/**
 * Üretim Modu (Production Mode)
 * Kullanıcıya Türkçe metin verilir, Rusça'sını girmesi istenir.
 */

class ProductionMode {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.questionCount = null;
        this.correctCount = 0;
        this.sessionOptions = { scope: 'learning' };
        this.coverageLabel = '';
        this.currentExpectedAnswer = '';
    }

    init(questionCount = null, sessionOptions = {}) {
        this.questionCount = questionCount;
        this.correctCount = 0;
        this.sessionOptions = app.normalizeSessionOptions(sessionOptions);
        this.words = this.getSessionWords(questionCount);
        this.currentIndex = 0;
        
        this.setupEventListeners();
        this.updateCoverageIndicator();
        this.showNextQuestion();
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

        const deckName = `production-${this.sessionOptions.scope}`;
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
        app.updateCoverageIndicator('productionCoverage', this.coverageLabel);
    }

    setupEventListeners() {
        const checkBtn = document.getElementById('productionCheckBtn');
        const nextBtn = document.getElementById('productionNextBtn');
        const inputField = document.getElementById('productionInput');

        // Mevcut event listener'ları temizlemek için klonlayıp değiştiriyoruz
        const newCheckBtn = checkBtn.cloneNode(true);
        checkBtn.parentNode.replaceChild(newCheckBtn, checkBtn);
        newCheckBtn.addEventListener('click', () => this.checkAnswer());

        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => this.handleNextClick());

        const newInputField = inputField.cloneNode(true);
        inputField.parentNode.replaceChild(newInputField, inputField);
        newInputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (document.getElementById('productionCheckBtn').style.display !== 'none') {
                    this.checkAnswer();
                } else {
                    this.handleNextClick();
                }
            }
        });
    }

    showNextQuestion() {
        if (this.currentIndex >= this.words.length) {
            app.showCompletion(this.correctCount, this.words.length);
            return;
        }

        const word = this.words[this.currentIndex];
        const promptEl = document.getElementById('productionPrompt');
        const wordEl = document.getElementById('productionPromptWord');
        const inputEl = document.getElementById('productionInput');
        
        // Reset UI
        inputEl.value = '';
        document.getElementById('productionFeedback').classList.add('hidden');
        document.getElementById('productionCheckBtn').style.display = 'block';
        document.getElementById('productionNextBtn').classList.add('hidden');
        
        // Cümle var mı kontrol et
        if (word.example && word.example.turkish && word.example.russian) {
            promptEl.textContent = word.example.turkish;
            wordEl.textContent = `(Kelime: ${word.turkish})`;
            this.currentExpectedAnswer = word.example.russian;
        } else {
            promptEl.textContent = word.turkish;
            wordEl.textContent = '';
            this.currentExpectedAnswer = word.russian;
        }

        this.updateProgress();
        inputEl.focus();
    }

    normalizeString(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "") // Noktalamaları kaldır
            .replace(/\s{2,}/g, " ") // Fazla boşlukları tek boşluk yap
            .trim();
    }

    checkAnswer() {
        const inputEl = document.getElementById('productionInput');
        const userAnswer = inputEl.value;
        const normalizedUser = this.normalizeString(userAnswer);
        const normalizedExpected = this.normalizeString(this.currentExpectedAnswer);
        
        const isCorrect = (normalizedUser === normalizedExpected) && normalizedUser.length > 0;
        const word = this.words[this.currentIndex];

        // SRS kaydı
        app.recordAnswer(word.id, isCorrect);
        if (isCorrect) {
            this.correctCount++;
        }

        this.showFeedback(isCorrect);
    }

    showFeedback(isCorrect) {
        const feedbackEl = document.getElementById('productionFeedback');
        const iconEl = document.getElementById('productionResultIcon');
        const msgEl = document.getElementById('productionResultMessage');
        const ansEl = document.getElementById('productionCorrectAnswer');
        const checkBtn = document.getElementById('productionCheckBtn');
        const nextBtn = document.getElementById('productionNextBtn');

        feedbackEl.className = `production-feedback ${isCorrect ? 'correct' : 'wrong'}`;
        feedbackEl.classList.remove('hidden');
        
        iconEl.textContent = isCorrect ? '✅' : '❌';
        msgEl.textContent = isCorrect ? 'Doğru!' : 'Yanlış!';
        ansEl.innerHTML = `Beklenen Cevap: <strong>${app.sanitizeHTML(this.currentExpectedAnswer)}</strong>`;
        
        checkBtn.style.display = 'none';
        nextBtn.classList.remove('hidden');
        nextBtn.focus();
    }

    handleNextClick() {
        this.currentIndex++;
        this.showNextQuestion();
    }

    updateProgress() {
        document.getElementById('productionCurrent').textContent = this.currentIndex + 1;
        document.getElementById('productionTotal').textContent = this.words.length;
    }
}

window.productionMode = new ProductionMode();
