/**
 * Yazma modu: Rusça kelimeyi gösterir, Türkçe karşılığı yazdırır.
 */
class TypingMode {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.answered = false;
        this.sessionOptions = { scope: 'learning' };
        this.coverageLabel = '';
        this.hintCharacters = [];
        this.hintMask = [];
    }

    init(questionCount = null, sessionOptions = {}) {
        this.correctCount = 0;
        this.score = 0;
        this.currentIndex = 0;
        this.answered = false;
        this.sessionOptions = app.normalizeSessionOptions(sessionOptions);
        this.words = this.getSessionWords(questionCount);
        this.setupEventListeners();
        this.updateCoverageIndicator();
        this.updateScore();
        this.showQuestion();
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

        return this.selectCoverageWords(poolWords, targetCount);
    }

    selectCoverageWords(poolWords, targetCount) {
        const deckName = `typing-${this.sessionOptions.scope}`;
        const beforeProgress = window.studySelector.getDeckProgress({ words: poolWords, deckName });
        const selectedIds = window.studySelector.selectCoverageIds({ words: poolWords, count: targetCount, deckName });
        const afterProgress = window.studySelector.getDeckProgress({ words: poolWords, deckName });

        this.coverageLabel = app.buildCoverageLabel({
            scope: this.sessionOptions.scope,
            total: afterProgress.total,
            covered: afterProgress.cursor,
            wrapped: afterProgress.cursor < beforeProgress.cursor
        });

        window.studySelector.rememberIds(selectedIds);
        return window.studySelector.resolveWords(selectedIds, poolWords);
    }

    setupEventListeners() {
        document.getElementById('typingForm').onsubmit = event => this.handleSubmit(event);
        document.getElementById('typingHintBtn').onclick = () => this.revealHintLetter();
        document.getElementById('typingFavorite').onclick = event => {
            event.stopPropagation();
            this.toggleFavorite();
        };
    }

    showQuestion() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        this.answered = false;
        this.resetHint(word.turkish);
        document.getElementById('typingWord').textContent = word.russian;
        document.getElementById('typingPrompt').textContent = 'Türkçe karşılığını yaz';
        document.getElementById('typingInput').value = '';
        document.getElementById('typingInput').disabled = false;
        document.getElementById('typingCheck').disabled = false;
        document.getElementById('typingInput').focus();
        this.updateFavoriteButton();
        this.updateProgress();
    }

    resetHint(answer) {
        this.hintCharacters = Array.from(String(answer || ''));
        this.hintMask = this.hintCharacters.map(character => !this.isHintCharacter(character));
        document.getElementById('typingHintText')?.classList.add('hidden');
    }

    isHintCharacter(character) {
        return /[0-9A-Za-zА-Яа-яЁёÇĞİÖŞÜçğıöşü]/.test(character);
    }

    revealHintLetter() {
        const nextIndex = this.hintMask.findIndex(isVisible => !isVisible);
        if (nextIndex === -1) return;

        this.hintMask[nextIndex] = true;
        this.renderHint();
    }

    renderHint() {
        const hintText = document.getElementById('typingHintText');
        if (!hintText) return;

        const hintValue = this.hintCharacters
            .map((character, index) => this.hintMask[index] ? character : '_')
            .join('');

        hintText.textContent = `İpucu: ${hintValue}`;
        hintText.classList.remove('hidden');
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.answered) return;

        const input = document.getElementById('typingInput');
        const userAnswer = input.value.trim();
        if (!userAnswer) {
            input.focus();
            return;
        }

        await this.checkAnswer(userAnswer);
    }

    async checkAnswer(userAnswer) {
        const word = this.words[this.currentIndex];
        if (!word) return;

        this.answered = true;
        document.getElementById('typingInput').disabled = true;
        document.getElementById('typingCheck').disabled = true;

        const isCorrect = this.isAnswerCorrect(userAnswer, word.turkish);
        app.recordAnswer(word.id, isCorrect);

        if (isCorrect) {
            this.score += 10;
            this.correctCount++;
            this.updateScore();
            await app.showSnackbar(true, 'Doğru!', word.turkish);
        } else {
            await app.showSnackbar(false, `Yanlış! Doğru cevap: ${word.turkish}`, word.russian);
        }

        this.nextQuestion();
    }

    isAnswerCorrect(userAnswer, correctAnswer) {
        const normalizedAnswer = this.normalizeAnswer(userAnswer);
        if (!normalizedAnswer) return false;

        return this.getAnswerVariants(correctAnswer).includes(normalizedAnswer);
    }

    getAnswerVariants(answer) {
        const answerText = String(answer || '');
        const answerWithoutNotes = answerText.replace(/\([^)]*\)/g, ' ');
        const rawVariants = answerWithoutNotes.split(/[,;/|]+|\s-\s|[?]+/);
        const normalizedVariants = rawVariants.map(value => this.normalizeAnswer(value)).filter(Boolean);

        return [...new Set([this.normalizeAnswer(answerText), ...normalizedVariants].filter(Boolean))];
    }

    normalizeAnswer(value) {
        return String(value || '')
            .toLocaleLowerCase('tr-TR')
            .replace(/[ğ]/g, 'g')
            .replace(/[ü]/g, 'u')
            .replace(/[ş]/g, 's')
            .replace(/[ı]/g, 'i')
            .replace(/[ö]/g, 'o')
            .replace(/[ç]/g, 'c')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!;:()[\]{}"'`´’“”/\\|-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex >= this.words.length) {
            app.showCompletion(this.correctCount, this.words.length);
            return;
        }

        this.showQuestion();
    }

    updateCoverageIndicator() {
        app.updateCoverageIndicator('typingCoverage', this.coverageLabel);
    }

    updateProgress() {
        document.getElementById('typingCurrent').textContent = this.currentIndex + 1;
        document.getElementById('typingTotal').textContent = this.words.length;
    }

    updateScore() {
        document.getElementById('typingScore').textContent = this.score;
    }

    updateFavoriteButton() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const button = document.getElementById('typingFavorite');
        const isFavorite = window.favoritesManager?.isFavorite(word.id);
        button.classList.toggle('active', isFavorite);
        button.textContent = isFavorite ? '★' : '☆';
    }

    toggleFavorite() {
        const word = this.words[this.currentIndex];
        if (!word) return;

        const isFavorite = window.favoritesManager?.toggleFavorite(word.id);
        const button = document.getElementById('typingFavorite');
        button.classList.toggle('active', isFavorite);
        button.textContent = isFavorite ? '★' : '☆';
    }
}

window.typingMode = new TypingMode();
