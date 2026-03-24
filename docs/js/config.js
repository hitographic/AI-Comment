/**
 * =============================================
 * ⚙️ CONFIG - App Configuration
 * =============================================
 */

const CONFIG = {
    APP_NAME: 'AutoCommentAI',
    VERSION: '2.0.0',
    
    // Storage keys
    STORAGE_KEYS: {
        API_KEY: 'acai_gemini_api_key',
        IG_SESSION: 'acai_ig_session',
        TT_SESSION: 'acai_tt_session',
        SETTINGS: 'acai_settings',
        HISTORY: 'acai_history',
        STATS: 'acai_stats',
        THEME: 'acai_theme',
        PERSONA: 'acai_persona',
    },

    // Gemini API - menggunakan model gratis terbaru (2025)
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
    GEMINI_MODELS: [
        'gemini-2.0-flash',          // Gratis, stabil, cepat (recommended)
        'gemini-2.5-flash-lite-preview-06-17',  // Preview model, sangat cepat
        'gemini-2.5-flash-preview-05-20',       // Preview model, advanced
    ],

    // Default settings
    DEFAULT_SETTINGS: {
        commentDelay: 30,
        maxDailyComments: 20,
        commentLang: 'mixed',
        useEmoji: true,
        randomDelay: true,
    },

    // Default AI Persona
    DEFAULT_PERSONA: `Kamu adalah user Instagram/TikTok Gen Z Indonesia yang gaul dan kekinian. 
Komentari postingan dengan bahasa yang natural, friendly, dan relatable.
Gunakan bahasa campuran Indo-English (Jaksel style).
Tambahkan emoji yang relevan tapi jangan berlebihan (1-3 emoji).
Jangan terlihat seperti bot. 
Buat komentar singkat (1-2 kalimat), padat, dan engaging.
Sesuaikan komentar dengan konteks postingan (gambar dan caption).
JANGAN gunakan hashtag di komentar.
Variasikan gaya komentar setiap kali.`,

    // Comment style prompts
    STYLE_PROMPTS: {
        genz: 'Gunakan bahasa Gen Z Indonesia yang super gaul. Campur Bahasa Indonesia dan English. Pakai slang seperti "slay", "no cap", "fr fr", "bestie", "literally", "vibe", "aesthetic". Tone: santai, asik, relatable.',
        friendly: 'Gunakan bahasa yang sopan, ramah, dan wholesome. Beri pujian yang tulus dan genuine. Tone: hangat, supportive, positif.',
        hype: 'Gunakan bahasa yang sangat excited dan antusias! Banyak tanda seru! Energi tinggi! Tone: hype, semangat, excited banget.',
        aesthetic: 'Gunakan bahasa yang puitis dan estetik. Metafora ringan. Tone: dreamy, soft, aesthetic vibes.',
        supportive: 'Gunakan bahasa yang mendukung dan memotivasi. Beri semangat dan apresiasi. Tone: encouraging, warm, genuine.',
    },

    // Rate limits
    MIN_DELAY_SECONDS: 10,
    MAX_COMMENTS_PER_DAY: 100,
};
