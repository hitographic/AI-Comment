/**
 * =============================================
 * 🚀 APP.JS - Main Application Controller
 * =============================================
 */

const App = {
    currentPage: 'dashboard',
    selectedPlatform: 'instagram',
    selectedPostCount: 5,

    // =============================================
    // INITIALIZATION
    // =============================================

    async init() {
        // Show loading screen
        this.updateLoadingStatus('Memuat konfigurasi...');
        await this.sleep(300);

        // Restore theme
        const theme = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', theme);

        this.updateLoadingStatus('Menghubungkan AI...');
        await this.sleep(300);

        // Restore sessions
        SocialAPI.restoreSessions();

        // Check AI status
        AIEngine.checkReady();

        this.updateLoadingStatus('Menyiapkan dashboard...');
        await this.sleep(400);

        // Bind events
        this.bindNavigation();
        this.bindDashboard();
        this.bindAccounts();
        this.bindSettings();
        this.bindWorkflow();
        this.bindModals();

        // Update UI
        this.updateAIStatus();
        this.updateAccountStatus();
        this.updateDashboard();
        this.loadHistory();

        // Hide loading, show app
        this.updateLoadingStatus('Siap!');
        await this.sleep(500);
        
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // Check first time (no API key)
        if (!Storage.hasApiKey()) {
            setTimeout(() => {
                document.getElementById('apiKeyModal').classList.remove('hidden');
            }, 500);
        }

        console.log('🤖 AutoCommentAI initialized!');
    },

    // =============================================
    // NAVIGATION
    // =============================================

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Mobile menu toggle
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.toggle('open');
        });

        // Close sidebar on page click (mobile)
        document.querySelector('.main-content')?.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.remove('open');
        });
    },

    navigateTo(page) {
        this.currentPage = page;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            workflow: 'Visual Workflow',
            accounts: 'Kelola Akun',
            history: 'Riwayat Komentar',
            settings: 'Pengaturan',
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Close mobile sidebar
        document.querySelector('.sidebar')?.classList.remove('open');
    },

    // =============================================
    // DASHBOARD
    // =============================================

    bindDashboard() {
        // Platform selector
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPlatform = btn.dataset.platform;
            });
        });

        // Post count selector
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPostCount = parseInt(btn.dataset.count);
                document.getElementById('customCount').value = '';
            });
        });

        document.getElementById('customCount')?.addEventListener('change', (e) => {
            if (e.target.value) {
                document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
                this.selectedPostCount = parseInt(e.target.value) || 5;
            }
        });

        // Comment style
        document.getElementById('commentStyle')?.addEventListener('change', (e) => {
            const customGroup = document.getElementById('customPromptGroup');
            if (e.target.value === 'custom') {
                customGroup?.classList.remove('hidden');
            } else {
                customGroup?.classList.add('hidden');
            }
        });

        // Start Quick Comment
        document.getElementById('startQuickComment')?.addEventListener('click', () => {
            this.startQuickComment();
        });
    },

    async startQuickComment() {
        const target = document.getElementById('targetInput')?.value?.trim();
        const style = document.getElementById('commentStyle')?.value || 'genz';
        const customPrompt = document.getElementById('customPrompt')?.value || '';

        if (!target) {
            this.showToast('Masukkan URL post atau username target!', 'warning');
            return;
        }

        // Check login
        const api = this.selectedPlatform === 'instagram' ? SocialAPI.instagram : SocialAPI.tiktok;
        if (!api.isLoggedIn) {
            this.showToast(`Belum login ${this.selectedPlatform}! Silakan login dulu.`, 'error');
            this.navigateTo('accounts');
            return;
        }

        // Navigate to workflow and run
        this.navigateTo('workflow');

        await WorkflowEngine.run({
            platform: this.selectedPlatform,
            target: target,
            postCount: this.selectedPostCount,
            style: style,
            customPrompt: customPrompt,
        });
    },

    updateDashboard() {
        const stats = Storage.getStats();
        
        document.getElementById('igCommentCount').textContent = stats.igComments || 0;
        document.getElementById('ttCommentCount').textContent = stats.ttComments || 0;
        document.getElementById('aiGeneratedCount').textContent = stats.aiGenerated || 0;
        
        const total = (stats.totalSuccess || 0) + (stats.totalFailed || 0);
        const rate = total > 0 ? Math.round((stats.totalSuccess / total) * 100) : 0;
        document.getElementById('successRate').textContent = `${rate}%`;
    },

    // =============================================
    // ACCOUNTS
    // =============================================

    bindAccounts() {
        // Instagram login
        document.getElementById('igLoginBtn')?.addEventListener('click', async () => {
            const username = document.getElementById('igUsername')?.value?.trim();
            const password = document.getElementById('igPassword')?.value;
            const sessionId = document.getElementById('igSessionId')?.value?.trim();

            if (!username && !sessionId) {
                this.showToast('Masukkan username atau session ID!', 'warning');
                return;
            }

            const btn = document.getElementById('igLoginBtn');
            btn.innerHTML = '<span class="spinner"></span> Logging in...';
            btn.disabled = true;

            try {
                const result = await SocialAPI.loginInstagram(username, password, sessionId);
                if (result.success) {
                    this.showToast(`Login Instagram berhasil! @${result.username}`, 'success');
                    this.updateAccountStatus();
                } else {
                    this.showToast(result.error || 'Login gagal!', 'error');
                }
            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                btn.innerHTML = '<i class="fab fa-instagram"></i> Login Instagram';
                btn.disabled = false;
            }
        });

        // Instagram logout
        document.getElementById('igLogoutBtn')?.addEventListener('click', () => {
            SocialAPI.logoutInstagram();
            this.updateAccountStatus();
            this.showToast('Logout Instagram berhasil', 'info');
        });

        // TikTok login
        document.getElementById('ttLoginBtn')?.addEventListener('click', async () => {
            const username = document.getElementById('ttUsername')?.value?.trim();
            const password = document.getElementById('ttPassword')?.value;
            const sessionId = document.getElementById('ttSessionId')?.value?.trim();

            if (!username && !sessionId) {
                this.showToast('Masukkan username atau session ID!', 'warning');
                return;
            }

            const btn = document.getElementById('ttLoginBtn');
            btn.innerHTML = '<span class="spinner"></span> Logging in...';
            btn.disabled = true;

            try {
                const result = await SocialAPI.loginTiktok(username, password, sessionId);
                if (result.success) {
                    this.showToast(`Login TikTok berhasil! @${result.username}`, 'success');
                    this.updateAccountStatus();
                } else {
                    this.showToast(result.error || 'Login gagal!', 'error');
                }
            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                btn.innerHTML = '<i class="fab fa-tiktok"></i> Login TikTok';
                btn.disabled = false;
            }
        });

        // TikTok logout
        document.getElementById('ttLogoutBtn')?.addEventListener('click', () => {
            SocialAPI.logoutTiktok();
            this.updateAccountStatus();
            this.showToast('Logout TikTok berhasil', 'info');
        });
    },

    updateAccountStatus() {
        // Instagram
        const igLoggedIn = SocialAPI.instagram.isLoggedIn;
        const igStatus = document.getElementById('igStatus');
        const igForm = document.getElementById('igLoginForm');
        const igInfo = document.getElementById('igAccountInfo');
        const igUser = document.getElementById('igLoggedUser');

        if (igStatus) {
            igStatus.innerHTML = igLoggedIn
                ? '<div class="status-badge online"><i class="fas fa-circle"></i> Online</div>'
                : '<div class="status-badge offline"><i class="fas fa-circle"></i> Belum Login</div>';
        }
        
        if (igLoggedIn) {
            igForm?.classList.add('hidden');
            igInfo?.classList.remove('hidden');
            if (igUser) igUser.textContent = `@${SocialAPI.instagram.username}`;
        } else {
            igForm?.classList.remove('hidden');
            igInfo?.classList.add('hidden');
        }

        // TikTok
        const ttLoggedIn = SocialAPI.tiktok.isLoggedIn;
        const ttStatus = document.getElementById('ttStatus');
        const ttForm = document.getElementById('ttLoginForm');
        const ttInfo = document.getElementById('ttAccountInfo');
        const ttUser = document.getElementById('ttLoggedUser');

        if (ttStatus) {
            ttStatus.innerHTML = ttLoggedIn
                ? '<div class="status-badge online"><i class="fas fa-circle"></i> Online</div>'
                : '<div class="status-badge offline"><i class="fas fa-circle"></i> Belum Login</div>';
        }
        
        if (ttLoggedIn) {
            ttForm?.classList.add('hidden');
            ttInfo?.classList.remove('hidden');
            if (ttUser) ttUser.textContent = `@${SocialAPI.tiktok.username}`;
        } else {
            ttForm?.classList.remove('hidden');
            ttInfo?.classList.add('hidden');
        }
    },

    // =============================================
    // SETTINGS
    // =============================================

    bindSettings() {
        // Load existing settings
        const settings = Storage.getSettings();
        const el = (id) => document.getElementById(id);

        if (el('commentDelay')) el('commentDelay').value = settings.commentDelay;
        if (el('maxDailyComments')) el('maxDailyComments').value = settings.maxDailyComments;
        if (el('commentLang')) el('commentLang').value = settings.commentLang;
        if (el('useEmoji')) el('useEmoji').checked = settings.useEmoji;
        if (el('randomDelay')) el('randomDelay').checked = settings.randomDelay;

        // Load persona
        const persona = Storage.getPersona();
        if (el('aiPersona')) el('aiPersona').value = persona;

        // Load API key
        if (Storage.hasApiKey()) {
            if (el('geminiApiKey')) el('geminiApiKey').value = Storage.getApiKey();
        }

        // Save API key
        el('saveApiKey')?.addEventListener('click', async () => {
            const apiKey = el('geminiApiKey')?.value?.trim();
            if (!apiKey) {
                this.showToast('Masukkan API Key!', 'warning');
                return;
            }

            const btn = el('saveApiKey');
            btn.innerHTML = '<span class="spinner"></span> Testing...';
            btn.disabled = true;

            const result = await AIEngine.testApiKey(apiKey);
            
            if (result.success) {
                Storage.setApiKey(apiKey);
                this.updateAIStatus();
                if (result.warning) {
                    this.showToast(result.warning, 'warning');
                } else {
                    this.showToast('API Key berhasil disimpan! AI siap digunakan 🤖', 'success');
                }
            } else {
                this.showToast(`API Key tidak valid: ${result.error}`, 'error');
            }

            btn.innerHTML = '<i class="fas fa-save"></i> Simpan API Key';
            btn.disabled = false;
        });

        // Toggle API key visibility
        el('toggleApiKeyVisibility')?.addEventListener('click', () => {
            const input = el('geminiApiKey');
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });

        // Save comment settings
        el('saveCommentSettings')?.addEventListener('click', () => {
            Storage.setSettings({
                commentDelay: parseInt(el('commentDelay')?.value) || 30,
                maxDailyComments: parseInt(el('maxDailyComments')?.value) || 20,
                commentLang: el('commentLang')?.value || 'mixed',
                useEmoji: el('useEmoji')?.checked ?? true,
                randomDelay: el('randomDelay')?.checked ?? true,
            });
            this.showToast('Pengaturan komentar tersimpan! ✅', 'success');
        });

        // Save persona
        el('savePersona')?.addEventListener('click', () => {
            const personaText = el('aiPersona')?.value?.trim();
            if (personaText) {
                Storage.setPersona(personaText);
                this.showToast('AI Persona tersimpan! 🤖', 'success');
            }
        });

        // Theme toggle
        el('themeToggle')?.addEventListener('click', () => {
            const current = Storage.getTheme();
            const newTheme = current === 'dark' ? 'light' : 'dark';
            Storage.setTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
            
            const icon = el('themeToggle')?.querySelector('i');
            if (icon) {
                icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        });

        // API Key indicator click
        el('apiKeyIndicator')?.addEventListener('click', () => {
            this.navigateTo('settings');
        });
    },

    updateAIStatus() {
        const ready = AIEngine.checkReady();
        const offline = AIEngine.offlineMode;
        const dot = document.getElementById('aiStatusDot');
        const text = document.getElementById('aiStatusText');
        const indicator = document.getElementById('apiKeyIndicator');

        if (dot) {
            dot.classList.toggle('online', ready);
        }
        if (text) {
            if (ready && !offline) {
                text.textContent = 'AI Online';
            } else if (ready && offline) {
                text.textContent = 'AI Offline (Template)';
            } else {
                text.textContent = 'AI Offline';
            }
        }
        if (indicator) {
            indicator.classList.toggle('active', ready);
        }
    },

    // =============================================
    // WORKFLOW PAGE
    // =============================================

    bindWorkflow() {
        document.getElementById('runWorkflow')?.addEventListener('click', () => {
            // Get options from dashboard form
            const target = document.getElementById('targetInput')?.value?.trim();
            const style = document.getElementById('commentStyle')?.value || 'genz';
            const customPrompt = document.getElementById('customPrompt')?.value || '';

            if (!target) {
                this.showToast('Masukkan target di Dashboard terlebih dahulu!', 'warning');
                this.navigateTo('dashboard');
                return;
            }

            WorkflowEngine.run({
                platform: this.selectedPlatform,
                target: target,
                postCount: this.selectedPostCount,
                style: style,
                customPrompt: customPrompt,
            });
        });

        document.getElementById('stopWorkflow')?.addEventListener('click', () => {
            WorkflowEngine.stop();
        });

        document.getElementById('resetWorkflow')?.addEventListener('click', () => {
            WorkflowEngine.resetNodes();
            WorkflowEngine.clearLog();
            WorkflowEngine.log('Workflow direset. Siap dijalankan kembali.', 'info');
        });
    },

    // =============================================
    // HISTORY
    // =============================================

    loadHistory() {
        const history = Storage.getHistory();
        const tbody = document.getElementById('historyBody');
        if (!tbody) return;

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">
                        <i class="fas fa-inbox"></i>
                        <p>Belum ada riwayat</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = history.slice(0, 100).map(entry => {
            const time = new Date(entry.timestamp).toLocaleString('id-ID');
            const platformIcon = entry.platform === 'instagram' 
                ? '<i class="fab fa-instagram" style="color:#E1306C"></i>' 
                : '<i class="fab fa-tiktok" style="color:#25F4EE"></i>';
            const statusBadge = entry.status === 'success'
                ? '<span class="status-badge online">✅ Berhasil</span>'
                : '<span class="status-badge offline">❌ Gagal</span>';

            return `
                <tr>
                    <td>${time}</td>
                    <td>${platformIcon} ${entry.platform}</td>
                    <td>@${entry.target || '-'}</td>
                    <td title="${entry.comment}">${(entry.comment || '').substring(0, 50)}${(entry.comment || '').length > 50 ? '...' : ''}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        // Export CSV
        document.getElementById('exportHistory')?.addEventListener('click', () => {
            this.exportHistoryCSV(history);
        });

        // Clear history
        document.getElementById('clearHistory')?.addEventListener('click', () => {
            if (confirm('Hapus semua riwayat?')) {
                Storage.clearHistory();
                this.loadHistory();
                this.showToast('Riwayat dihapus', 'info');
            }
        });
    },

    exportHistoryCSV(history) {
        const headers = ['Waktu', 'Platform', 'Target', 'Komentar', 'Status'];
        const rows = history.map(h => [
            new Date(h.timestamp).toLocaleString('id-ID'),
            h.platform,
            h.target,
            `"${(h.comment || '').replace(/"/g, '""')}"`,
            h.status
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `autocomment_history_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('History exported! 📥', 'success');
    },

    // =============================================
    // MODALS
    // =============================================

    bindModals() {
        // First time API key modal
        document.getElementById('closeApiKeyModal')?.addEventListener('click', () => {
            document.getElementById('apiKeyModal')?.classList.add('hidden');
        });

        document.getElementById('saveFirstTimeApiKey')?.addEventListener('click', async () => {
            const apiKey = document.getElementById('firstTimeApiKey')?.value?.trim();
            if (!apiKey) {
                this.showToast('Masukkan API Key!', 'warning');
                return;
            }

            const btn = document.getElementById('saveFirstTimeApiKey');
            btn.innerHTML = '<span class="spinner"></span> Mengaktifkan AI...';
            btn.disabled = true;

            const result = await AIEngine.testApiKey(apiKey);

            if (result.success) {
                Storage.setApiKey(apiKey);
                this.updateAIStatus();
                document.getElementById('apiKeyModal')?.classList.add('hidden');
                if (result.warning) {
                    this.showToast('⚡ ' + result.warning, 'warning');
                } else {
                    this.showToast('🎉 AI berhasil diaktifkan! Selamat menggunakan AutoCommentAI', 'success');
                    this.confetti();
                }
            } else {
                this.showToast(`API Key tidak valid: ${result.error}`, 'error');
            }

            btn.innerHTML = '<i class="fas fa-rocket"></i> Aktifkan AI';
            btn.disabled = false;
        });

        // Preview modal
        document.getElementById('closePreviewModal')?.addEventListener('click', () => {
            document.getElementById('aiPreviewModal')?.classList.add('hidden');
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                }
            });
        });
    },

    // =============================================
    // ACTIVITY LOG
    // =============================================

    addActivity(title, description, color = '#7C3AED', icon = 'fas fa-comment') {
        const log = document.getElementById('activityLog');
        if (!log) return;

        // Remove empty state
        const empty = log.querySelector('.activity-empty');
        if (empty) empty.remove();

        const time = new Date().toLocaleTimeString('id-ID');
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon" style="background: ${color}20; color: ${color};">
                <i class="${icon}"></i>
            </div>
            <div class="activity-text">
                <h4>${title}</h4>
                <p>${description}</p>
            </div>
            <span class="activity-time">${time}</span>
        `;

        log.prepend(item);

        // Keep max 20 items
        while (log.children.length > 20) {
            log.removeChild(log.lastChild);
        }
    },

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type] || icons.info}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    confetti() {
        const colors = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
        for (let i = 0; i < 30; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.cssText = `
                left: ${Math.random() * 100}vw;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation-delay: ${Math.random() * 0.5}s;
                animation-duration: ${2 + Math.random() * 2}s;
            `;
            document.body.appendChild(piece);
            setTimeout(() => piece.remove(), 4000);
        }
    },

    updateLoadingStatus(text) {
        const el = document.querySelector('.loader-status');
        if (el) el.textContent = text;
    },

    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    },
};

// =============================================
// BOOT 🚀
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
