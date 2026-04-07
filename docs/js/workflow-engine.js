/**
 * =============================================
 * ⚡ WORKFLOW ENGINE v2.0
 * =============================================
 * Alur:
 * 1. Login Check
 * 2. Scan N post dari target user (ambil caption)
 * 3. Smart Analysis (detect kategori dari caption)
 * 4. Generate komentar yang relevan dengan konten
 * 5. Post komentar otomatis
 *
 * Bisa jalan TANPA API Key!
 */

var WorkflowEngine = {
    isRunning: false,
    shouldStop: false,
    currentStep: 0,

    nodes: ['login', 'scan', 'ai', 'generate', 'post'],
    connectors: ['conn-1-2', 'conn-2-3', 'conn-3-4', 'conn-4-5'],

    resetNodes: function() {
        for (var i = 0; i < this.nodes.length; i++) {
            var el = document.getElementById('node-' + this.nodes[i]);
            if (el) el.classList.remove('active', 'completed', 'error');
        }
        for (var j = 0; j < this.connectors.length; j++) {
            var cel = document.getElementById(this.connectors[j]);
            if (cel) cel.classList.remove('active', 'completed', 'flowing');
        }
        var statusEls = document.querySelectorAll('.node-status');
        for (var k = 0; k < statusEls.length; k++) {
            statusEls[k].textContent = 'Menunggu...';
            statusEls[k].className = 'node-status';
        }
    },

    setNodeState: function(nodeName, state, statusText) {
        var el = document.getElementById('node-' + nodeName);
        if (!el) return;
        el.classList.remove('active', 'completed', 'error');
        if (state) el.classList.add(state);
        if (statusText) {
            var statusEl = el.querySelector('.node-status');
            if (statusEl) {
                statusEl.textContent = statusText;
                statusEl.className = 'node-status ' +
                    (state === 'active' ? 'running' : state === 'completed' ? 'done' : state === 'error' ? 'error' : '');
            }
        }
    },

    setConnectorState: function(index, state) {
        var el = document.getElementById(this.connectors[index]);
        if (!el) return;
        el.classList.remove('active', 'completed', 'flowing');
        if (state) el.classList.add(state);
    },

    log: function(message, type) {
        type = type || 'info';
        var logContainer = document.getElementById('workflowLog');
        if (!logContainer) return;
        var time = new Date().toLocaleTimeString('id-ID');
        var entry = document.createElement('div');
        entry.className = 'log-entry log-' + type;
        entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-msg">' + message + '</span>';
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    clearLog: function() {
        var logContainer = document.getElementById('workflowLog');
        if (logContainer) logContainer.innerHTML = '';
    },

    delay: async function(ms) {
        var settings = Storage.getSettings();
        if (settings.randomDelay) {
            ms = ms + Math.random() * ms * 0.5;
        }
        return new Promise(function(r) { setTimeout(r, ms); });
    },

    // =============================================
    // MAIN WORKFLOW
    // =============================================

    run: async function(options) {
        if (this.isRunning) {
            App.showToast('Workflow sedang berjalan!', 'warning');
            return;
        }

        var platform = options.platform || 'instagram';
        var target = options.target || '';
        var postCount = options.postCount || 5;
        var style = options.style || 'genz';
        var customPrompt = options.customPrompt || '';
        var postData = options.postData || null;

        this.isRunning = true;
        this.shouldStop = false;
        this.currentStep = 0;
        this.resetNodes();
        this.clearLog();

        var runBtn = document.getElementById('runWorkflow');
        var stopBtn = document.getElementById('stopWorkflow');
        if (runBtn) runBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');

        this.log('🚀 Workflow dimulai!', 'info');
        this.log('Platform: ' + platform + ' | Target: ' + target + ' | Posts: ' + postCount, 'info');

        var hasApiKey = Storage.hasApiKey();
        if (hasApiKey) {
            this.log('🤖 Mode: AI (Gemini) + Smart Template fallback', 'info');
        } else {
            this.log('🧠 Mode: Smart Template (tanpa API key)', 'info');
            this.log('💡 Komentar akan disesuaikan dengan isi caption setiap post', 'info');
        }

        try {
            // STEP 1: LOGIN CHECK
            await this.executeStep1_Login(platform);
            if (this.shouldStop) throw new Error('Workflow dihentikan user');

            // STEP 2: SCAN POSTS
            var posts = await this.executeStep2_Scan(platform, target, postCount, postData);
            if (this.shouldStop) throw new Error('Workflow dihentikan user');

            // STEP 3-5: Process each post
            var successCount = 0;
            var failCount = 0;
            var settings = Storage.getSettings();

            for (var i = 0; i < posts.length; i++) {
                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                this.log('', 'info');
                this.log('━━━ Post ' + (i + 1) + '/' + posts.length + ' ━━━', 'info');

                // Step 3: Analyze caption
                var analysis = await this.executeStep3_AIAnalysis(posts[i]);
                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                // Step 4: Generate comment based on analysis
                var comment = await this.executeStep4_Generate(posts[i], style, customPrompt);
                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                // Step 5: Post comment
                var result = await this.executeStep5_Post(platform, posts[i], comment);

                if (result.success) {
                    successCount++;
                    Storage.updateStats({
                        [platform === 'instagram' ? 'igComments' : 'ttComments']: 1,
                        aiGenerated: 1,
                        totalSuccess: 1,
                    });
                    Storage.addHistory({
                        platform: platform,
                        target: posts[i].username,
                        comment: comment,
                        caption: (posts[i].caption || '').substring(0, 80),
                        category: analysis.category,
                        status: 'success',
                    });
                } else {
                    failCount++;
                    Storage.updateStats({ totalFailed: 1 });
                    Storage.addHistory({
                        platform: platform,
                        target: posts[i].username,
                        comment: comment,
                        status: 'failed',
                        error: result.error,
                    });
                }

                // Delay between comments
                if (i < posts.length - 1) {
                    var delayMs = settings.commentDelay * 1000;
                    this.log('⏳ Menunggu ' + settings.commentDelay + 's sebelum post berikutnya...', 'warning');
                    await this.delay(delayMs);
                }
            }

            // DONE
            this.log('', 'info');
            this.log('✅ Workflow selesai! ✅', 'success');
            this.log('📊 Berhasil: ' + successCount + ' | Gagal: ' + failCount, 'success');
            App.showToast('Workflow selesai! ' + successCount + ' komentar berhasil 🎉', 'success');
            if (successCount > 0) App.confetti();

        } catch (error) {
            this.log('❌ ' + error.message, 'error');
            App.showToast(error.message, 'error');
        } finally {
            this.isRunning = false;
            this.shouldStop = false;
            if (runBtn) runBtn.classList.remove('hidden');
            if (stopBtn) stopBtn.classList.add('hidden');
            App.updateDashboard();
        }
    },

    stop: function() {
        this.shouldStop = true;
        this.log('⛔ Menghentikan workflow...', 'warning');
    },

    // =============================================
    // STEP IMPLEMENTATIONS
    // =============================================

    executeStep1_Login: async function(platform) {
        this.setNodeState('login', 'active', 'Checking...');
        this.log('🔐 Step 1: Cek status login...', 'info');
        await this.delay(800);

        var api = platform === 'instagram' ? SocialAPI.instagram : SocialAPI.tiktok;
        if (!api.isLoggedIn) {
            this.setNodeState('login', 'error', 'Belum login!');
            throw new Error('Belum login ' + platform + '! Silakan login di halaman Akun.');
        }

        this.setNodeState('login', 'completed', '@' + api.username);
        this.setConnectorState(0, 'completed');
        this.log('✅ Login OK: @' + api.username, 'success');
    },

    executeStep2_Scan: async function(platform, target, count, manualData) {
        this.setNodeState('scan', 'active', 'Scanning...');
        this.setConnectorState(0, 'active');
        this.log('🔍 Step 2: Mengambil ' + count + ' post dari ' + (target || 'manual') + '...', 'info');
        await this.delay(1500);

        var posts;
        if (manualData) {
            posts = Array.isArray(manualData) ? manualData : [manualData];
        } else if (platform === 'instagram') {
            posts = await SocialAPI.getInstagramPosts(target, count);
        } else {
            posts = await SocialAPI.getTiktokPosts(target, count);
        }

        this.setNodeState('scan', 'completed', posts.length + ' post');
        this.setConnectorState(1, 'completed');
        this.log('✅ Ditemukan ' + posts.length + ' post dari @' + (target || 'user'), 'success');
        return posts;
    },

    executeStep3_AIAnalysis: async function(post) {
        this.setNodeState('ai', 'active', 'Analyzing...');
        this.setConnectorState(1, 'active');

        var caption = post.caption || '';
        var category = AIEngine.detectCategory(caption);

        this.log('🧠 Step 3: Analisis caption...', 'ai');
        if (caption) {
            var preview = caption.length > 70 ? caption.substring(0, 70) + '...' : caption;
            this.log('   📝 Caption: "' + preview + '"', 'ai');
        }
        this.log('   🏷️ Kategori: ' + category.toUpperCase(), 'ai');

        await this.delay(800);

        this.setNodeState('ai', 'completed', category);
        this.setConnectorState(2, 'completed');

        return { category: category, hasCaption: !!caption };
    },

    executeStep4_Generate: async function(post, style, customPrompt) {
        this.setNodeState('generate', 'active', 'Generating...');
        this.setConnectorState(2, 'active');
        this.log('✨ Step 4: Generate komentar...', 'ai');

        var comment;
        try {
            comment = await AIEngine.smartComment(post, style, customPrompt);
            if (Storage.hasApiKey()) {
                this.log('   🤖 AI Generated: "' + comment + '"', 'ai');
            } else {
                this.log('   🧠 Smart Template: "' + comment + '"', 'ai');
            }
        } catch (error) {
            this.log('   ⚠️ Fallback: ' + error.message, 'warning');
            var result = AIEngine.generateSmartComment(post.caption || '');
            comment = result.comment;
        }

        this.setNodeState('generate', 'completed', 'Generated ✓');
        this.setConnectorState(3, 'completed');
        return comment;
    },

    executeStep5_Post: async function(platform, post, comment) {
        this.setNodeState('post', 'active', 'Posting...');
        this.setConnectorState(3, 'active');
        this.log('📤 Step 5: Mengirim komentar...', 'info');

        try {
            var result;
            if (platform === 'instagram') {
                result = await SocialAPI.postInstagramComment(post.id, comment);
            } else {
                result = await SocialAPI.postTiktokComment(post.id, comment);
            }

            this.setNodeState('post', 'completed', 'Posted ✓');
            this.log('✅ Komentar berhasil dikirim!', 'success');

            App.addActivity(
                'Komentar ke @' + post.username,
                '"' + comment + '"',
                platform === 'instagram' ? '#E1306C' : '#25F4EE',
                platform === 'instagram' ? 'fab fa-instagram' : 'fab fa-tiktok'
            );
            return { success: true };
        } catch (error) {
            this.setNodeState('post', 'error', 'Failed!');
            this.log('❌ Gagal: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },
};
