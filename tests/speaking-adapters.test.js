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

    emitError(error) {
        this.onerror?.({ error });
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
