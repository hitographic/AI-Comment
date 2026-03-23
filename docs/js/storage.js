/**
 * =============================================
 * 💾 STORAGE - LocalStorage Manager
 * =============================================
 * Semua data disimpan di browser (localStorage)
 * Tidak ada data yang dikirim ke server
 */

const Storage = {
    // ---- Generic ----
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    // ---- API Key ----
    getApiKey() {
        return this.get(CONFIG.STORAGE_KEYS.API_KEY, '');
    },

    setApiKey(key) {
        return this.set(CONFIG.STORAGE_KEYS.API_KEY, key);
    },

    hasApiKey() {
        const key = this.getApiKey();
        return key && key.length > 10;
    },

    // ---- Sessions ----
    getIGSession() {
        return this.get(CONFIG.STORAGE_KEYS.IG_SESSION, null);
    },

    setIGSession(session) {
        return this.set(CONFIG.STORAGE_KEYS.IG_SESSION, session);
    },

    getTTSession() {
        return this.get(CONFIG.STORAGE_KEYS.TT_SESSION, null);
    },

    setTTSession(session) {
        return this.set(CONFIG.STORAGE_KEYS.TT_SESSION, session);
    },

    // ---- Settings ----
    getSettings() {
        return this.get(CONFIG.STORAGE_KEYS.SETTINGS, CONFIG.DEFAULT_SETTINGS);
    },

    setSettings(settings) {
        return this.set(CONFIG.STORAGE_KEYS.SETTINGS, { ...CONFIG.DEFAULT_SETTINGS, ...settings });
    },

    // ---- Persona ----
    getPersona() {
        return this.get(CONFIG.STORAGE_KEYS.PERSONA, CONFIG.DEFAULT_PERSONA);
    },

    setPersona(persona) {
        return this.set(CONFIG.STORAGE_KEYS.PERSONA, persona);
    },

    // ---- History ----
    getHistory() {
        return this.get(CONFIG.STORAGE_KEYS.HISTORY, []);
    },

    addHistory(entry) {
        const history = this.getHistory();
        history.unshift({
            ...entry,
            id: Date.now(),
            timestamp: new Date().toISOString(),
        });
        // Keep last 500 entries
        if (history.length > 500) history.length = 500;
        return this.set(CONFIG.STORAGE_KEYS.HISTORY, history);
    },

    clearHistory() {
        return this.set(CONFIG.STORAGE_KEYS.HISTORY, []);
    },

    // ---- Stats ----
    getStats() {
        return this.get(CONFIG.STORAGE_KEYS.STATS, {
            igComments: 0,
            ttComments: 0,
            aiGenerated: 0,
            totalSuccess: 0,
            totalFailed: 0,
        });
    },

    updateStats(updates) {
        const stats = this.getStats();
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'number') {
                stats[key] = (stats[key] || 0) + updates[key];
            }
        });
        return this.set(CONFIG.STORAGE_KEYS.STATS, stats);
    },

    // ---- Theme ----
    getTheme() {
        return this.get(CONFIG.STORAGE_KEYS.THEME, 'dark');
    },

    setTheme(theme) {
        return this.set(CONFIG.STORAGE_KEYS.THEME, theme);
    },
};
