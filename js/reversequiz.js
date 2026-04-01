/**
 * Tersine Quiz Modu
 * Türkçe'den Rusça'ya çeviri
 */

class ReverseQuizMode {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
        this.correctCount = 0;
        this.questionCount = null;
        this.sessionOptions = { scope: 'learning' };
        this.coverageLabel = '';
    }

    init(questionCount = null, sessionOptions = {}) {
        this.questionCount = questionCount;
        this.correctCount = 0;
        this.sessionOptions = app.normalizeSessionOptions(sessionOptions);
        this.words = this.getSessionWords(questionCount);
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
        this.setupEventListeners();
        this.updateCoverageIndicator();
        this.showQuestion();
        this.updateScore();
    }

    getSessionWords(questionCount = null) {
        const poolWords = app.getStudyPool({
            scope: this.sessionOptions.scope,
            minCount: questionCount || 0
        });
        const targetCount = questionCount && questionCount < poolWords.length
            ? questionCount
            : poolWords.length;
        this.coverageLabel = '';

        if (!window.studySelector) {
            return app.shuffleArray([...poolWords]).slice(0, targetCount);
        }

        const deckName = `reversequiz-${this.sessionOptions.scope}`;
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
        app.updateCoverageIndicator('reversequizCoverage', this.coverageLabel);
    }

    setupEventListeners() {
        document.getElementById('reversequizNext').onclick = () => this.nextQuestion();

        document.getElementById('reversequizFavorite').onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite();
        };
    }

    showQuestion() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        this.answered = false;

        // Türkçe kelimeyi göster (ters yön)
        document.getElementById('reversequizWord').textContent = word.turkish;
        document.getElementById('reversequizHint').textContent = 'Rusça karşılığını seç';

        // Rusça seçenekler oluştur
        const options = this.generateOptions(word);
        const container = document.getElementById('reversequizOptions');
        container.innerHTML = '';

        options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt.russian;
            btn.dataset.correct = opt.id === word.id;
            btn.onclick = () => this.selectOption(btn, word);
            container.appendChild(btn);
        });

        document.getElementById('reversequizFeedback').classList.add('hidden');
        this.updateFavoriteButton();
        this.updateProgress();
    }

    generateOptions(correctWord) {
        const wrongs = app.getRandomWords(3, correctWord.id, correctWord.russian);
        const options = [correctWord, ...wrongs];
        return app.shuffleArray(options);
    }

    updateFavoriteButton() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const btn = document.getElementById('reversequizFavorite');
        const isFav = window.favoritesManager?.isFavorite(word.id);
        btn.classList.toggle('active', isFav);
        btn.textContent = isFav ? '★' : '☆';
    }

    toggleFavorite() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const isNowFav = window.favoritesManager?.toggleFavorite(word.id);
        const btn = document.getElementById('reversequizFavorite');
        btn.classList.toggle('active', isNowFav);
        btn.textContent = isNowFav ? '★' : '☆';
    }

    async selectOption(btn, correctWord) {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = btn.dataset.correct === 'true';

        document.querySelectorAll('#reversequizOptions .quiz-option').forEach(opt => {
            opt.classList.add('disabled');
            if (opt.dataset.correct === 'true') {
                opt.classList.add('correct');
            }
        });

        if (isCorrect) {
            btn.classList.add('correct');
            this.score += 10;
            this.correctCount++;

            app.recordAnswer(correctWord.id, isCorrect);
            this.updateScore();

            await app.showSnackbar(true, 'Harika!', 'Doğru bildin.');
        } else {
            btn.classList.add('wrong');

            app.recordAnswer(correctWord.id, isCorrect);
            this.updateScore();

            let explanation = '';
            if (window.aiManager) {
                try {
                    explanation = await window.aiManager.explainWord(correctWord);
                } catch (e) { }
            }

            await app.showSnackbar(false, `Yanlış! Doğru cevap: ${correctWord.russian}`, explanation ? `🤖 ${explanation}` : '');
        }

        this.nextQuestion();
    }

    nextQuestion() {
        this.currentIndex++;

        if (this.currentIndex >= this.words.length) {
            app.showCompletion(this.correctCount, this.words.length);
            return;
        }

        this.showQuestion();
    }

    updateScore() {
        document.getElementById('reversequizScore').textContent = this.score;
    }

    updateProgress() {
        document.getElementById('reversequizCurrent').textContent = this.currentIndex + 1;
        document.getElementById('reversequizTotal').textContent = this.words.length;
    }
}

window.reverseQuizMode = new ReverseQuizMode();
