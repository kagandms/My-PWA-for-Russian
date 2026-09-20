import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadAdapters() {
    const sources = ['js/speech-recognition-adapter.js', 'js/audio-recorder-adapter.js'];
    const window = {};
    const context = {
        window,
        globalThis: window,
        console,
        Blob,
        Promise,
        setTimeout,
        clearTimeout
    };
    for (const sourcePath of sources) {
        const source = fs.readFileSync(path.join(ROOT, sourcePath), 'utf8');
        vm.runInNewContext(source, context, { filename: sourcePath });
    }
    return window;
}

class FakeRecognition {
    static instances = [];

    constructor() {
        this.lang = '';
        this.interimResults = false;
        this.continuous = false;
        this.started = false;
        this.stopped = false;
        FakeRecognition.instances.push(this);
    }

    start() {
        this.started = true;
    }

    stop() {
        this.stopped = true;
        this.onend?.();
    }

    abort() {
        this.stopped = true;
        this.onend?.();
    }

    emitFinal(transcript) {
        this.onresult?.({
            resultIndex: 0,
            results: [{
                0: { transcript },
                isFinal: true,
                length: 1
            }]
        });
    }

    emitInterim(transcript) {
        this.onresult?.({
            resultIndex: 0,
            results: [{
                0: { transcript },
                isFinal: false,
                length: 1
            }]
        });
    }

    emitEnd() {
        this.onend?.();
    }

    emitError(error) {
        this.onerror?.({ error });
    }
}

class AsyncRecognition extends FakeRecognition {
    stop() {
        this.stopped = true;
    }

    abort() {
        this.stopped = true;
        this.aborted = true;
    }
}

class FakeMediaRecorder {
    static instances = [];
    static isTypeSupported(mimeType) {
        return mimeType === 'audio/webm;codecs=opus';
    }

    constructor(stream, options = {}) {
        this.stream = stream;
        this.mimeType = options.mimeType;
        this.state = 'inactive';
        this.started = false;
        this.stopped = false;
        FakeMediaRecorder.instances.push(this);
    }

    start() {
        this.started = true;
        this.state = 'recording';
    }

    stop() {
        this.stopped = true;
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['audio']) });
        this.onstop?.();
    }
}

function createStream() {
    let stoppedTracks = 0;
    const track = { stop: () => { stoppedTracks += 1; }, get stoppedTracks() { return stoppedTracks; } };
    return {
        stream: {
            getTracks: () => [track]
        },
        track
    };
}

test('supports transcript-only operation without MediaRecorder', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: FakeRecognition },
        navigator: {}
    });

    await adapter.start();
    FakeRecognition.instances[0].emitFinal('Я читаю');
    const snapshot = adapter.getSnapshot();

    assert.equal(snapshot.transcript, 'Я читаю');
    assert.equal(snapshot.transcript_state, 'final_result');
    assert.equal(snapshot.runtime, 'final_result');
});

test('waits for a final result that arrives asynchronously after stop', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 50
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    recognition.emitInterim('Я вижу');
    const stopPromise = adapter.stop();
    let settled = false;
    stopPromise.then(() => { settled = true; });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(recognition.stopped, true);
    assert.equal(settled, false);

    recognition.emitFinal('Я вижу дом.');
    recognition.emitEnd();
    const snapshot = await stopPromise;

    assert.equal(snapshot.transcript_state, 'final_result');
    assert.equal(snapshot.final_transcript, 'Я вижу дом.');
});

test('keeps a final result when end arrives after the final result', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 50
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    const stopPromise = adapter.stop();
    recognition.emitFinal('Я вижу дом.');
    recognition.emitEnd();
    const snapshot = await stopPromise;

    assert.equal(snapshot.transcript_state, 'final_result');
    assert.equal(snapshot.final_transcript, 'Я вижу дом.');
});

test('resolves partial-only recognition when end arrives without a final result', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 50
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    recognition.emitInterim('Я вижу');
    const stopPromise = adapter.stop();
    recognition.emitEnd();
    const snapshot = await stopPromise;

    assert.equal(snapshot.transcript_state, 'partial_only');
    assert.equal(snapshot.final_transcript, '');
});

test('resolves recognition errors as a terminal Stop condition', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 50
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    const stopPromise = adapter.stop();
    recognition.emitError('network');
    const snapshot = await stopPromise;

    assert.equal(snapshot.transcript_state, 'error');
    assert.equal(snapshot.error_code, 'network');
});

test('resolves a non-terminating recognition attempt at the bounded timeout', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 5
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    recognition.emitInterim('Я вижу');
    const snapshot = await adapter.stop();

    assert.equal(snapshot.transcript_state, 'partial_only');
    assert.equal(recognition.stopped, true);
});

test('ignores recognition callbacks after disposal', async () => {
    const { SpeechRecognitionAdapter } = loadAdapters();
    const adapter = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: AsyncRecognition },
        navigator: {},
        stopTimeoutMs: 50
    });

    await adapter.start();
    const recognition = FakeRecognition.instances.at(-1);
    const stopPromise = adapter.stop();
    recognition.emitFinal('Я вижу дом.');
    const snapshot = await stopPromise;
    adapter.dispose();
    recognition.emitFinal('поздний callback');

    assert.equal(snapshot.final_transcript, 'Я вижу дом.');
    assert.equal(adapter.getSnapshot().transcript_state, 'no_result');
});

test('supports recording-only operation without SpeechRecognition', async () => {
    const { AudioRecorderAdapter } = loadAdapters();
    const { stream, track } = createStream();
    const adapter = new AudioRecorderAdapter({
        window: { MediaRecorder: FakeMediaRecorder, Blob },
        navigator: { mediaDevices: { getUserMedia: async () => stream } }
    });

    await adapter.start();
    const result = await adapter.stop();

    assert.equal(result.mime_type, 'audio/webm;codecs=opus');
    assert.equal(result.blob.size > 0, true);
    assert.equal(track.stoppedTracks, 1);

    adapter.release();
    assert.equal(adapter.getSnapshot().blob, null);
});

test('keeps the surviving adapter usable when the combined path partially fails', async () => {
    const { SpeechRecognitionAdapter, AudioRecorderAdapter } = loadAdapters();
    const { stream, track } = createStream();
    const speech = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: class BrokenRecognition { start() { throw new Error('stt unavailable'); } } },
        navigator: {}
    });
    const recorder = new AudioRecorderAdapter({
        window: { MediaRecorder: FakeMediaRecorder, Blob },
        navigator: { mediaDevices: { getUserMedia: async () => stream } }
    });

    const results = await Promise.allSettled([speech.start(), recorder.start()]);
    const recording = await recorder.stop();

    assert.equal(results[0].status, 'rejected');
    assert.equal(results[1].status, 'fulfilled');
    assert.equal(recording.blob.size > 0, true);
    assert.equal(track.stoppedTracks, 1);
});

test('keeps transcript usable when recording permission fails', async () => {
    const { SpeechRecognitionAdapter, AudioRecorderAdapter } = loadAdapters();
    const speech = new SpeechRecognitionAdapter({
        window: { SpeechRecognition: FakeRecognition },
        navigator: {}
    });
    const recorder = new AudioRecorderAdapter({
        window: { MediaRecorder: FakeMediaRecorder, Blob },
        navigator: { mediaDevices: { getUserMedia: async () => { throw new Error('denied'); } } }
    });

    const results = await Promise.allSettled([speech.start(), recorder.start()]);
    FakeRecognition.instances.at(-1).emitFinal('Я читаю');

    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal(speech.getSnapshot().transcript_state, 'final_result');
});

test('protects duplicate starts and makes stop idempotent', async () => {
    const { AudioRecorderAdapter } = loadAdapters();
    const { stream, track } = createStream();
    const adapter = new AudioRecorderAdapter({
        window: { MediaRecorder: FakeMediaRecorder, Blob },
        navigator: { mediaDevices: { getUserMedia: async () => stream } }
    });

    await adapter.start();
    const firstStart = adapter.start();
    const secondStart = adapter.start();
    const firstStop = adapter.stop();
    const secondStop = adapter.stop();

    assert.equal(firstStart, secondStart);
    const [firstResult, secondResult] = await Promise.all([firstStop, secondStop]);
    assert.equal(firstResult.blob.size, secondResult.blob.size);
    assert.equal(track.stoppedTracks, 1);
});
