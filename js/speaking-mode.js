(function exposeSpeakingMode(root) {
    const TYPE_LABELS = Object.freeze({
        read_aloud: 'Read Aloud',
        prompted_speech: 'Prompted Speech',
        free_speech: 'Free Speech'
    });

    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getNow(options) {
        return options.now ? options.now() : new Date().toISOString();
    }

    function getErrorCode(error) {
        return error?.code || (String(error?.message || '').toLowerCase().includes('denied') ? 'permission_denied' : 'error');
    }

    class SpeakingMode {
        constructor(options = {}) {
            this.browserWindow = options.window ?? root;
            this.document = options.document ?? this.browserWindow.document;
            this.navigator = options.navigator ?? this.browserWindow.navigator;
            this.capabilityDetector = options.capabilityDetector ?? root.CapabilityDetector;
            this.exerciseRepository = options.exerciseRepository
                ?? (typeof root.SpeakingExerciseRepository === 'function'
                    ? (root.speakingExerciseRepository ?? new root.SpeakingExerciseRepository({ vocabularyRepository: root.vocabularyRepository }))
                    : { load: async () => {}, getReadAloudExercises: () => [], getPromptedExercises: () => [], getFreeSpeechTopics: () => [] });
            this.eventStore = options.eventStore
                ?? (typeof root.SpeakingEventStore === 'function' ? new root.SpeakingEventStore() : null);
            this.errorBridge = options.errorBridge ?? root.SpeakingErrorBridge;
            this.speechAdapterFactory = options.speechAdapterFactory
                ?? ((adapterOptions) => new root.SpeechRecognitionAdapter(adapterOptions));
            this.recorderAdapterFactory = options.recorderAdapterFactory
                ?? ((adapterOptions) => new root.AudioRecorderAdapter(adapterOptions));
            this.idFactory = options.idFactory ?? (() => 'speaking:attempt:' + Date.now());
            this.now = options.now;
            this.state = 'idle';
            this.capabilities = null;
            this.exercisePool = [];
            this.currentExercise = null;
            this.speechAdapter = null;
            this.recorderAdapter = null;
            this.adapterAvailability = { speech: false, recorder: false };
            this.attemptId = null;
            this.startedAt = null;
            this.startPromise = null;
            this.stopPromise = null;
            this.cancelPromise = null;
            this.adaptiveCompletion = null;
            this.pagehideHandler = () => { void this.cancel(); };
            this.boundControls = false;
        }

        async init() {
            await this.exerciseRepository.load();
            this.exercisePool = [
                ...this.exerciseRepository.getReadAloudExercises(),
                ...this.exerciseRepository.getPromptedExercises(),
                ...this.exerciseRepository.getFreeSpeechTopics().map((topic) => ({
                    ...topic,
                    exercise_id: topic.topic_id,
                    exercise_type: 'free_speech',
                    expected_text: null,
                    targets: []
                }))
            ];
            this.currentExercise = this.exercisePool[0] ?? null;
            this.capabilities = this.capabilityDetector?.detect?.({
                window: this.browserWindow,
                navigator: this.navigator
            }) ?? null;
            this.browserWindow.addEventListener?.('pagehide', this.pagehideHandler);
            this.bindControls();
            this.render();
            return this.getViewState();
        }

        bindControls() {
            if (this.boundControls) return;
            this.boundControls = true;
            this.document.getElementById('speakingStart')?.addEventListener('click', () => { void this.start(); });
            this.document.getElementById('speakingStop')?.addEventListener('click', () => { void this.stop(); });
            this.document.getElementById('speakingCancel')?.addEventListener('click', () => { void this.cancel(); });
        }

        getViewState() {
            return {
                state: this.state,
                exercise_id: this.currentExercise?.exercise_id ?? null,
                capabilities: this.capabilities ? cloneValue(this.capabilities) : null
            };
        }

        configureAdaptiveExercise(item, onComplete) {
            this.currentExercise = {
                ...cloneValue(item),
                exercise_type: item.exercise_type || 'read_aloud',
                expected_text: item.expected_text ?? item.prompt ?? null,
                targets: cloneValue(item.targets || [])
            };
            this.adaptiveCompletion = typeof onComplete === 'function' ? onComplete : null;
            this.state = 'idle';
            this.attemptId = null;
            this.startedAt = null;
            this.render();
        }

        createSpeechAdapter() {
            return this.speechAdapterFactory({
                window: this.browserWindow,
                navigator: this.navigator,
                onUpdate: () => this.render(),
                onError: () => this.render()
            });
        }

        createRecorderAdapter() {
            return this.recorderAdapterFactory({
                window: this.browserWindow,
                navigator: this.navigator,
                onUpdate: () => this.render(),
                onError: () => this.render()
            });
        }

        async start() {
            if (this.startPromise) return this.startPromise;
            if (this.state === 'recording') return true;
            if (!this.currentExercise) {
                this.state = 'unsupported';
                this.render();
                return false;
            }
            this.startPromise = this.startAdapters().finally(() => {
                this.startPromise = null;
            });
            return this.startPromise;
        }

        async startAdapters() {
            this.state = 'requesting_permission';
            this.attemptId = this.idFactory();
            this.startedAt = getNow(this);
            this.adapterAvailability = { speech: false, recorder: false };
            this.speechAdapter = this.createSpeechAdapter();
            this.recorderAdapter = this.createRecorderAdapter();
            this.render();
            const results = await Promise.allSettled([
                this.speechAdapter.start(),
                this.recorderAdapter.start()
            ]);
            this.adapterAvailability = {
                speech: results[0].status === 'fulfilled',
                recorder: results[1].status === 'fulfilled'
            };
            if (!this.adapterAvailability.speech && !this.adapterAvailability.recorder) {
                this.state = results.some((result) => getErrorCode(result.reason) === 'permission_denied')
                    ? 'permission_denied'
                    : 'unsupported';
                this.render();
                await this.releaseAdapters();
                return false;
            }
            this.state = 'recording';
            this.render();
            return true;
        }

        stop() {
            if (this.stopPromise) return this.stopPromise;
            if (this.state !== 'recording') return null;
            this.stopPromise = this.stopAdapters().finally(() => {
                this.stopPromise = null;
            });
            return this.stopPromise;
        }

        async stopAdapters() {
            this.state = 'processing';
            this.render();
            const stopResults = await Promise.allSettled([
                this.adapterAvailability.speech ? Promise.resolve(this.speechAdapter.stop()) : Promise.resolve(null),
                this.adapterAvailability.recorder ? this.recorderAdapter.stop() : Promise.resolve(null)
            ]);
            const speechSnapshot = this.adapterAvailability.speech
                ? this.speechAdapter.getSnapshot()
                : { transcript_state: 'unavailable', transcript: '' };
            const recordingResult = stopResults[1]?.status === 'fulfilled' ? stopResults[1].value : null;
            const observation = this.buildObservation(speechSnapshot);
            const event = this.buildEvent(observation, recordingResult);
            if (!event) {
                this.state = 'error';
                await this.releaseAdapters();
                this.render();
                return null;
            }
            try {
                const storedEvent = this.eventStore.recordEvent(event);
                this.bridgeFinalObservation(observation);
                const adaptiveCompletion = this.adaptiveCompletion;
                this.adaptiveCompletion = null;
                adaptiveCompletion?.(storedEvent);
                this.state = 'result';
                await this.releaseAdapters();
                this.render();
                return storedEvent;
            } catch (error) {
                this.state = 'error';
                await this.releaseAdapters();
                this.render();
                throw error;
            }
        }

        buildObservation(speechSnapshot) {
            const transcriptState = speechSnapshot.transcript_state || 'unavailable';
            const transcriptText = String(
                speechSnapshot.final_transcript
                || (transcriptState === 'final_result' ? speechSnapshot.transcript : '')
                || ''
            );
            const base = {
                exercise_type: this.currentExercise.exercise_type,
                exercise_id: this.currentExercise.exercise_id,
                expected_text: this.currentExercise.expected_text ?? null,
                transcript_text: transcriptText,
                transcript_state: transcriptState
            };
            if (transcriptState !== 'final_result' || !transcriptText.trim()) {
                return {
                    ...base,
                    alignment_status: null,
                    target_observations: [],
                    transcript_observation_available: false
                };
            }
            if (this.currentExercise.exercise_type === 'read_aloud') {
                const alignment = root.SpeakingCore.alignTranscript(
                    this.currentExercise.expected_text,
                    transcriptText,
                    { transcriptState }
                );
                return {
                    ...base,
                    ...alignment,
                    lexical_unit_id: this.currentExercise.targets[0]?.lexical_unit_id,
                    sense_id: this.currentExercise.targets[0]?.sense_id,
                    target_surface: this.currentExercise.targets[0]?.target_surface,
                    target_observations: [],
                    transcript_observation_available: true
                };
            }
            if (this.currentExercise.exercise_type === 'prompted_speech') {
                const targets = root.SpeakingCore.detectTargets(transcriptText, this.currentExercise.targets);
                return {
                    ...base,
                    alignment_status: null,
                    target_observations: targets.detected,
                    transcript_observation_available: true
                };
            }
            return {
                ...base,
                alignment_status: null,
                target_observations: [],
                transcript_observation_available: false
            };
        }

        buildEvent(observation, recordingResult) {
            const hasTranscript = observation.transcript_state === 'final_result'
                && observation.transcript_text.trim().length > 0;
            const hasRecording = Boolean(recordingResult?.blob && recordingResult.blob.size > 0);
            if (!hasTranscript && !hasRecording) return null;
            const transcriptObservation = this.buildTranscriptEvaluation(observation);
            return {
                schema_version: 1,
                namespace: 'ru_tr_speaking_events_v1',
                event_id: this.attemptId + ':event',
                attempt_id: this.attemptId,
                started_at: this.startedAt,
                completed_at: getNow(this),
                skill: 'speaking',
                exercise_type: this.currentExercise.exercise_type,
                attempt_status: 'completed',
                targets: cloneValue(this.currentExercise.targets || []),
                expected_text: this.currentExercise.expected_text ?? null,
                transcript_text: observation.transcript_text,
                transcript_state: observation.transcript_state,
                recording: {
                    available: hasRecording,
                    mime_type: recordingResult?.mime_type ?? null,
                    duration_ms: Number(recordingResult?.duration_ms) || 0,
                    stored: false,
                    uploaded: false,
                    retention: 'session_only'
                },
                evaluation_availability: transcriptObservation.available
                    ? 'transcript_observation'
                    : 'none',
                evaluation: {
                    transcript_observation: transcriptObservation,
                    pronunciation: 'not_evaluated',
                    stress: 'not_evaluated',
                    fluency: 'not_evaluated',
                    overall: 'insufficient_evidence'
                }
            };
        }

        buildTranscriptEvaluation(observation) {
            if (!observation.transcript_observation_available) {
                return {
                    available: false,
                    evidence_scope: 'none',
                    assertion_scope: 'none',
                    detection_method: 'none',
                    verification_status: 'not_evaluated',
                    adaptive_eligible: false,
                    exercise_eligible: false,
                    observations: []
                };
            }
            const observations = observation.exercise_type === 'read_aloud'
                ? [{ kind: 'alignment', status: observation.alignment_status }]
                : observation.target_observations.map((target) => ({
                    kind: 'target_presence',
                    status: target.observed ? 'observed' : 'not_observed',
                    lexical_unit_id: target.lexical_unit_id,
                    sense_id: target.sense_id
                }));
            return {
                available: true,
                evidence_scope: 'stt_final_transcript',
                assertion_scope: observation.exercise_type === 'read_aloud'
                    ? 'transcript_alignment'
                    : 'target_presence_in_transcript',
                detection_method: 'deterministic',
                verification_status: 'verified',
                adaptive_eligible: false,
                exercise_eligible: false,
                observations
            };
        }

        bridgeFinalObservation(observation) {
            if (!observation.transcript_observation_available) return;
            if (observation.exercise_type === 'read_aloud') {
                if (observation.alignment_status === 'mismatch') {
                    this.errorBridge.recordObservation({
                        observation,
                        errorStore: root.errorNotebookStore
                    });
                }
                return;
            }
            observation.target_observations
                .filter((target) => target.observed === false)
                .forEach((target) => this.errorBridge.recordObservation({
                    observation: {
                        ...observation,
                        target_observation: target
                    },
                    errorStore: root.errorNotebookStore
                }));
        }

        async cancel() {
            if (this.cancelPromise) return this.cancelPromise;
            this.cancelPromise = (async () => {
                this.speechAdapter?.cancel?.();
                const recorderCancel = this.recorderAdapter?.cancel?.();
                this.recorderAdapter?.release?.();
                await Promise.allSettled([Promise.resolve(recorderCancel)]);
                this.state = 'idle';
                this.attemptId = null;
                this.startedAt = null;
                this.adaptiveCompletion = null;
                this.render();
            })().finally(() => {
                this.cancelPromise = null;
            });
            return this.cancelPromise;
        }

        async releaseAdapters() {
            this.speechAdapter?.dispose?.();
            this.recorderAdapter?.release?.();
            this.adapterAvailability = { speech: false, recorder: false };
        }

        dispose() {
            this.browserWindow.removeEventListener?.('pagehide', this.pagehideHandler);
            void this.cancel();
            this.recorderAdapter?.release?.();
            this.render();
        }

        render() {
            const typeElement = this.document?.getElementById('speakingExerciseType');
            const promptElement = this.document?.getElementById('speakingPrompt');
            const targetsElement = this.document?.getElementById('speakingTargets');
            const recordingElement = this.document?.getElementById('speakingRecordingState');
            const transcriptElement = this.document?.getElementById('speakingTranscriptState');
            const resultElement = this.document?.getElementById('speakingResult');
            const pronunciationElement = this.document?.getElementById('speakingPronunciation');
            const stressElement = this.document?.getElementById('speakingStress');
            const fluencyElement = this.document?.getElementById('speakingFluency');
            const startButton = this.document?.getElementById('speakingStart');
            const stopButton = this.document?.getElementById('speakingStop');
            const cancelButton = this.document?.getElementById('speakingCancel');
            const privacyElement = this.document?.getElementById('speakingPrivacyNotice');
            if (!typeElement) return;
            const exerciseType = this.currentExercise?.exercise_type
                ?? (this.currentExercise?.topic_id ? 'free_speech' : 'none');
            typeElement.textContent = TYPE_LABELS[exerciseType] ?? 'Speaking';
            promptElement.textContent = this.currentExercise?.expected_text
                || this.currentExercise?.prompt
                || this.currentExercise?.prompt_tr
                || 'Speaking exercise';
            targetsElement.textContent = (this.currentExercise?.targets || [])
                .map((target) => target.target_surface)
                .join(' · ') || 'No explicit lexical targets';
            recordingElement.textContent = 'Recording: ' + this.state;
            transcriptElement.textContent = 'Transcript: ' + (this.speechAdapter?.getSnapshot?.().transcript_state || 'not_attempted');
            resultElement.textContent = this.state === 'result'
                ? 'Transcript observation saved; acoustic skills remain not evaluated.'
                : '';
            pronunciationElement.textContent = 'Pronunciation: not_evaluated';
            stressElement.textContent = 'Stress: not_evaluated';
            fluencyElement.textContent = 'Fluency: not_evaluated';
            privacyElement.textContent = 'Audio is kept only in session memory by this app. Browser speech-service processing may follow browser policy.';
            startButton.disabled = this.state === 'recording' || this.state === 'processing';
            stopButton.disabled = this.state !== 'recording';
            cancelButton.disabled = !['recording', 'processing', 'requesting_permission'].includes(this.state);
        }
    }

    root.SpeakingMode = SpeakingMode;
    root.speakingMode = root.speakingMode ?? new SpeakingMode();
})(typeof window !== 'undefined' ? window : globalThis);
