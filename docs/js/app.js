/**
 * =============================================
 * 🚀 APP.JS v2.0 - Main Application Controller
 * =============================================
 * Bisa jalan TANPA API Key!
 * Event listeners dibinding sekali saja (no duplicates).
 */

var App = {
    currentPage: 'dashboard',
    selectedPlatform: 'instagram',
    selectedPostCount: 5,
    _historyBound: false,

    // =============================================
    // INITIALIZATION
    // =============================================

    init: async function() {
        this.updateLoadingStatus('Memuat konfigurasi...');
        await this.sleep(300);

        var theme = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', theme);

        this.updateLoadingStatus('Menyiapkan Smart Engine...');
        await this.sleep(300);

        SocialAPI.restoreSessions();
        AIEngine.checkReady();

        this.updateLoadingStatus('Menyiapkan dashboard...');
        await this.sleep(400);

        this.bindNavigation();
        this.bindDashboard();
        this.bindAccounts();
        this.bindSettings();
        this.bindWorkflow();
        this.bindModals();

        this.updateAIStatus();
        this.updateAccountStatus();
        this.updateDashboard();
        this.loadHistory();

        this.updateLoadingStatus('Siap!');
        await this.sleep(500);

        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // TIDAK lagi paksa modal API key — app bisa jalan tanpa API
        if (!Storage.hasApiKey()) {
            // Tampilkan info bahwa mode smart template aktif
            setTimeout(function() {
                App.showToast('🧠 Smart Template Mode aktif! Bisa auto comment tanpa API key.', 'info');
            }, 1000);
        }

        console.log('🤖 AutoCommentAI v2.0 initialized! (Smart Template Mode)');
    },

    // =============================================
    // NAVIGATION
    // =============================================

    bindNavigation: function() {
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            (function(item) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    App.navigateTo(item.dataset.page);
                });
            })(navItems[i]);
        }

        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                var sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.toggle('open');
            });
        }

        var mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('click', function() {
                var sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.remove('open');
            });
        }
    },

    navigateTo: function(page) {
        this.currentPage = page;
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            if (navItems[i].dataset.page === page) {
                navItems[i].classList.add('active');
            } else {
                navItems[i].classList.remove('active');
            }
        }

        var pages = document.querySelectorAll('.page');
        for (var j = 0; j < pages.length; j++) {
            if (pages[j].id === 'page-' + page) {
                pages[j].classList.add('active');
            } else {
                pages[j].classList.remove('active');
            }
        }

        var titles = {
            dashboard: 'Dashboard',
            workflow: 'Visual Workflow',
            accounts: 'Kelola Akun',
            history: 'Riwayat Komentar',
            settings: 'Pengaturan',
        };
        var titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[page] || page;

        var sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('open');
    },

    // =============================================
    // DASHBOARD
    // =============================================

    bindDashboard: function() {
        var platformBtns = document.querySelectorAll('.platform-btn');
        for (var i = 0; i < platformBtns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    for (var k = 0; k < platformBtns.length; k++) platformBtns[k].classList.remove('active');
                    btn.classList.add('active');
                    App.selectedPlatform = btn.dataset.platform;
                });
            })(platformBtns[i]);
        }

        var countBtns = document.querySelectorAll('.count-btn');
        for (var j = 0; j < countBtns.length; j++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    for (var k = 0; k < countBtns.length; k++) countBtns[k].classList.remove('active');
                    btn.classList.add('active');
                    App.selectedPostCount = parseInt(btn.dataset.count);
                    var customInput = document.getElementById('customCount');
                    if (customInput) customInput.value = '';
                });
            })(countBtns[j]);
        }

        var customCount = document.getElementById('customCount');
        if (customCount) {
            customCount.addEventListener('change', function(e) {
                if (e.target.value) {
                    for (var k = 0; k < countBtns.length; k++) countBtns[k].classList.remove('active');
                    App.selectedPostCount = parseInt(e.target.value) || 5;
                }
            });
        }

        var commentStyle = document.getElementById('commentStyle');
        if (commentStyle) {
            commentStyle.addEventListener('change', function(e) {
                var customGroup = document.getElementById('customPromptGroup');
                if (customGroup) {
                    if (e.target.value === 'custom') {
                        customGroup.classList.remove('hidden');
                    } else {
                        customGroup.classList.add('hidden');
                    }
                }
            });
        }

        var startBtn = document.getElementById('startQuickComment');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                App.startQuickComment();
            });
        }
    },

    startQuickComment: async function() {
        var targetInput = document.getElementById('targetInput');
        var target = targetInput ? targetInput.value.trim() : '';
        var styleSelect = document.getElementById('commentStyle');
        var style = styleSelect ? styleSelect.value : 'genz';
        var customPromptEl = document.getElementById('customPrompt');
        var customPrompt = customPromptEl ? customPromptEl.value : '';

        if (!target) {
            this.showToast('Masukkan URL post atau username target!', 'warning');
            return;
        }

        var api = this.selectedPlatform === 'instagram' ? SocialAPI.instagram : SocialAPI.tiktok;
        if (!api.isLoggedIn) {
            this.showToast('Belum login ' + this.selectedPlatform + '! Silakan login dulu.', 'error');
            this.navigateTo('accounts');
            return;
        }

        this.navigateTo('workflow');

        await WorkflowEngine.run({
            platform: this.selectedPlatform,
            target: target,
            postCount: this.selectedPostCount,
            style: style,
            customPrompt: customPrompt,
        });
    },

    updateDashboard: function() {
        var stats = Storage.getStats();
        var el = function(id) { return document.getElementById(id); };

        if (el('igCommentCount')) el('igCommentCount').textContent = stats.igComments || 0;
        if (el('ttCommentCount')) el('ttCommentCount').textContent = stats.ttComments || 0;
        if (el('aiGeneratedCount')) el('aiGeneratedCount').textContent = stats.aiGenerated || 0;

        var total = (stats.totalSuccess || 0) + (stats.totalFailed || 0);
        var rate = total > 0 ? Math.round((stats.totalSuccess / total) * 100) : 0;
        if (el('successRate')) el('successRate').textContent = rate + '%';
    },

    // =============================================
    // ACCOUNTS
    // =============================================

    bindAccounts: function() {
        var igLoginBtn = document.getElementById('igLoginBtn');
        if (igLoginBtn) {
            igLoginBtn.addEventListener('click', async function() {
                var username = (document.getElementById('igUsername') || {}).value || '';
                var password = (document.getElementById('igPassword') || {}).value || '';
                var sessionId = (document.getElementById('igSessionId') || {}).value || '';
                username = username.trim();
                sessionId = sessionId.trim();

                if (!username && !sessionId) {
                    App.showToast('Masukkan username atau session ID!', 'warning');
                    return;
                }

                igLoginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
                igLoginBtn.disabled = true;

                try {
                    var result = await SocialAPI.loginInstagram(username, password, sessionId);
                    if (result.success) {
                        App.showToast('Login Instagram berhasil! @' + result.username, 'success');
                        App.updateAccountStatus();
                    } else {
                        App.showToast(result.error || 'Login gagal!', 'error');
                    }
                } catch (error) {
                    App.showToast(error.message, 'error');
                } finally {
                    igLoginBtn.innerHTML = '<i class="fab fa-instagram"></i> Login Instagram';
                    igLoginBtn.disabled = false;
                }
            });
        }

        var igLogoutBtn = document.getElementById('igLogoutBtn');
        if (igLogoutBtn) {
            igLogoutBtn.addEventListener('click', function() {
                SocialAPI.logoutInstagram();
                App.updateAccountStatus();
                App.showToast('Logout Instagram berhasil', 'info');
            });
        }

        var ttLoginBtn = document.getElementById('ttLoginBtn');
        if (ttLoginBtn) {
            ttLoginBtn.addEventListener('click', async function() {
                var username = (document.getElementById('ttUsername') || {}).value || '';
                var password = (document.getElementById('ttPassword') || {}).value || '';
                var sessionId = (document.getElementById('ttSessionId') || {}).value || '';
                username = username.trim();
                sessionId = sessionId.trim();

                if (!username && !sessionId) {
                    App.showToast('Masukkan username atau session ID!', 'warning');
                    return;
                }

                ttLoginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
                ttLoginBtn.disabled = true;

                try {
                    var result = await SocialAPI.loginTiktok(username, password, sessionId);
                    if (result.success) {
                        App.showToast('Login TikTok berhasil! @' + result.username, 'success');
                        App.updateAccountStatus();
                    } else {
                        App.showToast(result.error || 'Login gagal!', 'error');
                    }
                } catch (error) {
                    App.showToast(error.message, 'error');
                } finally {
                    ttLoginBtn.innerHTML = '<i class="fab fa-tiktok"></i> Login TikTok';
                    ttLoginBtn.disabled = false;
                }
            });
        }

        var ttLogoutBtn = document.getElementById('ttLogoutBtn');
        if (ttLogoutBtn) {
            ttLogoutBtn.addEventListener('click', function() {
                SocialAPI.logoutTiktok();
                App.updateAccountStatus();
                App.showToast('Logout TikTok berhasil', 'info');
            });
        }
    },

    updateAccountStatus: function() {
        var igLoggedIn = SocialAPI.instagram.isLoggedIn;
        var igStatus = document.getElementById('igStatus');
        var igForm = document.getElementById('igLoginForm');
        var igInfo = document.getElementById('igAccountInfo');
        var igUser = document.getElementById('igLoggedUser');

        if (igStatus) {
            igStatus.innerHTML = igLoggedIn
                ? '<div class="status-badge online"><i class="fas fa-circle"></i> Online</div>'
                : '<div class="status-badge offline"><i class="fas fa-circle"></i> Belum Login</div>';
        }
        if (igLoggedIn) {
            if (igForm) igForm.classList.add('hidden');
            if (igInfo) igInfo.classList.remove('hidden');
            if (igUser) igUser.textContent = '@' + SocialAPI.instagram.username;
        } else {
            if (igForm) igForm.classList.remove('hidden');
            if (igInfo) igInfo.classList.add('hidden');
        }

        var ttLoggedIn = SocialAPI.tiktok.isLoggedIn;
        var ttStatus = document.getElementById('ttStatus');
        var ttForm = document.getElementById('ttLoginForm');
        var ttInfo = document.getElementById('ttAccountInfo');
        var ttUser = document.getElementById('ttLoggedUser');

        if (ttStatus) {
            ttStatus.innerHTML = ttLoggedIn
                ? '<div class="status-badge online"><i class="fas fa-circle"></i> Online</div>'
                : '<div class="status-badge offline"><i class="fas fa-circle"></i> Belum Login</div>';
        }
        if (ttLoggedIn) {
            if (ttForm) ttForm.classList.add('hidden');
            if (ttInfo) ttInfo.classList.remove('hidden');
            if (ttUser) ttUser.textContent = '@' + SocialAPI.tiktok.username;
        } else {
            if (ttForm) ttForm.classList.remove('hidden');
            if (ttInfo) ttInfo.classList.add('hidden');
        }
    },

    // =============================================
    // SETTINGS
    // =============================================

    bindSettings: function() {
        var settings = Storage.getSettings();
        var el = function(id) { return document.getElementById(id); };

        if (el('commentDelay')) el('commentDelay').value = settings.commentDelay;
        if (el('maxDailyComments')) el('maxDailyComments').value = settings.maxDailyComments;
        if (el('commentLang')) el('commentLang').value = settings.commentLang;
        if (el('useEmoji')) el('useEmoji').checked = settings.useEmoji;
        if (el('randomDelay')) el('randomDelay').checked = settings.randomDelay;

        var persona = Storage.getPersona();
        if (el('aiPersona')) el('aiPersona').value = persona;
        if (Storage.hasApiKey() && el('geminiApiKey')) el('geminiApiKey').value = Storage.getApiKey();

        var saveApiKeyBtn = el('saveApiKey');
        if (saveApiKeyBtn) {
            saveApiKeyBtn.addEventListener('click', async function() {
                var apiKey = (el('geminiApiKey') || {}).value;
                apiKey = apiKey ? apiKey.trim() : '';
                if (!apiKey) {
                    App.showToast('Masukkan API Key! (Opsional - bisa tanpa API key)', 'warning');
                    return;
                }

                saveApiKeyBtn.innerHTML = '<span class="spinner"></span> Testing...';
                saveApiKeyBtn.disabled = true;

                var result = await AIEngine.testApiKey(apiKey);
                if (result.success) {
                    Storage.setApiKey(apiKey);
                    App.updateAIStatus();
                    App.showToast(result.warning || 'API Key berhasil! AI mode aktif 🤖', result.warning ? 'warning' : 'success');
                } else {
                    App.showToast('API Key error: ' + result.error, 'error');
                }

                saveApiKeyBtn.innerHTML = '<i class="fas fa-save"></i> Simpan API Key';
                saveApiKeyBtn.disabled = false;
            });
        }

        var toggleVisibility = el('toggleApiKeyVisibility');
        if (toggleVisibility) {
            toggleVisibility.addEventListener('click', function() {
                var input = el('geminiApiKey');
                if (input) input.type = input.type === 'password' ? 'text' : 'password';
            });
        }

        var saveCommentBtn = el('saveCommentSettings');
        if (saveCommentBtn) {
            saveCommentBtn.addEventListener('click', function() {
                Storage.setSettings({
                    commentDelay: parseInt((el('commentDelay') || {}).value) || 30,
                    maxDailyComments: parseInt((el('maxDailyComments') || {}).value) || 20,
                    commentLang: (el('commentLang') || {}).value || 'mixed',
                    useEmoji: el('useEmoji') ? el('useEmoji').checked : true,
                    randomDelay: el('randomDelay') ? el('randomDelay').checked : true,
                });
                App.showToast('Pengaturan tersimpan! ✅', 'success');
            });
        }

        var savePersonaBtn = el('savePersona');
        if (savePersonaBtn) {
            savePersonaBtn.addEventListener('click', function() {
                var personaText = (el('aiPersona') || {}).value;
                personaText = personaText ? personaText.trim() : '';
                if (personaText) {
                    Storage.setPersona(personaText);
                    App.showToast('AI Persona tersimpan! 🤖', 'success');
                }
            });
        }

        var themeToggle = el('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                var current = Storage.getTheme();
                var newTheme = current === 'dark' ? 'light' : 'dark';
                Storage.setTheme(newTheme);
                document.documentElement.setAttribute('data-theme', newTheme);
                var icon = themeToggle.querySelector('i');
                if (icon) icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            });
        }

        var apiKeyIndicator = el('apiKeyIndicator');
        if (apiKeyIndicator) {
            apiKeyIndicator.addEventListener('click', function() {
                App.navigateTo('settings');
            });
        }
    },

    updateAIStatus: function() {
        var ready = AIEngine.checkReady();
        var offline = AIEngine.offlineMode;
        var dot = document.getElementById('aiStatusDot');
        var text = document.getElementById('aiStatusText');
        var indicator = document.getElementById('apiKeyIndicator');

        if (dot) dot.classList.toggle('online', ready);
        if (text) {
            if (ready && !offline) {
                text.textContent = 'AI Online (Gemini)';
            } else {
                text.textContent = 'Smart Template ✓';
            }
        }
        if (indicator) indicator.classList.toggle('active', ready);
    },

    // =============================================
    // WORKFLOW PAGE
    // =============================================

    bindWorkflow: function() {
        var runBtn = document.getElementById('runWorkflow');
        if (runBtn) {
            runBtn.addEventListener('click', function() {
                var target = (document.getElementById('targetInput') || {}).value;
                target = target ? target.trim() : '';
                var style = (document.getElementById('commentStyle') || {}).value || 'genz';
                var customPrompt = (document.getElementById('customPrompt') || {}).value || '';

                if (!target) {
                    App.showToast('Masukkan target di Dashboard terlebih dahulu!', 'warning');
                    App.navigateTo('dashboard');
                    return;
                }

                WorkflowEngine.run({
                    platform: App.selectedPlatform,
                    target: target,
                    postCount: App.selectedPostCount,
                    style: style,
                    customPrompt: customPrompt,
                });
            });
        }

        var stopBtn = document.getElementById('stopWorkflow');
        if (stopBtn) {
            stopBtn.addEventListener('click', function() {
                WorkflowEngine.stop();
            });
        }

        var resetBtn = document.getElementById('resetWorkflow');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                WorkflowEngine.resetNodes();
                WorkflowEngine.clearLog();
                WorkflowEngine.log('Workflow direset. Siap dijalankan kembali.', 'info');
            });
        }
    },

    // =============================================
    // HISTORY (fixed: no duplicate event listeners)
    // =============================================

    loadHistory: function() {
        var history = Storage.getHistory();
        var tbody = document.getElementById('historyBody');
        if (!tbody) return;

        if (history.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5"><i class="fas fa-inbox"></i><p>Belum ada riwayat</p></td></tr>';
        } else {
            var rows = '';
            var items = history.slice(0, 100);
            for (var i = 0; i < items.length; i++) {
                var entry = items[i];
                var time = new Date(entry.timestamp).toLocaleString('id-ID');
                var platformIcon = entry.platform === 'instagram'
                    ? '<i class="fab fa-instagram" style="color:#E1306C"></i>'
                    : '<i class="fab fa-tiktok" style="color:#25F4EE"></i>';
                var statusBadge = entry.status === 'success'
                    ? '<span class="status-badge online">✅ Berhasil</span>'
                    : '<span class="status-badge offline">❌ Gagal</span>';
                var comment = entry.comment || '';
                var commentPreview = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;

                rows += '<tr>' +
                    '<td>' + time + '</td>' +
                    '<td>' + platformIcon + ' ' + entry.platform + '</td>' +
                    '<td>@' + (entry.target || '-') + '</td>' +
                    '<td title="' + comment.replace(/"/g, '&quot;') + '">' + commentPreview + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '</tr>';
            }
            tbody.innerHTML = rows;
        }

        // Bind event listeners ONLY ONCE
        if (!this._historyBound) {
            this._historyBound = true;

            var exportBtn = document.getElementById('exportHistory');
            if (exportBtn) {
                exportBtn.addEventListener('click', function() {
                    App.exportHistoryCSV(Storage.getHistory());
                });
            }

            var clearBtn = document.getElementById('clearHistory');
            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    if (confirm('Hapus semua riwayat?')) {
                        Storage.clearHistory();
                        App.loadHistory();
                        App.showToast('Riwayat dihapus', 'info');
                    }
                });
            }
        }
    },

    exportHistoryCSV: function(history) {
        var headers = ['Waktu', 'Platform', 'Target', 'Komentar', 'Status'];
        var rows = [];
        for (var i = 0; i < history.length; i++) {
            var h = history[i];
            rows.push([
                new Date(h.timestamp).toLocaleString('id-ID'),
                h.platform,
                h.target,
                '"' + (h.comment || '').replace(/"/g, '""') + '"',
                h.status
            ].join(','));
        }
        var csv = headers.join(',') + '\n' + rows.join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'autocomment_history_' + Date.now() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('History exported! 📥', 'success');
    },

    // =============================================
    // MODALS
    // =============================================

    bindModals: function() {
        var closeApiKeyModal = document.getElementById('closeApiKeyModal');
        if (closeApiKeyModal) {
            closeApiKeyModal.addEventListener('click', function() {
                var modal = document.getElementById('apiKeyModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        var saveFirstTimeApiKey = document.getElementById('saveFirstTimeApiKey');
        if (saveFirstTimeApiKey) {
            saveFirstTimeApiKey.addEventListener('click', async function() {
                var input = document.getElementById('firstTimeApiKey');
                var apiKey = input ? input.value.trim() : '';
                if (!apiKey) {
                    App.showToast('Masukkan API Key! (Opsional)', 'warning');
                    return;
                }

                saveFirstTimeApiKey.innerHTML = '<span class="spinner"></span> Testing...';
                saveFirstTimeApiKey.disabled = true;

                var result = await AIEngine.testApiKey(apiKey);
                if (result.success) {
                    Storage.setApiKey(apiKey);
                    App.updateAIStatus();
                    var modal = document.getElementById('apiKeyModal');
                    if (modal) modal.classList.add('hidden');
                    App.showToast(result.warning || '🎉 AI diaktifkan!', result.warning ? 'warning' : 'success');
                    if (!result.warning) App.confetti();
                } else {
                    App.showToast('API Key error: ' + result.error, 'error');
                }

                saveFirstTimeApiKey.innerHTML = '<i class="fas fa-rocket"></i> Aktifkan AI';
                saveFirstTimeApiKey.disabled = false;
            });
        }

        var closePreviewModal = document.getElementById('closePreviewModal');
        if (closePreviewModal) {
            closePreviewModal.addEventListener('click', function() {
                var modal = document.getElementById('aiPreviewModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        var overlays = document.querySelectorAll('.modal-overlay');
        for (var i = 0; i < overlays.length; i++) {
            (function(overlay) {
                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay) overlay.classList.add('hidden');
                });
            })(overlays[i]);
        }
    },

    // =============================================
    // ACTIVITY LOG
    // =============================================

    addActivity: function(title, description, color, icon) {
        color = color || '#7C3AED';
        icon = icon || 'fas fa-comment';
        var log = document.getElementById('activityLog');
        if (!log) return;

        var empty = log.querySelector('.activity-empty');
        if (empty) empty.remove();

        var time = new Date().toLocaleTimeString('id-ID');
        var item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = '<div class="activity-icon" style="background: ' + color + '20; color: ' + color + ';"><i class="' + icon + '"></i></div>' +
            '<div class="activity-text"><h4>' + title + '</h4><p>' + description + '</p></div>' +
            '<span class="activity-time">' + time + '</span>';

        log.prepend(item);
        while (log.children.length > 20) log.removeChild(log.lastChild);
    },

    // =============================================
    // UTILITY
    // =============================================

    showToast: function(message, type) {
        type = type || 'info';
        var container = document.getElementById('toastContainer');
        if (!container) return;

        var icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
        };

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.innerHTML = '<i class="toast-icon ' + (icons[type] || icons.info) + '"></i>' +
            '<span class="toast-message">' + message + '</span>' +
            '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';

        container.appendChild(toast);
        setTimeout(function() {
            toast.classList.add('toast-exit');
            setTimeout(function() { toast.remove(); }, 300);
        }, 4000);
    },

    confetti: function() {
        var colors = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
        for (var i = 0; i < 30; i++) {
            var piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.cssText = 'left:' + (Math.random() * 100) + 'vw;' +
                'background:' + colors[Math.floor(Math.random() * colors.length)] + ';' +
                'border-radius:' + (Math.random() > 0.5 ? '50%' : '0') + ';' +
                'animation-delay:' + (Math.random() * 0.5) + 's;' +
                'animation-duration:' + (2 + Math.random() * 2) + 's;';
            document.body.appendChild(piece);
            (function(p) { setTimeout(function() { p.remove(); }, 4000); })(piece);
        }
    },

    updateLoadingStatus: function(text) {
        var el = document.querySelector('.loader-status');
        if (el) el.textContent = text;
    },

    sleep: function(ms) {
        return new Promise(function(r) { setTimeout(r, ms); });
    },
};

// =============================================
// BOOT 🚀
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
