/**
 * Ana Uygulama - Tema ve Navigasyon Yönetimi
 */

class App {
    constructor() {
        this.currentMode = null;
        this.pendingMode = null;
        this.pendingSessionOptions = this.normalizeSessionOptions();
        this.selectedQuestionCount = null;
        this.stats = this.loadStats();
        this.init();
    }

    async init() {
        this.setupTheme();

        // Önce kelimeleri yükle
        if (typeof loadWords === 'function') {
            await loadWords();
        }

        window.storageManager?.migrateUserData();
        this.reloadUserDataManagers();
        this.setupNavigation();
        this.setupModals();
        window.notificationManager?.init?.();
        this.updateStatsDisplay();
        this.checkWords();

        // Günlük hedef ve streak göster
        window.goalsManager?.updateDisplay();

        this.setupPWA();
    }

    reloadUserDataManagers() {
        this.stats = this.loadStats();
        window.favoritesManager?.reload?.();
        window.srsManager?.reload?.();
    }

    // ===== PWA Kurulum Yönetimi =====
    setupPWA() {
        this.deferredPrompt = null;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            // Chrome 67 ve öncesi için otomatik prompt'u engelle
            e.preventDefault();
            // Etkinliği daha sonra kullanmak üzere sakla
            this.deferredPrompt = e;
            // Kurulum butonunu göster
            installBtn.style.display = 'flex';
        });

        installBtn.addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            // Kurulum prompt'unu göster
            this.deferredPrompt.prompt();
            // Kullanıcının cevabını bekle
            await this.deferredPrompt.userChoice;
            // Prompt used
            // Prompt bir kez kullanılabilir, sıfırla
            this.deferredPrompt = null;
            // Butonu gizle
            installBtn.style.display = 'none';
        });

        window.addEventListener('appinstalled', () => {
            // Kurulum tamamlandı, butonu gizle
            installBtn.style.display = 'none';
            this.deferredPrompt = null;
            // PWA installed
        });

        this.requestPersistentStorage();
    }

    async requestPersistentStorage() {
        if (!navigator.storage?.persist) return;

        try {
            await navigator.storage.persist();
        } catch (error) {
            console.error('Kalıcı depolama isteği başarısız oldu', error);
        }
    }

    // ===== Tema Yönetimi =====
    setupTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);

        const toggle = document.getElementById('theme-toggle');
        toggle.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // ===== Güvenlik Yardımcıları =====
    sanitizeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async showWrongFeedback(feedbackEl, correctText, word) {
        // Eski satıriçi (inline) bildirim sistemini (fallback olarak) tutabiliriz veya tamamen kapatabiliriz.
        // Ancak yeni sistemde await app.showSnackbar üzerinden gideceğimiz için burası artık pek kullanılmayacak.
        feedbackEl.innerHTML = `❌ Неправильно! Правильно: <strong>${this.sanitizeHTML(correctText)}</strong>`;
        if (window.aiManager) {
            try {
                const aiResult = await window.aiManager.explainWord(word);
                if (aiResult) {
                    feedbackEl.innerHTML += `<br><br>🤖 ${this.sanitizeHTML(aiResult)}`;
                }
            } catch (e) { /* silent */ }
        }
    }

    // ===== Gamified Snackbar (Duolingo Style Notification) =====
    async showSnackbar(isCorrect, mainText, subText = '') {
        return new Promise((resolve) => {
            const snackbar = document.getElementById('snackbar');
            const icon = document.getElementById('snackbarIcon');
            const textEl = document.getElementById('snackbarText');
            const btn = document.getElementById('snackbarNextBtn');

            if (!snackbar) { resolve(); return; }

            // Özellikleri ayarla
            snackbar.className = `snackbar show ${isCorrect ? 'correct' : 'wrong'}`;
            icon.textContent = isCorrect ? '✓' : '×';

            let html = `<div>${this.sanitizeHTML(mainText)}</div>`;
            if (subText) {
                html += `<div style="font-size: 0.95rem; margin-top: 0.25rem; font-weight: 500; opacity: 0.85;">${this.sanitizeHTML(subText)}</div>`;
            }
            textEl.innerHTML = html;

            // Birden fazla eventListener eklenmesini önlemek için butonu klonlayıp temizliyoruz.
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // "Devam Et" tıklanınca sözü (Promise) yerine getir ve sekmeyi kapat
            newBtn.addEventListener('click', () => {
                snackbar.classList.remove('show');
                resolve();
            });
        });
    }

    normalizeSessionOptions(options = {}) {
        return {
            scope: options.scope === 'all' ? 'all' : 'learning'
        };
    }

    getPendingWords() {
        const masteredIds = new Set(this.stats.masteredWords || []);
        return WORDS.filter(word => !masteredIds.has(this.getWordStorageKey(word.id)));
    }

    getStudyPool(options = {}) {
        const sessionOptions = this.normalizeSessionOptions(options);

        if (sessionOptions.customWordList && Array.isArray(sessionOptions.customWordList)) {
            return [...sessionOptions.customWordList];
        }

        if (sessionOptions.scope === 'all') {
            return [...WORDS];
        }

        return this.getLearningWords(Number(options.minCount) || 0);
    }

    buildCoverageLabel(options = {}) {
        const sessionOptions = this.normalizeSessionOptions(options);
        const total = Number(options.total) || 0;

        if (sessionOptions.scope !== 'all' || total <= 0) {
            return '';
        }

        const covered = Math.min(Math.max(Number(options.covered) || 0, 0), total);
        if (options.wrapped) {
            return `Kapsama: yeni tur ${covered}/${total}`;
        }

        return `Kapsama: ${covered}/${total}`;
    }

    updateCoverageIndicator(elementId, label = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (!label) {
            element.textContent = '';
            element.classList.add('hidden');
            return;
        }

        element.textContent = label;
        element.classList.remove('hidden');
    }

    getQuestionCountTitle() {
        if (this.pendingMode === 'flashcard') return 'Flashcard için kaç kart çalışmak istiyorsun?';
        if (this.pendingMode === 'quiz') return 'Quiz için kaç soru çözmek istiyorsun?';
        if (this.pendingMode === 'typing') return 'Yazma modu için kaç kelime çalışmak istiyorsun?';
        return 'Kaç soru çalışmak istiyorsun?';
    }

    modeUsesStudyScope(mode) {
        return ['flashcard', 'quiz', 'typing'].includes(mode);
    }

    setQuestionCountScope(scope = 'learning') {
        const normalizedScope = scope === 'all' ? 'all' : 'learning';
        this.pendingSessionOptions = this.normalizeSessionOptions({
            ...this.pendingSessionOptions,
            scope: normalizedScope
        });

        document.querySelectorAll('#questionCountModal .scope-btn').forEach(button => {
            const isActive = button.dataset.scope === normalizedScope;
            button.classList.toggle('primary', isActive);
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        const helpText = document.getElementById('questionCountHelp');
        if (!helpText) return;

        if (normalizedScope === 'all') {
            helpText.textContent = 'Tüm kelimeler ortak bir havuzdan gelir. Kısa oturumlarda bile seanslar arasında kaldığın yer korunur.';
            return;
        }

        helpText.textContent = 'Öncelik öğrenilmemiş kelimelerde kalır. Havuz soru sayısına yetmezse sistem otomatik olarak tüm kelimelere genişler.';
    }

    updateQuestionCountModal() {
        const title = document.getElementById('questionCountTitle');
        if (title) {
            title.textContent = this.getQuestionCountTitle();
        }

        const scopeSection = document.getElementById('questionCountScopeSection');
        const usesStudyScope = this.modeUsesStudyScope(this.pendingMode);
        if (scopeSection) {
            scopeSection.classList.toggle('hidden', !usesStudyScope);
        }

        const learningCount = document.getElementById('questionCountLearningCount');
        if (learningCount) {
            learningCount.textContent = `${this.getPendingWords().length} kelime`;
        }

        const allCount = document.getElementById('questionCountAllCount');
        if (allCount) {
            allCount.textContent = `${WORDS.length} kelime`;
        }

        if (usesStudyScope) {
            this.setQuestionCountScope(this.pendingSessionOptions.scope);
        }
    }

    // ===== Navigasyon =====
    setupNavigation() {
        // Mod kartlarına tıklama
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                this.openMode(mode);
            });
        });

        // Geri butonları
        document.querySelectorAll('[data-back]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent double firing
                this.closeMode();
            });
        });

        // Soru Sayısı Modal Butonları - EKLENDI
        document.querySelectorAll('#questionCountModal .modal-btn[data-count]').forEach(btn => {
            btn.addEventListener('click', () => {
                const count = parseInt(btn.dataset.count);
                if (this.pendingMode) {
                    this.startMode(this.pendingMode, count, this.pendingSessionOptions);
                    document.getElementById('questionCountModal').classList.add('hidden');
                    this.pendingMode = null;
                    this.pendingSessionOptions = this.normalizeSessionOptions();
                }
            });
        });

        document.querySelectorAll('#questionCountModal .scope-btn[data-scope]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setQuestionCountScope(btn.dataset.scope);
            });
        });

        // Modal İptal Butonu
        const cancelBtn = document.getElementById('questionCountCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('questionCountModal').classList.add('hidden');
                this.pendingMode = null;
                this.pendingSessionOptions = this.normalizeSessionOptions();
            });
        }

        // Header Butonları
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                document.getElementById('settingsModal').classList.remove('hidden');
            });
        }

        const addWordBtn = document.getElementById('add-word-btn');
        if (addWordBtn) {
            addWordBtn.addEventListener('click', () => this.openAddWordModal());
        }

        const allWordsBtn = document.getElementById('all-words-btn');
        if (allWordsBtn) {
            allWordsBtn.addEventListener('click', () => this.openMode('allwords'));
        }

        const trashBtn = document.getElementById('trash-btn');
        if (trashBtn) {
            trashBtn.addEventListener('click', () => this.openMode('trash'));
        }

        const favListBtn = document.getElementById('favorites-list-btn');
        if (favListBtn) {
            favListBtn.addEventListener('click', () => {
                this.showFavorites();
            });
        }

        // Ayarlar Modal Kapatma
        const settingsClose = document.getElementById('settingsClose');
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                document.getElementById('settingsModal').classList.add('hidden');
            });
        }
    }

    setupModals() {
        // Hedef butonları
        document.querySelectorAll('.goal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = parseInt(btn.dataset.goal);
                window.goalsManager?.setGoal(goal);

                // Visual feedback
                document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        this.setupDataControls();
        this.setupAddWordModal();
    }

    setupDataControls() {
        document.getElementById('refreshAppBtn')?.addEventListener('click', () => {
            this.refreshAppContent();
        });

        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportUserData();
        });

        document.getElementById('importDataInput')?.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;

            this.importUserData(file);
            event.target.value = '';
        });
    }

    setupAddWordModal() {
        document.getElementById('addWordForm')?.addEventListener('submit', event => {
            this.handleAddWordSubmit(event);
        });

        document.getElementById('addWordCancel')?.addEventListener('click', () => {
            this.closeAddWordModal();
        });
    }

    openAddWordModal() {
        const modal = document.getElementById('addWordModal');
        if (!modal) return;

        this.resetAddWordForm();
        modal.classList.remove('hidden');
        document.getElementById('addWordRussian')?.focus();
    }

    closeAddWordModal() {
        document.getElementById('addWordModal')?.classList.add('hidden');
        this.resetAddWordForm();
    }

    resetAddWordForm() {
        document.getElementById('addWordForm')?.reset();
        this.setAddWordStatus('');
    }

    getAddWordFormValues() {
        return {
            russian: document.getElementById('addWordRussian')?.value || '',
            turkish: document.getElementById('addWordTurkish')?.value || ''
        };
    }

    setAddWordStatus(message, type = 'info') {
        const status = document.getElementById('addWordStatus');
        if (!status) return;

        status.textContent = message;
        status.dataset.type = type;
        status.classList.toggle('hidden', !message);
    }

    async reloadWordsAfterUserChange() {
        const loaded = typeof loadWords === 'function' ? await loadWords() : false;
        if (!loaded) throw new Error('Kelime havuzu yenilenemedi.');

        window.storageManager?.migrateUserData();
        this.reloadUserDataManagers();
        this.updateStatsDisplay();
        this.checkWords();
        window.goalsManager?.updateDisplay();
    }

    async handleAddWordSubmit(event) {
        event.preventDefault();
        const submitButton = document.getElementById('addWordSubmit');
        if (submitButton) submitButton.disabled = true;
        this.setAddWordStatus('Добавление слова...');

        try {
            if (!window.userWordsManager) throw new Error('Менеджер хранения слов не готов.');

            window.userWordsManager.addRecord(this.getAddWordFormValues());
            await this.reloadWordsAfterUserChange();
            this.setAddWordStatus('Слово добавлено и перенесено в пул.', 'success');
            window.setTimeout(() => this.closeAddWordModal(), 650);
        } catch (error) {
            console.error('Kelime eklenemedi', error);
            this.setAddWordStatus(error.message || 'Не удалось добавить слово.', 'error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    async handleHardDeleteWord(word) {
        if (!confirm('Это слово будет удалено навсегда. Вы уверены?')) return; // Tamamen silinecek, emin misin?
        try {
            window.trashManager?.hardDeleteWord(word);
            this.refreshCurrentWordList();
            this.updateStatsDisplay();
            await this.showSnackbar(true, 'Удалено', 'Слово удалено навсегда.');
        } catch (error) {
            console.error('Kelime tamamen silinemedi', error);
            await this.showSnackbar(false, 'Ошибка', 'Не удалось удалить слово навсегда.');
        }
    }

    setSettingsStatus(message, type = 'info') {
        const status = document.getElementById('settingsStatus');
        if (!status) return;

        status.textContent = message;
        status.dataset.type = type;
        status.classList.toggle('hidden', !message);
    }

    async refreshAppContent() {
        const button = document.getElementById('refreshAppBtn');
        if (button) button.disabled = true;
        this.setSettingsStatus('Проверка обновлений...');

        try {
            await this.updateServiceWorkerRegistration();
            await this.refreshServiceWorkerCache();
            this.setSettingsStatus('Обновление получено. Приложение перезапускается.', 'success');
            window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('Uygulama güncellemesi başarısız oldu', error);
            this.setSettingsStatus('Не удалось получить обновление. Проверьте соединение.', 'error');
        } finally {
            if (button) button.disabled = false;
        }
    }

    async updateServiceWorkerRegistration() {
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        await registration.update();
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }

    refreshServiceWorkerCache() {
        return new Promise((resolve, reject) => {
            const controller = navigator.serviceWorker?.controller;
            if (!controller) {
                resolve();
                return;
            }

            const timeout = window.setTimeout(() => reject(new Error('Service worker не ответил.')), 10000);
            const channel = new MessageChannel();

            channel.port1.onmessage = event => {
                window.clearTimeout(timeout);
                if (event.data?.ok) {
                    resolve();
                    return;
                }

                reject(new Error(event.data?.message || 'Не удалось обновить кэш.'));
            };

            controller.postMessage({ type: 'REFRESH_CACHE' }, [channel.port2]);
        });
    }

    exportUserData() {
        try {
            window.storageManager?.downloadUserDataBackup();
            this.setSettingsStatus('Резервная копия подготовлена.', 'success');
        } catch (error) {
            console.error('Yedek oluşturulamadı', error);
            this.setSettingsStatus('Не удалось создать резервную копию.', 'error');
        }
    }

    async importUserData(file) {
        try {
            await window.storageManager?.importUserDataBackup(file);
            this.setSettingsStatus('Резервная копия восстановлена. Приложение перезапускается.', 'success');
            window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('Yedek geri yüklenemedi', error);
            this.setSettingsStatus('Не удалось прочитать файл резервной копии.', 'error');
        }
    }

    openMode(mode, sessionOptions = {}) {
        if (mode === 'trash') {
            this.showTrash();
            return;
        }

        if (WORDS.length === 0) {
            this.showNoWords();
            return;
        }

        const modesWithCount = ['flashcard', 'quiz', 'typing'];

        if (modesWithCount.includes(mode)) {
            this.pendingMode = mode;
            this.pendingSessionOptions = this.normalizeSessionOptions(sessionOptions);
            this.updateQuestionCountModal();
            document.getElementById('questionCountModal').classList.remove('hidden');
        } else if (mode === 'allwords') {
            this.showAllWords();
        } else if (mode === 'masteredArchive') {
            this.showMasteredArchive();
        } else if (mode === 'daily') {
            this.startMode('daily'); // Günün kelimeleri
        } else {
            this.startMode(mode);
        }
    }

    startMode(mode, questionCount = null, sessionOptions = {}) {
        const modeScreen = document.getElementById(`${mode}Mode`);
        if (!modeScreen) return;

        const normalizedOptions = this.normalizeSessionOptions(sessionOptions);

        {
            document.getElementById('mainMenu').classList.add('hidden');
            
            if (this.currentMode && this.currentMode !== mode) {
                const prevScreen = document.getElementById(`${this.currentMode}Mode`);
                if (prevScreen) prevScreen.classList.add('hidden');
            }
            
            modeScreen.classList.remove('hidden');
            this.currentMode = mode;

            // Mod'u başlat
            switch (mode) {
                case 'flashcard':
                    window.flashcardMode?.init(questionCount, normalizedOptions);
                    break;
                case 'quiz':
                    window.quizMode?.init(questionCount, normalizedOptions);
                    break;
                case 'fullchoicequiz':
                    window.fullChoiceQuizMode?.init();
                    break;
                case 'typing':
                    window.typingMode?.init(questionCount, normalizedOptions);
                    break;
                case 'daily':
                    window.dailyMode?.init();
                    break;
                case 'torfl':
                    window.torflAPI?.init();
                    break;
                case 'stats':
                    window.statsMode?.init();
                    break;
                case 'hardwords':
                    window.hardWordsMode?.init(questionCount);
                    break;
                case 'categories':
                    window.categoriesMode?.init();
                    break;
                case 'prefixes':
                    window.prefixesMode?.init();
                    break;
            }
        }
    }

    // ===== Mod Kapatma =====

    closeMode() {
        if (this.currentMode) {
            const modeScreen = document.getElementById(`${this.currentMode}Mode`);
            if (modeScreen) {
                modeScreen.classList.add('hidden');
            }
            document.getElementById('mainMenu').classList.remove('hidden');
            this.currentMode = null;
            this.updateStatsDisplay();

            // Günlük kelimeler modundan çıkınca ana menüyü yenile
            if (window.dailyMode && typeof window.dailyMode.reset === 'function') {
                window.dailyMode.reset();
            }
        }
    }

    // ===== Kelime Kontrolleri =====


    checkWords() {
        const noWordsMessage = document.getElementById('noWordsMessage');
        if (!noWordsMessage) return;

        if (WORDS.length === 0) {
            noWordsMessage.classList.remove('hidden');
            return;
        }

        noWordsMessage.classList.add('hidden');
    }

    showNoWords() {
        const msg = document.getElementById('noWordsMessage');
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
    }

    // ===== İstatistikler =====
    loadStats() {
        const defaults = {
            totalCorrect: 0,
            totalWrong: 0,
            masteredWords: [],
            wordProgress: {}
        };
        try {
            const saved = localStorage.getItem('stats');
            const stats = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
            return window.storageManager?.normalizeStats(stats) || stats;
        } catch (e) {
            console.error('İstatistikler yüklenirken hata oluştu', e);
            return defaults;
        }
    }

    saveStats() {
        localStorage.setItem('stats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        if (!this.stats) return; // Koruma

        const totalWordsEl = document.getElementById('totalWords');
        if (totalWordsEl) totalWordsEl.textContent = WORDS.length;

        const masteredWordsEl = document.getElementById('masteredWords');
        if (masteredWordsEl) masteredWordsEl.textContent = this.stats.masteredWords ? this.stats.masteredWords.length : 0;

        const total = this.stats.totalCorrect + this.stats.totalWrong;
        const accuracy = total > 0 ? Math.round((this.stats.totalCorrect / total) * 100) : 0;
        
        const accuracyEl = document.getElementById('accuracy');
        if (accuracyEl) accuracyEl.textContent = `%${accuracy}`;
    }

    getWordStorageKey(wordId) {
        return window.storageManager?.getWordStorageKey(wordId) || String(wordId);
    }

    recordAnswer(wordId, isCorrect) {
        if (window.srsManager) {
            window.srsManager.updateWord(wordId, isCorrect);
        }

        if (isCorrect) {
            this.stats.totalCorrect++;
            // Günlük hedef için kaydet
            window.goalsManager?.recordWord();
        } else {
            this.stats.totalWrong++;
        }

        // Kelime ilerlemesini güncelle
        const wordKey = this.getWordStorageKey(wordId);

        if (!this.stats.wordProgress[wordKey]) {
            this.stats.wordProgress[wordKey] = { correct: 0, wrong: 0 };
        }

        if (isCorrect) {
            this.stats.wordProgress[wordKey].correct++;
            // 5 kez doğru cevaplarsa "öğrenildi" say
            if (this.stats.wordProgress[wordKey].correct >= 5 &&
                !this.stats.masteredWords.includes(wordKey)) {
                this.stats.masteredWords.push(wordKey);
            }
        } else {
            this.stats.wordProgress[wordKey].wrong++;
            // Yanlış cevaplarsa öğrenilmişlerden çıkar
            const idx = this.stats.masteredWords.indexOf(wordKey);
            if (idx > -1) {
                this.stats.masteredWords.splice(idx, 1);
            }
        }

        this.saveStats();
        window.notificationManager?.syncProfileDebounced?.();
    }

    getLearningWords(minCount = 0) {
        const learningWords = this.getPendingWords();

        if (learningWords.length === 0) return [...WORDS];
        if (minCount > 0 && learningWords.length < minCount) return [...WORDS];
        return learningWords;
    }

    // Yardımcı fonksiyonlar
    showAllWords() {
        const sortedWords = [...WORDS].sort((a, b) => a.russian.localeCompare(b.russian));
        this._currentWordList = sortedWords;
        this._currentWordListMode = 'all';
        this.renderWordList(sortedWords, { title: '📚 Tüm Kelimeler', mode: 'all' });
        this.setupAllWordsSearch();
    }

    showFavorites() {
        const favoriteWords = window.favoritesManager?.getFavoriteWords() || [];
        const sortedWords = [...favoriteWords].sort((a, b) => a.russian.localeCompare(b.russian));
        this._currentWordList = sortedWords;
        this._currentWordListMode = 'favorites';
        this.renderWordList(sortedWords, { title: '⭐ Favoriler', mode: 'favorites' });
        this.setupAllWordsSearch();
    }

    showTrash() {
        const deletedWords = window.trashManager?.getDeletedWords() || [];
        const sortedWords = [...deletedWords].sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
        this._currentWordList = sortedWords;
        this._currentWordListMode = 'trash';
        this.renderWordList(sortedWords, { title: '🗑️ Çöp Kutusu', mode: 'trash' });
        this.setupAllWordsSearch();
    }

    /**
     * Sets up live search listener for the All Words / Favorites list.
     * Uses this._currentWordList (set by showAllWords / showFavorites).
     * Security: user input is only used for filtering — never injected into DOM raw.
     */
    setupAllWordsSearch() {
        const input = document.getElementById('allwordsSearchInput');
        const clearBtn = document.getElementById('allwordsClearBtn');
        if (!input || !clearBtn) return;

        // Reset input state on each open
        input.value = '';
        clearBtn.style.display = 'none';

        // Remove previous listeners by cloning (clean slate key pattern)
        const newInput = input.cloneNode(true);
        const newClear = clearBtn.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        clearBtn.parentNode.replaceChild(newClear, clearBtn);

        newInput.addEventListener('input', () => {
            const query = newInput.value.trim();
            newClear.style.display = query.length > 0 ? 'block' : 'none';
            // this._currentWordList is always set before setupAllWordsSearch is called
            this.handleAllWordsSearch(query);
        });

        newClear.addEventListener('click', () => {
            newInput.value = '';
            newClear.style.display = 'none';
            this.handleAllWordsSearch('');
            newInput.focus();
        });
    }

    /**
     * Filters this._currentWordList based on query and re-renders.
     * Matches against russian, turkish, and english (if present) fields.
     * Guard: if _currentWordList is not set, safely returns empty.
     * @param {string} query - Raw user input (used only for string comparison, not DOM injection)
     */
    handleAllWordsSearch(query) {
        const allWords = this._currentWordList || [];
        const lowerQ = query.toLowerCase();
        const filtered = query.length === 0
            ? allWords
            : allWords.filter(w => {
                const ruMatch = w.russian?.toLowerCase().includes(lowerQ);
                const trMatch = w.turkish?.toLowerCase().includes(lowerQ);
                const enMatch = w.english?.toLowerCase().includes(lowerQ);
                return ruMatch || trMatch || enMatch;
            });

        this.renderWordList(filtered, {
            title: this.getWordListTitle(this._currentWordListMode),
            mode: this._currentWordListMode,
            query
        });
    }

    getWordListTitle(mode = 'all') {
        if (mode === 'favorites') return '⭐ Favoriler';
        if (mode === 'trash') return '🗑️ Çöp Kutusu';
        return '📚 Tüm Kelimeler';
    }

    getEmptyWordListMarkup(mode = 'all', query = '') {
        if (query) {
            return `<div class="search-no-results">🔍 "${this.sanitizeHTML(query)}" için sonuç bulunamadı.</div>`;
        }

        if (mode === 'favorites') {
            return '<div class="no-favorites"><p>⭐ Henüz favori kelime yok</p><p>Kelime listesinden favori ekleyebilirsiniz.</p></div>';
        }

        if (mode === 'trash') {
            return '<div class="no-favorites"><p>🗑️ Çöp kutusu boş</p><p>Kaldırdığın kelimeler burada görünür.</p></div>';
        }

        return '<div class="no-favorites"><p>📚 Kelime bulunamadı</p><p>Yeni kelime eklemek için üstteki artı butonunu kullan.</p></div>';
    }

    renderWordContent(word, options = {}) {
        const showConfidence = options.showConfidence !== false && !word.isDeletedWord;
        let confidenceMarkup = '';

        if (showConfidence && window.masteredManager) {
            const score = window.masteredManager.getWordConfidence(word);
            const display = window.masteredManager.getConfidenceDisplay(score);
            confidenceMarkup = `
                <div class="word-confidence-bar">
                    <div class="confidence-track">
                        <div class="confidence-fill ${display.colorClass}" style="width: ${score}%"></div>
                    </div>
                    <span class="confidence-label">${display.emoji} ${score}%</span>
                </div>
            `;
        }

        if (word.english) {
            return `
                <div class="word-text multi-line">
                    <span class="english" style="color:var(--accent);font-weight:bold;">${this.sanitizeHTML(word.english)}</span>
                    <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                    <span class="turkish" style="color:var(--text-muted);font-size:0.9em;">${this.sanitizeHTML(word.turkish)}</span>
                    ${confidenceMarkup}
                </div>
            `;
        }

        return `
            <div class="word-text">
                <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                <span class="turkish">${this.sanitizeHTML(word.turkish)}</span>
                ${confidenceMarkup}
            </div>
        `;
    }

    renderWordList(words, options = {}) {
        const title = options.title || this.getWordListTitle(options.mode);
        const mode = options.mode || 'all';
        const query = options.query || '';
        const container = document.getElementById('wordsList');
        const countSpan = document.getElementById('allwordsCount');
        const modeScreen = document.getElementById('allwordsMode');
        const titleEl = modeScreen.querySelector('h2');

        if (!container || !modeScreen) return;

        document.getElementById('mainMenu').classList.add('hidden');
        modeScreen.classList.remove('hidden');
        this.currentMode = 'allwords';

        if (titleEl) titleEl.textContent = title;
        container.innerHTML = '';
        countSpan.textContent = words.length;

        if (words.length === 0) {
            container.innerHTML = this.getEmptyWordListMarkup(mode, query);
            return;
        }

        const fragment = document.createDocumentFragment();
        words.forEach(word => {
            fragment.appendChild(this.createWordListItem(word, mode));
        });
        container.appendChild(fragment);
    }

    createWordListItem(word, mode = 'all') {
        const item = document.createElement('div');
        item.className = 'word-item';
        item.innerHTML = `
            ${this.renderWordContent(word)}
            <div class="word-actions"></div>
        `;

        const actions = item.querySelector('.word-actions');
        if (mode === 'trash') {
            actions.appendChild(this.createRestoreButton(word));
            actions.appendChild(this.createHardDeleteButton(word));
            return item;
        }

        actions.appendChild(this.createFavoriteButton(word, mode));
        actions.appendChild(this.createDeleteButton(word));
        return item;
    }

    createFavoriteButton(word, mode = 'all') {
        const button = document.createElement('button');
        const isFavorite = window.favoritesManager?.isFavorite(word.id);
        button.className = `favorite-btn ${isFavorite ? 'active' : ''}`;
        button.type = 'button';
        button.dataset.id = word.id;
        button.setAttribute('aria-label', 'Favoriye ekle');
        button.textContent = isFavorite ? '★' : '☆';
        button.onclick = event => {
            event.stopPropagation();
            const newStatus = window.favoritesManager?.toggleFavorite(word.id);
            button.classList.toggle('active', newStatus);
            button.textContent = newStatus ? '★' : '☆';
            if (mode === 'favorites' && !newStatus) {
                this.refreshCurrentWordList();
            }
        };

        return button;
    }

    createDeleteButton(word) {
        const button = document.createElement('button');
        button.className = 'word-action-btn delete-word-btn';
        button.type = 'button';
        button.setAttribute('aria-label', 'Kelimeyi kaldır');
        button.textContent = '🗑️';
        button.onclick = event => {
            event.stopPropagation();
            this.handleDeleteWord(word);
        };

        return button;
    }

    createRestoreButton(word) {
        const button = document.createElement('button');
        button.className = 'word-action-btn restore-word-btn';
        button.type = 'button';
        button.setAttribute('aria-label', 'Kelimeyi geri al');
        button.textContent = '↩️';
        button.onclick = event => {
            event.stopPropagation();
            this.handleRestoreWord(word);
        };

        return button;
    }

    createHardDeleteButton(word) {
        const button = document.createElement('button');
        button.className = 'word-action-btn delete-word-btn';
        button.type = 'button';
        button.setAttribute('aria-label', 'Удалить навсегда'); // Tamamen sil (Rusça)
        button.textContent = '❌';
        button.onclick = event => {
            event.stopPropagation();
            this.handleHardDeleteWord(word);
        };

        return button;
    }

    async handleDeleteWord(word) {
        try {
            if (!window.trashManager) throw new Error('Çöp kutusu yöneticisi hazır değil.');

            window.trashManager.deleteWord(word);
            await this.reloadWordsAfterUserChange();
            this.refreshCurrentWordList();
        } catch (error) {
            console.error('Kelime kaldırılamadı', error);
        }
    }

    async handleRestoreWord(word) {
        try {
            if (!window.trashManager) throw new Error('Çöp kutusu yöneticisi hazır değil.');

            window.trashManager.restoreWord(word.wordKey || word.key);
            await this.reloadWordsAfterUserChange();
            this.showTrash();
        } catch (error) {
            console.error('Kelime geri alınamadı', error);
        }
    }

    refreshCurrentWordList() {
        if (this._currentWordListMode === 'favorites') {
            this.showFavorites();
            return;
        }

        if (this._currentWordListMode === 'trash') {
            this.showTrash();
            return;
        }

        this.showAllWords();
    }

    // ===== Mastered Archive Mode =====

    showMasteredArchive() {
        if (!window.masteredManager) return;

        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('masteredArchiveMode').classList.remove('hidden');
        this.currentMode = 'masteredArchive';

        this._masteredSelectedKeys = new Set();
        this.setupMasteredArchiveListeners();
        this.renderMasteredArchive();
    }

    setupMasteredArchiveListeners() {
        const slider = document.getElementById('confidenceThreshold');
        const selectAll = document.getElementById('masteredSelectAll');
        const archiveBtn = document.getElementById('masteredArchiveBtn');

        if (slider) {
            // Clone to remove old listeners
            const newSlider = slider.cloneNode(true);
            slider.parentNode.replaceChild(newSlider, slider);

            newSlider.addEventListener('input', () => {
                document.getElementById('thresholdValue').textContent = newSlider.value;
                this._masteredSelectedKeys = new Set();
                this.renderMasteredArchive();
            });
        }

        if (selectAll) {
            const newSelectAll = selectAll.cloneNode(true);
            selectAll.parentNode.replaceChild(newSelectAll, selectAll);

            newSelectAll.addEventListener('change', () => {
                this.handleMasteredSelectAll(newSelectAll.checked);
            });
        }

        if (archiveBtn) {
            const newBtn = archiveBtn.cloneNode(true);
            archiveBtn.parentNode.replaceChild(newBtn, archiveBtn);

            newBtn.addEventListener('click', () => {
                this.handleBulkArchive();
            });
        }
    }

    renderMasteredArchive() {
        const threshold = Number(document.getElementById('confidenceThreshold')?.value) || 50;
        const results = window.masteredManager.detectMasteredWords(threshold);
        const container = document.getElementById('masteredWordList');
        const countSpan = document.getElementById('masteredArchiveCount');

        // Update stats
        const stats = window.masteredManager.getConfidenceStats();
        this.setText('masteredStatHigh', stats.high);
        this.setText('masteredStatMedium', stats.medium);
        this.setText('masteredStatLow', stats.low);
        this.setText('masteredStatNone', stats.none);

        if (countSpan) countSpan.textContent = results.length;
        if (!container) return;

        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="mastered-empty">
                    <p>🎓 Пока не найдено слов с уверенностью ≥ ${threshold}%</p>
                    <p>Продолжай учить — система анализирует твой прогресс автоматически!</p>
                </div>
            `;
            this.updateMasteredSelection();
            return;
        }

        const fragment = document.createDocumentFragment();

        results.forEach(({ word, score }) => {
            const wordKey = window.storageManager?.getWordStorageKey(word.id) || String(word.id);
            const display = window.masteredManager.getConfidenceDisplay(score);
            const isChecked = this._masteredSelectedKeys.has(wordKey);

            const item = document.createElement('label');
            item.className = 'mastered-word-item';
            item.innerHTML = `
                <input type="checkbox" class="mastered-checkbox" data-word-key="${this.sanitizeHTML(wordKey)}"
                    ${isChecked ? 'checked' : ''} />
                <div class="mastered-word-content">
                    <div class="mastered-word-text">
                        <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                        <span class="turkish">${this.sanitizeHTML(word.turkish)}</span>
                    </div>
                    <div class="mastered-confidence">
                        <div class="confidence-track">
                            <div class="confidence-fill ${display.colorClass}" style="width: ${score}%"></div>
                        </div>
                        <span class="confidence-score">${display.emoji} ${score}%</span>
                    </div>
                </div>
            `;

            const checkbox = item.querySelector('.mastered-checkbox');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this._masteredSelectedKeys.add(wordKey);
                } else {
                    this._masteredSelectedKeys.delete(wordKey);
                }
                this.updateMasteredSelection();
            });

            fragment.appendChild(item);
        });

        container.appendChild(fragment);
        this.updateMasteredSelection();
    }

    handleMasteredSelectAll(checked) {
        const checkboxes = document.querySelectorAll('#masteredWordList .mastered-checkbox');

        checkboxes.forEach(cb => {
            cb.checked = checked;
            const key = cb.dataset.wordKey;
            if (checked) {
                this._masteredSelectedKeys.add(key);
            } else {
                this._masteredSelectedKeys.delete(key);
            }
        });

        this.updateMasteredSelection();
    }

    updateMasteredSelection() {
        const count = this._masteredSelectedKeys?.size || 0;
        const countSpan = document.getElementById('masteredSelectedCount');
        const archiveBtn = document.getElementById('masteredArchiveBtn');
        const selectAll = document.getElementById('masteredSelectAll');

        if (countSpan) countSpan.textContent = count;
        if (archiveBtn) archiveBtn.disabled = count === 0;

        // Sync select-all checkbox state
        const totalCheckboxes = document.querySelectorAll('#masteredWordList .mastered-checkbox').length;
        if (selectAll) {
            selectAll.checked = totalCheckboxes > 0 && count === totalCheckboxes;
            selectAll.indeterminate = count > 0 && count < totalCheckboxes;
        }
    }

    async handleBulkArchive() {
        const selectedKeys = this._masteredSelectedKeys;
        if (!selectedKeys || selectedKeys.size === 0) return;

        const count = selectedKeys.size;
        if (!confirm(`${count} слово будет убрано из списка. Их можно будет восстановить из корзины. Продолжить?`)) {
            return;
        }

        // Find word objects for selected keys
        const wordsToArchive = WORDS.filter(word => {
            const wordKey = window.storageManager?.getWordStorageKey(word.id) || String(word.id);
            return selectedKeys.has(wordKey);
        });

        const archived = window.masteredManager.archiveWords(wordsToArchive);

        // Reload words and refresh
        try {
            await this.reloadWordsAfterUserChange();
        } catch (error) {
            console.error('Kelime havuzu yenilenemedi', error);
        }

        this._masteredSelectedKeys = new Set();
        this.renderMasteredArchive();

        await this.showSnackbar(true,
            `✅ ${archived} слов убрано`,
            'Восстановить их можно из корзины (🗑️).'
        );
    }

    setText(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = String(value);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getRandomWords(count, excludeId = null, excludeText = null) {
        let available = WORDS.filter(w => w.id !== excludeId);
        // Avoid options with same translation text as the correct answer
        if (excludeText) {
            available = available.filter(w => w.turkish !== excludeText && w.russian !== excludeText);
        }
        return this.shuffleArray(available).slice(0, count);
    }

    showCompletion(score, total) {
        if (total === 0) { this.closeMode(); return; }
        const modal = document.getElementById('completionModal');
        const text = document.getElementById('completionText');
        const title = modal.querySelector('h3');

        const percentage = (score / total) * 100;
        let message = '';
        let emoji = '';

        if (percentage === 100) {
            emoji = '🏆';
            message = 'Отлично! Ты ответил правильно на все вопросы!';
        } else if (percentage >= 80) {
            emoji = '🎉';
            message = 'Отличная работа! Ты молодец.';
        } else if (percentage >= 60) {
            emoji = '👍';
            message = 'Хорошо, но ты можешь лучше.';
        } else {
            emoji = '📚';
            message = 'Тебе нужно больше практиковаться.';
        }

        title.textContent = `${emoji} Результат: ${score}/${total}`;
        text.textContent = message;

        modal.classList.remove('hidden');

        // Close button handler
        const closeBtn = document.getElementById('completionClose');
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            this.closeMode();
        };
    }
}

// Global app instance
const app = new App();
