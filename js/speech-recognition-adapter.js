(function exposeSpeechRecognitionAdapter(root) {
    const DEFAULT_STOP_TIMEOUT_MS = 1500;

    function createAdapterError(code, message, cause) {
        const error = new Error(message);
        error.code = code;
        if (cause) error.cause = cause;
        return error;
    }

    function cloneSnapshot(snapshot) {
        return { ...snapshot };
    }

    class SpeechRecognitionAdapter {
        constructor(options = {}) {
            this.browserWindow = options.window ?? root;
            this.Constructor = options.recognitionConstructor
                ?? this.browserWindow.SpeechRecognition
                ?? this.browserWindow.webkitSpeechRecognition;
            this.onUpdate = options.onUpdate ?? (() => {});
            this.onError = options.onError ?? (() => {});
            this.recognition = null;
            this.finalParts = [];
            this.partialTranscript = '';
            this.stopTimeoutMs = Number.isFinite(options.stopTimeoutMs)
                ? Math.max(0, options.stopTimeoutMs)
                : DEFAULT_STOP_TIMEOUT_MS;
            this.stopPromise = null;
            this.stopResolver = null;
            this.stopTimer = null;
            this.isDisposed = false;
            this.snapshot = {
                runtime: 'not_attempted',
                transcript: '',
                final_transcript: '',
                partial_transcript: '',
                transcript_state: 'no_result',
                error_code: null
            };
        }

        start() {
            if (this.recognition) return Promise.resolve(cloneSnapshot(this.snapshot));
            if (typeof this.Constructor !== 'function') {
                const error = createAdapterError('unsupported', 'SpeechRecognition is unavailable');
                this.snapshot = { ...this.snapshot, runtime: 'error', error_code: error.code };
                this.emitUpdate();
                return Promise.reject(error);
            }

            try {
                this.isDisposed = false;
                this.stopPromise = null;
                this.recognition = new this.Constructor();
                this.configureRecognition();
                this.recognition.start();
                this.updateSnapshot({
                    runtime: 'started',
                    transcript_state: 'no_result',
                    error_code: null
                });
                return Promise.resolve(cloneSnapshot(this.snapshot));
            } catch (error) {
                this.recognition = null;
                const adapterError = createAdapterError('start_failed', 'SpeechRecognition could not start', error);
                this.updateSnapshot({ runtime: 'error', error_code: adapterError.code });
                this.onError(adapterError);
                return Promise.reject(adapterError);
            }
        }

        configureRecognition() {
            this.recognition.lang = 'ru-RU';
            this.recognition.interimResults = true;
            this.recognition.continuous = true;
            this.recognition.onresult = (event) => {
                if (!this.isDisposed) this.handleResult(event);
            };
            this.recognition.onerror = (event) => {
                if (!this.isDisposed) this.handleError(event);
            };
            this.recognition.onend = () => {
                if (!this.isDisposed) this.handleEnd();
            };
        }

        handleResult(event) {
            const results = Array.from(event.results ?? []);
            this.finalParts = results
                .filter((result) => result.isFinal)
                .map((result) => String(result[0]?.transcript ?? '').trim())
                .filter(Boolean);
            this.partialTranscript = results
                .filter((result) => !result.isFinal)
                .map((result) => String(result[0]?.transcript ?? '').trim())
                .filter(Boolean)
                .join(' ')
                .trim();
            const finalTranscript = this.finalParts.join(' ').trim();
            const transcript = [finalTranscript, this.partialTranscript].filter(Boolean).join(' ').trim();
            this.updateSnapshot({
                runtime: finalTranscript ? 'final_result' : 'partial_only',
                transcript,
                final_transcript: finalTranscript,
                partial_transcript: this.partialTranscript,
                transcript_state: finalTranscript ? 'final_result' : 'partial_only'
            });
            if (finalTranscript) this.resolveStop();
        }

        handleError(event) {
            const code = String(event?.error ?? 'unknown');
            const error = createAdapterError(code, 'SpeechRecognition runtime error');
            this.updateSnapshot({ runtime: 'error', transcript_state: 'error', error_code: code });
            this.onError(error);
            this.resolveStop();
        }

        handleEnd() {
            if (this.snapshot.runtime === 'started' && !this.snapshot.transcript) {
                this.updateSnapshot({ runtime: 'no_result', transcript_state: 'no_result' });
            }
            this.resolveStop();
        }

        updateSnapshot(changes) {
            this.snapshot = { ...this.snapshot, ...changes };
            this.emitUpdate();
        }

        emitUpdate() {
            this.onUpdate(cloneSnapshot(this.snapshot));
        }

        stop() {
            if (!this.recognition) return Promise.resolve(cloneSnapshot(this.snapshot));
            if (this.stopPromise) return this.stopPromise;
            this.stopPromise = new Promise((resolve) => {
                this.stopResolver = resolve;
                this.stopTimer = setTimeout(() => {
                    if (this.snapshot.runtime === 'started') {
                        this.updateSnapshot({
                            runtime: this.snapshot.transcript ? 'partial_only' : 'no_result',
                            transcript_state: this.snapshot.transcript ? 'partial_only' : 'no_result'
                        });
                    }
                    this.resolveStop();
                }, this.stopTimeoutMs);
                try {
                    this.recognition.stop();
                } catch (error) {
                    const adapterError = createAdapterError('stop_failed', 'SpeechRecognition could not stop', error);
                    this.updateSnapshot({ runtime: 'error', transcript_state: 'error', error_code: adapterError.code });
                    this.onError(adapterError);
                    this.resolveStop();
                }
            });
            return this.stopPromise;
        }

        cancel() {
            if (!this.recognition) return;
            this.isDisposed = true;
            const recognition = this.recognition;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            try {
                recognition.abort();
            } catch (error) {
                this.onError(createAdapterError('cancel_failed', 'SpeechRecognition could not cancel', error));
            }
            this.recognition = null;
            this.resolveStop();
            this.updateSnapshot({ runtime: 'not_attempted', transcript_state: 'no_result' });
        }

        dispose() {
            this.isDisposed = true;
            this.onUpdate = () => {};
            this.onError = () => {};
            this.cancel();
        }

        resolveStop() {
            if (!this.stopResolver) return;
            const resolve = this.stopResolver;
            this.stopResolver = null;
            clearTimeout(this.stopTimer);
            this.stopTimer = null;
            resolve(cloneSnapshot(this.snapshot));
        }

        getSnapshot() {
            return cloneSnapshot(this.snapshot);
        }
    }

    root.SpeechRecognitionAdapter = SpeechRecognitionAdapter;
})(typeof window !== 'undefined' ? window : globalThis);
