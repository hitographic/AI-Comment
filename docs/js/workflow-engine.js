/**
 * =============================================
 * ⚡ WORKFLOW ENGINE
 * =============================================
 * Visual workflow execution engine (n8n-style)
 * Steps: Login → Scan → AI Analysis → Generate → Post
 */

const WorkflowEngine = {
    isRunning: false,
    shouldStop: false,
    currentStep: 0,
    
    nodes: ['login', 'scan', 'ai', 'generate', 'post'],
    connectors: ['conn-1-2', 'conn-2-3', 'conn-3-4', 'conn-4-5'],

    /**
     * Reset all node visual states
     */
    resetNodes() {
        this.nodes.forEach(node => {
            const el = document.getElementById(`node-${node}`);
            if (el) {
                el.classList.remove('active', 'completed', 'error');
            }
        });
        this.connectors.forEach(conn => {
            const el = document.getElementById(conn);
            if (el) {
                el.classList.remove('active', 'completed', 'flowing');
            }
        });
        // Reset status texts
        document.querySelectorAll('.node-status').forEach(el => {
            el.textContent = 'Menunggu...';
            el.className = 'node-status';
        });
    },

    /**
     * Set node state
     */
    setNodeState(nodeName, state, statusText = '') {
        const el = document.getElementById(`node-${nodeName}`);
        if (!el) return;

        el.classList.remove('active', 'completed', 'error');
        if (state) el.classList.add(state);

        if (statusText) {
            const statusEl = el.querySelector('.node-status');
            if (statusEl) {
                statusEl.textContent = statusText;
                statusEl.className = `node-status ${state === 'active' ? 'running' : state === 'completed' ? 'done' : state === 'error' ? 'error' : ''}`;
            }
        }
    },

    /**
     * Set connector state
     */
    setConnectorState(index, state) {
        const el = document.getElementById(this.connectors[index]);
        if (!el) return;
        el.classList.remove('active', 'completed', 'flowing');
        if (state) el.classList.add(state);
    },

    /**
     * Add log entry
     */
    log(message, type = 'info') {
        const logContainer = document.getElementById('workflowLog');
        if (!logContainer) return;

        const now = new Date();
        const time = now.toLocaleTimeString('id-ID');
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-msg">${message}</span>
        `;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    /**
     * Clear log
     */
    clearLog() {
        const logContainer = document.getElementById('workflowLog');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    },

    /**
     * Delay helper with random variance
     */
    async delay(ms) {
        const settings = Storage.getSettings();
        if (settings.randomDelay) {
            ms = ms + Math.random() * ms * 0.5;
        }
        return new Promise(r => setTimeout(r, ms));
    },

    /**
     * Run the full workflow
     */
    async run(options) {
        if (this.isRunning) {
            App.showToast('Workflow sedang berjalan!', 'warning');
            return;
        }

        const {
            platform = 'instagram',
            target = '',
            postCount = 5,
            style = 'genz',
            customPrompt = '',
            postData = null,  // For manual/uploaded post data
        } = options;

        this.isRunning = true;
        this.shouldStop = false;
        this.currentStep = 0;
        this.resetNodes();
        this.clearLog();

        // Update UI
        document.getElementById('runWorkflow')?.classList.add('hidden');
        document.getElementById('stopWorkflow')?.classList.remove('hidden');

        this.log('🚀 Workflow dimulai!', 'info');
        this.log(`Platform: ${platform} | Target: ${target} | Posts: ${postCount}`, 'info');

        try {
            // ===== STEP 1: LOGIN CHECK =====
            await this.executeStep1_Login(platform);

            if (this.shouldStop) throw new Error('Workflow dihentikan user');

            // ===== STEP 2: SCAN POSTS =====
            const posts = await this.executeStep2_Scan(platform, target, postCount, postData);

            if (this.shouldStop) throw new Error('Workflow dihentikan user');

            // ===== STEP 3-5: Process each post =====
            let successCount = 0;
            let failCount = 0;
            const settings = Storage.getSettings();

            for (let i = 0; i < posts.length; i++) {
                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                this.log(`\n📝 Processing post ${i + 1}/${posts.length}...`, 'info');

                // Step 3: AI Analysis
                const analysis = await this.executeStep3_AIAnalysis(posts[i]);

                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                // Step 4: Generate Comment
                const comment = await this.executeStep4_Generate(posts[i], style, customPrompt);

                if (this.shouldStop) throw new Error('Workflow dihentikan user');

                // Step 5: Post Comment
                const result = await this.executeStep5_Post(platform, posts[i], comment);

                if (result.success) {
                    successCount++;
                    Storage.updateStats({
                        [platform === 'instagram' ? 'igComments' : 'ttComments']: 1,
                        aiGenerated: 1,
                        totalSuccess: 1,
                    });
                    Storage.addHistory({
                        platform,
                        target: posts[i].username,
                        comment: comment,
                        status: 'success',
                    });
                } else {
                    failCount++;
                    Storage.updateStats({ totalFailed: 1 });
                    Storage.addHistory({
                        platform,
                        target: posts[i].username,
                        comment: comment,
                        status: 'failed',
                        error: result.error,
                    });
                }

                // Delay between comments
                if (i < posts.length - 1) {
                    const delayMs = settings.commentDelay * 1000;
                    this.log(`⏳ Menunggu ${settings.commentDelay}s sebelum komentar berikutnya...`, 'warning');
                    await this.delay(delayMs);
                }
            }

            // ===== DONE =====
            this.log(`\n✅ Workflow selesai! Success: ${successCount}, Failed: ${failCount}`, 'success');
            App.showToast(`Workflow selesai! ${successCount} komentar berhasil dikirim 🎉`, 'success');
            
            // Celebration
            if (successCount > 0) {
                App.confetti();
            }

        } catch (error) {
            this.log(`\n❌ Error: ${error.message}`, 'error');
            App.showToast(error.message, 'error');
        } finally {
            this.isRunning = false;
            this.shouldStop = false;
            document.getElementById('runWorkflow')?.classList.remove('hidden');
            document.getElementById('stopWorkflow')?.classList.add('hidden');
            App.updateDashboard();
        }
    },

    /**
     * Stop workflow
     */
    stop() {
        this.shouldStop = true;
        this.log('⛔ Menghentikan workflow...', 'warning');
    },

    // =============================================
    // STEP IMPLEMENTATIONS
    // =============================================

    async executeStep1_Login(platform) {
        this.setNodeState('login', 'active', 'Checking...');
        this.log('🔐 Step 1: Mengecek status login...', 'info');
        
        await this.delay(800);

        const api = platform === 'instagram' ? SocialAPI.instagram : SocialAPI.tiktok;
        
        if (!api.isLoggedIn) {
            this.setNodeState('login', 'error', 'Belum login!');
            throw new Error(`Belum login ${platform}! Silakan login di halaman Akun.`);
        }

        this.setNodeState('login', 'completed', `@${api.username}`);
        this.setConnectorState(0, 'completed');
        this.log(`✅ Login OK: @${api.username}`, 'success');
    },

    async executeStep2_Scan(platform, target, count, manualData) {
        this.setNodeState('scan', 'active', 'Scanning...');
        this.setConnectorState(0, 'active');
        this.log(`🔍 Step 2: Scanning ${count} post dari ${target || 'manual'}...`, 'info');

        await this.delay(1500);

        let posts;
        if (manualData) {
            posts = Array.isArray(manualData) ? manualData : [manualData];
        } else {
            if (platform === 'instagram') {
                posts = await SocialAPI.getInstagramPosts(target, count);
            } else {
                posts = await SocialAPI.getTiktokPosts(target, count);
            }
        }

        this.setNodeState('scan', 'completed', `${posts.length} post`);
        this.setConnectorState(1, 'completed');
        this.log(`✅ Ditemukan ${posts.length} post`, 'success');

        return posts;
    },

    async executeStep3_AIAnalysis(post) {
        this.setNodeState('ai', 'active', 'Analyzing...');
        this.setConnectorState(1, 'active');
        this.log(`🧠 Step 3: AI membaca konteks post @${post.username}...`, 'ai');

        await this.delay(1000);

        let analysis = {
            hasImage: !!post.imageUrl || !!post.imageBase64,
            hasCaption: !!post.caption,
            topic: 'general',
        };

        if (post.caption) {
            this.log(`   📝 Caption: "${post.caption.substring(0, 80)}${post.caption.length > 80 ? '...' : ''}"`, 'ai');
        }
        if (analysis.hasImage) {
            this.log(`   🖼️ Gambar terdeteksi - AI akan analisis visual`, 'ai');
        }

        this.setNodeState('ai', 'completed', 'Analyzed ✓');
        this.setConnectorState(2, 'completed');

        return analysis;
    },

    async executeStep4_Generate(post, style, customPrompt) {
        this.setNodeState('generate', 'active', 'Generating...');
        this.setConnectorState(2, 'active');
        this.log(`✨ Step 4: AI generating komentar Gen Z...`, 'ai');

        let comment;
        
        try {
            if (AIEngine.checkReady()) {
                comment = await AIEngine.smartComment(post, style, customPrompt);
                this.log(`   🤖 AI Generated: "${comment}"`, 'ai');
            } else {
                comment = AIEngine.generateFallbackComment();
                this.log(`   📝 Template comment: "${comment}" (API key belum diset)`, 'warning');
            }
        } catch (error) {
            this.log(`   ⚠️ AI error, using fallback: ${error.message}`, 'warning');
            comment = AIEngine.generateFallbackComment();
        }

        this.setNodeState('generate', 'completed', 'Generated ✓');
        this.setConnectorState(3, 'completed');

        return comment;
    },

    async executeStep5_Post(platform, post, comment) {
        this.setNodeState('post', 'active', 'Posting...');
        this.setConnectorState(3, 'active');
        this.log(`📤 Step 5: Mengirim komentar ke ${platform}...`, 'info');

        try {
            let result;
            if (platform === 'instagram') {
                result = await SocialAPI.postInstagramComment(post.id, comment);
            } else {
                result = await SocialAPI.postTiktokComment(post.id, comment);
            }

            this.setNodeState('post', 'completed', 'Posted ✓');
            this.log(`✅ Komentar berhasil dikirim!`, 'success');
            
            // Add to activity log
            App.addActivity(
                `Komentar dikirim ke @${post.username}`,
                `"${comment}"`,
                platform === 'instagram' ? '#E1306C' : '#25F4EE',
                platform === 'instagram' ? 'fab fa-instagram' : 'fab fa-tiktok'
            );

            return { success: true };
        } catch (error) {
            this.setNodeState('post', 'error', 'Failed!');
            this.log(`❌ Gagal: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
};
