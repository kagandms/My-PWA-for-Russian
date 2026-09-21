(function exposeTrkiMode(root) {
    function getElement(id) {
        return root.document?.getElementById(id) || null;
    }

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function formatSeconds(seconds) {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
        const remainder = String(safeSeconds % 60).padStart(2, '0');
        return `${minutes}:${remainder}`;
    }

    class TrkiMode {
        constructor(options = {}) {
            this.repository = options.repository || root.trkiRepository;
            this.sessionStore = options.sessionStore || root.trkiSessionStore;
            this.attemptStore = options.attemptStore || root.trkiAttemptStore;
            this.profileStore = options.profileStore || root.trkiProfileStore;
            this.errorBridge = options.errorBridge || root.TrkiErrorBridge;
            this.errorNotebook = options.errorNotebook || root.errorNotebookStore;
            this.queue = [];
            this.session = null;
            this.mode = 'study';
            this.selectedOption = null;
            this.hasSubmitted = false;
            this.timerHandle = null;
            this.isBound = false;
        }

        init() {
            this.bindControls();
            this.showStartPanel();
            this.renderTimer();
        }

        bindControls() {
            if (this.isBound) return;
            this.isBound = true;
            getElement('trkiStudyStart').onclick = () => this.start('study');
            getElement('trkiExamStart').onclick = () => this.start('exam');
            getElement('trkiSubmit').onclick = () => this.submit();
            getElement('trkiNext').onclick = () => this.next();
            getElement('trkiPause').onclick = () => this.togglePause();
            getElement('trkiRestart').onclick = () => this.reset();
            getElement('trkiWritingInput').oninput = () => this.renderWritingCount();
        }

        start(mode) {
            if (this.session?.session_status === 'active' || this.session?.session_status === 'paused') {
                if (this.mode !== mode) {
                    this.setStatus(`Devam eden ${this.mode} oturumu var; önce onu tamamlayın.`);
                    return;
                }
                this.startTimerRefresh();
                this.renderExercise();
                return;
            }
            const persistedSession = this.sessionStore.getActiveSession?.();
            if (persistedSession) {
                this.restoreSession(persistedSession);
                return;
            }
            this.mode = mode;
            const level = getElement('trkiLevel')?.value || 'B1';
            const section = getElement('trkiSection')?.value || 'all';
            this.queue = this.buildQueue(level, section, mode);
            if (this.queue.length === 0) {
                this.setStatus('Bu seçim için doğrulanmış TRKI içeriği yok.');
                return;
            }
            this.session = this.sessionStore.createSession({
                mode,
                level,
                duration_seconds: mode === 'exam' ? 45 * 60 : 20 * 60,
                planned_items: this.queue.map(exercise => ({ exercise_id: exercise.exercise_id }))
            });
            this.startTimerRefresh();
            this.renderExercise();
        }

        restoreSession(session) {
            const allExercises = this.repository.getAllExercises();
            const exerciseById = new Map(allExercises.map(exercise => [exercise.exercise_id, exercise]));
            const queue = session.planned_items.map(item => exerciseById.get(item.exercise_id)).filter(Boolean);
            if (queue.length !== session.planned_items.length) {
                this.setStatus('Devam eden TRKI oturumu için içerik bulunamadı.');
                return;
            }
            this.session = session;
            this.mode = session.mode;
            this.queue = queue;
            this.startTimerRefresh();
            this.renderExercise();
        }

        buildQueue(level, section, mode) {
            return this.repository.getAllExercises()
                .filter(exercise => exercise.level === level && (section === 'all' || exercise.section === section))
                .filter(exercise => mode === 'study'
                    || exercise.section === 'writing'
                    || (exercise.verification_status === 'verified' && exercise.exercise_eligible === true));
        }

        getCurrentExercise() {
            return this.queue[this.session?.current_index || 0] || null;
        }

        renderExercise() {
            const exercise = this.getCurrentExercise();
            if (!exercise) return this.finish();
            this.showExercisePanel();
            this.hasSubmitted = false;
            this.selectedOption = null;
            getElement('trkiProgress').textContent = `${this.session.current_index + 1}/${this.queue.length}`;
            getElement('trkiSectionLabel').textContent = `${exercise.level} · ${exercise.section} · ${exercise.exercise_type}`;
            getElement('trkiSourceMeta').textContent = this.formatSourceMeta(exercise);
            getElement('trkiPrompt').textContent = exercise.prompt;
            getElement('trkiPassage').textContent = exercise.passage || '';
            this.renderOptions(exercise);
            this.renderWritingInput(exercise);
            getElement('trkiFeedback').textContent = '';
            getElement('trkiNext').classList.add('hidden');
            getElement('trkiSubmit').classList.remove('hidden');
            getElement('trkiPause').disabled = this.mode === 'exam';
            getElement('trkiPause').textContent = 'Duraklat';
        }

        renderOptions(exercise) {
            const options = getElement('trkiOptions');
            options.innerHTML = '';
            if (typeof options.replaceChildren === 'function') options.replaceChildren();
            if (Array.isArray(options.children)) options.children = [];
            (exercise.options || []).forEach((option, index) => {
                const button = root.document.createElement('button');
                button.type = 'button';
                button.className = 'modal-btn trki-option';
                button.textContent = option;
                button.onclick = () => { this.selectedOption = index; };
                options.appendChild(button);
            });
        }

        renderWritingInput(exercise) {
            const input = getElement('trkiWritingInput');
            const isWriting = exercise.section === 'writing';
            input.classList.toggle('hidden', !isWriting);
            if (isWriting) input.value = '';
            getElement('trkiWritingMeta').classList.toggle('hidden', !isWriting);
            getElement('trkiOptions').classList.toggle('hidden', isWriting);
            this.renderWritingCount();
        }

        renderWritingCount() {
            const input = getElement('trkiWritingInput');
            const words = input.value.trim() ? input.value.trim().split(/\s+/u).length : 0;
            getElement('trkiWritingCount').textContent = `Kelime sayısı: ${words}`;
        }

        formatSourceMeta(exercise) {
            const sourceId = exercise.source_reference?.source_id || 'unknown';
            const status = exercise.verification_status || 'unknown';
            const scoring = exercise.exercise_eligible === true && exercise.scoring?.mode === 'objective'
                ? 'objective'
                : 'practice-only';
            return `Kaynak referansı: ${sourceId} · Provenance: ${status} · ${scoring}`;
        }

        submit() {
            if (this.hasSubmitted) return;
            const exercise = this.getCurrentExercise();
            if (!exercise) return;
            const attempt = this.createAttempt(exercise);
            if (!attempt) return;
            this.attemptStore.recordAttempt(attempt);
            this.profileStore.applyAttempt(attempt);
            this.recordNotebookError(exercise, attempt);
            this.hasSubmitted = true;
            this.renderFeedback(exercise, attempt);
        }

        createAttempt(exercise) {
            const attemptId = `trki-attempt:${this.session.session_id}:${exercise.exercise_id}:${this.session.current_index}`;
            if (exercise.section === 'writing') {
                const userAnswer = getElement('trkiWritingInput').value.trim();
                if (!userAnswer) return null;
                return this.createPracticeAttempt(exercise, attemptId, userAnswer);
            }
            if (this.selectedOption === null) {
                this.setStatus('Önce bir seçenek seçin.');
                return null;
            }
            const isCorrect = this.selectedOption === exercise.answer_key?.option_index;
            const objectiveScoreable = exercise.verification_status === 'verified' && exercise.exercise_eligible === true;
            if (!objectiveScoreable) return this.createPracticeAttempt(exercise, attemptId, exercise.options[this.selectedOption]);
            return {
                attempt_id: attemptId,
                session_id: this.session.session_id,
                exercise_id: exercise.exercise_id,
                level: exercise.level,
                section: exercise.section,
                exercise_type: exercise.exercise_type,
                user_answer: exercise.options[this.selectedOption],
                result: isCorrect ? 'correct' : 'incorrect',
                scoring_status: 'scored',
                objective_scoreable: true,
                score: isCorrect ? exercise.scoring.points : 0,
                mastery_eligible: true,
                error_notebook_eligible: true,
                adaptive_eligible: false,
                answered_at: new Date().toISOString()
            };
        }

        createPracticeAttempt(exercise, attemptId, userAnswer) {
            return {
                attempt_id: attemptId,
                session_id: this.session.session_id,
                exercise_id: exercise.exercise_id,
                level: exercise.level,
                section: exercise.section,
                exercise_type: exercise.exercise_type,
                user_answer: userAnswer,
                result: 'practice_submitted',
                scoring_status: 'practice_only',
                objective_scoreable: false,
                score: null,
                mastery_eligible: false,
                error_notebook_eligible: false,
                adaptive_eligible: false,
                answered_at: new Date().toISOString()
            };
        }

        recordNotebookError(exercise, attempt) {
            const error = this.errorBridge?.createNotebookError?.({ exercise, attempt });
            if (error) this.errorNotebook?.recordError?.(error);
        }

        renderFeedback(exercise, attempt) {
            const feedback = getElement('trkiFeedback');
            if (this.mode === 'exam') {
                feedback.textContent = 'Yanıt kaydedildi. Sonuçlar oturum tamamlandığında gösterilir.';
            } else if (attempt.scoring_status === 'practice_only') {
                feedback.textContent = 'Practice-only kayıt oluşturuldu; skor, mastery ve Error Notebook etkisi yok.';
            } else {
                feedback.textContent = attempt.result === 'correct' ? 'Doğru.' : `Yanlış. Doğru seçenek: ${exercise.options[exercise.answer_key.option_index]}`;
            }
            getElement('trkiSubmit').classList.add('hidden');
            getElement('trkiNext').classList.remove('hidden');
        }

        next() {
            if (!this.hasSubmitted) return;
            const item = this.session.planned_items[this.session.current_index];
            this.session = this.sessionStore.completeItem(this.session.session_id, item.exercise_id);
            if (this.session.session_status === 'completed') return this.finish();
            this.renderExercise();
        }

        togglePause() {
            if (this.mode === 'exam' || !this.session) return;
            if (this.session.session_status === 'active') {
                this.session = this.sessionStore.pause(this.session.session_id);
                getElement('trkiPause').textContent = 'Devam et';
                return;
            }
            this.session = this.sessionStore.resume(this.session.session_id);
            getElement('trkiPause').textContent = 'Duraklat';
        }

        renderTimer() {
            if (!this.session) return;
            const elapsed = this.sessionStore.getElapsedSeconds(this.session.session_id);
            getElement('trkiTimer').textContent = `Süre: ${formatSeconds(elapsed)}`;
        }

        startTimerRefresh() {
            this.disposeTimer();
            this.renderTimer();
            this.timerHandle = root.setInterval?.(() => this.renderTimer(), 1000) || null;
        }

        disposeTimer() {
            if (this.timerHandle !== null) root.clearInterval?.(this.timerHandle);
            this.timerHandle = null;
        }

        finish() {
            this.disposeTimer();
            this.showCompletionPanel();
            const attempts = this.attemptStore.getSnapshot?.().attempts || [];
            const sessionAttempts = attempts.filter(attempt => attempt.session_id === this.session?.session_id);
            const score = sessionAttempts
                .filter(attempt => attempt.scoring_status === 'scored')
                .reduce((total, attempt) => total + attempt.score, 0);
            const maximum = this.queue
                .filter(exercise => exercise.exercise_eligible === true && exercise.scoring?.mode === 'objective')
                .reduce((total, exercise) => total + exercise.scoring.points, 0);
            getElement('trkiSummary').textContent = `TRKI oturumu tamamlandı. Yerel pratik sonucu: ${score}/${maximum}. Resmî sertifika skoru değildir.`;
        }

        reset() {
            this.disposeTimer();
            this.session = null;
            this.queue = [];
            this.showStartPanel();
        }

        showStartPanel() {
            getElement('trkiStartPanel')?.classList.remove('hidden');
            getElement('trkiExercisePanel')?.classList.add('hidden');
            getElement('trkiCompletionPanel')?.classList.add('hidden');
        }

        showExercisePanel() {
            getElement('trkiStartPanel')?.classList.add('hidden');
            getElement('trkiExercisePanel')?.classList.remove('hidden');
            getElement('trkiCompletionPanel')?.classList.add('hidden');
        }

        showCompletionPanel() {
            getElement('trkiStartPanel')?.classList.add('hidden');
            getElement('trkiExercisePanel')?.classList.add('hidden');
            getElement('trkiCompletionPanel')?.classList.remove('hidden');
        }

        setStatus(message) {
            const status = getElement('trkiStatus');
            if (status) status.textContent = message;
        }

        dispose() {
            this.disposeTimer();
        }
    }

    root.TrkiMode = TrkiMode;
    root.trkiController = new TrkiMode();
})(typeof window !== 'undefined' ? window : globalThis);
