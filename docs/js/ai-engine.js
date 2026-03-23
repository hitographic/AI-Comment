/**
 * =============================================
 * AI ENGINE - Gemini AI Comment Generator
 * =============================================
 */

const AIEngine = {
    isReady: false,
    activeModel: null,

    checkReady() {
        this.isReady = Storage.hasApiKey();
        return this.isReady;
    },

    getApiUrl(model) {
        return CONFIG.GEMINI_API_BASE + model + ':generateContent';
    },

    async testApiKey(apiKey) {
        var models = CONFIG.GEMINI_MODELS;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            try {
                console.log('Testing API key with model: ' + model);
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
                    console.log('API key valid! Model: ' + model);
                    return { success: true, model: model };
                }
                var err = await response.json();
                var errMsg = err.error ? (err.error.message || '') : '';
                console.warn('Model ' + model + ' gagal: ' + errMsg);
                if (errMsg.indexOf('API_KEY_INVALID') >= 0 || errMsg.indexOf('API key not valid') >= 0) {
                    return { success: false, error: 'API Key tidak valid. Pastikan API key benar.' };
                }
                continue;
            } catch (error) {
                console.warn('Model ' + model + ' error: ' + error.message);
                continue;
            }
        }
        return {
            success: false,
            error: 'Semua model Gemini sedang rate-limited. Coba lagi dalam beberapa menit, atau buat API key baru di aistudio.google.com/apikey'
        };
    },

    async callGemini(apiKey, body) {
        var models;
        if (this.activeModel) {
            models = [this.activeModel].concat(CONFIG.GEMINI_MODELS.filter(function(m) { return m !== AIEngine.activeModel; }));
        } else {
            models = CONFIG.GEMINI_MODELS;
        }
        var lastError = null;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            try {
                console.log('Trying model: ' + model);
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
                    console.log('Success with model: ' + model);
                    return data;
                }
                var err = await response.json();
                var errMsg = err.error ? (err.error.message || 'Unknown error') : 'Unknown error';
                console.warn('Model ' + model + ': ' + errMsg);
                lastError = errMsg;
                continue;
            } catch (error) {
                console.warn('Model ' + model + ' network error: ' + error.message);
                lastError = error.message;
                continue;
            }
        }
        throw new Error(lastError || 'Semua model Gemini gagal. Coba lagi nanti.');
    },

    async generateComment(postContext, style, customPrompt) {
        style = style || 'genz';
        customPrompt = customPrompt || '';
        var apiKey = Storage.getApiKey();
        if (!apiKey) throw new Error('API Key belum diset!');

        var persona = Storage.getPersona();
        var settings = Storage.getSettings();

        var stylePrompt = CONFIG.STYLE_PROMPTS[style] || CONFIG.STYLE_PROMPTS.genz;
        if (style === 'custom' && customPrompt) {
            stylePrompt = customPrompt;
        }

        var langMap = {
            'id': 'Tulis komentar dalam Bahasa Indonesia.',
            'en': 'Write the comment in English.',
            'mixed': 'Tulis komentar dalam campuran Bahasa Indonesia dan English (Jaksel style).'
        };
        var langPrompt = langMap[settings.commentLang] || '';

        var emojiPrompt = settings.useEmoji
            ? 'Tambahkan 1-3 emoji yang relevan.'
            : 'JANGAN gunakan emoji.';

        var systemPrompt = persona + '\n\n' + stylePrompt + '\n' + langPrompt + '\n' + emojiPrompt + '\n\nRULES:\n- Komentar HARUS relevan dengan konteks postingan\n- Maksimal 1-2 kalimat\n- JANGAN menggunakan hashtag\n- JANGAN menyebutkan bahwa kamu AI/bot\n- Buat komentar yang natural seperti orang asli\n- Variasikan setiap komentar (jangan repetitif)\n\nBerikan HANYA komentar saja, tanpa penjelasan atau tanda kutip.';

        var parts = [];

        if (postContext.imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: postContext.imageMimeType || 'image/jpeg',
                    data: postContext.imageBase64
                }
            });
        }

        var textPrompt = 'Analisis postingan ' + (postContext.platform || 'Instagram') + ' berikut dan buat 1 komentar yang natural:\n\n';
        if (postContext.username) {
            textPrompt += 'Akun: @' + postContext.username + '\n';
        }
        if (postContext.caption) {
            textPrompt += 'Caption: ' + postContext.caption + '\n';
        }
        if (postContext.imageUrl && !postContext.imageBase64) {
            textPrompt += '(Postingan ini memiliki gambar/foto)\n';
        }
        textPrompt += '\nBuat komentar:';
        parts.push({ text: textPrompt });

        try {
            var data = await this.callGemini(apiKey, {
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [{ parts: parts }],
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 150
                }
            });

            var comment = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                comment = data.candidates[0].content.parts[0].text || '';
            }

            comment = comment.trim();
            comment = comment.replace(/^["']|["']$/g, '');
            comment = comment.replace(/^(Komentar:|Comment:)\s*/i, '');

            if (!comment) {
                throw new Error('AI menghasilkan komentar kosong');
            }

            return comment;
        } catch (error) {
            console.error('AI Generate Error:', error);
            throw error;
        }
    },

    async generateMultipleComments(postContext, count, style) {
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
                console.error('Error generating comment ' + (i + 1) + ':', error);
            }
            if (i < count - 1) {
                await new Promise(function(r) { setTimeout(r, 2000); });
            }
        }
        return comments;
    },

    async analyzeImageFromUrl(imageUrl) {
        try {
            var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(imageUrl);
            var response = await fetch(proxyUrl);
            var blob = await response.blob();

            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() {
                    var base64 = reader.result.split(',')[1];
                    resolve({ base64: base64, mimeType: blob.type || 'image/jpeg' });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Could not fetch image:', error);
            return null;
        }
    },

    async analyzeImageFromFile(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() {
                var base64 = reader.result.split(',')[1];
                resolve({ base64: base64, mimeType: file.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async smartComment(postData, style, customPrompt) {
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
        } else if (postData.imageUrl) {
            var imageData = await this.analyzeImageFromUrl(postData.imageUrl);
            if (imageData) {
                context.imageBase64 = imageData.base64;
                context.imageMimeType = imageData.mimeType;
            }
        }

        return this.generateComment(context, style, customPrompt);
    },

    generateFallbackComment(category) {
        category = category || 'general';
        var templates = {
            general: [
                "Keren banget sih ini! \uD83D\uDD25",
                "Wah mantap bgt, suka deh! \u2728",
                "Slay abis, no cap! \uD83D\uDCAF",
                "This is fire bruh \uD83D\uDD25\uD83E\uDD29",
                "Aesthetic banget vibes nya! \uD83D\uDE0D",
                "Gokil parah, always on point! \uD83E\uDEF6",
                "Next level content sih ini \uD83E\uDD2F",
                "Main character energy bgt! \uD83D\uDC51",
                "Literally the best! \uD83D\uDC95",
                "Keep it up bestie! \uD83D\uDE80"
            ],
            fashion: [
                "Outfit on point bgt! \uD83D\uDC57\uD83D\uDD25",
                "Drip check passed! \uD83D\uDCA7\u2728",
                "Fashion icon sih ini mah \uD83D\uDC51",
                "Slaying the game as always \uD83D\uDC85",
                "Fit check: 100/10! \uD83D\uDD25"
            ],
            food: [
                "Looks yummy bgt! \uD83E\uDD24",
                "Waduh bikin laper aja nih \uD83D\uDE2D",
                "Mau dong! Sharing is caring \uD83E\uDD7A",
                "Menu wajib cobain sih ini \uD83D\uDD25",
                "Culinary goals bgt! \u2728"
            ],
            event: [
                "Wah seru bgt pasti! \uD83C\uDF89",
                "Pengen ikutan dong! \uD83E\uDD7A",
                "Event of the year sih! \uD83D\uDD25",
                "See you there! \uD83E\uDD29",
                "Can't wait for this! \u2728"
            ]
        };

        var pool = templates[category] || templates.general;
        return pool[Math.floor(Math.random() * pool.length)];
    }
};
