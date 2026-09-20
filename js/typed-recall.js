class TypedRecallMode {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answered = false;
    }

    init(questionCount = null) {
        const allQuestions = window.vocabularyRepository?.getTypedRecallQuestions?.() || [];
        this.questions = this.selectQuestions(allQuestions, questionCount);
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answered = false;
        this.setupEventListeners();
        this.showQuestion();
    }

    selectQuestions(questions, questionCount) {
        const application = typeof app !== 'undefined' ? app : window.app;
        const shuffled = application?.shuffleArray ? application.shuffleArray(questions) : [...questions];
        const count = Number(questionCount);
        if (!Number.isInteger(count) || count <= 0) return shuffled;
        return shuffled.slice(0, count);
    }

    setupEventListeners() {
        const input = document.getElementById('typedRecallInput');
        const submit = document.getElementById('typedRecallSubmit');
        const next = document.getElementById('typedRecallNext');
        if (!input || !submit || !next) return;

        submit.onclick = () => this.submitAnswer();
        next.onclick = () => this.nextQuestion();
        input.onkeydown = event => {
            if (event.key === 'Enter') this.submitAnswer();
        };
    }

    showQuestion() {
        const question = this.questions[this.currentIndex];
        const prompt = document.getElementById('typedRecallPrompt');
        const input = document.getElementById('typedRecallInput');
        const feedback = document.getElementById('typedRecallFeedback');
        const submit = document.getElementById('typedRecallSubmit');
        const next = document.getElementById('typedRecallNext');
        const progress = document.getElementById('typedRecallProgress');
        if (!prompt || !input || !feedback || !submit || !next || !progress) return;

        if (!question) {
            prompt.textContent = 'Uygun canonical sense bulunamadı.';
            input.disabled = true;
            submit.disabled = true;
            next.classList.add('hidden');
            return;
        }

        prompt.textContent = question.prompt;
        progress.textContent = `${this.currentIndex + 1}/${this.questions.length}`;
        input.value = '';
        input.disabled = false;
        submit.disabled = false;
        feedback.textContent = '';
        feedback.classList.add('hidden');
        next.classList.add('hidden');
        this.answered = false;
        input.focus();
    }

    submitAnswer() {
        if (this.answered) return;
        const question = this.questions[this.currentIndex];
        const input = document.getElementById('typedRecallInput');
        if (!question || !input || !window.TypedRecallCore) return;

        const result = window.TypedRecallCore.evaluateAnswer({ question, userAnswer: input.value });
        this.answered = true;
        this.recordAttempt(question, result, input.value);
        this.renderFeedback(question, result);
        input.disabled = true;
        document.getElementById('typedRecallSubmit').disabled = true;
        document.getElementById('typedRecallNext').classList.remove('hidden');
        if (result.isCorrect) this.correctCount += 1;
    }

    recordAttempt(question, result, userAnswer) {
        const attempt = {
            lexical_unit_id: question.lexical_unit_id,
            sense_id: question.sense_id,
            skill: 'recall',
            exercise_type: 'typed_recall',
            result: result.result,
            timestamp: new Date().toISOString(),
            user_answer: userAnswer,
            expected_answers: question.accepted_answers
        };
        let storedAttempt = attempt;
        try {
            storedAttempt = window.learningProgressStore?.recordAttempt(attempt) || attempt;
        } catch (error) {
            console.error('Typed Recall progress could not be recorded.', error);
        }
        try {
            window.errorNotebookStore?.recordFromTypedRecall({ attempt: storedAttempt, result });
        } catch (error) {
            console.error('Typed Recall error could not be recorded.', error);
        }
    }

    renderFeedback(question, result) {
        const feedback = document.getElementById('typedRecallFeedback');
        if (!feedback) return;
        const expected = question.accepted_answers.join(', ');
        const userAnswer = result.user_answer || '(boş)';
        if (result.result === 'correct') {
            feedback.textContent = 'Doğru.';
            feedback.dataset.result = 'correct';
        } else if (result.result === 'valid_other_sense') {
            feedback.textContent = `Bu cevap başka bir sense için doğru. Hedef cevap: ${expected} · Cevabın: ${userAnswer} · Türkçe sense: ${question.prompt}`;
            feedback.dataset.result = 'valid_other_sense';
        } else if (result.result === 'almost_correct') {
            feedback.textContent = `Neredeyse doğru. Beklenen: ${expected} · Cevabın: ${userAnswer} · Türkçe sense: ${question.prompt}`;
            feedback.dataset.result = 'almost_correct';
        } else {
            feedback.textContent = `Yanlış. Beklenen: ${expected} · Cevabın: ${userAnswer} · Türkçe sense: ${question.prompt}`;
            feedback.dataset.result = 'incorrect';
        }
        feedback.classList.remove('hidden');
    }

    nextQuestion() {
        this.currentIndex += 1;
        if (this.currentIndex >= this.questions.length) {
            const application = typeof app !== 'undefined' ? app : window.app;
            application?.showCompletion(this.correctCount, this.questions.length);
            return;
        }
        this.showQuestion();
    }
}

window.TypedRecallMode = TypedRecallMode;
window.typedRecallMode = new TypedRecallMode();
