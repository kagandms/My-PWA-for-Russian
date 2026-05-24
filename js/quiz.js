/**
 * Quiz Modu
 */

class QuizMode {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
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

        if (this.sessionOptions.scope === 'all') {
            const deckName = 'quiz-all';
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

        const dueCount = window.studySelector.getReviewCandidates(poolWords).length;
        const reviewCount = window.studySelector.getReviewTarget({ count: targetCount, dueCount, ratio: 0.3 });
        const reviewIds = window.studySelector.selectReviewIds({ words: poolWords, count: reviewCount });
        const coverageIds = window.studySelector.selectCoverageIds({
            words: poolWords,
            count: targetCount - reviewIds.length,
            excludeIds: reviewIds,
            deckName: 'quiz-learning'
        });
        const selectedIds = app.shuffleArray([...coverageIds, ...reviewIds]);

        window.studySelector.rememberIds(selectedIds);
        return window.studySelector.resolveWords(selectedIds, poolWords);
    }

    updateCoverageIndicator() {
        app.updateCoverageIndicator('quizCoverage', this.coverageLabel);
    }

    startWithWords(specificWords) {
        this.words = app.shuffleArray([...specificWords]);
        this.questionCount = this.words.length;
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
        this.correctCount = 0;

        // Event listener'ları tekrar eklememek için kontrol edebiliriz veya 
        // init'te bir kere eklendiğinden emin olabiliriz. 
        // Ancak basitlik adına burada tekrar çağırmak sorun olmaz (onclick override eder).
        this.setupEventListeners();

        this.showQuestion();
        this.updateScore();
    }

    setupEventListeners() {
        document.getElementById('quizNext').onclick = () => this.nextQuestion();

        // Favori butonu
        document.getElementById('quizFavorite').onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite();
        };
    }

    showQuestion() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        this.answered = false;

        // Soru
        document.getElementById('quizWord').textContent = word.russian;
        document.getElementById('quizExample').textContent = word.example.russian;

        // Seçenekler oluştur
        const options = this.generateOptions(word);
        const container = document.getElementById('quizOptions');
        container.innerHTML = '';

        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt.turkish;
            btn.dataset.correct = opt.id === word.id;
            btn.onclick = () => this.selectOption(btn, word);
            container.appendChild(btn);
        });

        // Geri bildirimi gizle
        document.getElementById('quizFeedback').classList.add('hidden');

        // Favori butonunu güncelle
        this.updateFavoriteButton();
    }

    generateOptions(correctWord) {
        // Doğru cevap + 3 yanlış
        const wrongs = app.getRandomWords(3, correctWord.id, correctWord.turkish);
        const options = [correctWord, ...wrongs];
        return app.shuffleArray(options);
    }

    updateFavoriteButton() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const btn = document.getElementById('quizFavorite');
        const isFav = window.favoritesManager?.isFavorite(word.id);
        btn.classList.toggle('active', isFav);
        btn.textContent = isFav ? '★' : '☆';
    }

    toggleFavorite() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const isNowFav = window.favoritesManager?.toggleFavorite(word.id);
        const btn = document.getElementById('quizFavorite');
        btn.classList.toggle('active', isNowFav);
        btn.textContent = isNowFav ? '★' : '☆';
    }

    async selectOption(btn, correctWord) {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = btn.dataset.correct === 'true';

        // Scoped to #quizOptions to avoid cross-contamination with other quiz modes
        document.querySelectorAll('#quizOptions .quiz-option').forEach(opt => {
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

            await app.showSnackbar(true, 'Отлично!', 'Правильный ответ.');
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

            await app.showSnackbar(false, `Неправильно! Правильный ответ: ${correctWord.turkish}`, explanation ? `🤖 ${explanation}` : '');
        }

        // Snackbar'daki "Devam Et" butonuna basılınca Promise çözülür ve direk buraya düşeriz.
        this.nextQuestion();
    }

    nextQuestion() {
        this.currentIndex++;

        // Tamamlandı mı kontrol et
        if (this.currentIndex >= this.words.length) {
            app.showCompletion(this.correctCount, this.words.length);
            return;
        }

        this.showQuestion();
    }

    updateScore() {
        document.getElementById('quizScore').textContent = this.score;
    }
}

window.quizMode = new QuizMode();
