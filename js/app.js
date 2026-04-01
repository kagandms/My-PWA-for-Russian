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

        this.setupNavigation();
        this.setupModals();
        this.updateStatsDisplay();
        this.checkWords();

        // Günlük hedef ve streak göster
        window.goalsManager?.updateDisplay();

        this.setupPWA();
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
            const { outcome } = await this.deferredPrompt.userChoice;
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
        feedbackEl.innerHTML = `❌ Yanlış! Doğru: <strong>${this.sanitizeHTML(correctText)}</strong>`;
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
        return WORDS.filter(word => !masteredIds.has(word.id));
    }

    getStudyPool(options = {}) {
        const sessionOptions = this.normalizeSessionOptions(options);

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
        if (this.pendingMode === 'reversequiz') return 'Tersine Quiz için kaç soru çözmek istiyorsun?';
        return 'Kaç soru çalışmak istiyorsun?';
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

        const learningCount = document.getElementById('questionCountLearningCount');
        if (learningCount) {
            learningCount.textContent = `${this.getPendingWords().length} kelime`;
        }

        const allCount = document.getElementById('questionCountAllCount');
        if (allCount) {
            allCount.textContent = `${WORDS.length} kelime`;
        }

        this.setQuestionCountScope(this.pendingSessionOptions.scope);
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
    }

    openMode(mode) {
        if (WORDS.length === 0) {
            this.showNoWords();
            return;
        }

        // Soru sayısı sorulacak modlar (Typing kaldırıldı)
        const modesWithCount = ['flashcard', 'quiz', 'reversequiz'];

        if (modesWithCount.includes(mode)) {
            this.pendingMode = mode;
            this.pendingSessionOptions = this.normalizeSessionOptions();
            this.updateQuestionCountModal();
            document.getElementById('questionCountModal').classList.remove('hidden');
        } else if (mode === 'allwords') {
            this.showAllWords();
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
                case 'reversequiz':
                    window.reverseQuizMode?.init(questionCount, normalizedOptions);
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
                case 'synonyms':
                    window.synonymsMode?.init();
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
        if (WORDS.length === 0) {
            document.getElementById('noWordsMessage').classList.remove('hidden');
        }
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
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    saveStats() {
        localStorage.setItem('stats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        if (!this.stats) return; // Koruma

        document.getElementById('totalWords').textContent = WORDS.length;
        document.getElementById('masteredWords').textContent = this.stats.masteredWords ? this.stats.masteredWords.length : 0;

        const total = this.stats.totalCorrect + this.stats.totalWrong;
        const accuracy = total > 0 ? Math.round((this.stats.totalCorrect / total) * 100) : 0;
        document.getElementById('accuracy').textContent = `%${accuracy}`;
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
        if (!this.stats.wordProgress[wordId]) {
            this.stats.wordProgress[wordId] = { correct: 0, wrong: 0 };
        }

        if (isCorrect) {
            this.stats.wordProgress[wordId].correct++;
            // 5 kez doğru cevaplarsa "öğrenildi" say
            if (this.stats.wordProgress[wordId].correct >= 5 &&
                !this.stats.masteredWords.includes(wordId)) {
                this.stats.masteredWords.push(wordId);
            }
        } else {
            this.stats.wordProgress[wordId].wrong++;
            // Yanlış cevaplarsa öğrenilmişlerden çıkar
            const idx = this.stats.masteredWords.indexOf(wordId);
            if (idx > -1) {
                this.stats.masteredWords.splice(idx, 1);
            }
        }

        this.saveStats();
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
        this.renderWordList(sortedWords, '📚 Tüm Kelimeler', false);
        // Search'i aktif et — word list'i instance'a kaydet
        this._currentWordList = sortedWords;
        this.setupAllWordsSearch();
    }

    showFavorites() {
        const favoriteWords = window.favoritesManager?.getFavoriteWords() || [];
        const sortedWords = [...favoriteWords].sort((a, b) => a.russian.localeCompare(b.russian));
        this.renderWordList(sortedWords, '⭐ Favoriler', true);
        // Search'i aktif et
        this._currentWordList = sortedWords;
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
        const container = document.getElementById('wordsList');
        const countSpan = document.getElementById('allwordsCount');
        if (!container) return;

        // Guard: empty query shows all
        const lowerQ = query.toLowerCase();
        const filtered = query.length === 0
            ? allWords
            : allWords.filter(w => {
                const ruMatch = w.russian?.toLowerCase().includes(lowerQ);
                const trMatch = w.turkish?.toLowerCase().includes(lowerQ);
                const enMatch = w.english?.toLowerCase().includes(lowerQ);
                return ruMatch || trMatch || enMatch;
            });

        // Re-render filtered results
        container.innerHTML = '';
        countSpan.textContent = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="search-no-results">🔍 "${this.sanitizeHTML(query)}" için sonuç bulunamadı.</div>`;
            return;
        }

        // Determine if in favorites view (removeOnUnfav mode)
        const isFavView = document.getElementById('allwordsMode')?.querySelector('h2')?.textContent?.includes('Favori');
        const fragment = document.createDocumentFragment();
        filtered.forEach(word => {
            const item = document.createElement('div');
            item.className = 'word-item';
            const isFav = window.favoritesManager?.isFavorite(word.id);
            const starClass = isFav ? 'active' : '';
            const starText = isFav ? '★' : '☆';
            let wordContent = '';
            if (word.english) {
                wordContent = `
                    <div class="word-text multi-line">
                        <span class="english" style="color:var(--accent);font-weight:bold;">${this.sanitizeHTML(word.english)}</span>
                        <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                        <span class="turkish" style="color:var(--text-muted);font-size:0.9em;">${this.sanitizeHTML(word.turkish)}</span>
                    </div>
                `;
            } else {
                wordContent = `
                    <div class="word-text">
                        <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                        <span class="turkish">${this.sanitizeHTML(word.turkish)}</span>
                    </div>
                `;
            }
            item.innerHTML = `
                ${wordContent}
                <button class="favorite-btn ${starClass}" data-id="${word.id}">${starText}</button>
            `;
            const favBtn = item.querySelector('.favorite-btn');
            favBtn.onclick = (e) => {
                e.stopPropagation();
                const newStatus = window.favoritesManager?.toggleFavorite(word.id);
                favBtn.classList.toggle('active', newStatus);
                favBtn.textContent = newStatus ? '★' : '☆';
                if (isFavView && !newStatus) {
                    item.remove();
                    countSpan.textContent = parseInt(countSpan.textContent) - 1;
                    if (parseInt(countSpan.textContent) === 0) {
                        container.innerHTML = '<div class="no-favorites"><p>⭐ Henüz favori kelime yok</p><p>Kelime listesinden favori ekleyebilirsiniz.</p></div>';
                    }
                }
            };
            fragment.appendChild(item);
        });
        container.appendChild(fragment);
    }

    renderWordList(words, title, removeOnUnfav) {
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
            container.innerHTML = '<div class="no-favorites"><p>⭐ Henüz favori kelime yok</p><p>Kelime listesinden favori ekleyebilirsiniz.</p></div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        words.forEach(word => {
            const item = document.createElement('div');
            item.className = 'word-item';

            const isFav = window.favoritesManager?.isFavorite(word.id);
            const starClass = isFav ? 'active' : '';
            const starText = isFav ? '★' : '☆';

            let wordContent = '';
            if (word.english) {
                // IELTS Words: EN - RU - TR
                wordContent = `
                    <div class="word-text multi-line">
                        <span class="english" style="color:var(--accent);font-weight:bold;">${this.sanitizeHTML(word.english)}</span>
                        <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                        <span class="turkish" style="color:var(--text-muted);font-size:0.9em;">${this.sanitizeHTML(word.turkish)}</span>
                    </div>
                `;
            } else {
                // Standard Words: RU - TR
                wordContent = `
                    <div class="word-text">
                        <span class="russian">${this.sanitizeHTML(word.russian)}</span>
                        <span class="turkish">${this.sanitizeHTML(word.turkish)}</span>
                    </div>
                `;
            }

            item.innerHTML = `
                ${wordContent}
                <button class="favorite-btn ${starClass}" data-id="${word.id}">${starText}</button>
            `;

            const favBtn = item.querySelector('.favorite-btn');
            favBtn.onclick = (e) => {
                e.stopPropagation();
                const newStatus = window.favoritesManager?.toggleFavorite(word.id);
                favBtn.classList.toggle('active', newStatus);
                favBtn.textContent = newStatus ? '★' : '☆';
                // Remove from list when unfavoriting in favorites view
                if (removeOnUnfav && !newStatus) {
                    item.remove();
                    countSpan.textContent = parseInt(countSpan.textContent) - 1;
                    if (parseInt(countSpan.textContent) === 0) {
                        container.innerHTML = '<div class="no-favorites"><p>⭐ Henüz favori kelime yok</p><p>Kelime listesinden favori ekleyebilirsiniz.</p></div>';
                    }
                }
            };

            fragment.appendChild(item);
        });
        container.appendChild(fragment);
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
            message = 'Mükemmel! Hepsini doğru bildin!';
        } else if (percentage >= 80) {
            emoji = '🎉';
            message = 'Harika iş! Çok iyisin.';
        } else if (percentage >= 60) {
            emoji = '👍';
            message = 'Güzel, ama daha iyisini yapabilirsin.';
        } else {
            emoji = '📚';
            message = 'Biraz daha pratik yapmalısın.';
        }

        title.textContent = `${emoji} Sonuç: ${score}/${total}`;
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
