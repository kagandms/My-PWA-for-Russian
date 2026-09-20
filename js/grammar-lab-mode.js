(function exposeGrammarLabMode(root) {
    class GrammarLabMode {
        init() {
            this.exercises = root.grammarRepository?.getScoredExercises?.() || [];
            this.currentIndex = 0;
            const submit = document.getElementById('grammarLabSubmit');
            if (submit) submit.onclick = () => this.submitAnswer();
            this.renderQuestion();
        }

        renderQuestion() {
            const prompt = document.getElementById('grammarLabPrompt');
            const input = document.getElementById('grammarLabInput');
            const feedback = document.getElementById('grammarLabFeedback');
            const progress = document.getElementById('grammarLabProgress');
            if (!prompt || !input || !feedback || !progress) return;
            const exercise = this.exercises[this.currentIndex];
            if (!exercise) {
                prompt.textContent = 'Güvenilir ve puanlanabilir Grammar Lab alıştırması bulunamadı.';
                input.disabled = true;
                progress.textContent = '0/0';
                return;
            }
            prompt.textContent = exercise.prompt;
            input.value = '';
            input.disabled = false;
            feedback.textContent = '';
            progress.textContent = `${this.currentIndex + 1}/${this.exercises.length}`;
        }

        submitAnswer() {
            const exercise = this.exercises[this.currentIndex];
            const input = document.getElementById('grammarLabInput');
            const feedback = document.getElementById('grammarLabFeedback');
            if (!exercise || !input || !feedback || !root.GrammarLabCore) return;
            const result = root.GrammarLabCore.evaluateAnswer({ exercise, userAnswer: input.value });
            this.recordAttempt(exercise, result, input.value);
            feedback.textContent = result.isCorrect ? 'Doğru.' : `Yanlış. Beklenen: ${result.expected_answers.join(', ')}`;
            feedback.dataset.result = result.result;
            input.disabled = true;
        }

        recordAttempt(exercise, result, userAnswer) {
            try {
                root.grammarProgressStore?.recordAttempt({
                    exercise_id: exercise.exercise_id,
                    grammar_topic: exercise.grammar_topic || null,
                    result: result.result,
                    timestamp: new Date().toISOString(),
                    user_answer: userAnswer,
                    expected_answers: result.expected_answers,
                    verification_status: exercise.verification_status,
                    exercise_eligible: exercise.exercise_eligible
                });
            } catch (error) {
                root.console?.error?.('Grammar progress could not be recorded.', error);
            }
        }
    }

    root.GrammarLabMode = GrammarLabMode;
    root.grammarLabMode = new GrammarLabMode();
})(typeof window !== 'undefined' ? window : globalThis);
