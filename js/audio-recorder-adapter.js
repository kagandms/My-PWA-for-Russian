(function exposeAudioRecorderAdapter(root) {
    const MIME_CANDIDATES = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
    ];

    function createAdapterError(code, message, cause) {
        const error = new Error(message);
        error.code = code;
        if (cause) error.cause = cause;
        return error;
    }

    function cloneSnapshot(snapshot) {
        return { ...snapshot };
    }

    class AudioRecorderAdapter {
        constructor(options = {}) {
            this.browserWindow = options.window ?? root;
            this.browserNavigator = options.navigator ?? this.browserWindow.navigator ?? {};
            this.Constructor = options.recorderConstructor ?? this.browserWindow.MediaRecorder;
            this.clock = options.clock ?? (() => Date.now());
            this.onUpdate = options.onUpdate ?? (() => {});
            this.onError = options.onError ?? (() => {});
            this.stream = null;
            this.recorder = null;
            this.chunks = [];
            this.startPromise = null;
            this.stopPromise = null;
            this.result = null;
            this.startedAt = null;
            this.snapshot = {
                runtime: 'not_attempted',
                recording: false,
                blob: null,
                mime_type: null,
                duration_ms: 0,
                microphone_capture: 'untested',
                error_code: null
            };
        }

        start() {
            if (this.startPromise) return this.startPromise;
            this.startPromise = this.startInternal();
            return this.startPromise;
        }

        async startInternal() {
            if (typeof this.Constructor !== 'function') {
                throw this.fail('unsupported', 'MediaRecorder is unavailable');
            }
            const getUserMedia = this.browserNavigator?.mediaDevices?.getUserMedia;
            if (typeof getUserMedia !== 'function') {
                throw this.fail('unsupported', 'Microphone capture is unavailable');
            }
            try {
                this.stream = await getUserMedia.call(this.browserNavigator.mediaDevices, { audio: true });
                const mimeType = this.selectMimeType();
                this.recorder = mimeType
                    ? new this.Constructor(this.stream, { mimeType })
                    : new this.Constructor(this.stream);
                this.configureRecorder();
                this.startedAt = this.clock();
                this.recorder.start();
                this.updateSnapshot({
                    runtime: 'started',
                    recording: true,
                    mime_type: this.recorder.mimeType || mimeType || null,
                    microphone_capture: 'granted',
                    error_code: null
                });
                return cloneSnapshot(this.snapshot);
            } catch (error) {
                const adapterError = error.code ? error : createAdapterError('capture_failed', 'Audio recording could not start', error);
                this.cleanupStream();
                this.updateSnapshot({
                    runtime: 'error',
                    recording: false,
                    microphone_capture: adapterError.code === 'NotAllowedError' ? 'denied' : 'error',
                    error_code: adapterError.code
                });
                this.onError(adapterError);
                throw adapterError;
            }
        }

        selectMimeType() {
            if (typeof this.Constructor.isTypeSupported !== 'function') return MIME_CANDIDATES[0];
            return MIME_CANDIDATES.find((mimeType) => this.Constructor.isTypeSupported(mimeType)) ?? '';
        }

        configureRecorder() {
            this.recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) this.chunks.push(event.data);
            };
            this.recorder.onerror = (event) => {
                const error = createAdapterError('recorder_error', 'MediaRecorder runtime error', event?.error);
                this.updateSnapshot({ runtime: 'error', recording: false, error_code: error.code });
                this.cleanupStream();
                this.onError(error);
            };
        }

        stop() {
            if (this.stopPromise) return this.stopPromise;
            if (!this.recorder || !this.snapshot.recording) return Promise.resolve(this.result);
            this.stopPromise = new Promise((resolve, reject) => {
                const finish = () => {
                    const mimeType = this.recorder?.mimeType ?? this.snapshot.mime_type ?? 'audio/webm';
                    const BlobConstructor = this.browserWindow.Blob ?? root.Blob;
                    this.result = {
                        blob: new BlobConstructor(this.chunks, { type: mimeType }),
                        mime_type: mimeType,
                        duration_ms: Math.max(0, this.clock() - this.startedAt)
                    };
                    this.updateSnapshot({
                        runtime: 'stopped',
                        recording: false,
                        blob: this.result.blob,
                        mime_type: this.result.mime_type,
                        duration_ms: this.result.duration_ms
                    });
                    this.cleanupStream();
                    resolve({ ...this.result });
                };
                this.recorder.onstop = finish;
                try {
                    this.recorder.stop();
                } catch (error) {
                    const adapterError = createAdapterError('stop_failed', 'MediaRecorder could not stop', error);
                    this.cleanupStream();
                    this.onError(adapterError);
                    reject(adapterError);
                }
            });
            return this.stopPromise;
        }

        cancel() {
            if (!this.recorder) return Promise.resolve(null);
            this.snapshot = { ...this.snapshot, recording: false, runtime: 'cancelled' };
            try {
                this.recorder.stop();
            } catch (error) {
                this.onError(createAdapterError('cancel_failed', 'MediaRecorder could not cancel', error));
            }
            this.cleanupStream();
            this.result = null;
            this.chunks = [];
            this.recorder = null;
            this.emitUpdate();
            return Promise.resolve(null);
        }

        release() {
            this.result = null;
            this.chunks = [];
            this.snapshot = { ...this.snapshot, blob: null };
            this.emitUpdate();
        }

        cleanupStream() {
            this.stream?.getTracks?.().forEach((track) => track.stop());
            this.stream = null;
        }

        fail(code, message) {
            const error = createAdapterError(code, message);
            this.updateSnapshot({ runtime: 'error', recording: false, error_code: code });
            this.onError(error);
            return error;
        }

        updateSnapshot(changes) {
            this.snapshot = { ...this.snapshot, ...changes };
            this.emitUpdate();
        }

        emitUpdate() {
            this.onUpdate(cloneSnapshot(this.snapshot));
        }

        getSnapshot() {
            return cloneSnapshot(this.snapshot);
        }

        dispose() {
            if (this.snapshot.recording) this.cancel();
            this.release();
            this.onUpdate = () => {};
            this.onError = () => {};
        }
    }

    root.AudioRecorderAdapter = AudioRecorderAdapter;
})(typeof window !== 'undefined' ? window : globalThis);

