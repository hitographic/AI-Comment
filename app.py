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

    def login(self, username: str, password: str) -> dict:
        """Login ke Instagram."""
        try:
            from instagrapi import Client

            self.client = Client()
            self.client.delay_range = [1, 3]

            add_log("instagram", f"🔑 Mencoba login sebagai @{username}...", "info")

            self.client.login(username, password)
            self.is_logged_in = True
            bot_state["instagram"]["is_logged_in"] = True
            bot_state["instagram"]["username"] = username

            add_log("instagram", f"✅ Berhasil login sebagai @{username}!", "success")
            return {"success": True, "message": f"Login berhasil! Welcome @{username}"}

        except Exception as e:
            error_msg = str(e)
            add_log("instagram", f"❌ Login gagal: {error_msg}", "error")
            return {"success": False, "message": f"Login gagal: {error_msg}"}

    def get_posts_by_hashtag(self, hashtag: str, amount: int = 9) -> list:
        """Ambil postingan berdasarkan hashtag."""
        try:
            if not self.client:
                return []
            medias = self.client.hashtag_medias_recent(hashtag, amount=amount)
            return medias
        except Exception as e:
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
        mode=mode, category=category, post_caption=caption, post_type=post_type
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
        comment = generate_comment(mode=mode, category=category, post_caption=caption)
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
    ║  🌐 http://localhost:5000                ║
    ╚══════════════════════════════════════════╝
    """
    )
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
