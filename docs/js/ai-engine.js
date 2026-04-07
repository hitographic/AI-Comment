/**
 * =============================================
 * 🧠 AI ENGINE v2.0 - Smart Comment Generator
 * =============================================
 * Bisa generate komentar TANPA API Key!
 * Menggunakan smart keyword detection + context-aware templates.
 *
 * Mode:
 * 1. Gemini AI (jika ada API key) — komentar paling natural
 * 2. Smart Template (tanpa API key) — analisis caption → komentar relevan
 */

var AIEngine = {
    isReady: true, // selalu ready karena ada smart fallback
    activeModel: null,
    offlineMode: true,

    // =============================================
    // SMART CONTENT DETECTION (NO API NEEDED)
    // =============================================

    CONTENT_PATTERNS: {
        makanan: {
            keywords: [
                "makan", "food", "kuliner", "resep", "recipe", "masak", "cook",
                "enak", "yummy", "delicious", "lezat", "nasi", "mie", "ayam",
                "sate", "bakso", "rendang", "sambal", "pedas", "manis", "gurih",
                "resto", "restaurant", "cafe", "kopi", "coffee", "dessert",
                "cake", "roti", "pizza", "burger", "sushi", "ramen", "seafood",
                "mukbang", "foodie", "jajanan", "snack", "cemilan", "breakfast",
                "lunch", "dinner", "sarapan", "warung", "homemade", "indomie",
                "boba", "matcha", "coklat", "ice cream", "es krim"
            ],
            templates: [
                "Wah keliatan enak bgt! Bikin laper aja nih 🤤🔥",
                "Looks so yummy! Auto ngiler parah 😋✨",
                "Food goals bgt sih ini! Drop lokasi dong 📍",
                "Duh jadi pengen makan ini juga 🤤💕",
                "Porsinya mantep! Worth it ga nih? 💰🔥",
                "Kuliner explorer sejati! Auto save 📌",
                "Ini sih wajib cobain, looks bussin fr fr 🔥😍",
                "Comfort food goals bgt sih ini 🫶✨",
                "Bikin laper tengah malem aja deh 😭🤤",
                "Rating 10/10 pasti ini mah! 💯🍽️",
                "Aesthetik bgt plating nya! Chef's kiss 🤌✨",
                "Waduh bikin kalap, pengen semua 😍🔥",
                "Bagi resepnya dong! 📝",
                "This is literally food heaven! 😇🍕",
                "Tampilannya menggoda bgt! ⭐🔥"
            ]
        },
        travel: {
            keywords: [
                "travel", "jalan", "trip", "vacation", "liburan", "holiday",
                "pantai", "beach", "gunung", "mountain", "hiking", "camping",
                "hotel", "resort", "villa", "staycation", "explore", "adventure",
                "sunset", "sunrise", "view", "pemandangan", "wanderlust",
                "healing", "bali", "lombok", "bromo", "danau", "waterfall",
                "diving", "snorkeling", "surfing", "island", "pulau", "tropical"
            ],
            templates: [
                "Tempatnya aesthetic bgt! Pengen kesana juga 📍✨",
                "Wanderlust vibes! Jadi pengen healing 🌴😍",
                "View nya gila sih, surga dunia! 🏔️🔥",
                "Bucket list updated! 📝🗺️",
                "Living the dream bgt sih! 🌅✨",
                "Healing goals! Kapan bisa kesana ya 😭💕",
                "Paradise found! Drop tips dong 🏖️",
                "Foto nya kayak wallpaper, cakep bgt! 📸🔥",
                "Nature therapy at its finest! 🌿💚",
                "Vibes nya healing bgt, auto recharge! ⚡🌴",
                "Ini dimana sih?? Cakep bgt 😍📍",
                "Travel goals! Ajak-ajak dong 🧳✨",
                "The view is breathtaking fr fr 🤩🏔️",
                "Pengen escape ke sini juga deh 🌊💙"
            ]
        },
        fashion: {
            keywords: [
                "outfit", "fashion", "ootd", "style", "baju", "dress",
                "hijab", "sepatu", "shoes", "sneakers", "tas", "bag",
                "makeup", "skincare", "beauty", "stylish", "trendy",
                "vintage", "streetwear", "branded", "shopping", "belanja",
                "lookbook", "wardrobe"
            ],
            templates: [
                "Outfit nya on point bgt! 🔥👗",
                "Drip check: 100/10! Slay abis 💧✨",
                "Fashion icon sih ini mah! 👑💅",
                "OOTD goals bgt! Mau dong inspirasinya 😍",
                "Slaying the fashion game! 💅🔥",
                "Fit check selalu pass! 🔥✨",
                "Warna nya match bgt, estetik! 🎨",
                "Style goals! Where did you get that? 🛍️",
                "Mix n match nya kece bgt! 👏✨",
                "Selalu on point deh outfit nya! 💯",
                "Fashion inspo bgt ya 😍🔥",
                "Auto screenshot buat referensi 📸💕"
            ]
        },
        selfie: {
            keywords: [
                "selfie", "mirror", "foto", "photo", "pose", "glow up",
                "glowing", "cantik", "beautiful", "pretty", "handsome",
                "ganteng", "cute", "gorgeous", "stunning", "smile"
            ],
            templates: [
                "Glowing bgt! Skincare routine apa sih? ✨😍",
                "Cantik/ganteng parah, ga ada obat! 🔥💕",
                "Main character energy bgt! 👑✨",
                "Slay queen/king! Always fire 💅🔥",
                "Self love vibes! Love to see it 🫶",
                "The confidence is radiating! ✨",
                "Photogenic bgt sih! 📸🔥",
                "Looking fresh as always! 🌟",
                "Udah kayak model sih! 💃🔥",
                "Aura nya terpancar bgt 😍👑",
                "Natural beauty! ✨🫶"
            ]
        },
        motivasi: {
            keywords: [
                "motivasi", "motivation", "semangat", "sukses", "success",
                "inspirasi", "dream", "mimpi", "goal", "hustle", "grind",
                "never give up", "belajar", "growth", "mindset", "positive",
                "grateful", "blessed", "achievement", "prestasi", "bismillah",
                "alhamdulillah", "konsisten", "focus", "progress"
            ],
            templates: [
                "Semangat terus! You got this 💪🔥",
                "Inspiring bgt! Keep going ✨💕",
                "Real talk, needed to hear this 🙏",
                "Proud of you! Terus berkarya 👑✨",
                "Dedication level: OVER 9000! 💯🔥",
                "Growth mindset! Love the progress 📈💪",
                "This hits different, so real! 🔥🫶",
                "Konsisten terus, pasti sukses! 🚀",
                "Mindset is everything! 🧠🔥",
                "Aamiin! Semoga makin berkah ✨🤲",
                "Note to self sih ini! 📝🔥"
            ]
        },
        lucu: {
            keywords: [
                "wkwk", "haha", "ngakak", "lucu", "funny", "meme",
                "jokes", "humor", "comedy", "receh", "kocak", "gokil",
                "relate", "relatable", "lol", "lmao", "bruh", "prank"
            ],
            templates: [
                "WKWKWK ini relate bgt sih 😂💀",
                "Ngakak parah! Hampir keselek 🤣🔥",
                "Bruh moment bgt ini! 💀😂",
                "LMAOOO literally me everyday 😭🤣",
                "Comedy gold! 🎤😂",
                "Living rent free in my head! 🏠😂",
                "Ini sih meme material bgt 💀🔥",
                "Receh tapi ngakak bgt 🤣✨",
                "Content creator of the year 🏆😂"
            ]
        },
        musik: {
            keywords: [
                "musik", "music", "lagu", "song", "sing", "nyanyi",
                "cover", "guitar", "gitar", "piano", "drum", "band",
                "concert", "konser", "spotify", "playlist", "vocal",
                "suara", "voice", "acoustic", "live"
            ],
            templates: [
                "Suaranya bagus bgt! 🎵😍",
                "Talent! Auto replay sih 🔁🔥",
                "Merinding dengernya! 🫠✨",
                "Drop full version dong! 🎶",
                "Playlist material bgt! 🎧🔥",
                "This is a bop! Can't stop listening 🎵💕",
                "Eargasm bgt! 🤩🎵",
                "Spotify when?? 🎧"
            ]
        },
        olahraga: {
            keywords: [
                "gym", "workout", "fitness", "olahraga", "sport", "lari",
                "run", "jogging", "exercise", "diet", "healthy", "sehat",
                "body goals", "training", "yoga", "boxing", "swimming"
            ],
            templates: [
                "Body goals! Workout routine apa? 💪🔥",
                "Dedication! Semangat gym nya 🏋️✨",
                "Keep grinding! 🔥🏃",
                "Healthy lifestyle goals! 🌿💪",
                "Beast mode activated! 💪🔥🔥",
                "No pain no gain! 🏋️✨",
                "Progress nya kelihatan bgt! 📈💪",
                "Jadi termotivasi nih! 🔥💪"
            ]
        },
        bisnis: {
            keywords: [
                "bisnis", "business", "usaha", "jualan", "promo", "diskon",
                "sale", "order", "produk", "brand", "launching", "opening",
                "entrepreneur", "startup", "umkm", "marketing", "olshop"
            ],
            templates: [
                "Keren bgt produknya! Sukses terus 🚀🔥",
                "Semoga makin laris ya 📈✨",
                "Auto checkout! 🛒💕",
                "Support local business! 💪🔥",
                "Quality nya bagus bgt! ⭐✨",
                "Recommended bgt ini! 💯",
                "Keep up the good work! 🚀",
                "Packaging nya aesthetic! 😍📦"
            ]
        },
        pet: {
            keywords: [
                "kucing", "cat", "anjing", "dog", "puppy", "kitten",
                "pet", "hewan", "animal", "peliharaan", "anabul", "fur baby"
            ],
            templates: [
                "GEMESH BGT! Pengen peluk 🥹💕",
                "Anabul nya lucu bgt! 😍🐾",
                "Fur baby goals! So cute 🤗💕",
                "Ga kuat liat yang lucu-lucu 😭💕",
                "Pet parent of the year! 🏆🐾",
                "Menggemaskan parah! 😊💕",
                "Healing bgt liat ini! 🥹✨",
                "Bikin pengen punya juga! 😭🐾"
            ]
        },
        general: {
            keywords: [],
            templates: [
                "Gila sih ini keren bgt!! 🔥🔥",
                "Aesthetic bgt, vibes nya dapet! ✨😍",
                "Slay abis! Ga ada obat 💅🔥",
                "This is so fire bruh 🔥🤩",
                "Kece parah, auto saved! 😍📌",
                "Literally the best! 💯",
                "No cap, ini bagus bgt sih 🫶✨",
                "Main character energy bgt! 👑🔥",
                "Gaskeun terus! Selalu keren 🚀✨",
                "Next level bgt ya 🤯🔥",
                "Kontennya selalu beda, love it! 💕",
                "Elite content fr fr 🏆🔥",
                "Selalu konsisten bagus deh! 👏✨",
                "Never disappoints! 🔝🔥",
                "Creative bgt, out of the box! 🎨🔥",
                "Top tier content as always! 👑💯",
                "Keep going! Selalu support 🫶💪",
                "You got this bestie! 💕✨",
                "Proud of you! Terus berkarya 👑",
                "Semangat terus! Inspiring 💫"
            ]
        }
    },

    // =============================================
    // SMART DETECTION
    // =============================================

    /**
     * Detect content category from caption text
     */
    detectCategory: function(caption) {
        if (!caption) return 'general';
        var text = caption.toLowerCase();
        var scores = {};

        var categories = Object.keys(this.CONTENT_PATTERNS);
        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            var keywords = this.CONTENT_PATTERNS[cat].keywords;
            if (!keywords || keywords.length === 0) continue;

            var score = 0;
            for (var j = 0; j < keywords.length; j++) {
                if (text.indexOf(keywords[j]) >= 0) {
                    score += 1;
                    if (keywords[j].length > 5) score += 0.5;
                }
            }
            if (score > 0) scores[cat] = score;
        }

        // Find highest score
        var bestCat = 'general';
        var bestScore = 0;
        var cats = Object.keys(scores);
        for (var k = 0; k < cats.length; k++) {
            if (scores[cats[k]] > bestScore) {
                bestScore = scores[cats[k]];
                bestCat = cats[k];
            }
        }
        return bestCat;
    },

    /**
     * Generate smart comment based on caption analysis (NO API needed!)
     */
    generateFallbackComment: function(category) {
        category = category || 'general';
        var pool = this.CONTENT_PATTERNS[category];
        if (!pool) pool = this.CONTENT_PATTERNS.general;
        var templates = pool.templates;
        return templates[Math.floor(Math.random() * templates.length)];
    },

    /**
     * Smart comment: detect category from caption → pick relevant template
     */
    generateSmartComment: function(caption) {
        var category = this.detectCategory(caption || '');
        return {
            comment: this.generateFallbackComment(category),
            category: category,
        };
    },

    // =============================================
    // API KEY / GEMINI (OPTIONAL)
    // =============================================

    checkReady: function() {
        var hasKey = Storage.hasApiKey();
        this.offlineMode = !hasKey;
        this.isReady = true; // always ready with smart fallback
        return this.isReady;
    },

    getApiUrl: function(model) {
        return CONFIG.GEMINI_API_BASE + model + ':generateContent';
    },

    testApiKey: async function(apiKey) {
        var models = CONFIG.GEMINI_MODELS;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            try {
                var response = await fetch(
                    this.getApiUrl(model) + '?key=' + apiKey,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Balas dengan OK saja.' }] }]
                        })
                    }
                );
                if (response.ok) {
                    this.activeModel = model;
                    this.offlineMode = false;
                    return { success: true, model: model };
                }
                var err = await response.json();
                var errMsg = err.error ? (err.error.message || '') : '';
                if (errMsg.indexOf('API_KEY_INVALID') >= 0 || errMsg.indexOf('API key not valid') >= 0) {
                    return { success: false, error: 'API Key tidak valid.' };
                }
                if (response.status === 404 || response.status === 429) continue;
            } catch (error) {
                continue;
            }
        }
        // All models failed but API key format looks valid
        if (CONFIG.ENABLE_OFFLINE_FALLBACK) {
            return {
                success: true,
                model: 'smart-template',
                warning: 'API key tersimpan! Model Gemini sedang tidak tersedia. Menggunakan Smart Template mode.'
            };
        }
        return { success: false, error: 'Semua model Gemini tidak tersedia.' };
    },

    callGemini: async function(apiKey, body) {
        var models;
        if (this.activeModel && this.activeModel !== 'smart-template') {
            models = [this.activeModel].concat(CONFIG.GEMINI_MODELS.filter(function(m) { return m !== AIEngine.activeModel; }));
        } else {
            models = CONFIG.GEMINI_MODELS;
        }
        var lastError = null;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            try {
                var response = await fetch(
                    this.getApiUrl(model) + '?key=' + apiKey,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    }
                );
                if (response.ok) {
                    var data = await response.json();
                    this.activeModel = model;
                    return data;
                }
                var err = await response.json();
                lastError = err.error ? err.error.message : 'Unknown error';
                continue;
            } catch (error) {
                lastError = error.message;
                continue;
            }
        }
        throw new Error(lastError || 'All Gemini models failed.');
    },

    /**
     * Generate comment - works WITH or WITHOUT API key
     */
    generateComment: async function(postContext, style, customPrompt) {
        style = style || 'genz';
        customPrompt = customPrompt || '';
        var caption = postContext.caption || '';

        // === NO API KEY → Smart Template (always works) ===
        var apiKey = Storage.getApiKey();
        if (!apiKey) {
            var result = this.generateSmartComment(caption);
            console.log('Smart Template | Category:', result.category, '| Comment:', result.comment);
            return result.comment;
        }

        // === HAS API KEY → Try Gemini first ===
        var persona = Storage.getPersona();
        var settings = Storage.getSettings();
        var stylePrompt = CONFIG.STYLE_PROMPTS[style] || CONFIG.STYLE_PROMPTS.genz;
        if (style === 'custom' && customPrompt) stylePrompt = customPrompt;

        var langMap = {
            'id': 'Tulis komentar dalam Bahasa Indonesia.',
            'en': 'Write the comment in English.',
            'mixed': 'Tulis komentar dalam campuran Bahasa Indonesia dan English (Jaksel style).'
        };
        var langPrompt = langMap[settings.commentLang] || '';
        var emojiPrompt = settings.useEmoji
            ? 'Tambahkan 1-3 emoji yang relevan.'
            : 'JANGAN gunakan emoji.';

        var systemPrompt = persona + '\n\n' + stylePrompt + '\n' + langPrompt + '\n' + emojiPrompt +
            '\n\nRULES:\n- Komentar HARUS relevan dengan konteks postingan\n- Maksimal 1-2 kalimat\n- JANGAN gunakan hashtag\n- JANGAN menyebutkan bahwa kamu AI/bot\n- Natural seperti orang asli\n- Variasikan setiap komentar\n\nBerikan HANYA komentar saja.';

        var parts = [];
        if (postContext.imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: postContext.imageMimeType || 'image/jpeg',
                    data: postContext.imageBase64
                }
            });
        }

        var textPrompt = 'Analisis postingan ' + (postContext.platform || 'Instagram') + ' berikut dan buat 1 komentar natural:\n\n';
        if (postContext.username) textPrompt += 'Akun: @' + postContext.username + '\n';
        if (caption) textPrompt += 'Caption: ' + caption + '\n';
        textPrompt += '\nBuat komentar:';
        parts.push({ text: textPrompt });

        try {
            var data = await this.callGemini(apiKey, {
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: parts }],
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 150
                }
            });

            var comment = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content &&
                data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                comment = data.candidates[0].content.parts[0].text || '';
            }
            comment = comment.trim().replace(/^["']|["']$/g, '').replace(/^(Komentar:|Comment:)\s*/i, '');

            if (!comment) throw new Error('AI menghasilkan komentar kosong');
            return comment;
        } catch (error) {
            console.error('AI Error, using Smart Template fallback:', error);
            var result = this.generateSmartComment(caption);
            return result.comment;
        }
    },

    generateMultipleComments: async function(postContext, count, style) {
        count = count || 3;
        style = style || 'genz';
        var comments = [];
        for (var i = 0; i < count; i++) {
            try {
                var comment = await this.generateComment(postContext, style);
                if (comment && comments.indexOf(comment) === -1) {
                    comments.push(comment);
                }
            } catch (error) {
                console.error('Error generating comment:', error);
            }
            if (i < count - 1) {
                await new Promise(function(r) { setTimeout(r, 500); });
            }
        }
        return comments;
    },

    analyzeImageFromUrl: async function(imageUrl) {
        try {
            var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(imageUrl);
            var response = await fetch(proxyUrl);
            var blob = await response.blob();
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() {
                    resolve({ base64: reader.result.split(',')[1], mimeType: blob.type || 'image/jpeg' });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            return null;
        }
    },

    smartComment: async function(postData, style, customPrompt) {
        style = style || 'genz';
        customPrompt = customPrompt || '';
        var context = {
            platform: postData.platform || 'instagram',
            username: postData.username || '',
            caption: postData.caption || '',
            imageUrl: postData.imageUrl || '',
            imageBase64: null,
            imageMimeType: null
        };

        if (postData.imageBase64) {
            context.imageBase64 = postData.imageBase64;
            context.imageMimeType = postData.imageMimeType || 'image/jpeg';
        } else if (postData.imageUrl && Storage.hasApiKey()) {
            var imageData = await this.analyzeImageFromUrl(postData.imageUrl);
            if (imageData) {
                context.imageBase64 = imageData.base64;
                context.imageMimeType = imageData.mimeType;
            }
        }

        return this.generateComment(context, style, customPrompt);
    },
};
