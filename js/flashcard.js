/**
 * Flashcard Modu
 */

class FlashcardMode {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.direction = 'ru-tr'; // ru-tr veya tr-ru
        this.isFlipped = false;
        this.questionCount = null;
        this.correctCount = 0;
        this.sessionOptions = { scope: 'learning' };
        this.coverageLabel = '';
    }

    init(questionCount = null, sessionOptions = {}) {
        this.questionCount = questionCount;
        this.correctCount = 0;
        this.sessionOptions = app.normalizeSessionOptions(sessionOptions);
        this.words = this.getSessionWords(questionCount);
        this.currentIndex = 0;
        this.isFlipped = false;
        this.setupEventListeners();
        this.updateCoverageIndicator();
        this.updateCard();
        this.updateProgress();
        this.updateFavoriteButton();
    }

    getSessionWords(questionCount = null) {
        const poolWords = app.getStudyPool({
            ...this.sessionOptions,
            minCount: questionCount || 0
        });
        const targetCount = questionCount && questionCount < poolWords.length
            ? questionCount
            : poolWords.length;
        this.coverageLabel = '';

        if (!window.studySelector) {
            return app.shuffleArray([...poolWords]).slice(0, targetCount);
        }

        const deckName = `flashcard-${this.sessionOptions.scope}`;
        const beforeProgress = window.studySelector.getDeckProgress({
            words: poolWords,
            deckName
        });
        const selectedIds = window.studySelector.selectCoverageIds({
            words: poolWords,
            count: targetCount,
            deckName
        });
        const afterProgress = window.studySelector.getDeckProgress({
            words: poolWords,
            deckName
        });
        const wrapped = afterProgress.cursor < beforeProgress.cursor;
        this.coverageLabel = app.buildCoverageLabel({
            scope: this.sessionOptions.scope,
            total: afterProgress.total,
            covered: afterProgress.cursor,
            wrapped
        });

        window.studySelector.rememberIds(selectedIds);
        return window.studySelector.resolveWords(selectedIds, poolWords);
    }

    updateCoverageIndicator() {
        app.updateCoverageIndicator('flashcardCoverage', this.coverageLabel);
    }

    setupEventListeners() {
        // Kart çevirme
        const card = document.getElementById('flashcard');
        card.onclick = () => this.flipCard();

        // Biliyorum / Bilmiyorum
        document.getElementById('flashcardCorrect').onclick = () => this.answer(true);
        document.getElementById('flashcardWrong').onclick = () => this.answer(false);

        // Yön değiştirme
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.direction = btn.dataset.dir;
                this.isFlipped = false;
                document.getElementById('flashcard').classList.remove('flipped');
                this.updateCard();
            };
        });

        // Favori butonu
        document.getElementById('flashcardFavorite').onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite();
        };

        // AI Açıklama butonu
        document.getElementById('flashcardExplain').onclick = () => this.aiExplain();

        // AI Örnek butonu
        document.getElementById('flashcardGetExample').onclick = () => this.aiGetExample();
    }

    async aiExplain() {
        const word = this.words[this.currentIndex];
        if (!word || !window.aiManager) return;

        const resultDiv = document.getElementById('flashcardAiResult');
        const textP = document.getElementById('flashcardAiText');
        const btn = document.getElementById('flashcardExplain');

        btn.disabled = true;
        btn.textContent = '🔄 Yükleniyor...';
        resultDiv.classList.remove('hidden');
        textP.innerHTML = 'AI düşünüyor...';

        const result = await window.aiManager.explainWord(word);
        textP.innerHTML = app.sanitizeHTML(result) || 'Açıklama alınamadı.';
        btn.disabled = false;
        btn.textContent = '🤖 Açıkla';
    }

    async aiGetExample() {
        const word = this.words[this.currentIndex];
        if (!word || !window.aiManager) return;

        const resultDiv = document.getElementById('flashcardAiResult');
        const textP = document.getElementById('flashcardAiText');
        const btn = document.getElementById('flashcardGetExample');

        btn.disabled = true;
        btn.textContent = '🔄 Yükleniyor...';
        resultDiv.classList.remove('hidden');
        textP.innerHTML = 'AI örnek cümle oluşturuyor...';

        const result = await window.aiManager.generateExample(word);
        textP.innerHTML = app.sanitizeHTML(result) || 'Örnek alınamadı.';
        btn.disabled = false;
        btn.textContent = '💡 Örnek Al';
    }

    flipCard() {
        this.isFlipped = !this.isFlipped;
        document.getElementById('flashcard').classList.toggle('flipped');
    }

    updateCard() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        if (this.direction === 'ru-tr') {
            document.getElementById('flashcardWord').textContent = word.russian;
            document.getElementById('flashcardTranslation').textContent = word.turkish;
            return;
        }

        document.getElementById('flashcardWord').textContent = word.turkish;
        document.getElementById('flashcardTranslation').textContent = word.russian;
    }

    updateProgress() {
        document.getElementById('flashcardCurrent').textContent = this.currentIndex + 1;
        document.getElementById('flashcardTotal').textContent = this.words.length;
    }

    updateFavoriteButton() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const btn = document.getElementById('flashcardFavorite');
        const isFav = window.favoritesManager?.isFavorite(word.id);
        btn.classList.toggle('active', isFav);
        btn.textContent = isFav ? '★' : '☆';
    }

    toggleFavorite() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const isNowFav = window.favoritesManager?.toggleFavorite(word.id);
        const btn = document.getElementById('flashcardFavorite');
        btn.classList.toggle('active', isNowFav);
        btn.textContent = isNowFav ? '★' : '☆';
    }

    answer(isCorrect) {
        const word = this.words[this.currentIndex];
        app.recordAnswer(word.id, isCorrect);

        if (isCorrect) {
            this.correctCount++;
        }

        // Sonraki kart
        this.currentIndex++;

        // Tamamlandı mı kontrol et
        if (this.currentIndex >= this.words.length) {
            app.showCompletion(this.correctCount, this.words.length);
            return;
        }

        // Kartı resetle
        this.isFlipped = false;
        document.getElementById('flashcard').classList.remove('flipped');
        document.getElementById('flashcardAiResult').classList.add('hidden');

        this.updateCard();
        this.updateProgress();
        this.updateFavoriteButton();
    }
}

window.flashcardMode = new FlashcardMode();
