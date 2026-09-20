(function exposeSpeechRecognitionAdapter(root) {
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
            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onerror = (event) => this.handleError(event);
            this.recognition.onend = () => this.handleEnd();
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
        }

        handleError(event) {
            const code = String(event?.error ?? 'unknown');
            const error = createAdapterError(code, 'SpeechRecognition runtime error');
            this.updateSnapshot({ runtime: 'error', transcript_state: 'error', error_code: code });
            this.onError(error);
        }

        handleEnd() {
            if (this.snapshot.runtime === 'started' && !this.snapshot.transcript) {
                this.updateSnapshot({ runtime: 'no_result', transcript_state: 'no_result' });
            }
        }

        updateSnapshot(changes) {
            this.snapshot = { ...this.snapshot, ...changes };
            this.emitUpdate();
        }

        emitUpdate() {
            this.onUpdate(cloneSnapshot(this.snapshot));
        }

        stop() {
            if (!this.recognition) return cloneSnapshot(this.snapshot);
            try {
                this.recognition.stop();
            } catch (error) {
                const adapterError = createAdapterError('stop_failed', 'SpeechRecognition could not stop', error);
                this.onError(adapterError);
            }
            return cloneSnapshot(this.snapshot);
        }

        cancel() {
            if (!this.recognition) return;
            try {
                this.recognition.abort();
            } catch (error) {
                this.onError(createAdapterError('cancel_failed', 'SpeechRecognition could not cancel', error));
            }
            this.recognition = null;
            this.updateSnapshot({ runtime: 'not_attempted', transcript_state: 'no_result' });
        }

        dispose() {
            this.cancel();
            this.onUpdate = () => {};
            this.onError = () => {};
        }

        getSnapshot() {
            return cloneSnapshot(this.snapshot);
        }
    }

    root.SpeechRecognitionAdapter = SpeechRecognitionAdapter;
})(typeof window !== 'undefined' ? window : globalThis);

