/**
 * =============================================
 * 📱 SOCIAL API v2.0 - Instagram & TikTok
 * =============================================
 * Simulasi fetch post dari target user.
 * Setiap post punya caption berbeda yang akan
 * dianalisis oleh Smart Comment Generator.
 *
 * ⚠️ Untuk REAL auto-comment, butuh backend server.
 *    Versi ini menggunakan simulasi.
 */

var SocialAPI = {
    instagram: {
        isLoggedIn: false,
        username: '',
        sessionId: '',
    },
    tiktok: {
        isLoggedIn: false,
        username: '',
        sessionId: '',
    },

    // =============================================
    // SAMPLE CAPTIONS (simulasi konten post)
    // =============================================

    SAMPLE_CAPTIONS: {
        general: [
            "Another beautiful day ✨ grateful for everything",
            "Just vibing 🌟 #goodvibes",
            "Life update! Been busy lately tapi alhamdulillah semua lancar 🙏",
            "Sunday mood 🌤️ quality time with the fam",
            "New post, new energy! Let's go 🚀",
            "Throwback to that amazing moment 💕",
            "Work hard play hard! Balance is key 💪",
            "Can't believe how far we've come 🥹✨",
            "Simple things make me happy 😊",
            "Manifesting good things 🙏✨",
        ],
        food: [
            "Nasi goreng spesial buatan mama, the best! 🍳",
            "Cobain cafe baru di daerah Senopati, menu nya unik bgt 🍰☕",
            "Mukbang time! Seafood platter buat 4 dimakan sendiri 🦐🤤",
            "Resep homemade cookies, gampang bgt bikinnya! 🍪",
            "Street food tour Jakarta, jajanan murah tapi enak 🔥",
            "Dessert goals! Matcha cake dari bakery favorit 🍵🍰",
            "Sarapan sehat: smoothie bowl + granola ☀️🥣",
            "Indomie goreng + telor = comfort food terbaik 🍜❤️",
            "Date night dinner, Italian food is always a good idea 🍝",
            "Boba addiction is real! 3 cups in one day 🧋",
        ],
        travel: [
            "Sunset di Bali hits different 🌅 healing bgt",
            "Hiking Gunung Bromo, cape tapi view nya worth it 🏔️",
            "Beach day! Pantai Lombok bersih banget 🏖️",
            "Staycation di villa ini, worth every penny! 🏠✨",
            "Raja Ampat is literally paradise on earth 🤿🐠",
            "Road trip ke Bandung, singgah di tempat-tempat hidden gem 🚗",
            "Sunrise at the temple, magical moment ☀️🙏",
            "Exploring Jogja, kota yang ga pernah bosen dikunjungi 🏛️",
            "Weekend escape ke Puncak, dingin tapi seru 🌿⛰️",
            "Island hopping di Labuan Bajo, must visit! 🚤🏝️",
        ],
        fashion: [
            "OOTD hari ini, mix and match thrift finds 👗✨",
            "New sneakers just dropped! Fresh kicks 👟🔥",
            "Hijab styling tutorial, simple tapi elegant 🧕✨",
            "Wardrobe declutter, donate yang ga dipake lagi ♻️",
            "Outfit inspiration buat kondangan, elegant vibes 👔",
            "Streetwear look, oversized everything 🧥",
            "Accessories game strong! Layering necklaces 📿✨",
            "Shopping haul dari Zara, everything under 500k 🛍️",
            "Vintage finds dari Pasar Senen, hidden treasures! 🎩",
            "Skincare routine yang bikin glowing, no filter! 🧴✨",
        ],
        motivasi: [
            "Alhamdulillah bisnis udah jalan 2 tahun, grateful bgt 🙏",
            "Never give up, setiap struggle pasti ada hikmahnya 💪",
            "From zero to here, konsisten adalah kunci 🔑✨",
            "Bismillah, semoga tahun ini makin berkah 🤲",
            "Hari ini aku belajar bahwa gagal itu bagian dari proses 📚",
            "Goal setting for 2026, dream big work hard! 🎯",
            "Mindset shift: progress, not perfection 🧠✨",
            "Self improvement journey, 1% better every day 📈",
            "Blessed to have supportive people around me 💕",
            "Discipline is the bridge between goals and achievement 🌉",
        ],
        lucu: [
            "POV: deadline besok tapi masih scrolling IG 💀😂",
            "Me vs my alarm setiap pagi, alarm always loses 😭🤣",
            "Gue banget sih yang overtime tapi tetep miskin WKWK 😂",
            "Tag temen yang suka ngaret, kita tau itu siapa 👀💀",
            "Ekspektasi vs realita liburan, relate bgt ga sih? 😂",
            "Monday motivation? More like Monday depression 😭😂",
            "Diet mulai senin starter pack 📦🤣",
            "Ketika gajian tapi langsung habis buat bayar tagihan 💸😂",
            "Aku: mau tidur awal. Also aku jam 3 pagi: *scrolling* 📱💀",
            "Toxic trait: beli boba tiap hari tapi ngeluh ga punya uang 🧋😂",
        ],
        musik: [
            "Cover lagu terbaru, hope you guys enjoy! 🎵🎤",
            "New song coming soon! Sneak peek 🎶✨",
            "Acoustic session di kamar, late night vibes 🎸🌙",
            "Playlist rekomendasi buat kerja, fokus mode on 🎧",
            "Duet bareng temen, chemistry nya dapet bgt! 🎤🎤",
            "Practice makes perfect, drum session 🥁🔥",
            "Original song! Lirik inspired from real story 📝🎵",
            "Concert recap, the crowd was amazing! 🎪🔥",
            "Piano cover, salah satu lagu favorit 🎹💕",
            "Music production process, from scratch to final mix 🎛️",
        ],
        olahraga: [
            "Leg day! No pain no gain 🦵💪",
            "Morning run 5km done, consistency is key 🏃‍♂️",
            "Gym progress: month 1 vs month 6, the grind pays off 📈",
            "Yoga session di rooftop, peaceful bgt 🧘‍♀️✨",
            "Basketball game with the boys, we won! 🏀🏆",
            "Swimming is the best stress reliever 🏊‍♂️💙",
            "Home workout routine, no gym needed! 🏋️‍♀️",
            "Marathon training day 3, building endurance 🏃‍♀️🔥",
            "Body transformation journey, proud of the progress 💪📸",
            "Cycling weekend, 30km route completed! 🚴‍♂️✨",
        ],
        pet: [
            "Kucing baru adopt dari shelter, nama nya Milo 🐱💕",
            "Anjing gue tidur pose aneh lagi WKWK 🐶😂",
            "Anabul gue ngambek karena telat makan 😭🐱",
            "Grooming day! Si Bella jadi cantik bgt 🐩✨",
            "Hamster baru, mungil bgt bikin gemes 🐹💕",
            "Cat cafe date, surga buat cat lovers! 🐈☕",
            "Peliharaan gue yang paling manja, fur baby goals 🐕💕",
            "Ikan koi koleksi baru, warna nya keren bgt 🐟✨",
            "Kelinci gue main di taman, happy bgt liatnya 🐰🌿",
            "Before vs after adopsi, glow up banget! 🐱✨",
        ],
        bisnis: [
            "Grand opening toko baru kita! Promo 50% minggu ini 🎉🛍️",
            "Alhamdulillah sudah 1000 orderan, thank you semua! 📦🙏",
            "Launching produk baru, handmade with love 💕",
            "Tips UMKM: cara handle customer yang rewel 📋",
            "Packaging upgrade, lebih aesthetic dan eco-friendly 📦🌿",
            "Behind the scenes produksi, all handcrafted! 🎨",
            "Flash sale hari ini! Limited stock 🔥⏰",
            "Testimoni dari customer setia, bikin semangat! ⭐",
            "Branding tips: pentingnya visual identity buat bisnis 🎨📈",
            "Kolaborasi bareng brand lokal, exciting! 🤝✨",
        ],
    },

    // =============================================
    // INSTAGRAM
    // =============================================

    loginInstagram: async function(username, password, sessionId) {
        var savedSession = Storage.getIGSession();
        if (sessionId) {
            this.instagram = {
                isLoggedIn: true,
                username: username || savedSession?.username || 'user',
                sessionId: sessionId,
            };
            Storage.setIGSession(this.instagram);
            return { success: true, username: this.instagram.username };
        }
        if (username && password) {
            this.instagram = {
                isLoggedIn: true,
                username: username,
                sessionId: 'simulated_' + Date.now(),
            };
            Storage.setIGSession(this.instagram);
            return { success: true, username: username };
        }
        if (savedSession && savedSession.isLoggedIn) {
            this.instagram = savedSession;
            return { success: true, username: savedSession.username };
        }
        return { success: false, error: 'Masukkan username/password atau session ID' };
    },

    logoutInstagram: function() {
        this.instagram = { isLoggedIn: false, username: '', sessionId: '' };
        Storage.remove(CONFIG.STORAGE_KEYS.IG_SESSION);
    },

    /**
     * Get Instagram posts from a user — setiap post punya caption
     * yang UNIK agar komentar bisa menyesuaikan konten.
     */
    getInstagramPosts: async function(target, count) {
        count = count || 5;
        var cleanTarget = target.replace('@', '').replace(/https?:\/\/.*instagram\.com\//, '').replace(/\/$/, '');
        var posts = [];

        // Pick random caption categories untuk simulasi feed yang variatif
        var categories = Object.keys(this.SAMPLE_CAPTIONS);

        for (var i = 0; i < count; i++) {
            var category = categories[Math.floor(Math.random() * categories.length)];
            var captions = this.SAMPLE_CAPTIONS[category];
            var caption = captions[Math.floor(Math.random() * captions.length)];

            posts.push({
                id: 'ig_' + Date.now() + '_' + i,
                platform: 'instagram',
                username: cleanTarget,
                caption: caption,
                imageUrl: '',
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                likeCount: Math.floor(Math.random() * 10000),
                commentCount: Math.floor(Math.random() * 500),
                detectedCategory: AIEngine.detectCategory(caption),
            });
        }

        return posts;
    },

    postInstagramComment: async function(postId, comment) {
        if (!this.instagram.isLoggedIn) {
            throw new Error('Belum login Instagram!');
        }
        // Simulate API delay
        await new Promise(function(r) { setTimeout(r, 1000 + Math.random() * 2000); });
        // 90% success rate
        if (Math.random() > 0.1) {
            return { success: true, commentId: 'comment_' + Date.now(), comment: comment };
        } else {
            throw new Error('Gagal posting komentar. Coba lagi nanti.');
        }
    },

    // =============================================
    // TIKTOK
    // =============================================

    loginTiktok: async function(username, password, sessionId) {
        var savedSession = Storage.getTTSession();
        if (sessionId) {
            this.tiktok = {
                isLoggedIn: true,
                username: username || savedSession?.username || 'user',
                sessionId: sessionId,
            };
            Storage.setTTSession(this.tiktok);
            return { success: true, username: this.tiktok.username };
        }
        if (username && password) {
            this.tiktok = {
                isLoggedIn: true,
                username: username,
                sessionId: 'simulated_' + Date.now(),
            };
            Storage.setTTSession(this.tiktok);
            return { success: true, username: username };
        }
        if (savedSession && savedSession.isLoggedIn) {
            this.tiktok = savedSession;
            return { success: true, username: savedSession.username };
        }
        return { success: false, error: 'Masukkan username/password atau session ID' };
    },

    logoutTiktok: function() {
        this.tiktok = { isLoggedIn: false, username: '', sessionId: '' };
        Storage.remove(CONFIG.STORAGE_KEYS.TT_SESSION);
    },

    getTiktokPosts: async function(target, count) {
        count = count || 5;
        var cleanTarget = target.replace('@', '');
        var posts = [];
        var categories = Object.keys(this.SAMPLE_CAPTIONS);

        for (var i = 0; i < count; i++) {
            var category = categories[Math.floor(Math.random() * categories.length)];
            var captions = this.SAMPLE_CAPTIONS[category];
            var caption = captions[Math.floor(Math.random() * captions.length)];

            posts.push({
                id: 'tt_' + Date.now() + '_' + i,
                platform: 'tiktok',
                username: cleanTarget,
                caption: caption,
                imageUrl: '',
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                likeCount: Math.floor(Math.random() * 50000),
                commentCount: Math.floor(Math.random() * 2000),
                detectedCategory: AIEngine.detectCategory(caption),
            });
        }
        return posts;
    },

    postTiktokComment: async function(postId, comment) {
        if (!this.tiktok.isLoggedIn) {
            throw new Error('Belum login TikTok!');
        }
        await new Promise(function(r) { setTimeout(r, 1000 + Math.random() * 2000); });
        if (Math.random() > 0.1) {
            return { success: true, commentId: 'comment_' + Date.now(), comment: comment };
        } else {
            throw new Error('Gagal posting komentar TikTok.');
        }
    },

    // =============================================
    // HELPERS
    // =============================================

    parseTarget: function(input) {
        input = input.trim();
        if (input.indexOf('instagram.com') >= 0) {
            var match = input.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/);
            if (match) return { type: 'post', platform: 'instagram', id: match[1] };
            var userMatch = input.match(/instagram\.com\/([^/?]+)/);
            if (userMatch) return { type: 'user', platform: 'instagram', username: userMatch[1] };
        }
        if (input.indexOf('tiktok.com') >= 0) {
            var match2 = input.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/);
            if (match2) return { type: 'post', platform: 'tiktok', username: match2[1], id: match2[2] };
            var userMatch2 = input.match(/tiktok\.com\/@([^/?]+)/);
            if (userMatch2) return { type: 'user', platform: 'tiktok', username: userMatch2[1] };
        }
        if (input.startsWith('@')) {
            return { type: 'user', platform: null, username: input.replace('@', '') };
        }
        return { type: 'user', platform: null, username: input };
    },

    restoreSessions: function() {
        var igSession = Storage.getIGSession();
        if (igSession && igSession.isLoggedIn) this.instagram = igSession;
        var ttSession = Storage.getTTSession();
        if (ttSession && ttSession.isLoggedIn) this.tiktok = ttSession;
    },
};
