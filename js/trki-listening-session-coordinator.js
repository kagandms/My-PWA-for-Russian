(function exposeTrkiListeningSessionCoordinator(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function getElement(document, id) {
        return document?.getElementById?.(id) || null;
    }

    function formatSeconds(seconds) {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
    }

    function createDefaultAudioAdapter() {
        return {
            play: async () => { throw new Error('A Listening audio adapter is unavailable.'); },
            cleanup() {}
        };
    }

    class TrkiListeningSessionCoordinator {
        constructor(options = {}) {
            this.browserWindow = options.window ?? root;
            this.document = options.document ?? this.browserWindow.document;
            this.repository = options.repository ?? root.trkiListeningRepository;
            this.sessionStore = options.sessionStore ?? new root.TrkiListeningSessionStore();
            this.attemptStore = options.attemptStore ?? new root.TrkiListeningAttemptStore();
            this.playbackFactory = options.playbackFactory ?? root.ListeningPlayback.create;
            this.audioAdapterFactory = options.audioAdapterFactory ?? ((item, handlers) => this.createAudioAdapter(item, handlers));
            this.audioMemory = new Map();
            this.idFactory = options.idFactory ?? (() => `trki-listening-attempt:${Date.now()}`);
            this.now = options.now ?? (() => new Date().toISOString());
            this.queue = [];
            this.session = null;
            this.playback = null;
            this.audioAdapter = null;
            this.mode = 'study';
            this.selectedAnswer = null;
            this.hasSubmitted = false;
            this.summary = null;
            this.timerHandle = null;
            this.boundControls = false;
        }

        async init() {
            await this.repository?.load?.();
            this.bindControls();
            const persistedSession = this.sessionStore.getActiveSession?.();
            if (persistedSession) this.restoreSession(persistedSession);
            this.render();
            return this.getViewState();
        }

        bindControls() {
            if (this.boundControls) return;
            this.boundControls = true;
            getElement(this.document, 'trkiListeningStudyStart')?.addEventListener('click', () => { void this.startFromUi('study'); });
            getElement(this.document, 'trkiListeningExamStart')?.addEventListener('click', () => { void this.startFromUi('exam'); });
            getElement(this.document, 'trkiListeningPlay')?.addEventListener('click', () => { void this.play(); });
            getElement(this.document, 'trkiListeningSubmit')?.addEventListener('click', () => this.submit());
            getElement(this.document, 'trkiListeningNext')?.addEventListener('click', () => this.next());
            getElement(this.document, 'trkiListeningReselect')?.addEventListener('change', (event) => { void this.selectRestrictedAudio(event.target.files?.[0]); });
        }

        createAudioAdapter(item, handlers) {
            const AudioContext = this.browserWindow.AudioContext || this.browserWindow.webkitAudioContext;
            if (item.audio.storage_mode === 'bundled_synthetic' && typeof AudioContext === 'function') {
                let context = null;
                let oscillator = null;
                return {
                    play: async () => {
                        context = context || new AudioContext();
                        await context.resume?.();
                        oscillator = context.createOscillator();
                        oscillator.frequency.value = 440;
                        oscillator.connect(context.destination);
                        oscillator.onended = () => handlers.onEnded?.();
                        handlers.onPlaying?.();
                        oscillator.start();
                        oscillator.stop(context.currentTime + (item.audio.duration_ms / 1000));
                    },
                    cleanup: () => {
                        try { oscillator?.stop?.(); } catch (error) { this.browserWindow.console?.debug?.('Synthetic audio already stopped.', error); }
                        void context?.close?.();
                    }
                };
            }
            const file = this.audioMemory.get(item.audio.audio_id);
            if (file && typeof this.browserWindow.Audio === 'function' && typeof this.browserWindow.URL?.createObjectURL === 'function') {
                const url = this.browserWindow.URL.createObjectURL(file);
                const element = new this.browserWindow.Audio(url);
                element.onplaying = () => handlers.onPlaying?.();
                element.onwaiting = () => handlers.onBuffering?.();
                element.onended = () => handlers.onEnded?.();
                element.onerror = () => handlers.onError?.({ before_start: !this.playback?.getSnapshot?.().actual_start_seen });
                return { play: () => element.play(), cleanup: () => { element.pause?.(); this.browserWindow.URL.revokeObjectURL(url); } };
            }
            return createDefaultAudioAdapter();
        }

        buildQueue(level = null) {
            return (this.repository?.getObjectiveTasks?.() || [])
                .filter((task) => !level || task.package.level === level)
                .flatMap((task) => task.questions.map((question) => ({
                    ...cloneValue(task),
                    question: cloneValue(question),
                    identity: root.TrkiListeningCore.createIdentity({
                        package_id: task.package.package_id,
                        package_version: task.package.package_version,
                        task_id: task.task_id,
                        audio_id: task.audio.audio_id,
                        question_id: question.question_id
                    })
                })));
        }

        getSelectedLevel() {
            const selectedLevel = getElement(this.document, 'trkiListeningLevel')?.value;
            return ['B1', 'B2'].includes(selectedLevel) ? selectedLevel : 'B1';
        }

        async startFromUi(mode) {
            try {
                await this.start(mode);
            } catch (error) {
                const status = getElement(this.document, 'trkiListeningStartStatus');
                if (status) status.textContent = error.message || 'TRKI Listening oturumu başlatılamadı.';
            }
        }

        createAudioBindings(queue) {
            return queue.reduce((bindings, item) => {
                if (bindings[item.audio.audio_id]) return bindings;
                bindings[item.audio.audio_id] = {
                    ...cloneValue(item.audio),
                    availability: item.audio.storage_mode === 'local_restricted' ? 'awaiting_audio_reselection' : 'available',
                    plays_consumed: 0
                };
                return bindings;
            }, {});
        }

        async start(mode) {
            if (this.session?.session_status === 'active' || this.session?.session_status === 'paused') {
                this.restoreSession(this.session);
                return this.getViewState();
            }
            this.mode = mode;
            const level = this.getSelectedLevel();
            this.queue = this.buildQueue(level);
            if (!this.queue.length) throw new Error(`No verified TRKI Listening content is available for ${level}.`);
            this.session = this.sessionStore.createSession({
                mode,
                level,
                duration_seconds: mode === 'exam' ? 45 * 60 : 20 * 60,
                planned_items: this.queue.map((item) => ({ item_id: item.identity.key, identity: item.identity.parts })),
                audio_bindings: this.createAudioBindings(this.queue)
            });
            this.summary = null;
            this.configureCurrentItem();
            this.startTimerRefresh();
            this.render();
            return this.getViewState();
        }

        restoreSession(session) {
            this.session = cloneValue(session);
            this.mode = session.mode;
            this.queue = this.buildQueue(session.level);
            this.queue = this.queue.filter((item) => session.planned_items.some((planned) => planned.item_id === item.identity.key));
            if (this.queue.length !== session.planned_items.length) throw new Error('Persisted TRKI Listening content is unavailable.');
            Object.entries(session.audio_bindings || {}).forEach(([audioId, binding]) => {
                if (binding.storage_mode === 'local_restricted' && !this.audioMemory.has(audioId)) {
                    this.session = this.sessionStore.updateAudioBinding(session.session_id, audioId, { availability: 'awaiting_audio_reselection' });
                }
            });
            this.configureCurrentItem();
            this.startTimerRefresh();
        }

        getCurrentItem() {
            const itemId = this.session?.planned_items?.[this.session.current_index]?.item_id;
            return this.queue.find((item) => item.identity.key === itemId) || null;
        }

        configureCurrentItem() {
            const item = this.getCurrentItem();
            if (!item) return;
            this.selectedAnswer = null;
            this.hasSubmitted = false;
            const binding = this.session.audio_bindings[item.audio.audio_id];
            this.playback = this.playbackFactory(item.replay_policy, { plays_consumed: binding?.plays_consumed });
            this.audioAdapter?.cleanup?.();
            this.audioAdapter = this.audioAdapterFactory(item, {
                onPlaying: () => this.handleAudioEvent('playing'),
                onBuffering: () => this.handleAudioEvent('buffering'),
                onEnded: () => this.handleAudioEvent('ended'),
                onError: (error) => this.handleAudioEvent('error', error)
            }) || createDefaultAudioAdapter();
        }

        async play() {
            if (!this.session || !this.playback || this.session.session_status !== 'active') return null;
            const requested = this.playback.requestPlay();
            this.persistPlayback();
            if (requested.status !== 'play_requested') {
                this.render();
                return requested;
            }
            const item = this.getCurrentItem();
            const binding = this.session.audio_bindings[item.audio.audio_id];
            if (item.audio.storage_mode === 'local_restricted' && binding.availability !== 'available') {
                this.handleAudioEvent('error', { before_start: true });
                return this.playback.getSnapshot();
            }
            try {
                await this.audioAdapter.play({ item, onPlaying: () => this.handleAudioEvent('playing') });
            } catch (error) {
                this.handleAudioEvent('error', { before_start: true, error });
            }
            this.render();
            return this.playback.getSnapshot();
        }

        handleAudioEvent(eventName, details = {}) {
            if (!this.playback) return null;
            const handlers = {
                playing: () => this.playback.handlePlaying(),
                buffering: () => this.playback.handleBuffering(),
                ended: () => this.playback.handleEnded(),
                error: () => this.playback.handleFailure(details)
            };
            const snapshot = handlers[eventName]?.() || this.playback.getSnapshot();
            this.persistPlayback();
            this.render();
            return snapshot;
        }

        persistPlayback() {
            const item = this.getCurrentItem();
            if (!item || !this.session || !this.playback) return;
            this.session = this.sessionStore.updateAudioBinding(this.session.session_id, item.audio.audio_id, {
                plays_consumed: this.playback.getSnapshot().plays_consumed
            });
        }

        selectAnswer(optionIndex) {
            this.selectedAnswer = Number.isInteger(optionIndex) ? optionIndex : null;
            return this.selectedAnswer;
        }

        async selectRestrictedAudio(file) {
            if (!file || !this.session) return null;
            const item = this.getCurrentItem();
            if (!item || item.audio.storage_mode !== 'local_restricted') return null;
            const audioApi = root.TrkiListeningAudio;
            const cryptoApi = this.browserWindow.crypto || root.crypto;
            const accepted = await audioApi.acceptReselectedFile(this.session, item.audio.audio_id, file, cryptoApi);
            this.session = this.sessionStore.updateAudioBinding(
                this.session.session_id,
                item.audio.audio_id,
                accepted.session.audio_bindings[item.audio.audio_id]
            );
            this.audioMemory.set(item.audio.audio_id, file);
            this.configureCurrentItem();
            this.render();
            return this.getViewState();
        }

        submit() {
            if (this.hasSubmitted) return null;
            const item = this.getCurrentItem();
            if (!item || !Number.isInteger(this.selectedAnswer)) return null;
            const result = root.TrkiListeningCore.evaluateAnswer(item.question, this.selectedAnswer);
            const evaluation = root.TrkiListeningCore.createEvaluationSnapshot(item.question, result, {
                package: item.package,
                task: item
            });
            const attempt = this.attemptStore.recordAttempt({
                attempt_id: this.idFactory(),
                session_id: this.session.session_id,
                level: item.package.level,
                section: 'listening',
                exercise_type: item.task_type,
                identity: item.identity,
                submitted_answer: { option_index: this.selectedAnswer },
                result: result.result,
                scoring_status: 'scored',
                objective_scoreable: true,
                score: result.score,
                mastery_eligible: true,
                error_notebook_eligible: false,
                adaptive_eligible: false,
                replay: this.playback.getSnapshot(),
                evaluation,
                answered_at: this.now()
            });
            this.hasSubmitted = true;
            this.render();
            return attempt;
        }

        next() {
            if (!this.hasSubmitted || !this.session) return null;
            const item = this.getCurrentItem();
            this.session = this.sessionStore.completeItem(this.session.session_id, item.identity.key, { result: 'submitted' });
            if (this.session.session_status === 'completed') {
                this.finishSummary();
                this.disposeAudio();
                this.render();
                return this.session;
            }
            this.configureCurrentItem();
            this.render();
            return this.session;
        }

        createTechnicalAttempt(item, reason) {
            return this.attemptStore.recordAttempt({
                attempt_id: `${this.idFactory()}:technical`,
                session_id: this.session.session_id,
                level: item.package.level,
                section: 'listening',
                exercise_type: item.task_type,
                identity: item.identity,
                submitted_answer: { status: 'not_submitted' },
                result: 'technical_unavailable',
                scoring_status: 'non_scorable',
                objective_scoreable: false,
                score: null,
                mastery_eligible: false,
                error_notebook_eligible: false,
                adaptive_eligible: false,
                technical_reason: reason,
                replay: this.playback?.getSnapshot() || null,
                evaluation: null,
                answered_at: this.now()
            });
        }

        handleTimerTick(at) {
            if (!this.session || this.session.session_status !== 'active') return this.getViewState();
            if (this.sessionStore.getRemainingSeconds(this.session.session_id, at) > 0) {
                this.render();
                return this.getViewState();
            }
            const item = this.getCurrentItem();
            const binding = item && this.session.audio_bindings[item.audio.audio_id];
            if (item && item.audio.storage_mode === 'local_restricted' && binding?.availability !== 'available') {
                this.createTechnicalAttempt(item, 'required_audio_unavailable');
                this.summary = { comparable: false, technical_unavailable_count: 1 };
            } else {
                this.summary = { comparable: false, technical_unavailable_count: 0, reason: 'session_timeout' };
            }
            this.session = this.sessionStore.timeout(this.session.session_id);
            this.disposeAudio();
            this.render();
            return this.getViewState();
        }

        finishSummary() {
            const attempts = this.attemptStore.getSnapshot().attempts.filter((attempt) => attempt.session_id === this.session.session_id);
            const technical = attempts.filter((attempt) => attempt.result === 'technical_unavailable').length;
            const score = attempts.filter((attempt) => attempt.scoring_status === 'scored').reduce((total, attempt) => total + attempt.score, 0);
            this.summary = { comparable: technical === 0, technical_unavailable_count: technical, score, denominator: this.queue.length };
        }

        startTimerRefresh() {
            if (this.timerHandle !== null) this.browserWindow.clearInterval?.(this.timerHandle);
            this.timerHandle = this.browserWindow.setInterval?.(() => this.handleTimerTick(this.now()), 1000) || null;
            this.timerHandle?.unref?.();
        }

        disposeAudio() {
            this.audioAdapter?.cleanup?.();
            this.playback?.cleanup?.();
            this.audioAdapter = null;
            this.playback = null;
        }

        dispose() {
            if (this.timerHandle !== null) this.browserWindow.clearInterval?.(this.timerHandle);
            this.timerHandle = null;
            this.disposeAudio();
        }

        getViewState() {
            return {
                state: this.session?.session_status || 'idle',
                mode: this.mode,
                session: this.session ? cloneValue(this.session) : null,
                current_identity: this.getCurrentItem()?.identity || null,
                current_question: this.getCurrentItem()?.question || null,
                playback: this.playback?.getSnapshot?.() || null,
                summary: this.summary ? cloneValue(this.summary) : null,
                selected_answer: this.selectedAnswer
            };
        }

        render() {
            const startPanel = getElement(this.document, 'trkiListeningStartPanel');
            const exercisePanel = getElement(this.document, 'trkiListeningExercisePanel');
            const completionPanel = getElement(this.document, 'trkiListeningCompletionPanel');
            const isActive = ['active', 'paused'].includes(this.session?.session_status);
            startPanel?.classList?.toggle('hidden', Boolean(this.session));
            exercisePanel?.classList?.toggle('hidden', !isActive);
            completionPanel?.classList?.toggle('hidden', !this.summary);
            const timer = getElement(this.document, 'trkiListeningTimer');
            if (timer && this.session) timer.textContent = `Süre: ${formatSeconds(this.sessionStore.getElapsedSeconds(this.session.session_id))}`;
            const progress = getElement(this.document, 'trkiListeningProgress');
            if (progress && this.session) {
                const progressIndex = Math.min(this.session.current_index + 1, this.queue.length);
                progress.textContent = `${progressIndex}/${this.queue.length}`;
            }
            const question = getElement(this.document, 'trkiListeningPrompt');
            if (question) question.textContent = this.getCurrentItem()?.question.prompt || '';
            const status = getElement(this.document, 'trkiListeningAudioStatus');
            if (status) status.textContent = this.playback?.getSnapshot?.().status || '';
            const playButton = getElement(this.document, 'trkiListeningPlay');
            if (playButton) playButton.disabled = !isActive || ['playing', 'buffering', 'max_plays_reached', 'cleaned_up'].includes(this.playback?.getSnapshot?.().status);
            const submitButton = getElement(this.document, 'trkiListeningSubmit');
            if (submitButton) submitButton.disabled = !isActive || this.hasSubmitted;
            const nextButton = getElement(this.document, 'trkiListeningNext');
            nextButton?.classList?.toggle('hidden', !this.hasSubmitted);
            const summary = getElement(this.document, 'trkiListeningSummary');
            if (summary && this.summary) summary.textContent = this.summary.comparable ? 'Yerel sonuç hazır.' : 'Teknik olarak kullanılamayan içerik nedeniyle sonuç karşılaştırılamaz.';
            const feedback = getElement(this.document, 'trkiListeningFeedback');
            if (feedback) feedback.textContent = this.hasSubmitted
                ? 'Yanıt kaydedildi; sonuç yerel ve paket sürümüne bağlıdır.'
                : '';
            const options = getElement(this.document, 'trkiListeningOptions');
            if (!options || !this.getCurrentItem()) return;
            options.innerHTML = '';
            this.getCurrentItem().question.options.forEach((option, index) => {
                const button = this.document?.createElement?.('button');
                if (!button) return;
                button.type = 'button';
                button.textContent = option;
                button.addEventListener?.('click', () => this.selectAnswer(index));
                options.appendChild?.(button);
            });
        }
    }

    root.TrkiListeningSessionCoordinator = TrkiListeningSessionCoordinator;
    root.trkiListeningController = root.trkiListeningController instanceof TrkiListeningSessionCoordinator
        ? root.trkiListeningController
        : new TrkiListeningSessionCoordinator();
})(typeof window !== 'undefined' ? window : globalThis);
