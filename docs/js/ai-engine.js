/**/**

 * ============================================= * =============================================

 * 🧠 AI ENGINE - Gemini AI Comment Generator * 🧠 AI ENGINE - Gemini AI Comment Generator

 * ============================================= * =============================================

 * Menggunakan Google Gemini API untuk: * Menggunakan Google Gemini API untuk:

 * 1. Membaca/analisis gambar postingan * 1. Membaca/analisis gambar postingan

 * 2. Memahami konteks caption * 2. Memahami konteks caption

 * 3. Generate komentar Gen Z yang relevan * 3. Generate komentar Gen Z yang relevan

 *  */

 * Menggunakan model GRATIS dengan auto-fallback:

 * gemini-1.5-flash → gemini-1.5-flash-8b → gemini-2.0-flashconst AIEngine = {

 */    isReady: false,



const AIEngine = {    /**

    isReady: false,     * Check if AI is ready (API key exists)

    activeModel: null,     */

    checkReady() {

    /**        this.isReady = Storage.hasApiKey();

     * Check if AI is ready (API key exists)        return this.isReady;

     */    },

    checkReady() {

        this.isReady = Storage.hasApiKey();    /**

        return this.isReady;     * Test API key validity

    },     */

    async testApiKey(apiKey) {

    /**        try {

     * Build full API URL for a specific model            const response = await fetch(

     */                `${CONFIG.GEMINI_API_URL}?key=${apiKey}`,

    getApiUrl(model) {                {

        return `${CONFIG.GEMINI_API_BASE}${model}:generateContent`;                    method: 'POST',

    },                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({

    /**                        contents: [{

     * Test API key validity - coba semua model sampai ada yang berhasil                            parts: [{ text: 'Balas dengan "OK" saja.' }]

     */                        }]

    async testApiKey(apiKey) {                    })

        const models = CONFIG.GEMINI_MODELS;                }

                    );

        for (const model of models) {            

            try {            if (!response.ok) {

                console.log(`🔑 Testing API key with model: ${model}...`);                const err = await response.json();

                const response = await fetch(                throw new Error(err.error?.message || 'API key tidak valid');

                    `${this.getApiUrl(model)}?key=${apiKey}`,            }

                    {            

                        method: 'POST',            return { success: true };

                        headers: { 'Content-Type': 'application/json' },        } catch (error) {

                        body: JSON.stringify({            return { success: false, error: error.message };

                            contents: [{        }

                                parts: [{ text: 'Balas dengan "OK" saja.' }]    },

                            }]

                        })    /**

                    }     * Generate comment berdasarkan konteks postingan

                );     * @param {Object} postContext - { caption, imageUrl, username, platform }

                     * @param {string} style - Gaya komentar

                if (response.ok) {     * @param {string} customPrompt - Custom prompt (opsional)

                    this.activeModel = model;     */

                    console.log(`✅ API key valid! Active model: ${model}`);    async generateComment(postContext, style = 'genz', customPrompt = '') {

                    return { success: true, model: model };        const apiKey = Storage.getApiKey();

                }        if (!apiKey) throw new Error('API Key belum diset!');

                

                const err = await response.json();        const persona = Storage.getPersona();

                const errMsg = err.error?.message || '';        const settings = Storage.getSettings();

                console.warn(`⚠️ Model ${model} gagal: ${errMsg}`);        

                        // Build prompt

                // Jika error bukan quota/rate limit, API key-nya yang salah        let stylePrompt = CONFIG.STYLE_PROMPTS[style] || CONFIG.STYLE_PROMPTS.genz;

                if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {        if (style === 'custom' && customPrompt) {

                    return { success: false, error: 'API Key tidak valid. Pastikan API key benar.' };            stylePrompt = customPrompt;

                }        }

                

                // Kalau quota exceeded, coba model berikutnya        const langPrompt = {

                continue;            'id': 'Tulis komentar dalam Bahasa Indonesia.',

                            'en': 'Write the comment in English.',

            } catch (error) {            'mixed': 'Tulis komentar dalam campuran Bahasa Indonesia dan English (Jaksel style).',

                console.warn(`⚠️ Model ${model} error: ${error.message}`);        }[settings.commentLang] || '';

                continue;

            }        const emojiPrompt = settings.useEmoji 

        }            ? 'Tambahkan 1-3 emoji yang relevan.' 

                    : 'JANGAN gunakan emoji.';

        return { 

            success: false,         const systemPrompt = `${persona}

            error: 'Semua model Gemini sedang rate-limited. Coba lagi dalam beberapa menit, atau buat API key baru di aistudio.google.com/apikey' 

        };${stylePrompt}

    },${langPrompt}

${emojiPrompt}

    /**

     * Call Gemini API with auto-fallback across modelsRULES:

     */- Komentar HARUS relevan dengan konteks postingan

    async callGemini(apiKey, body) {- Maksimal 1-2 kalimat

        const models = this.activeModel - JANGAN menggunakan hashtag

            ? [this.activeModel, ...CONFIG.GEMINI_MODELS.filter(m => m !== this.activeModel)]- JANGAN menyebutkan bahwa kamu AI/bot

            : CONFIG.GEMINI_MODELS;- Buat komentar yang natural seperti orang asli

- Variasikan setiap komentar (jangan repetitif)

        let lastError = null;

Berikan HANYA komentar saja, tanpa penjelasan atau tanda kutip.`;

        for (const model of models) {

            try {        // Build content parts

                console.log(`🤖 Trying model: ${model}...`);        const parts = [];

                const response = await fetch(        

                    `${this.getApiUrl(model)}?key=${apiKey}`,        // Add image if available

                    {        if (postContext.imageBase64) {

                        method: 'POST',            parts.push({

                        headers: { 'Content-Type': 'application/json' },                inline_data: {

                        body: JSON.stringify(body)                    mime_type: postContext.imageMimeType || 'image/jpeg',

                    }                    data: postContext.imageBase64

                );                }

            });

                if (response.ok) {        }

                    const data = await response.json();

                    this.activeModel = model;        // Add text context

                    console.log(`✅ Success with model: ${model}`);        let textPrompt = `Analisis postingan ${postContext.platform || 'Instagram'} berikut dan buat 1 komentar yang natural:\n\n`;

                    return data;        

                }        if (postContext.username) {

            textPrompt += `Akun: @${postContext.username}\n`;

                const err = await response.json();        }

                const errMsg = err.error?.message || 'Unknown error';        if (postContext.caption) {

                console.warn(`⚠️ Model ${model}: ${errMsg}`);            textPrompt += `Caption: ${postContext.caption}\n`;

                lastError = errMsg;        }

        if (postContext.imageUrl && !postContext.imageBase64) {

                // If quota/rate limit, try next model            textPrompt += `(Postingan ini memiliki gambar/foto)\n`;

                if (errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429') || errMsg.includes('Resource') || errMsg.includes('exceeded')) {        }

                    continue;        

                }        textPrompt += `\nBuat komentar:`;

        parts.push({ text: textPrompt });

                // Other errors - still try next model

                continue;        // Call Gemini API

        try {

            } catch (error) {            const response = await fetch(

                console.warn(`⚠️ Model ${model} network error: ${error.message}`);                `${CONFIG.GEMINI_API_URL}?key=${apiKey}`,

                lastError = error.message;                {

                continue;                    method: 'POST',

            }                    headers: { 'Content-Type': 'application/json' },

        }                    body: JSON.stringify({

                        system_instruction: {

        throw new Error(lastError || 'Semua model Gemini gagal. Coba lagi nanti.');                            parts: [{ text: systemPrompt }]

    },                        },

                        contents: [{

    /**                            parts: parts

     * Generate comment berdasarkan konteks postingan                        }],

     */                        generationConfig: {

    async generateComment(postContext, style = 'genz', customPrompt = '') {                            temperature: 0.9,

        const apiKey = Storage.getApiKey();                            topK: 40,

        if (!apiKey) throw new Error('API Key belum diset!');                            topP: 0.95,

                            maxOutputTokens: 150,

        const persona = Storage.getPersona();                        }

        const settings = Storage.getSettings();                    })

                        }

        let stylePrompt = CONFIG.STYLE_PROMPTS[style] || CONFIG.STYLE_PROMPTS.genz;            );

        if (style === 'custom' && customPrompt) {

            stylePrompt = customPrompt;            if (!response.ok) {

        }                const err = await response.json();

                throw new Error(err.error?.message || 'Gagal generate komentar');

        const langPrompt = {            }

            'id': 'Tulis komentar dalam Bahasa Indonesia.',

            'en': 'Write the comment in English.',            const data = await response.json();

            'mixed': 'Tulis komentar dalam campuran Bahasa Indonesia dan English (Jaksel style).',            let comment = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        }[settings.commentLang] || '';            

            // Clean up

        const emojiPrompt = settings.useEmoji             comment = comment.trim();

            ? 'Tambahkan 1-3 emoji yang relevan.'             comment = comment.replace(/^["']|["']$/g, ''); // Remove quotes

            : 'JANGAN gunakan emoji.';            comment = comment.replace(/^(Komentar:|Comment:)\s*/i, ''); // Remove prefix

            

        const systemPrompt = `${persona}            return comment;

        } catch (error) {

${stylePrompt}            console.error('AI Generate Error:', error);

${langPrompt}            throw error;

${emojiPrompt}        }

    },

RULES:

- Komentar HARUS relevan dengan konteks postingan    /**

- Maksimal 1-2 kalimat     * Generate multiple unique comments

- JANGAN menggunakan hashtag     */

- JANGAN menyebutkan bahwa kamu AI/bot    async generateMultipleComments(postContext, count = 3, style = 'genz') {

- Buat komentar yang natural seperti orang asli        const comments = [];

- Variasikan setiap komentar (jangan repetitif)        for (let i = 0; i < count; i++) {

            try {

Berikan HANYA komentar saja, tanpa penjelasan atau tanda kutip.`;                const comment = await this.generateComment(postContext, style);

                if (comment && !comments.includes(comment)) {

        // Build content parts                    comments.push(comment);

        const parts = [];                }

                    } catch (error) {

        if (postContext.imageBase64) {                console.error(`Error generating comment ${i + 1}:`, error);

            parts.push({            }

                inline_data: {            // Small delay between requests

                    mime_type: postContext.imageMimeType || 'image/jpeg',            if (i < count - 1) {

                    data: postContext.imageBase64                await new Promise(r => setTimeout(r, 1000));

                }            }

            });        }

        }        return comments;

    },

        let textPrompt = `Analisis postingan ${postContext.platform || 'Instagram'} berikut dan buat 1 komentar yang natural:\n\n`;

            /**

        if (postContext.username) {     * Analyze image from URL (fetch and convert to base64)

            textPrompt += `Akun: @${postContext.username}\n`;     */

        }    async analyzeImageFromUrl(imageUrl) {

        if (postContext.caption) {        try {

            textPrompt += `Caption: ${postContext.caption}\n`;            // Use a CORS proxy for external images

        }            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;

        if (postContext.imageUrl && !postContext.imageBase64) {            const response = await fetch(proxyUrl);

            textPrompt += `(Postingan ini memiliki gambar/foto)\n`;            const blob = await response.blob();

        }            

                    return new Promise((resolve, reject) => {

        textPrompt += `\nBuat komentar:`;                const reader = new FileReader();

        parts.push({ text: textPrompt });                reader.onload = () => {

                    const base64 = reader.result.split(',')[1];

        try {                    resolve({

            const data = await this.callGemini(apiKey, {                        base64: base64,

                system_instruction: {                        mimeType: blob.type || 'image/jpeg'

                    parts: [{ text: systemPrompt }]                    });

                },                };

                contents: [{                reader.onerror = reject;

                    parts: parts                reader.readAsDataURL(blob);

                }],            });

                generationConfig: {        } catch (error) {

                    temperature: 0.9,            console.warn('Could not fetch image:', error);

                    topK: 40,            return null;

                    topP: 0.95,        }

                    maxOutputTokens: 150,    },

                }

            });    /**

     * Analyze image from file input

            let comment = data.candidates?.[0]?.content?.parts?.[0]?.text || '';     */

                async analyzeImageFromFile(file) {

            comment = comment.trim();        return new Promise((resolve, reject) => {

            comment = comment.replace(/^["']|["']$/g, '');            const reader = new FileReader();

            comment = comment.replace(/^(Komentar:|Comment:)\s*/i, '');            reader.onload = () => {

                            const base64 = reader.result.split(',')[1];

            if (!comment) {                resolve({

                throw new Error('AI menghasilkan komentar kosong');                    base64: base64,

            }                    mimeType: file.type

                            });

            return comment;            };

        } catch (error) {            reader.onerror = reject;

            console.error('AI Generate Error:', error);            reader.readAsDataURL(file);

            throw error;        });

        }    },

    },

    /**

    /**     * Generate comment with full context analysis

     * Generate multiple unique comments     * This is the main function that reads image + caption

     */     */

    async generateMultipleComments(postContext, count = 3, style = 'genz') {    async smartComment(postData, style = 'genz', customPrompt = '') {

        const comments = [];        const context = {

        for (let i = 0; i < count; i++) {            platform: postData.platform || 'instagram',

            try {            username: postData.username || '',

                const comment = await this.generateComment(postContext, style);            caption: postData.caption || '',

                if (comment && !comments.includes(comment)) {            imageUrl: postData.imageUrl || '',

                    comments.push(comment);            imageBase64: null,

                }            imageMimeType: null,

            } catch (error) {        };

                console.error(`Error generating comment ${i + 1}:`, error);

            }        // Try to get image data

            if (i < count - 1) {        if (postData.imageBase64) {

                await new Promise(r => setTimeout(r, 2000));            context.imageBase64 = postData.imageBase64;

            }            context.imageMimeType = postData.imageMimeType || 'image/jpeg';

        }        } else if (postData.imageUrl) {

        return comments;            const imageData = await this.analyzeImageFromUrl(postData.imageUrl);

    },            if (imageData) {

                context.imageBase64 = imageData.base64;

    /**                context.imageMimeType = imageData.mimeType;

     * Analyze image from URL            }

     */        }

    async analyzeImageFromUrl(imageUrl) {

        try {        return this.generateComment(context, style, customPrompt);

            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;    },

            const response = await fetch(proxyUrl);

            const blob = await response.blob();    /**

                 * Fallback: Generate comment without AI (template-based)

            return new Promise((resolve, reject) => {     */

                const reader = new FileReader();    generateFallbackComment(category = 'general') {

                reader.onload = () => {        const templates = {

                    const base64 = reader.result.split(',')[1];            general: [

                    resolve({ base64, mimeType: blob.type || 'image/jpeg' });                "Keren banget sih ini! 🔥",

                };                "Wah mantap bgt, suka deh! ✨",

                reader.onerror = reject;                "Slay abis, no cap! 💯",

                reader.readAsDataURL(blob);                "This is fire bruh 🔥🤩",

            });                "Aesthetic banget vibes nya! 😍",

        } catch (error) {                "Gokil parah, always on point! 🫶",

            console.warn('Could not fetch image:', error);                "Next level content sih ini 🤯",

            return null;                "Main character energy bgt! 👑",

        }                "Literally the best! 💕",

    },                "Keep it up bestie! 🚀",

            ],

    /**            fashion: [

     * Analyze image from file input                "Outfit on point bgt! 👗🔥",

     */                "Drip check passed! 💧✨",

    async analyzeImageFromFile(file) {                "Fashion icon sih ini mah 👑",

        return new Promise((resolve, reject) => {                "Slaying the game as always 💅",

            const reader = new FileReader();                "Fit check: 100/10! 🔥",

            reader.onload = () => {            ],

                const base64 = reader.result.split(',')[1];            food: [

                resolve({ base64, mimeType: file.type });                "Looks yummy bgt! 🤤",

            };                "Waduh bikin laper aja nih 😭",

            reader.onerror = reject;                "Mau dong! Sharing is caring 🥺",

            reader.readAsDataURL(file);                "Menu wajib cobain sih ini 🔥",

        });                "Culinary goals bgt! ✨",

    },            ],

            event: [

    /**                "Wah seru bgt pasti! 🎉",

     * Generate comment with full context analysis (image + caption)                "Pengen ikutan dong! 🥺",

     */                "Event of the year sih! 🔥",

    async smartComment(postData, style = 'genz', customPrompt = '') {                "See you there! 🤩",

        const context = {                "Can't wait for this! ✨",

            platform: postData.platform || 'instagram',            ],

            username: postData.username || '',        };

            caption: postData.caption || '',

            imageUrl: postData.imageUrl || '',        const pool = templates[category] || templates.general;

            imageBase64: null,        return pool[Math.floor(Math.random() * pool.length)];

            imageMimeType: null,    }

        };};


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
