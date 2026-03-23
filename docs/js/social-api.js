/**
 * =============================================
 * 📱 SOCIAL API - Instagram & TikTok Connector
 * =============================================
 * 
 * ⚠️ PENTING: Instagram dan TikTok tidak menyediakan
 * public API untuk posting komentar dari browser.
 * 
 * Module ini mensimulasikan alur kerja dan menyediakan:
 * 1. Login management (session-based)
 * 2. Post scraping simulation
 * 3. Comment posting via API proxy
 * 
 * Untuk REAL auto-comment, diperlukan:
 * - Backend server (Node.js/Python)
 * - Puppeteer/Selenium untuk browser automation
 * - Atau Instagram Graph API (untuk akun business)
 * 
 * Versi ini menggunakan simulasi + AI generation
 * yang bisa kamu gunakan sebagai framework.
 */

const SocialAPI = {
    // ---- State ----
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
    // INSTAGRAM
    // =============================================

    /**
     * Login Instagram
     */
    async loginInstagram(username, password, sessionId) {
        // Load existing session
        const savedSession = Storage.getIGSession();
        
        if (sessionId) {
            // Session ID based login (recommended)
            this.instagram = {
                isLoggedIn: true,
                username: username || savedSession?.username || 'user',
                sessionId: sessionId,
            };
            Storage.setIGSession(this.instagram);
            return { success: true, username: this.instagram.username };
        }

        if (username && password) {
            /**
             * ⚠️ CATATAN KEAMANAN:
             * Login via username/password dari client-side TIDAK bisa dilakukan
             * karena Instagram memblokir CORS requests.
             * 
             * Untuk implementasi nyata, gunakan:
             * 1. Session ID dari browser (cara paling aman di client-side)
             * 2. Backend server dengan instagram-private-api
             * 3. Instagram Graph API (untuk business accounts)
             * 
             * Di sini kita simpan credentials dan simulasikan login
             */
            this.instagram = {
                isLoggedIn: true,
                username: username,
                sessionId: `simulated_${Date.now()}`,
            };
            Storage.setIGSession(this.instagram);
            return { success: true, username: username };
        }

        // Try restore session
        if (savedSession?.isLoggedIn) {
            this.instagram = savedSession;
            return { success: true, username: savedSession.username };
        }

        return { success: false, error: 'Masukkan username/password atau session ID' };
    },

    /**
     * Logout Instagram
     */
    logoutInstagram() {
        this.instagram = { isLoggedIn: false, username: '', sessionId: '' };
        Storage.remove(CONFIG.STORAGE_KEYS.IG_SESSION);
    },

    /**
     * Get Instagram posts from a user/hashtag
     * In real implementation, this would scrape or use API
     */
    async getInstagramPosts(target, count = 5) {
        // Simulate fetching posts
        // In real implementation: use instagram-private-api or scraping
        
        const posts = [];
        for (let i = 0; i < count; i++) {
            posts.push({
                id: `ig_${Date.now()}_${i}`,
                platform: 'instagram',
                username: target.replace('@', ''),
                caption: `Post ${i + 1} dari @${target.replace('@', '')}`,
                imageUrl: '',
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                likeCount: Math.floor(Math.random() * 10000),
                commentCount: Math.floor(Math.random() * 500),
            });
        }
        
        return posts;
    },

    /**
     * Post comment to Instagram
     * ⚠️ Requires real API implementation for production
     */
    async postInstagramComment(postId, comment) {
        if (!this.instagram.isLoggedIn) {
            throw new Error('Belum login Instagram!');
        }

        // In real implementation:
        // POST to Instagram API with session cookie
        // Using instagram-private-api or similar

        // Simulate API call
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

        // Simulate success (90% chance)
        const success = Math.random() > 0.1;
        
        if (success) {
            return {
                success: true,
                commentId: `comment_${Date.now()}`,
                comment: comment,
            };
        } else {
            throw new Error('Gagal posting komentar. Coba lagi nanti.');
        }
    },

    // =============================================
    // TIKTOK
    // =============================================

    /**
     * Login TikTok
     */
    async loginTiktok(username, password, sessionId) {
        const savedSession = Storage.getTTSession();

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
                sessionId: `simulated_${Date.now()}`,
            };
            Storage.setTTSession(this.tiktok);
            return { success: true, username: username };
        }

        if (savedSession?.isLoggedIn) {
            this.tiktok = savedSession;
            return { success: true, username: savedSession.username };
        }

        return { success: false, error: 'Masukkan username/password atau session ID' };
    },

    /**
     * Logout TikTok
     */
    logoutTiktok() {
        this.tiktok = { isLoggedIn: false, username: '', sessionId: '' };
        Storage.remove(CONFIG.STORAGE_KEYS.TT_SESSION);
    },

    /**
     * Get TikTok posts
     */
    async getTiktokPosts(target, count = 5) {
        const posts = [];
        for (let i = 0; i < count; i++) {
            posts.push({
                id: `tt_${Date.now()}_${i}`,
                platform: 'tiktok',
                username: target.replace('@', ''),
                caption: `Video ${i + 1} dari @${target.replace('@', '')}`,
                imageUrl: '',
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                likeCount: Math.floor(Math.random() * 50000),
                commentCount: Math.floor(Math.random() * 2000),
            });
        }
        return posts;
    },

    /**
     * Post comment to TikTok
     */
    async postTiktokComment(postId, comment) {
        if (!this.tiktok.isLoggedIn) {
            throw new Error('Belum login TikTok!');
        }

        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

        const success = Math.random() > 0.1;
        
        if (success) {
            return {
                success: true,
                commentId: `comment_${Date.now()}`,
                comment: comment,
            };
        } else {
            throw new Error('Gagal posting komentar TikTok.');
        }
    },

    // =============================================
    // HELPERS
    // =============================================

    /**
     * Parse target input (URL or username)
     */
    parseTarget(input) {
        input = input.trim();
        
        // Instagram URL
        if (input.includes('instagram.com')) {
            const match = input.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/);
            if (match) return { type: 'post', platform: 'instagram', id: match[1] };
            
            const userMatch = input.match(/instagram\.com\/([^/?]+)/);
            if (userMatch) return { type: 'user', platform: 'instagram', username: userMatch[1] };
        }

        // TikTok URL
        if (input.includes('tiktok.com')) {
            const match = input.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/);
            if (match) return { type: 'post', platform: 'tiktok', username: match[1], id: match[2] };
            
            const userMatch = input.match(/tiktok\.com\/@([^/?]+)/);
            if (userMatch) return { type: 'user', platform: 'tiktok', username: userMatch[1] };
        }

        // Username
        if (input.startsWith('@')) {
            return { type: 'user', platform: null, username: input.replace('@', '') };
        }

        return { type: 'user', platform: null, username: input };
    },

    /**
     * Restore sessions on load
     */
    restoreSessions() {
        const igSession = Storage.getIGSession();
        if (igSession?.isLoggedIn) {
            this.instagram = igSession;
        }

        const ttSession = Storage.getTTSession();
        if (ttSession?.isLoggedIn) {
            this.tiktok = ttSession;
        }
    },
};
