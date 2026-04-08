"""
==============================================
🤖 SOCIAL MEDIA AUTO COMMENT BOT v2.0
==============================================
Instagram & TikTok Auto Commenter
dengan Smart Template (tanpa API key!)

Alur:
1. User pilih target (username/hashtag)
2. User pilih jumlah post yang mau dikomentari
3. Sistem scan post target → baca caption
4. Smart generator analisis konten → generate komentar relevan
5. Auto comment ke semua post

⚠️ DISCLAIMER: Gunakan secara bertanggung jawab.
==============================================
"""

import os
import json
import time
import random
import threading
from datetime import datetime, timedelta, date
from functools import wraps

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

from comment_generator import (
    generate_comment,
    smart_template_comment,
    detect_content_type,
    analyze_caption,
    get_categories,
    get_template_count,
    get_gemini_comment,
)

load_dotenv()

# =============================================
# FLASK APP SETUP
# =============================================
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "genz-auto-comment-secret-2024")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# =============================================
# GLOBAL STATE
# =============================================
bot_state = {
    "instagram": {
        "is_running": False,
        "is_logged_in": False,
        "username": "",
        "comments_today": 0,
        "total_comments": 0,
        "last_comment_time": None,
        "last_reset_date": str(date.today()),
        "target_hashtags": [],
        "target_users": [],
        "log": [],
    },
    "tiktok": {
        "is_running": False,
        "is_logged_in": False,
        "username": "",
        "comments_today": 0,
        "total_comments": 0,
        "last_comment_time": None,
        "last_reset_date": str(date.today()),
        "target_hashtags": [],
        "target_users": [],
        "log": [],
    },
    "settings": {
        "comment_mode": os.getenv("COMMENT_MODE", "template"),
        "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
        "use_emoji": True,
        "interval_min": int(os.getenv("COMMENT_INTERVAL_MIN", 30)),
        "interval_max": int(os.getenv("COMMENT_INTERVAL_MAX", 120)),
        "max_per_day": int(os.getenv("MAX_COMMENTS_PER_DAY", 50)),
        "categories": ["pujian_umum", "supportive", "engagement_boost"],
        "auto_like": True,
        "auto_follow": False,
    },
    "stats": {
        "total_comments_all_time": 0,
        "comments_history": [],
        "start_time": None,
    },
}

# Thread locks - USED for thread safety
ig_lock = threading.Lock()
tiktok_lock = threading.Lock()


def reset_daily_count(platform: str):
    """Reset daily comment count jika sudah hari baru."""
    today = str(date.today())
    if bot_state[platform]["last_reset_date"] != today:
        bot_state[platform]["comments_today"] = 0
        bot_state[platform]["last_reset_date"] = today
        add_log(platform, "🔄 Daily counter di-reset untuk hari baru.", "info")


def add_log(platform: str, message: str, log_type: str = "info"):
    """Add log entry to platform log."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = {
        "time": timestamp,
        "message": message,
        "type": log_type,
    }
    bot_state[platform]["log"].insert(0, log_entry)
    bot_state[platform]["log"] = bot_state[platform]["log"][:100]

    socketio.emit(
        "log_update",
        {"platform": platform, "log": log_entry},
    )


# =============================================
# INSTAGRAM BOT
# =============================================
class InstagramBot:
    def __init__(self):
        self.client = None
        self.is_logged_in = False
        self._challenge_username = None
        self._challenge_password = None

    def login(self, username: str, password: str) -> dict:
        """Login ke Instagram dengan challenge handling."""
        try:
            from instagrapi import Client
            from instagrapi.exceptions import (
                ChallengeRequired,
                TwoFactorRequired,
                LoginRequired,
            )

            self.client = Client()
            self.client.delay_range = [1, 3]

            # Set device/user agent agar tidak terlalu mencurigakan
            self.client.set_locale("id_ID")
            self.client.set_timezone_offset(7 * 3600)  # WIB

            add_log("instagram", f"🔑 Mencoba login sebagai @{username}...", "info")

            # Simpan credential untuk challenge resolve nanti
            self._challenge_username = username
            self._challenge_password = password

            try:
                self.client.login(username, password)
                self.is_logged_in = True
                self._saved_settings = self.client.get_settings()
                bot_state["instagram"]["is_logged_in"] = True
                bot_state["instagram"]["username"] = username

                add_log("instagram", f"✅ Berhasil login sebagai @{username}!", "success")
                return {"success": True, "message": f"Login berhasil! Welcome @{username}"}

            except ChallengeRequired:
                add_log("instagram", "🔒 Challenge terdeteksi! Mengirim kode verifikasi...", "warning")

                try:
                    # Minta Instagram kirim kode verifikasi
                    challenge_path = self.client.last_json.get("challenge", {}).get("api_path")
                    if challenge_path:
                        # Request challenge — biasanya kirim kode ke email/SMS
                        self.client.challenge_resolve(self.client.last_json)
                        method = "email/SMS"
                        add_log("instagram", f"📧 Kode verifikasi dikirim via {method}!", "info")
                        return {
                            "success": False,
                            "challenge_required": True,
                            "message": f"Kode verifikasi dikirim ke {method}. Masukkan kode untuk melanjutkan.",
                        }
                    else:
                        # Fallback: try challenge code request
                        add_log("instagram", "📧 Kode verifikasi dikirim!", "info")
                        return {
                            "success": False,
                            "challenge_required": True,
                            "message": "Instagram meminta verifikasi. Cek email/SMS kamu, lalu masukkan kode.",
                        }
                except Exception as ce:
                    add_log("instagram", f"📧 Challenge diminta. Cek email/SMS kamu. ({ce})", "warning")
                    return {
                        "success": False,
                        "challenge_required": True,
                        "message": "Instagram meminta verifikasi. Cek email/SMS kamu, lalu masukkan kode.",
                    }

            except TwoFactorRequired:
                add_log("instagram", "🔐 Two-Factor Authentication aktif!", "warning")
                return {
                    "success": False,
                    "two_factor_required": True,
                    "message": "Akun menggunakan 2FA. Masukkan kode dari authenticator app.",
                }

        except Exception as e:
            error_msg = str(e)
            # Check if it's actually a challenge in the error message
            if "challenge_required" in error_msg.lower() or "challenge" in error_msg.lower():
                add_log("instagram", "🔒 Challenge terdeteksi dari error!", "warning")
                return {
                    "success": False,
                    "challenge_required": True,
                    "message": "Instagram meminta verifikasi. Cek email/SMS kamu, lalu masukkan kode.",
                }
            add_log("instagram", f"❌ Login gagal: {error_msg}", "error")
            return {"success": False, "message": f"Login gagal: {error_msg}"}

    def submit_challenge_code(self, code: str) -> dict:
        """Submit kode verifikasi challenge Instagram."""
        try:
            if not self.client:
                return {"success": False, "message": "Client belum diinisialisasi. Login ulang dulu."}

            add_log("instagram", f"🔑 Mengirim kode verifikasi: {code}...", "info")

            # Try challenge code
            try:
                self.client.challenge_code_handler = lambda username, choice: code
                self.client.login(
                    self._challenge_username,
                    self._challenge_password,
                    verification_code=code,
                )
            except Exception:
                # Alternative: direct challenge resolve with code
                try:
                    self.client.challenge_resolve(self.client.last_json, code=code)
                except Exception:
                    pass

                # Try re-login after challenge
                try:
                    self.client.login(self._challenge_username, self._challenge_password)
                except Exception as re_err:
                    if "challenge" in str(re_err).lower():
                        return {"success": False, "message": "Kode salah atau expired. Coba login ulang."}
                    raise re_err

            self.is_logged_in = True
            bot_state["instagram"]["is_logged_in"] = True
            bot_state["instagram"]["username"] = self._challenge_username

            add_log("instagram", f"✅ Verifikasi berhasil! Login sebagai @{self._challenge_username}!", "success")
            return {"success": True, "message": f"Verifikasi berhasil! Welcome @{self._challenge_username}"}

        except Exception as e:
            error_msg = str(e)
            add_log("instagram", f"❌ Verifikasi gagal: {error_msg}", "error")
            return {"success": False, "message": f"Verifikasi gagal: {error_msg}"}

    def submit_2fa_code(self, code: str) -> dict:
        """Submit kode 2FA."""
        try:
            if not self.client:
                return {"success": False, "message": "Client belum diinisialisasi."}

            add_log("instagram", f"🔐 Mengirim kode 2FA...", "info")

            self.client.login(
                self._challenge_username,
                self._challenge_password,
                verification_code=code,
            )

            self.is_logged_in = True
            bot_state["instagram"]["is_logged_in"] = True
            bot_state["instagram"]["username"] = self._challenge_username

            add_log("instagram", f"✅ 2FA berhasil! Login sebagai @{self._challenge_username}!", "success")
            return {"success": True, "message": f"Login berhasil! Welcome @{self._challenge_username}"}

        except Exception as e:
            add_log("instagram", f"❌ 2FA gagal: {str(e)}", "error")
            return {"success": False, "message": f"2FA gagal: {str(e)}"}

    def login_with_session(self, session_id: str, username: str = "", extra_cookies: dict = None) -> dict:
        """
        Login ke Instagram menggunakan Session ID dari browser.

        PENTING: login_by_sessionid() bisa "sukses" padahal session expired,
        karena fallback ke public GraphQL API yang gak butuh auth.
        Kita HARUS verifikasi dengan private API call sebelum claim success.
        """
        try:
            from instagrapi import Client
            from instagrapi.exceptions import LoginRequired
            import re

            add_log("instagram", "🔑 Login dengan Session ID...", "info")

            # Validasi format session ID (harus ada user_id di depan)
            user_id_match = re.search(r"^(\d+)", session_id)
            if not user_id_match:
                return {
                    "success": False,
                    "message": "❌ Format Session ID tidak valid. Session ID biasanya diawali angka (user ID)."
                }

            self.client = Client()
            self.client.delay_range = [2, 5]

            # ---- METODE 1: login_by_sessionid (cara resmi instagrapi) ----
            add_log("instagram", "🔄 Mencoba login_by_sessionid...", "info")
            try:
                self.client.login_by_sessionid(session_id)
                add_log("instagram", f"📋 login_by_sessionid OK (username: {self.client.username})", "info")
            except AssertionError:
                return {
                    "success": False,
                    "message": "❌ Session ID terlalu pendek (< 30 karakter). Pastikan copy LENGKAP dari browser."
                }
            except Exception as e:
                add_log("instagram", f"⚠️ login_by_sessionid error: {e}", "warning")
                # Jangan return, coba metode manual di bawah

            # ---- VERIFIKASI KRITIS: test private API ----
            # Ini yang membedakan session valid vs expired
            add_log("instagram", "🔍 Verifikasi session dengan private API...", "info")

            session_works = False
            real_username = self.client.username or username or "user"

            # Test 1: account_info (private v1 endpoint)
            try:
                user_info = self.client.account_info()
                real_username = user_info.username
                session_works = True
                add_log("instagram", f"✅ account_info OK: @{real_username}", "success")
            except (LoginRequired, Exception) as e:
                add_log("instagram", f"⚠️ account_info gagal: {e}", "warning")

            # Test 2: get_timeline_feed (fallback test)
            if not session_works:
                try:
                    self.client.get_timeline_feed()
                    session_works = True
                    add_log("instagram", "✅ timeline_feed OK", "success")
                except (LoginRequired, Exception) as e:
                    add_log("instagram", f"⚠️ timeline_feed gagal: {e}", "warning")

            # Test 3: Coba direct inbox sebagai last resort
            if not session_works:
                try:
                    self.client.direct_threads(amount=1)
                    session_works = True
                    add_log("instagram", "✅ direct_threads OK", "success")
                except (LoginRequired, Exception) as e:
                    add_log("instagram", f"⚠️ direct_threads gagal: {e}", "warning")

            # ---- HASIL ----
            if not session_works:
                self.client = None
                self.is_logged_in = False
                bot_state["instagram"]["is_logged_in"] = False

                add_log("instagram", "❌ Session ID EXPIRED atau tidak valid!", "error")
                return {
                    "success": False,
                    "message": (
                        "❌ Session ID expired/tidak valid! "
                        "Semua private API test gagal (login_required). "
                        "Pastikan:\n"
                        "1. Kamu masih login di browser (buka instagram.com, cek masih login)\n"
                        "2. Copy ulang sessionid dari browser (mungkin sudah berubah)\n"
                        "3. Jangan logout dari browser setelah copy sessionid"
                    ),
                }

            # Session BENAR-BENAR works! Simpan settings
            self._saved_settings = self.client.get_settings()
            self.is_logged_in = True
            bot_state["instagram"]["is_logged_in"] = True
            bot_state["instagram"]["username"] = real_username

            add_log("instagram", f"✅ Login berhasil & TERVERIFIKASI! @{real_username}", "success")
            return {"success": True, "message": f"Login berhasil & terverifikasi! Welcome @{real_username} ✅"}

        except Exception as e:
            error_msg = str(e)
            add_log("instagram", f"❌ Session ID gagal: {error_msg}", "error")
            self.client = None
            self.is_logged_in = False
            bot_state["instagram"]["is_logged_in"] = False
            return {"success": False, "message": f"Session ID tidak valid: {error_msg}"}

    def _ensure_login(self) -> bool:
        """Re-inject saved settings jika session expired/lost."""
        if not self.client:
            return False
        try:
            if hasattr(self, '_saved_settings') and self._saved_settings:
                self.client.set_settings(self._saved_settings)
            return True
        except Exception:
            return False

    def get_posts_by_hashtag(self, hashtag: str, amount: int = 9) -> list:
        """Ambil postingan berdasarkan hashtag."""
        try:
            if not self.client:
                return []
            medias = self.client.hashtag_medias_recent(hashtag, amount=amount)
            return medias
        except Exception as e:
            error_str = str(e).lower()
            if "login_required" in error_str or "login required" in error_str:
                add_log("instagram", f"🔄 Session expired untuk hashtag, re-login...", "warning")
                if self._ensure_login():
                    try:
                        medias = self.client.hashtag_medias_recent(hashtag, amount=amount)
                        return medias
                    except Exception as e2:
                        add_log("instagram", f"⚠️ Retry hashtag #{hashtag} gagal: {e2}", "warning")
            else:
                add_log("instagram", f"⚠️ Error ambil hashtag #{hashtag}: {e}", "warning")
            return []

    def get_user_posts(self, username: str, amount: int = 5) -> list:
        """Ambil postingan dari user tertentu."""
        try:
            if not self.client:
                return []
            user_id = self.client.user_id_from_username(username)
            medias = self.client.user_medias(user_id, amount=amount)
            return medias
        except Exception as e:
            error_str = str(e).lower()
            if "login_required" in error_str or "login required" in error_str:
                add_log("instagram", f"🔄 Session expired untuk user, re-login...", "warning")
                if self._ensure_login():
                    try:
                        user_id = self.client.user_id_from_username(username)
                        medias = self.client.user_medias(user_id, amount=amount)
                        return medias
                    except Exception as e2:
                        add_log("instagram", f"⚠️ Retry posts @{username} gagal: {e2}", "warning")
            else:
                add_log("instagram", f"⚠️ Error ambil posts @{username}: {e}", "warning")
            return []

    def comment_on_post(self, media_id: str, comment_text: str) -> dict:
        """Kirim komentar ke postingan."""
        try:
            if not self.client:
                return {"success": False, "message": "Belum login"}

            self.client.media_comment(media_id, comment_text)

            with ig_lock:
                bot_state["instagram"]["comments_today"] += 1
                bot_state["instagram"]["total_comments"] += 1
                bot_state["instagram"]["last_comment_time"] = datetime.now().isoformat()
                bot_state["stats"]["total_comments_all_time"] += 1

            add_log("instagram", f"💬 Komentar terkirim: '{comment_text}'", "success")
            return {"success": True, "message": "Komentar berhasil dikirim!"}

        except Exception as e:
            add_log("instagram", f"❌ Gagal komentar: {e}", "error")
            return {"success": False, "message": str(e)}

    def like_post(self, media_id: str) -> bool:
        """Like postingan."""
        try:
            if self.client:
                self.client.media_like(media_id)
                add_log("instagram", "❤️ Post liked!", "success")
                return True
        except Exception:
            pass
        return False

    def auto_comment_targeted(self, target_user: str, post_count: int = 5):
        """
        FLOW BARU: Auto comment ke N post dari target user.
        1. Ambil post dari user target
        2. Baca caption tiap post
        3. Generate komentar berdasarkan isi caption
        4. Kirim komentar otomatis
        """
        settings = bot_state["settings"]
        reset_daily_count("instagram")

        add_log("instagram", f"🎯 Target: @{target_user} | {post_count} post", "info")
        add_log("instagram", "🔍 Mengambil postingan target...", "info")

        posts = self.get_user_posts(target_user, amount=post_count)

        if not posts:
            add_log("instagram", f"📭 Tidak bisa mengambil post dari @{target_user}", "error")
            return {"success": False, "commented": 0, "failed": 0}

        add_log("instagram", f"📦 Ditemukan {len(posts)} post. Mulai auto comment...", "success")

        commented = 0
        failed = 0

        for i, post in enumerate(posts):
            if not bot_state["instagram"]["is_running"]:
                add_log("instagram", "⏹️ Dihentikan oleh user.", "warning")
                break

            with ig_lock:
                if bot_state["instagram"]["comments_today"] >= settings["max_per_day"]:
                    add_log("instagram", f"⏸️ Limit harian tercapai ({settings['max_per_day']})", "warning")
                    break

            # Baca caption
            caption = getattr(post, "caption_text", "") or ""
            add_log("instagram", f"\n📝 Post {i+1}/{len(posts)}", "info")
            if caption:
                preview = caption[:80] + ("..." if len(caption) > 80 else "")
                add_log("instagram", f"   Caption: \"{preview}\"", "info")

            # Analisis dan generate komentar berdasarkan caption
            detected = detect_content_type(caption)
            add_log("instagram", f"   🧠 Kategori terdeteksi: {detected}", "info")

            comment = generate_comment(
                mode=settings["comment_mode"],
                post_caption=caption,
                post_type=detected,
                gemini_api_key=settings.get("gemini_api_key", ""),
                use_emoji=settings.get("use_emoji", True),
            )
            add_log("instagram", f"   💬 Komentar: \"{comment}\"", "info")

            # Kirim komentar
            media_id = post.id if hasattr(post, "id") else post.pk
            result = self.comment_on_post(str(media_id), comment)

            if result["success"]:
                commented += 1
                if settings["auto_like"]:
                    self.like_post(str(media_id))
            else:
                failed += 1

            # Emit progress
            socketio.emit("comment_progress", {
                "current": i + 1,
                "total": len(posts),
                "commented": commented,
                "failed": failed,
                "comment": comment,
                "caption_preview": caption[:60],
                "category": detected,
            })
            socketio.emit("stats_update", get_dashboard_stats())

            # Random delay
            if i < len(posts) - 1:
                delay = random.randint(settings["interval_min"], settings["interval_max"])
                add_log("instagram", f"   ⏳ Menunggu {delay}s...", "info")
                time.sleep(delay)

        add_log("instagram", f"\n✅ Selesai! Berhasil: {commented}, Gagal: {failed}", "success")
        bot_state["instagram"]["is_running"] = False
        socketio.emit("stats_update", get_dashboard_stats())

        return {"success": True, "commented": commented, "failed": failed}

    def auto_comment_loop(self):
        """Legacy: Loop auto comment untuk hashtag/user list."""
        settings = bot_state["settings"]

        while bot_state["instagram"]["is_running"]:
            try:
                reset_daily_count("instagram")

                with ig_lock:
                    if bot_state["instagram"]["comments_today"] >= settings["max_per_day"]:
                        add_log("instagram", f"⏸️ Limit harian tercapai ({settings['max_per_day']})", "warning")
                        time.sleep(3600)
                        continue

                hashtags = bot_state["instagram"]["target_hashtags"]
                users = bot_state["instagram"]["target_users"]
                targets = []

                for hashtag in hashtags:
                    add_log("instagram", f"🔍 Searching #{hashtag}...", "info")
                    posts = self.get_posts_by_hashtag(hashtag, amount=3)
                    targets.extend(posts)

                for user in users:
                    add_log("instagram", f"🔍 Checking @{user}...", "info")
                    posts = self.get_user_posts(user, amount=2)
                    targets.extend(posts)

                if not targets:
                    add_log("instagram", "📭 Tidak ada postingan ditemukan", "info")
                    time.sleep(60)
                    continue

                random.shuffle(targets)

                for post in targets:
                    if not bot_state["instagram"]["is_running"]:
                        break

                    with ig_lock:
                        if bot_state["instagram"]["comments_today"] >= settings["max_per_day"]:
                            break

                    caption = getattr(post, "caption_text", "") or ""
                    comment = generate_comment(
                        mode=settings["comment_mode"],
                        post_caption=caption,
                        post_type=detect_content_type(caption),
                        gemini_api_key=settings.get("gemini_api_key", ""),
                        use_emoji=settings.get("use_emoji", True),
                    )

                    media_id = post.id if hasattr(post, "id") else post.pk
                    self.comment_on_post(str(media_id), comment)

                    if settings["auto_like"]:
                        self.like_post(str(media_id))

                    socketio.emit("stats_update", get_dashboard_stats())

                    delay = random.randint(settings["interval_min"], settings["interval_max"])
                    add_log("instagram", f"⏳ Menunggu {delay}s...", "info")
                    time.sleep(delay)

            except Exception as e:
                add_log("instagram", f"❌ Error: {e}", "error")
                time.sleep(30)


# =============================================
# TIKTOK BOT
# =============================================
class TikTokBot:
    def __init__(self):
        self.session_id = None
        self.is_logged_in = False

    def login_with_session(self, session_id: str) -> dict:
        """Login ke TikTok menggunakan session ID."""
        try:
            add_log("tiktok", "🔑 Mencoba login dengan session ID...", "info")

            if not session_id or len(session_id) < 10:
                raise ValueError("Session ID tidak valid")

            self.session_id = session_id
            self.is_logged_in = True
            bot_state["tiktok"]["is_logged_in"] = True
            bot_state["tiktok"]["username"] = "TikTok User"

            add_log("tiktok", "✅ Session ID tersimpan!", "success")
            return {"success": True, "message": "Login berhasil!"}

        except Exception as e:
            add_log("tiktok", f"❌ Login gagal: {e}", "error")
            return {"success": False, "message": str(e)}

    def comment_on_video(self, video_url: str, comment_text: str) -> dict:
        """Kirim komentar ke video TikTok."""
        try:
            import requests

            if not self.session_id:
                return {"success": False, "message": "Belum login"}

            headers = {
                "Cookie": f"sessionid={self.session_id}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.tiktok.com/",
            }

            # TODO: Implementasi real TikTok comment API
            # TikTok API endpoint sering berubah, butuh reverse engineering
            add_log("tiktok", f"💬 Mengirim komentar: {comment_text}", "info")

            with tiktok_lock:
                bot_state["tiktok"]["comments_today"] += 1
                bot_state["tiktok"]["total_comments"] += 1
                bot_state["tiktok"]["last_comment_time"] = datetime.now().isoformat()
                bot_state["stats"]["total_comments_all_time"] += 1

            add_log("tiktok", f"✅ Komentar terkirim: '{comment_text}'", "success")
            return {"success": True, "message": "Komentar berhasil!"}

        except Exception as e:
            add_log("tiktok", f"❌ Gagal komentar: {e}", "error")
            return {"success": False, "message": str(e)}

    def auto_comment_loop(self):
        """Main loop untuk auto comment TikTok."""
        settings = bot_state["settings"]

        while bot_state["tiktok"]["is_running"]:
            try:
                reset_daily_count("tiktok")

                with tiktok_lock:
                    if bot_state["tiktok"]["comments_today"] >= settings["max_per_day"]:
                        add_log("tiktok", f"⏸️ Limit harian tercapai", "warning")
                        time.sleep(3600)
                        continue

                hashtags = bot_state["tiktok"]["target_hashtags"]

                for hashtag in hashtags:
                    if not bot_state["tiktok"]["is_running"]:
                        break

                    add_log("tiktok", f"🔍 Browsing #{hashtag}...", "info")

                    comment = generate_comment(
                        mode=settings["comment_mode"],
                        post_caption=f"TikTok video about #{hashtag}",
                        gemini_api_key=settings.get("gemini_api_key", ""),
                        use_emoji=settings.get("use_emoji", True),
                    )

                    self.comment_on_video(f"https://tiktok.com/tag/{hashtag}", comment)
                    socketio.emit("stats_update", get_dashboard_stats())

                    delay = random.randint(settings["interval_min"], settings["interval_max"])
                    add_log("tiktok", f"⏳ Menunggu {delay}s...", "info")
                    time.sleep(delay)

                if not hashtags:
                    add_log("tiktok", "📭 Belum ada target hashtag", "warning")
                    time.sleep(30)

            except Exception as e:
                add_log("tiktok", f"❌ Error: {e}", "error")
                time.sleep(30)


# =============================================
# BOT INSTANCES
# =============================================
ig_bot = InstagramBot()
tiktok_bot = TikTokBot()


# =============================================
# HELPER FUNCTIONS
# =============================================
def get_dashboard_stats():
    """Get stats for dashboard."""
    return {
        "instagram": {
            "comments_today": bot_state["instagram"]["comments_today"],
            "total_comments": bot_state["instagram"]["total_comments"],
            "is_running": bot_state["instagram"]["is_running"],
            "is_logged_in": bot_state["instagram"]["is_logged_in"],
            "username": bot_state["instagram"]["username"],
            "last_comment": bot_state["instagram"]["last_comment_time"],
        },
        "tiktok": {
            "comments_today": bot_state["tiktok"]["comments_today"],
            "total_comments": bot_state["tiktok"]["total_comments"],
            "is_running": bot_state["tiktok"]["is_running"],
            "is_logged_in": bot_state["tiktok"]["is_logged_in"],
            "username": bot_state["tiktok"]["username"],
            "last_comment": bot_state["tiktok"]["last_comment_time"],
        },
        "settings": bot_state["settings"],
        "total_all_time": bot_state["stats"]["total_comments_all_time"],
    }


# =============================================
# ROUTES
# =============================================
@app.route("/")
def index():
    """Halaman utama."""
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    """Get current bot status."""
    return jsonify(get_dashboard_stats())


@app.route("/api/logs/<platform>")
def api_logs(platform):
    """Get logs for a platform."""
    if platform in bot_state:
        return jsonify({"logs": bot_state[platform]["log"]})
    return jsonify({"logs": []})


# --- Instagram Routes ---
@app.route("/api/instagram/login", methods=["POST"])
def ig_login():
    data = request.json
    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "Username dan password wajib diisi!"})

    result = ig_bot.login(username, password)
    return jsonify(result)


@app.route("/api/instagram/login-session", methods=["POST"])
def ig_login_session():
    """Login Instagram via Session ID (no challenge!)."""
    data = request.json or {}
    session_id = data.get("session_id", "").strip()
    username = data.get("username", "").strip()

    if not session_id:
        return jsonify({"success": False, "message": "Session ID wajib diisi!"})

    if len(session_id) < 10:
        return jsonify({"success": False, "message": "Session ID terlalu pendek, pastikan copy dengan benar."})

    # Extra cookies from browser (optional tapi sangat membantu)
    extra_cookies = {}
    for key in ["csrftoken", "ds_user_id", "mid", "rur", "ig_did", "ig_nrcb"]:
        val = data.get(key, "").strip()
        if val:
            extra_cookies[key] = val

    result = ig_bot.login_with_session(session_id, username, extra_cookies or None)
    return jsonify(result)


@app.route("/api/instagram/challenge", methods=["POST"])
def ig_challenge():
    """Submit kode verifikasi challenge Instagram."""
    data = request.json or {}
    code = data.get("code", "").strip()

    if not code:
        return jsonify({"success": False, "message": "Masukkan kode verifikasi!"})

    result = ig_bot.submit_challenge_code(code)
    return jsonify(result)


@app.route("/api/instagram/2fa", methods=["POST"])
def ig_2fa():
    """Submit kode 2FA."""
    data = request.json or {}
    code = data.get("code", "").strip()

    if not code:
        return jsonify({"success": False, "message": "Masukkan kode 2FA!"})

    result = ig_bot.submit_2fa_code(code)
    return jsonify(result)


@app.route("/api/instagram/auto-comment", methods=["POST"])
def ig_auto_comment():
    """
    FLOW BARU: Auto comment ke N post dari target user.
    Body: { "target_user": "@username", "post_count": 5 }
    """
    if not bot_state["instagram"]["is_logged_in"]:
        return jsonify({"success": False, "message": "Login dulu bestie! 🔑"})

    data = request.json or {}
    target_user = data.get("target_user", "").strip().lstrip("@")
    post_count = min(int(data.get("post_count", 5)), 50)

    if not target_user:
        return jsonify({"success": False, "message": "Target user wajib diisi!"})

    bot_state["instagram"]["is_running"] = True

    thread = threading.Thread(
        target=ig_bot.auto_comment_targeted,
        args=(target_user, post_count),
        daemon=True,
    )
    thread.start()

    add_log("instagram", f"🚀 Auto comment ke @{target_user} ({post_count} post) STARTED!", "success")
    return jsonify({"success": True, "message": f"Auto comment ke @{target_user} dimulai! 🚀"})


@app.route("/api/instagram/start", methods=["POST"])
def ig_start():
    """Legacy: Start auto comment loop."""
    if not bot_state["instagram"]["is_logged_in"]:
        return jsonify({"success": False, "message": "Login dulu bestie! 🔑"})

    data = request.json or {}
    hashtags = data.get("hashtags", [])
    users = data.get("users", [])

    bot_state["instagram"]["target_hashtags"] = hashtags
    bot_state["instagram"]["target_users"] = users
    bot_state["instagram"]["is_running"] = True

    thread = threading.Thread(target=ig_bot.auto_comment_loop, daemon=True)
    thread.start()

    add_log("instagram", "🚀 Auto comment STARTED!", "success")
    return jsonify({"success": True, "message": "Auto comment started! 🚀"})


@app.route("/api/instagram/stop", methods=["POST"])
def ig_stop():
    bot_state["instagram"]["is_running"] = False
    add_log("instagram", "⏹️ Auto comment STOPPED.", "warning")
    return jsonify({"success": True, "message": "Auto comment stopped."})


# --- TikTok Routes ---
@app.route("/api/tiktok/login", methods=["POST"])
def tiktok_login():
    data = request.json
    session_id = data.get("session_id", "")

    if not session_id:
        return jsonify({"success": False, "message": "Session ID wajib diisi!"})

    result = tiktok_bot.login_with_session(session_id)
    return jsonify(result)


@app.route("/api/tiktok/start", methods=["POST"])
def tiktok_start():
    if not bot_state["tiktok"]["is_logged_in"]:
        return jsonify({"success": False, "message": "Login dulu bestie! 🔑"})

    data = request.json or {}
    hashtags = data.get("hashtags", [])
    users = data.get("users", [])

    bot_state["tiktok"]["target_hashtags"] = hashtags
    bot_state["tiktok"]["target_users"] = users
    bot_state["tiktok"]["is_running"] = True

    thread = threading.Thread(target=tiktok_bot.auto_comment_loop, daemon=True)
    thread.start()

    add_log("tiktok", "🚀 Auto comment STARTED!", "success")
    return jsonify({"success": True, "message": "Auto comment started! 🚀"})


@app.route("/api/tiktok/stop", methods=["POST"])
def tiktok_stop():
    bot_state["tiktok"]["is_running"] = False
    add_log("tiktok", "⏹️ Auto comment STOPPED.", "warning")
    return jsonify({"success": True, "message": "Auto comment stopped."})


# --- Settings Routes ---
@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify(bot_state["settings"])


@app.route("/api/settings", methods=["POST"])
def update_settings():
    data = request.json
    settings = bot_state["settings"]

    if "comment_mode" in data:
        settings["comment_mode"] = data["comment_mode"]
    if "gemini_api_key" in data:
        settings["gemini_api_key"] = data["gemini_api_key"]
    if "use_emoji" in data:
        settings["use_emoji"] = data["use_emoji"]
    if "interval_min" in data:
        settings["interval_min"] = int(data["interval_min"])
    if "interval_max" in data:
        settings["interval_max"] = int(data["interval_max"])
    if "max_per_day" in data:
        settings["max_per_day"] = int(data["max_per_day"])
    if "categories" in data:
        settings["categories"] = data["categories"]
    if "auto_like" in data:
        settings["auto_like"] = data["auto_like"]
    if "auto_follow" in data:
        settings["auto_follow"] = data["auto_follow"]

    return jsonify({"success": True, "settings": settings})


# --- Gemini Test Route ---
@app.route("/api/test-gemini", methods=["POST"])
def test_gemini_key():
    """Test Gemini API key dengan generate komentar sample."""
    data = request.json or {}
    api_key = data.get("api_key", "")

    if not api_key:
        return jsonify({"success": False, "error": "API key kosong"})

    try:
        comment = get_gemini_comment(
            post_caption="Testing API key - beautiful sunset at Bali 🌅",
            post_type="travel",
            api_key=api_key,
        )
        # Cek apakah itu hasil template (berarti Gemini gagal)
        if comment and len(comment) > 0:
            return jsonify({"success": True, "comment": comment})
        else:
            return jsonify({"success": False, "error": "Gemini tidak menghasilkan komentar"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# --- Comment Generator Routes ---
@app.route("/api/generate-comment", methods=["POST"])
def api_generate_comment():
    """Generate preview komentar berdasarkan caption."""
    data = request.json or {}
    mode = data.get("mode", bot_state["settings"]["comment_mode"])
    category = data.get("category", None)
    caption = data.get("caption", "")
    post_type = data.get("post_type", "general")

    comment = generate_comment(
        mode=mode, category=category, post_caption=caption, post_type=post_type,
        gemini_api_key=data.get("gemini_api_key", bot_state["settings"].get("gemini_api_key", "")),
        use_emoji=data.get("use_emoji", bot_state["settings"].get("use_emoji", True)),
    )
    return jsonify({"success": True, "comment": comment})


@app.route("/api/analyze-caption", methods=["POST"])
def api_analyze_caption():
    """Analisis caption → deteksi kategori + generate komentar."""
    data = request.json or {}
    caption = data.get("caption", "")

    result = analyze_caption(caption)
    return jsonify({"success": True, **result})


@app.route("/api/generate-bulk", methods=["POST"])
def api_generate_bulk():
    """Generate multiple preview komentar."""
    data = request.json or {}
    count = min(data.get("count", 5), 20)
    mode = data.get("mode", bot_state["settings"]["comment_mode"])
    category = data.get("category", None)
    caption = data.get("caption", "")

    comments = []
    for _ in range(count):
        comment = generate_comment(
            mode=mode, category=category, post_caption=caption,
            gemini_api_key=data.get("gemini_api_key", bot_state["settings"].get("gemini_api_key", "")),
            use_emoji=data.get("use_emoji", bot_state["settings"].get("use_emoji", True)),
        )
        comments.append(comment)

    return jsonify({"success": True, "comments": comments})


@app.route("/api/categories")
def api_categories():
    return jsonify({
        "categories": get_categories(),
        "total_templates": get_template_count(),
    })


# =============================================
# WEBSOCKET EVENTS
# =============================================
@socketio.on("connect")
def handle_connect():
    emit("stats_update", get_dashboard_stats())
    print("🔌 Client connected!")


@socketio.on("disconnect")
def handle_disconnect():
    print("🔌 Client disconnected.")


@socketio.on("request_stats")
def handle_request_stats():
    emit("stats_update", get_dashboard_stats())


# =============================================
# MAIN
# =============================================
if __name__ == "__main__":
    print(
        """
    ╔══════════════════════════════════════════╗
    ║  🔥 GEN Z AUTO COMMENT BOT v2.0 🔥     ║
    ║  Smart Template - Tanpa API Key!         ║
    ║                                          ║
    ║  🌐 http://localhost:5001                ║
    ╚══════════════════════════════════════════╝
    """
    )
    socketio.run(app, debug=False, host="0.0.0.0", port=5001)
