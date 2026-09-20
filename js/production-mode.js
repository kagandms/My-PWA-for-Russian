(function exposeProductionMode(root) {
    class ProductionMode {
        constructor() {
            this.exercises = [];
            this.currentIndex = 0;
            this.answered = false;
        }

        init(questionCount = null) {
            const allExercises = root.vocabularyRepository?.getProductionExercises?.() || [];
            this.exercises = this.selectExercises(allExercises, questionCount);
            this.currentIndex = 0;
            this.answered = false;
            this.setupEventListeners();
            this.showExercise();
        }

        selectExercises(exercises, questionCount) {
            const application = typeof app !== 'undefined' ? app : root.app;
            const shuffled = application?.shuffleArray ? application.shuffleArray(exercises) : [...exercises];
            const count = Number(questionCount);
            if (!Number.isInteger(count) || count <= 0) return shuffled;
            return shuffled.slice(0, count);
        }

        setupEventListeners() {
            const input = document.getElementById('productionInput');
            const submit = document.getElementById('productionSubmit');
            const next = document.getElementById('productionNext');
            if (!input || !submit || !next) return;

            submit.onclick = () => this.submitAnswer();
            next.onclick = () => this.nextExercise();
            input.onkeydown = event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) this.submitAnswer();
            };
        }

        showExercise() {
            const exercise = this.exercises[this.currentIndex];
            const prompt = document.getElementById('productionPrompt');
            const input = document.getElementById('productionInput');
            const feedback = document.getElementById('productionFeedback');
            const submit = document.getElementById('productionSubmit');
            const next = document.getElementById('productionNext');
            const progress = document.getElementById('productionProgress');
            if (!prompt || !input || !feedback || !submit || !next || !progress) return;

            if (!exercise) {
                this.finishSession(prompt, input, submit, next, progress);
                return;
            }

            prompt.textContent = exercise.prompt;
            progress.textContent = `${this.currentIndex + 1}/${this.exercises.length}`;
            input.value = '';
            input.disabled = false;
            submit.disabled = false;
            feedback.textContent = '';
            feedback.dataset.result = '';
            feedback.classList.add('hidden');
            next.classList.add('hidden');
            this.answered = false;
            input.focus();
        }

        finishSession(prompt, input, submit, next, progress) {
            prompt.textContent = 'Production oturumu tamamlandı.';
            progress.textContent = `${this.exercises.length}/${this.exercises.length}`;
            input.disabled = true;
            submit.disabled = true;
            next.classList.add('hidden');
            const status = document.getElementById('productionStatus');
            if (status) {
                status.textContent = 'Oturum tamamlandı. Bu sonuçlar doğruluk puanı değildir.';
                status.classList.remove('hidden');
            }
        }

        submitAnswer() {
            if (this.answered) return;
            const exercise = this.exercises[this.currentIndex];
            const input = document.getElementById('productionInput');
            if (!exercise || !input || !root.ProductionCore) return;

            const result = root.ProductionCore.evaluateTargetPresence({
                targetForm: exercise.target_form,
                userAnswer: input.value
            });
            this.answered = true;
            this.recordAttempt(exercise, result, input.value);
            this.renderFeedback(exercise, result);
            input.disabled = true;
            document.getElementById('productionSubmit').disabled = true;
            document.getElementById('productionNext').classList.remove('hidden');
        }

        recordAttempt(exercise, result, userAnswer) {
            try {
                root.learningProgressStore?.recordAttempt({
                    exercise_id: exercise.exercise_id,
                    lexical_unit_id: exercise.lexical_unit_id,
                    sense_id: exercise.sense_id,
                    skill: 'production',
                    exercise_type: exercise.exercise_type,
                    result: result.result,
                    timestamp: new Date().toISOString(),
                    user_answer: userAnswer,
                    target_form: exercise.target_form,
                    expected_answers: [exercise.target_form]
                });
            } catch (error) {
                console.error('Production progress could not be recorded.', error);
            }
        }

        renderFeedback(exercise, result) {
            const feedback = document.getElementById('productionFeedback');
            if (!feedback) return;
            const answer = result.user_answer || '(boş)';
            feedback.dataset.result = result.result;
            if (result.result === 'completed') {
                feedback.textContent = `Canonical hedef biçim tespit edildi: ${exercise.target_form}.`;
            } else if (result.result === 'empty_answer') {
                feedback.textContent = `Cevap boş. Canonical hedef biçim: ${exercise.target_form}.`;
            } else if (result.result === 'needs_review') {
                feedback.textContent = 'Bu egzersiz güvenli biçimde değerlendirilemedi; review gerekli.';
            } else {
                feedback.textContent = `Canonical hedef biçimi otomatik olarak tespit edemedim; çekimli bir biçim kullanmış olabilirsin. Beklenen canonical biçim: ${exercise.target_form}. Cevabın: ${answer} · Türkçe sense: ${exercise.prompt}`;
            }
            feedback.classList.remove('hidden');
        }

        nextExercise() {
            this.currentIndex += 1;
            this.showExercise();
        }
    }

    root.ProductionMode = ProductionMode;
    root.productionMode = new ProductionMode();
})(typeof window !== 'undefined' ? window : globalThis);
