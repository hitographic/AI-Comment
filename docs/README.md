# 🤖 AutoCommentAI - Smart Social Media Auto Commenter

> Tool automasi komentar AI untuk Instagram & TikTok dengan gaya bahasa Gen Z! 
> Dijalankan di GitHub Pages - tanpa server!

![Version](https://img.shields.io/badge/version-2.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-blue)

## ✨ Fitur Utama

- 🧠 **AI-Powered Comments** - Menggunakan Google Gemini AI untuk membaca gambar + caption dan generate komentar yang relevan
- 🔥 **Gaya Gen Z** - Komentar dengan bahasa gaul, kekinian, Jaksel style
- 📊 **Visual Workflow** - UI seperti n8n untuk melihat alur automasi
- 📱 **Instagram & TikTok** - Support 2 platform sekaligus
- 🎨 **Dark/Light Mode** - Tampilan modern dan responsive
- 🔒 **100% Client-Side** - Semua data tersimpan di browser, tidak ada server
- 📈 **Dashboard & History** - Lacak semua aktivitas dan statistik

## 🚀 Cara Deploy di GitHub Pages

### Step 1: Fork/Clone Repository
```bash
git clone https://github.com/USERNAME/autocomment-ai.git
cd autocomment-ai
```

### Step 2: Enable GitHub Pages
1. Buka repository di GitHub
2. Pergi ke **Settings** → **Pages**
3. Di bagian **Source**, pilih:
   - Branch: `main`
   - Folder: `/docs`
4. Klik **Save**
5. Tunggu beberapa menit, website akan live di `https://USERNAME.github.io/autocomment-ai/`

### Step 3: Dapatkan Gemini API Key (GRATIS)
1. Buka [Google AI Studio](https://aistudio.google.com/apikey)
2. Login dengan akun Google
3. Klik **"Create API Key"**
4. Copy API Key

### Step 4: Buka Website & Setup
1. Buka URL GitHub Pages kamu
2. Masukkan Gemini API Key yang sudah dicopy
3. Login akun Instagram/TikTok
4. Mulai auto comment! 🎉

## 📖 Cara Penggunaan

### Alur Kerja:
```
1. LOGIN → Masukkan akun IG/TikTok
2. PILIH TARGET → Masukkan username atau URL post
3. PILIH JUMLAH → Berapa post yang mau dikomentari (1-50)
4. PILIH GAYA → Gen Z, Friendly, Hype, Aesthetic, dll
5. KLIK OK → AI akan otomatis:
   - Scan post target
   - Baca gambar & caption dengan AI
   - Generate komentar yang relevan
   - Posting komentar secara otomatis
```

### Tips:
- 🔑 Gunakan **Session ID** untuk login yang lebih aman (daripada password)
- ⏱️ Set **delay minimal 30 detik** antar komentar untuk menghindari ban
- 🎯 Maksimal **20 komentar/hari** untuk keamanan akun
- 🤖 Sesuaikan **AI Persona** di Settings untuk komentar yang lebih personal

## 🏗️ Struktur Project

```
docs/                    ← GitHub Pages root
├── index.html          ← Main HTML
├── css/
│   ├── style.css       ← Main styles
│   ├── workflow.css    ← Workflow node styles
│   └── animations.css  ← Animations & effects
└── js/
    ├── config.js       ← App configuration
    ├── storage.js      ← LocalStorage manager
    ├── ai-engine.js    ← Gemini AI integration
    ├── social-api.js   ← Instagram & TikTok connector
    ├── workflow-engine.js ← Visual workflow engine
    └── app.js          ← Main app controller
```

## ⚠️ Disclaimer Penting

### Keterbatasan GitHub Pages (Client-Side Only):
1. **Login Instagram/TikTok** - Karena berjalan di browser, login menggunakan **Session ID** (bukan full API integration)
2. **Posting Komentar** - Dalam versi ini, posting komentar adalah **simulasi** karena Instagram/TikTok memblokir direct API calls dari browser (CORS)
3. **AI Comment Generation** - Ini **100% berfungsi nyata** menggunakan Google Gemini API

### Untuk Implementasi Full Auto-Comment yang Nyata:
Diperlukan backend server (Node.js/Python) dengan:
- `instagram-private-api` untuk Instagram
- Puppeteer/Selenium untuk browser automation
- Proxy rotation untuk menghindari rate limit

### Gunakan Secara Bertanggung Jawab:
- ❌ Jangan spam
- ❌ Jangan gunakan untuk harassment
- ✅ Gunakan interval yang wajar
- ✅ Hormati Terms of Service platform

## 🛠️ Teknologi

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **AI**: Google Gemini 2.0 Flash (Vision + Text)
- **Hosting**: GitHub Pages (Static)
- **Storage**: Browser LocalStorage
- **Design**: Custom UI inspired by n8n workflow

## 📄 License

MIT License - Gunakan secara bebas dan bertanggung jawab.

---

Made with ❤️ and 🤖 AI
