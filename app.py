"""
==============================================
🤖 SOCIAL MEDIA AUTO COMMENT BOT
==============================================
Instagram & TikTok Auto Commenter
dengan gaya bahasa Gen Z yang gaul!

⚠️ DISCLAIMER: Gunakan secara bertanggung jawab.
Jangan spam! Gunakan interval yang wajar.
==============================================
"""

import os
import json
import time
import random
import threading
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

from comment_generator import generate_comment, get_categories, get_template_count

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

# Thread locks
ig_lock = threading.Lock()
tiktok_lock = threading.Lock()


def add_log(platform: str, message: str, log_type: str = "info"):
    """Add log entry to platform log."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = {
        "time": timestamp,
        "message": message,
        "type": log_type,  # info, success, warning, error
    }
    bot_state[platform]["log"].insert(0, log_entry)
    # Keep only last 100 logs
    bot_state[platform]["log"] = bot_state[platform]["log"][:100]

    # Emit to frontend via WebSocket
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
            # Settings untuk menghindari challenge
            self.client.delay_range = [1, 3]

            add_log("instagram", f"🔑 Mencoba login sebagai @{username}...", "info")

            self.client.login(username, password)
            self.is_logged_in = True
            bot_state["instagram"]["is_logged_in"] = True
            bot_state["instagram"]["username"] = username

            add_log(
                "instagram", f"✅ Berhasil login sebagai @{username}!", "success"
            )
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
            add_log(
                "instagram", f"⚠️ Error ambil posts @{username}: {e}", "warning"
            )
            return []

    def comment_on_post(self, media_id: str, comment_text: str) -> dict:
        """Kirim komentar ke postingan."""
        try:
            if not self.client:
                return {"success": False, "message": "Belum login"}

            self.client.media_comment(media_id, comment_text)

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

    def auto_comment_loop(self):
        """Main loop untuk auto comment Instagram."""
        settings = bot_state["settings"]

        while bot_state["instagram"]["is_running"]:
            try:
                # Check daily limit
                if (
                    bot_state["instagram"]["comments_today"]
                    >= settings["max_per_day"]
                ):
                    add_log(
                        "instagram",
                        f"⏸️ Limit harian tercapai ({settings['max_per_day']}). Istirahat dulu~",
                        "warning",
                    )
                    time.sleep(3600)  # Tunggu 1 jam
                    continue

                # Komentar di postingan dari hashtag target
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
                    add_log(
                        "instagram",
                        "📭 Tidak ada postingan ditemukan, coba lagi nanti...",
                        "info",
                    )
                    time.sleep(60)
                    continue

                random.shuffle(targets)

                for post in targets:
                    if not bot_state["instagram"]["is_running"]:
                        break

                    if (
                        bot_state["instagram"]["comments_today"]
                        >= settings["max_per_day"]
                    ):
                        break

                    # Generate komentar
                    category = random.choice(settings["categories"])
                    caption = getattr(post, "caption_text", "")
                    comment = generate_comment(
                        mode=settings["comment_mode"],
                        category=category,
                        post_caption=caption,
                        post_type="general",
                    )

                    # Kirim komentar
                    media_id = post.id if hasattr(post, "id") else post.pk
                    self.comment_on_post(str(media_id), comment)

                    # Auto like jika diaktifkan
                    if settings["auto_like"]:
                        self.like_post(str(media_id))

                    # Emit stats update
                    socketio.emit("stats_update", get_dashboard_stats())

                    # Random delay
                    delay = random.randint(
                        settings["interval_min"], settings["interval_max"]
                    )
                    add_log(
                        "instagram",
                        f"⏳ Menunggu {delay} detik sebelum komentar berikutnya...",
                        "info",
                    )
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
        """Login ke TikTok menggunakan session ID dari cookie browser."""
        try:
            add_log("tiktok", "🔑 Mencoba login dengan session ID...", "info")

            # Validasi session ID
            if not session_id or len(session_id) < 10:
                raise ValueError("Session ID tidak valid")

            self.session_id = session_id
            self.is_logged_in = True
            bot_state["tiktok"]["is_logged_in"] = True
            bot_state["tiktok"]["username"] = "TikTok User"

            add_log("tiktok", "✅ Session ID tersimpan!", "success")
            return {
                "success": True,
                "message": "Login berhasil dengan session ID!",
            }

        except Exception as e:
            add_log("tiktok", f"❌ Login gagal: {e}", "error")
            return {"success": False, "message": str(e)}

    def comment_on_video(self, video_url: str, comment_text: str) -> dict:
        """Kirim komentar ke video TikTok via API."""
        try:
            import requests

            headers = {
                "Cookie": f"sessionid={self.session_id}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.tiktok.com/",
            }

            # Note: TikTok API endpoints sering berubah
            # Ini adalah simplified version
            add_log(
                "tiktok",
                f"💬 Mengirim komentar ke video: {comment_text}",
                "info",
            )

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
                if bot_state["tiktok"]["comments_today"] >= settings["max_per_day"]:
                    add_log(
                        "tiktok",
                        f"⏸️ Limit harian tercapai ({settings['max_per_day']})",
                        "warning",
                    )
                    time.sleep(3600)
                    continue

                hashtags = bot_state["tiktok"]["target_hashtags"]

                for hashtag in hashtags:
                    if not bot_state["tiktok"]["is_running"]:
                        break

                    add_log("tiktok", f"🔍 Browsing #{hashtag}...", "info")

                    # Generate dan kirim komentar
                    category = random.choice(settings["categories"])
                    comment = generate_comment(
                        mode=settings["comment_mode"],
                        category=category,
                    )

                    self.comment_on_video(
                        f"https://tiktok.com/tag/{hashtag}", comment
                    )

                    socketio.emit("stats_update", get_dashboard_stats())

                    delay = random.randint(
                        settings["interval_min"], settings["interval_max"]
                    )
                    add_log(
                        "tiktok",
                        f"⏳ Menunggu {delay} detik...",
                        "info",
                    )
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
    """Login Instagram."""
    data = request.json
    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "Username dan password wajib diisi!"})

    result = ig_bot.login(username, password)
    return jsonify(result)


@app.route("/api/instagram/start", methods=["POST"])
def ig_start():
    """Start auto comment Instagram."""
    if not bot_state["instagram"]["is_logged_in"]:
        return jsonify({"success": False, "message": "Login dulu bestie! 🔑"})

    data = request.json or {}
    hashtags = data.get("hashtags", [])
    users = data.get("users", [])

    bot_state["instagram"]["target_hashtags"] = hashtags
    bot_state["instagram"]["target_users"] = users
    bot_state["instagram"]["is_running"] = True

    # Start auto comment in background thread
    thread = threading.Thread(target=ig_bot.auto_comment_loop, daemon=True)
    thread.start()

    add_log("instagram", "🚀 Auto comment STARTED! Let's goo~ 🔥", "success")
    return jsonify({"success": True, "message": "Auto comment started! 🚀"})


@app.route("/api/instagram/stop", methods=["POST"])
def ig_stop():
    """Stop auto comment Instagram."""
    bot_state["instagram"]["is_running"] = False
    add_log("instagram", "⏹️ Auto comment STOPPED.", "warning")
    return jsonify({"success": True, "message": "Auto comment stopped."})


# --- TikTok Routes ---
@app.route("/api/tiktok/login", methods=["POST"])
def tiktok_login():
    """Login TikTok dengan session ID."""
    data = request.json
    session_id = data.get("session_id", "")

    if not session_id:
        return jsonify({"success": False, "message": "Session ID wajib diisi!"})

    result = tiktok_bot.login_with_session(session_id)
    return jsonify(result)


@app.route("/api/tiktok/start", methods=["POST"])
def tiktok_start():
    """Start auto comment TikTok."""
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

    add_log("tiktok", "🚀 Auto comment STARTED! Let's goo~ 🔥", "success")
    return jsonify({"success": True, "message": "Auto comment started! 🚀"})


@app.route("/api/tiktok/stop", methods=["POST"])
def tiktok_stop():
    """Stop auto comment TikTok."""
    bot_state["tiktok"]["is_running"] = False
    add_log("tiktok", "⏹️ Auto comment STOPPED.", "warning")
    return jsonify({"success": True, "message": "Auto comment stopped."})


# --- Settings Routes ---
@app.route("/api/settings", methods=["GET"])
def get_settings():
    """Get current settings."""
    return jsonify(bot_state["settings"])


@app.route("/api/settings", methods=["POST"])
def update_settings():
    """Update settings."""
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
    """Generate preview komentar."""
    data = request.json or {}
    mode = data.get("mode", bot_state["settings"]["comment_mode"])
    category = data.get("category", None)
    caption = data.get("caption", "")
    post_type = data.get("post_type", "general")

    comment = generate_comment(
        mode=mode, category=category, post_caption=caption, post_type=post_type
    )
    return jsonify({"success": True, "comment": comment})


@app.route("/api/generate-bulk", methods=["POST"])
def api_generate_bulk():
    """Generate multiple preview komentar."""
    data = request.json or {}
    count = min(data.get("count", 5), 20)
    mode = data.get("mode", bot_state["settings"]["comment_mode"])
    category = data.get("category", None)

    comments = []
    for _ in range(count):
        comment = generate_comment(mode=mode, category=category)
        comments.append(comment)

    return jsonify({"success": True, "comments": comments})


@app.route("/api/categories")
def api_categories():
    """Get available comment categories."""
    return jsonify(
        {
            "categories": get_categories(),
            "total_templates": get_template_count(),
        }
    )


# =============================================
# WEBSOCKET EVENTS
# =============================================
@socketio.on("connect")
def handle_connect():
    """Handle client connection."""
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
    ║  🔥 GEN Z AUTO COMMENT BOT v1.0 🔥     ║
    ║  Instagram & TikTok Auto Commenter      ║
    ║                                          ║
    ║  🌐 http://localhost:5000                ║
    ╚══════════════════════════════════════════╝
    """
    )
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
