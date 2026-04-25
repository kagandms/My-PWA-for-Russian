/**
 * Eş/Zıt Anlam Modu
 */
class SynonymsMode {
    constructor() {
        this.storageKey = 'ru_tr_synonyms_quiz_progress';
        this.sessionOptions = { synonymMode: 'normal' };
        this.progress = this.loadProgress();
        this.currentPair = null;
        this.score = 0;
        this.totalQuestions = 0;
        this.currentIndex = 0;
        this.pairs = [];
        this.answered = false;
    }

    createDefaultProgress() {
        return {
            version: 1,
            completedPairKeys: [],
            updatedAt: null
        };
    }

    loadProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
            const progress = saved && typeof saved === 'object' ? saved : this.createDefaultProgress();
            return this.normalizeProgress(progress);
        } catch (error) {
            console.error('Eş/Zıt kalıcı quiz ilerlemesi yüklenirken hata oluştu', error);
            return this.createDefaultProgress();
        }
    }

    normalizeProgress(progress) {
        const completedPairKeys = Array.isArray(progress.completedPairKeys)
            ? [...new Set(progress.completedPairKeys.map(key => String(key)).filter(Boolean))]
            : [];

        return {
            ...this.createDefaultProgress(),
            ...progress,
            completedPairKeys
        };
    }

    saveProgress() {
        this.progress.updatedAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }

    init(questionCount = null, sessionOptions = {}) {
        if (!Array.isArray(SYNONYMS) || SYNONYMS.length === 0) {
            alert("Eş/Zıt anlamlı kelime verisi bulunamadı!");
            app.closeMode();
            return;
        }

        this.sessionOptions = app.normalizeSessionOptions(sessionOptions);
        this.progress = this.loadProgress();
        this.pairs = this.getSessionPairs(questionCount, this.getSourcePairsForSession());
        this.currentIndex = 0;
        this.score = 0;
        this.totalQuestions = this.pairs.length;
        this.answered = false;

        this.updateProgress();
        this.showQuestion();
    }

    isPersistentMode() {
        return this.sessionOptions.synonymMode === 'persistent';
    }

    getSourcePairsForSession() {
        if (!this.isPersistentMode()) return SYNONYMS;

        const remainingPairs = this.getRemainingPersistentPairs();
        if (remainingPairs.length > 0) return remainingPairs;

        this.resetPersistentProgress();
        return SYNONYMS;
    }

    getSessionPairs(questionCount = null, sourcePairs = SYNONYMS) {
        const shuffledPairs = app.shuffleArray([...sourcePairs]);
        const targetCount = Number(questionCount) || shuffledPairs.length;

        return shuffledPairs.slice(0, Math.min(targetCount, shuffledPairs.length));
    }

    normalizeText(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    }

    getSynonymWordKey(word) {
        return `${this.normalizeText(word?.ru)}::${this.normalizeText(word?.tr)}`;
    }

    getPairKey(pair) {
        const firstWordKey = this.getSynonymWordKey(pair?.w1);
        const secondWordKey = this.getSynonymWordKey(pair?.w2);
        const pairType = this.normalizeText(pair?.type || 'unknown');

        return `synonym:${pairType}:${firstWordKey}::${secondWordKey}`;
    }

    getCurrentPairKeySet() {
        return new Set(SYNONYMS.map(pair => this.getPairKey(pair)));
    }

    getCompletedPairKeySet() {
        const currentPairKeys = this.getCurrentPairKeySet();
        return new Set(this.progress.completedPairKeys.filter(key => currentPairKeys.has(key)));
    }

    getRemainingPersistentPairs() {
        const completedPairKeys = this.getCompletedPairKeySet();
        return SYNONYMS.filter(pair => !completedPairKeys.has(this.getPairKey(pair)));
    }

    resetPersistentProgress() {
        this.progress = this.createDefaultProgress();
        this.saveProgress();
    }

    showQuestion() {
        if (this.currentIndex >= this.pairs.length) {
            app.showCompletion(this.score, this.totalQuestions);
            return;
        }

        const pair = this.pairs[this.currentIndex];
        const words = this.getQuestionWords(pair);
        this.currentPair = pair;
        this.answered = false;
        this.updateProgress();
        this.renderQuestion(pair, words.questionWord);
        this.renderOptions(pair, words.answerWord);
        document.getElementById('synonymsFeedback').classList.add('hidden');
    }

    getQuestionWords(pair) {
        const askIndex = Math.random() < 0.5 ? 0 : 1;

        return {
            questionWord: askIndex === 0 ? pair.w1 : pair.w2,
            answerWord: askIndex === 0 ? pair.w2 : pair.w1
        };
    }

    renderQuestion(pair, questionWord) {
        document.getElementById('synonymsWord').textContent = `${questionWord.ru} (${questionWord.tr})`;
        document.getElementById('synonymsType').textContent = pair.type === 'antonym'
            ? 'Zıt Anlamlısı?'
            : 'Eş Anlamlısı?';
    }

    renderOptions(pair, answerWord) {
        const options = app.shuffleArray([
            answerWord,
            ...this.getDistractorWords(pair, answerWord)
        ]);

        const optionsContainer = document.getElementById('synonymsOptions');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.textContent = option.ru;
            button.onclick = () => this.checkAnswer(option, answerWord, button);
            optionsContainer.appendChild(button);
        });
    }

    getDistractorWords(pair, answerWord) {
        const pairKey = this.getPairKey(pair);
        const answerKey = this.getSynonymWordKey(answerWord);
        const distractorPairs = SYNONYMS.filter(item => this.getPairKey(item) !== pairKey);

        return app.shuffleArray(distractorPairs)
            .map(item => Math.random() < 0.5 ? item.w1 : item.w2)
            .filter(word => this.getSynonymWordKey(word) !== answerKey)
            .slice(0, 3);
    }

    checkAnswer(selected, correct, button) {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = this.getSynonymWordKey(selected) === this.getSynonymWordKey(correct);
        this.markOptionsAnswered(button, correct);

        if (isCorrect) {
            this.handleCorrectAnswer(button);
        } else {
            this.handleWrongAnswer(correct);
        }

        document.getElementById('synonymsFeedback').classList.remove('hidden');
        this.updateProgress();
        document.getElementById('synonymsNext').onclick = () => this.showNextQuestion();
    }

    markOptionsAnswered(selectedButton, correctWord) {
        document.querySelectorAll('#synonymsOptions .quiz-option').forEach(button => {
            button.classList.add('disabled');
            if (button.textContent === correctWord.ru) button.classList.add('correct');
        });

        if (selectedButton.textContent !== correctWord.ru) {
            selectedButton.classList.add('wrong');
        }
    }

    handleCorrectAnswer(button) {
        button.classList.add('correct');
        this.score++;

        if (this.isPersistentMode()) {
            this.markPairCompleted(this.currentPair);
        }

        const feedback = this.isPersistentMode()
            ? 'Doğru! Bu çift kalıcı havuzdan çıktı.'
            : "Doğru! 🎉";

        document.getElementById('synonymsFeedbackText').textContent = feedback;
        document.getElementById('synonymsFeedbackText').className = "correct-text";
    }

    handleWrongAnswer(correct) {
        const persistentSuffix = this.isPersistentMode() ? ' Bu çift havuzda kalacak.' : '';
        document.getElementById('synonymsFeedbackText').textContent =
            `Yanlış! Doğru cevap: ${correct.ru} (${correct.tr}).${persistentSuffix}`;
        document.getElementById('synonymsFeedbackText').className = "wrong-text";
    }

    markPairCompleted(pair) {
        const pairKey = this.getPairKey(pair);
        if (this.progress.completedPairKeys.includes(pairKey)) return;

        this.progress.completedPairKeys.push(pairKey);
        this.saveProgress();
    }

    showNextQuestion() {
        this.currentIndex++;
        this.showQuestion();
    }

    updateProgress() {
        const currentQuestion = this.totalQuestions === 0
            ? 0
            : Math.min(this.currentIndex + 1, this.totalQuestions);

        document.getElementById('synonymsCurrent').textContent = currentQuestion;
        document.getElementById('synonymsTotal').textContent = this.totalQuestions;
        this.updatePersistentStatus();
    }

    updatePersistentStatus() {
        const status = document.getElementById('synonymsPersistentStatus');
        if (!status) return;

        if (!this.isPersistentMode()) {
            status.textContent = '';
            status.classList.add('hidden');
            return;
        }

        const total = SYNONYMS.length;
        const completed = this.getCompletedPairKeySet().size;
        const remaining = Math.max(total - completed, 0);

        status.textContent = `Kalıcı: ${completed}/${total} • Kalan ${remaining}`;
        status.classList.remove('hidden');
    }
}

window.synonymsMode = new SynonymsMode();
