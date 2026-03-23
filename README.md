# 🔥 GenZ Auto Comment Bot v1.0

Aplikasi web untuk otomatis komentar di **Instagram** dan **TikTok** dengan gaya bahasa **Gen Z** yang gaul dan kekinian!

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![Status](https://img.shields.io/badge/Status-Beta-orange)

---

## ✨ Fitur

- 🤖 **Auto Comment** - Otomatis komentar di Instagram & TikTok
- 💬 **85+ Template Gen Z** - Komentar gaul & kekinian yang bervariasi
- 🧠 **AI Mode (OpenAI)** - Generate komentar unik menggunakan GPT
- 📊 **Dashboard Real-time** - Monitor aktivitas bot lewat WebSocket
- 🎯 **Target Fleksibel** - Pilih hashtag atau user target
- ⏱️ **Smart Timing** - Interval random untuk menghindari ban
- 📈 **Kategori Komentar** - Pujian, supportive, lucu, makanan, travel, dll
- 🔒 **Safety Limits** - Batasan harian untuk keamanan akun

## 🚀 Quick Start

### 1. Clone & Setup

```bash
cd "5. Aplikasi Auto Comment"

# Buat virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Konfigurasi

```bash
# Copy dan edit file environment
cp .env.example .env
```

Edit file `.env` sesuai kebutuhan:
- `OPENAI_API_KEY` - (Opsional) untuk mode AI
- `COMMENT_MODE` - `template` atau `ai`
- `COMMENT_INTERVAL_MIN` - Delay minimum (detik)
- `COMMENT_INTERVAL_MAX` - Delay maximum (detik)
- `MAX_COMMENTS_PER_DAY` - Batas komentar per hari

### 3. Jalankan

```bash
python app.py
```

Buka browser: **http://localhost:5000** 🌐

## 📱 Cara Pakai

### Instagram
1. Buka tab **Instagram**
2. Login dengan username & password
3. Tambahkan hashtag/user target
4. Klik **Start** dan bot akan berjalan! 🚀

### TikTok
1. Buka TikTok di browser → F12 → Application → Cookies
2. Cari cookie bernama `sessionid` dan copy nilainya
3. Buka tab **TikTok** → paste session ID
4. Tambahkan hashtag target → **Start**! 🎬

### Comment Generator
1. Buka tab **Generator**
2. Pilih mode (Template/AI)
3. Pilih kategori komentar
4. Klik **Generate** untuk preview komentar

## 🎨 Kategori Komentar

| Kategori | Contoh |
|----------|--------|
| 🌟 Pujian Umum | "Gila sih ini keren banget!! 🔥🔥" |
| 👗 Outfit | "Drip check: 100/10 💧✨" |
| 🍔 Makanan | "Food porn alert! Bikin ngiler 🤤" |
| ✈️ Travel | "Healing goals! Surga dunia! 🏔️" |
| 💪 Supportive | "Keep going bestie! 🫶💪" |
| 😂 Lucu | "WKWKWK ini relate bgt 😂💀" |
| 📈 Engagement | "Wajib FYP sih ini! 🚀" |

## ⚙️ Tech Stack

- **Backend**: Python, Flask, Flask-SocketIO
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Instagram API**: Instagrapi
- **AI**: OpenAI GPT-3.5 (opsional)
- **Real-time**: WebSocket (Socket.IO)

## ⚠️ Disclaimer

> **PENTING**: Aplikasi ini dibuat untuk tujuan edukasi dan eksperimen.
> - Gunakan secara **bertanggung jawab**
> - **Jangan spam** - gunakan interval yang wajar (min. 30 detik)
> - Instagram/TikTok bisa **memban** akun yang melakukan auto comment
> - Gunakan **akun cadangan** untuk testing
> - Developer tidak bertanggung jawab atas penyalahgunaan aplikasi ini

## 📁 Struktur File

```
📦 Aplikasi Auto Comment
├── 📄 app.py                  # Main Flask server
├── 📄 comment_generator.py    # Gen Z comment engine
├── 📄 requirements.txt        # Python dependencies
├── 📄 .env.example            # Template environment variables
├── 📄 README.md               # Dokumentasi
└── 📁 templates/
    └── 📄 index.html          # Web UI (dashboard)
```

## 🤝 Support

Ada pertanyaan atau masalah? Hubungi developer! 💬

---

**Made with 💜 by Gen Z, for Gen Z** ✨
