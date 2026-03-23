/**
 * =============================================
 * 🧠 AI ENGINE - Gemini AI Comment Generator
 * =============================================
 * Menggunakan Google Gemini API untuk:
 * 1. Membaca/analisis gambar postingan
 * 2. Memahami konteks caption
 * 3. Generate komentar Gen Z yang relevan
 */

const AIEngine = {
    isReady: false,

    /**
     * Check if AI is ready (API key exists)
     */
    checkReady() {
        this.isReady = Storage.hasApiKey();
        return this.isReady;
    },

    /**
     * Test API key validity
     */
    async testApiKey(apiKey) {
        try {
            const response = await fetch(
                `${CONFIG.GEMINI_API_URL}?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: 'Balas dengan "OK" saja.' }]
                        }]
                    })
                }
            );
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'API key tidak valid');
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Generate comment berdasarkan konteks postingan
     * @param {Object} postContext - { caption, imageUrl, username, platform }
     * @param {string} style - Gaya komentar
     * @param {string} customPrompt - Custom prompt (opsional)
     */
    async generateComment(postContext, style = 'genz', customPrompt = '') {
        const apiKey = Storage.getApiKey();
        if (!apiKey) throw new Error('API Key belum diset!');

        const persona = Storage.getPersona();
        const settings = Storage.getSettings();
        
        // Build prompt
        let stylePrompt = CONFIG.STYLE_PROMPTS[style] || CONFIG.STYLE_PROMPTS.genz;
        if (style === 'custom' && customPrompt) {
            stylePrompt = customPrompt;
        }

        const langPrompt = {
            'id': 'Tulis komentar dalam Bahasa Indonesia.',
            'en': 'Write the comment in English.',
            'mixed': 'Tulis komentar dalam campuran Bahasa Indonesia dan English (Jaksel style).',
        }[settings.commentLang] || '';

        const emojiPrompt = settings.useEmoji 
            ? 'Tambahkan 1-3 emoji yang relevan.' 
            : 'JANGAN gunakan emoji.';

        const systemPrompt = `${persona}

${stylePrompt}
${langPrompt}
${emojiPrompt}

RULES:
- Komentar HARUS relevan dengan konteks postingan
- Maksimal 1-2 kalimat
- JANGAN menggunakan hashtag
- JANGAN menyebutkan bahwa kamu AI/bot
- Buat komentar yang natural seperti orang asli
- Variasikan setiap komentar (jangan repetitif)

Berikan HANYA komentar saja, tanpa penjelasan atau tanda kutip.`;

        // Build content parts
        const parts = [];
        
        // Add image if available
        if (postContext.imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: postContext.imageMimeType || 'image/jpeg',
                    data: postContext.imageBase64
                }
            });
        }

        // Add text context
        let textPrompt = `Analisis postingan ${postContext.platform || 'Instagram'} berikut dan buat 1 komentar yang natural:\n\n`;
        
        if (postContext.username) {
            textPrompt += `Akun: @${postContext.username}\n`;
        }
        if (postContext.caption) {
            textPrompt += `Caption: ${postContext.caption}\n`;
        }
        if (postContext.imageUrl && !postContext.imageBase64) {
            textPrompt += `(Postingan ini memiliki gambar/foto)\n`;
        }
        
        textPrompt += `\nBuat komentar:`;
        parts.push({ text: textPrompt });

        // Call Gemini API
        try {
            const response = await fetch(
                `${CONFIG.GEMINI_API_URL}?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: [{
                            parts: parts
                        }],
                        generationConfig: {
                            temperature: 0.9,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 150,
                        }
                    })
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Gagal generate komentar');
            }

            const data = await response.json();
            let comment = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Clean up
            comment = comment.trim();
            comment = comment.replace(/^["']|["']$/g, ''); // Remove quotes
            comment = comment.replace(/^(Komentar:|Comment:)\s*/i, ''); // Remove prefix
            
            return comment;
        } catch (error) {
            console.error('AI Generate Error:', error);
            throw error;
        }
    },

    /**
     * Generate multiple unique comments
     */
    async generateMultipleComments(postContext, count = 3, style = 'genz') {
        const comments = [];
        for (let i = 0; i < count; i++) {
            try {
                const comment = await this.generateComment(postContext, style);
                if (comment && !comments.includes(comment)) {
                    comments.push(comment);
                }
            } catch (error) {
                console.error(`Error generating comment ${i + 1}:`, error);
            }
            // Small delay between requests
            if (i < count - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return comments;
    },

    /**
     * Analyze image from URL (fetch and convert to base64)
     */
    async analyzeImageFromUrl(imageUrl) {
        try {
            // Use a CORS proxy for external images
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve({
                        base64: base64,
                        mimeType: blob.type || 'image/jpeg'
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Could not fetch image:', error);
            return null;
        }
    },

    /**
     * Analyze image from file input
     */
    async analyzeImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve({
                    base64: base64,
                    mimeType: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Generate comment with full context analysis
     * This is the main function that reads image + caption
     */
    async smartComment(postData, style = 'genz', customPrompt = '') {
        const context = {
            platform: postData.platform || 'instagram',
            username: postData.username || '',
            caption: postData.caption || '',
            imageUrl: postData.imageUrl || '',
            imageBase64: null,
            imageMimeType: null,
        };

        // Try to get image data
        if (postData.imageBase64) {
            context.imageBase64 = postData.imageBase64;
            context.imageMimeType = postData.imageMimeType || 'image/jpeg';
        } else if (postData.imageUrl) {
            const imageData = await this.analyzeImageFromUrl(postData.imageUrl);
            if (imageData) {
                context.imageBase64 = imageData.base64;
                context.imageMimeType = imageData.mimeType;
            }
        }

        return this.generateComment(context, style, customPrompt);
    },

    /**
     * Fallback: Generate comment without AI (template-based)
     */
    generateFallbackComment(category = 'general') {
        const templates = {
            general: [
                "Keren banget sih ini! 🔥",
                "Wah mantap bgt, suka deh! ✨",
                "Slay abis, no cap! 💯",
                "This is fire bruh 🔥🤩",
                "Aesthetic banget vibes nya! 😍",
                "Gokil parah, always on point! 🫶",
                "Next level content sih ini 🤯",
                "Main character energy bgt! 👑",
                "Literally the best! 💕",
                "Keep it up bestie! 🚀",
            ],
            fashion: [
                "Outfit on point bgt! 👗🔥",
                "Drip check passed! 💧✨",
                "Fashion icon sih ini mah 👑",
                "Slaying the game as always 💅",
                "Fit check: 100/10! 🔥",
            ],
            food: [
                "Looks yummy bgt! 🤤",
                "Waduh bikin laper aja nih 😭",
                "Mau dong! Sharing is caring 🥺",
                "Menu wajib cobain sih ini 🔥",
                "Culinary goals bgt! ✨",
            ],
            event: [
                "Wah seru bgt pasti! 🎉",
                "Pengen ikutan dong! 🥺",
                "Event of the year sih! 🔥",
                "See you there! 🤩",
                "Can't wait for this! ✨",
            ],
        };

        const pool = templates[category] || templates.general;
        return pool[Math.floor(Math.random() * pool.length)];
    }
};
