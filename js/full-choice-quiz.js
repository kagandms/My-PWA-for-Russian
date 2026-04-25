/**
 * Kalıcı şıklı quiz modu.
 * Doğru bilinen kelimeler stable key ile havuzdan çıkar ve deploylar arasında korunur.
 */
class FullChoiceQuizMode {
    constructor() {
        this.storageKey = 'ru_tr_full_choice_quiz_progress';
        this.progress = this.loadProgress();
        this.currentWord = null;
        this.lastWordKey = null;
        this.answered = false;
    }

    createDefaultProgress() {
        return {
            version: 1,
            completedWordKeys: [],
            updatedAt: null
        };
    }

    loadProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
            const progress = saved && typeof saved === 'object' ? saved : this.createDefaultProgress();
            return this.normalizeProgress(progress);
        } catch (error) {
            console.error('Kalıcı quiz ilerlemesi yüklenirken hata oluştu', error);
            return this.createDefaultProgress();
        }
    }

    normalizeProgress(progress) {
        const defaultProgress = this.createDefaultProgress();
        const completedWordKeys = window.storageManager
            ? window.storageManager.normalizeWordKeyList(progress.completedWordKeys)
            : this.normalizeWordKeysFallback(progress.completedWordKeys);

        return {
            ...defaultProgress,
            ...progress,
            completedWordKeys
        };
    }

    normalizeWordKeysFallback(keys) {
        if (!Array.isArray(keys)) return [];

        const normalizedKeys = keys.map(key => String(key)).filter(Boolean);
        return [...new Set(normalizedKeys)];
    }

    saveProgress() {
        this.progress.updatedAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }

    init() {
        this.progress = this.loadProgress();
        this.currentWord = null;
        this.answered = false;
        this.setupEventListeners();
        this.renderState();
    }

    setupEventListeners() {
        document.getElementById('fullChoiceQuizReset').onclick = () => this.resetProgressWithConfirmation();
        document.getElementById('fullChoiceQuizResetComplete').onclick = () => this.resetProgress();
        document.getElementById('fullChoiceQuizFavorite').onclick = event => {
            event.stopPropagation();
            this.toggleFavorite();
        };
    }

    getWordKey(word) {
        return window.storageManager?.getWordStorageKey(word.id) || String(word.id);
    }

    getCurrentWordKeySet() {
        return new Set(WORDS.map(word => this.getWordKey(word)));
    }

    getCompletedWordKeySet() {
        const currentWordKeys = this.getCurrentWordKeySet();
        return new Set(this.progress.completedWordKeys.filter(key => currentWordKeys.has(key)));
    }

    getRemainingWords() {
        const completedWordKeys = this.getCompletedWordKeySet();
        return WORDS.filter(word => !completedWordKeys.has(this.getWordKey(word)));
    }

    renderState() {
        this.updateCounters();
        const remainingWords = this.getRemainingWords();

        if (remainingWords.length === 0) {
            this.showCompletionState();
            return;
        }

        this.showActiveState(remainingWords);
    }

    showActiveState(remainingWords) {
        document.getElementById('fullChoiceQuizActive').classList.remove('hidden');
        document.getElementById('fullChoiceQuizComplete').classList.add('hidden');
        this.currentWord = this.selectNextWord(remainingWords);
        this.showQuestion();
    }

    showCompletionState() {
        this.currentWord = null;
        document.getElementById('fullChoiceQuizActive').classList.add('hidden');
        document.getElementById('fullChoiceQuizComplete').classList.remove('hidden');
    }

    selectNextWord(remainingWords) {
        if (remainingWords.length === 1) return remainingWords[0];

        const candidates = remainingWords.filter(word => this.getWordKey(word) !== this.lastWordKey);
        const selectableWords = candidates.length > 0 ? candidates : remainingWords;
        return app.shuffleArray(selectableWords)[0];
    }

    showQuestion() {
        if (!this.currentWord) return;

        this.answered = false;
        document.getElementById('fullChoiceQuizWord').textContent = this.currentWord.russian;
        document.getElementById('fullChoiceQuizHint').textContent = 'Doğru bilirsen bu turdan çıkar.';
        this.renderOptions();
        this.updateFavoriteButton();
    }

    renderOptions() {
        const options = this.generateOptions(this.currentWord);
        const container = document.getElementById('fullChoiceQuizOptions');
        container.innerHTML = '';

        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.textContent = option.turkish;
            button.dataset.correct = String(option.id === this.currentWord.id);
            button.onclick = () => this.selectOption(button, this.currentWord);
            container.appendChild(button);
        });
    }

    generateOptions(correctWord) {
        const wrongWords = app.getRandomWords(3, correctWord.id, correctWord.turkish);
        return app.shuffleArray([correctWord, ...wrongWords]);
    }

    updateCounters() {
        const total = WORDS.length;
        const completed = this.getCompletedWordKeySet().size;
        const remaining = Math.max(total - completed, 0);
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('fullChoiceQuizCompleted').textContent = completed;
        document.getElementById('fullChoiceQuizRemaining').textContent = remaining;
        document.getElementById('fullChoiceQuizCompletedHeader').textContent = completed;
        document.getElementById('fullChoiceQuizTotalHeader').textContent = total;
        document.getElementById('fullChoiceQuizProgressFill').style.width = `${percent}%`;
    }

    updateFavoriteButton() {
        if (!this.currentWord) return;

        const button = document.getElementById('fullChoiceQuizFavorite');
        const isFavorite = window.favoritesManager?.isFavorite(this.currentWord.id);
        button.classList.toggle('active', isFavorite);
        button.textContent = isFavorite ? '★' : '☆';
    }

    toggleFavorite() {
        if (!this.currentWord) return;

        const isFavorite = window.favoritesManager?.toggleFavorite(this.currentWord.id);
        const button = document.getElementById('fullChoiceQuizFavorite');
        button.classList.toggle('active', isFavorite);
        button.textContent = isFavorite ? '★' : '☆';
    }

    async selectOption(button, correctWord) {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = button.dataset.correct === 'true';
        this.markOptionsAnswered(button);
        app.recordAnswer(correctWord.id, isCorrect);

        if (isCorrect) {
            this.markWordCompleted(correctWord);
            this.updateCounters();
            await app.showSnackbar(true, 'Doğru!', 'Bu kelime artık bu turda tekrar gelmeyecek.');
        } else {
            await app.showSnackbar(false, `Yanlış! Doğru cevap: ${correctWord.turkish}`, 'Bu kelime havuzda kalacak.');
        }

        this.lastWordKey = this.getWordKey(correctWord);
        this.renderState();
    }

    markOptionsAnswered(selectedButton) {
        document.querySelectorAll('#fullChoiceQuizOptions .quiz-option').forEach(option => {
            option.classList.add('disabled');
            if (option.dataset.correct === 'true') option.classList.add('correct');
        });

        if (selectedButton.dataset.correct !== 'true') {
            selectedButton.classList.add('wrong');
        }
    }

    markWordCompleted(word) {
        const wordKey = this.getWordKey(word);
        if (!this.progress.completedWordKeys.includes(wordKey)) {
            this.progress.completedWordKeys.push(wordKey);
        }

        this.saveProgress();
    }

    resetProgressWithConfirmation() {
        const shouldReset = window.confirm('Kalıcı quiz turunu sıfırlamak istiyor musun?');
        if (!shouldReset) return;

        this.resetProgress();
    }

    resetProgress() {
        this.progress = this.createDefaultProgress();
        this.saveProgress();
        this.lastWordKey = null;
        this.renderState();
    }
}

window.fullChoiceQuizMode = new FullChoiceQuizMode();
