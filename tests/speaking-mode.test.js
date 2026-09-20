import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

class FakeElement {
    constructor(id) {
        this.id = id;
        this.textContent = '';
        this.innerHTML = '';
        this.hidden = false;
        this.disabled = false;
        this.dataset = {};
        this.listeners = {};
        this.classList = {
            toggle: (name, value) => { this[name] = Boolean(value); },
            add: (name) => { this[name] = true; },
            remove: (name) => { this[name] = false; }
        };
    }

    addEventListener(type, handler) {
        this.listeners[type] = handler;
    }

    click() {
        this.listeners.click?.({ preventDefault() {} });
    }

    appendChild() {}
    replaceChildren() {}
}

class FakeDocument {
    constructor() {
        this.elements = new Map();
    }

    getElementById(id) {
        if (!this.elements.has(id)) this.elements.set(id, new FakeElement(id));
        return this.elements.get(id);
    }

    createElement(tagName) {
        return new FakeElement(tagName);
    }
}

class FakeSpeechAdapter {
    constructor(options = {}) {
        this.options = options;
        this.starts = 0;
        this.stops = 0;
        this.cancels = 0;
        this.snapshot = options.snapshot ?? {
            runtime: 'started',
            transcript: 'Я вижу дом.',
            final_transcript: 'Я вижу дом.',
            partial_transcript: '',
            transcript_state: 'final_result'
        };
    }

    start() {
        this.starts += 1;
        if (this.options.startError) return Promise.reject(this.options.startError);
        return Promise.resolve(this.snapshot);
    }

    stop() {
        this.stops += 1;
        return this.snapshot;
    }

    cancel() {
        this.cancels += 1;
    }

    dispose() {
        this.cancels += 1;
    }

    getSnapshot() {
        return { ...this.snapshot };
    }
}

class FakeRecorderAdapter {
    constructor(options = {}) {
        this.options = options;
        this.starts = 0;
        this.stops = 0;
        this.cancels = 0;
        this.releases = 0;
        this.snapshot = options.snapshot ?? {
            runtime: 'stopped',
            recording: false,
            blob: { size: 10 },
            mime_type: 'audio/webm',
            duration_ms: 1000,
            microphone_capture: 'granted'
        };
    }

    start() {
        this.starts += 1;
        if (this.options.startError) return Promise.reject(this.options.startError);
        return Promise.resolve(this.snapshot);
    }

    stop() {
        this.stops += 1;
        if (this.options.stopError) return Promise.reject(this.options.stopError);
        return Promise.resolve({
            blob: this.snapshot.blob,
            mime_type: this.snapshot.mime_type,
            duration_ms: this.snapshot.duration_ms
        });
    }

    cancel() {
        this.cancels += 1;
        return Promise.resolve(null);
    }

    release() {
        this.releases += 1;
        this.snapshot = { ...this.snapshot, blob: null };
    }

    dispose() {
        this.cancels += 1;
        this.release();
    }

    getSnapshot() {
        return { ...this.snapshot };
    }
}

function createRepository() {
    const readAloud = {
        exercise_id: 'speaking:read:1',
        exercise_type: 'read_aloud',
        prompt: null,
        expected_text: 'Я вижу ёлку.',
        verification_status: 'verified',
        exercise_eligible: true,
        targets: [{ lexical_unit_id: 'lu:tree', sense_id: 'sense:tree', target_surface: 'ёлка' }]
    };
    const prompted = {
        exercise_id: 'speaking:prompted:1',
        exercise_type: 'prompted_speech',
        prompt: 'Используйте слова.',
        expected_text: null,
        verification_status: 'verified',
        exercise_eligible: true,
        targets: [
            { lexical_unit_id: 'lu:tree', sense_id: 'sense:tree', target_surface: 'ёлка' },
            { lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }
        ]
    };
    const free = {
        topic_id: 'speaking:free:1',
        prompt_ru: 'Расскажите о своём дне.',
        prompt_tr: 'Gününüzü anlatın.',
        duration_seconds: 45
    };
    return {
        readAloud,
        prompted,
        free,
        async load() {},
        getReadAloudExercises: () => [readAloud],
        getPromptedExercises: () => [prompted],
        getFreeSpeechTopics: () => [free]
    };
}

function loadMode() {
    const window = {
        addEventListener() {},
        removeEventListener() {},
        console
    };
    const context = { window, globalThis: window, console, structuredClone };
    for (const file of ['js/speaking-core.js', 'js/speaking-mode.js']) {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInNewContext(source, context, { filename: file });
    }
    return window.SpeakingMode;
}

function createMode(overrides = {}) {
    const document = new FakeDocument();
    const repository = createRepository();
    const recordedEvents = [];
    const bridgeCalls = [];
    const speechOptions = overrides.speechOptions ?? {};
    const recorderOptions = overrides.recorderOptions ?? {};
    const window = {
        addEventListener: overrides.addEventListener ?? (() => {}),
        removeEventListener: overrides.removeEventListener ?? (() => {}),
        console
    };
    const SpeakingMode = loadMode();
    const mode = new SpeakingMode({
        window,
        document,
        exerciseRepository: repository,
        capabilityDetector: { detect: () => ({ processing_mode: 'browser_managed_unspecified' }) },
        speechAdapterFactory: () => new FakeSpeechAdapter(speechOptions),
        recorderAdapterFactory: () => new FakeRecorderAdapter(recorderOptions),
        eventStore: {
            recordEvent: (event) => {
                recordedEvents.push(event);
                return event;
            }
        },
        errorBridge: {
            recordObservation: (input) => {
                bridgeCalls.push(input.observation);
                return { error_id: 'speaking:error:1' };
            }
        },
        now: () => '2026-09-20T10:00:10.000Z',
        idFactory: () => 'speaking:attempt:test'
    });
    return { mode, document, repository, recordedEvents, bridgeCalls };
}

test('renders Read Aloud, Prompted Speech, and Free Speech without starting capture during init', async () => {
    const { mode, document, repository } = createMode();

    await mode.init();
    assert.match(document.getElementById('speakingExerciseType').textContent, /Read Aloud/);

    mode.currentExercise = repository.prompted;
    mode.render();
    assert.match(document.getElementById('speakingExerciseType').textContent, /Prompted/);

    mode.currentExercise = repository.free;
    mode.render();
    assert.match(document.getElementById('speakingExerciseType').textContent, /Free/);
    assert.equal(document.getElementById('speakingStart').disabled, false);
});

test('starts microphone and speech adapters only after explicit start', async () => {
    const { mode } = createMode();
    await mode.init();

    assert.equal(mode.speechAdapter, null);
    assert.equal(mode.recorderAdapter, null);

    await mode.start();

    assert.equal(mode.speechAdapter.starts, 1);
    assert.equal(mode.recorderAdapter.starts, 1);
    assert.equal(mode.state, 'recording');
});

test('commits a validated final transcript event and bridges only the final mismatch', async () => {
    const { mode, recordedEvents, bridgeCalls } = createMode();
    await mode.init();
    await mode.start();
    await mode.stop();

    assert.equal(mode.state, 'result');
    assert.equal(recordedEvents.length, 1);
    assert.equal(bridgeCalls.length, 1);
    assert.equal(bridgeCalls[0].transcript_state, 'final_result');
    assert.equal(recordedEvents[0].recording.stored, false);
    assert.equal(recordedEvents[0].recording.uploaded, false);
    assert.equal(recordedEvents[0].recording.retention, 'session_only');
    assert.equal(recordedEvents[0].evaluation.transcript_observation.adaptive_eligible, false);
});

test('does not bridge partial transcript and does not persist an incomplete learning event', async () => {
    const { mode, recordedEvents, bridgeCalls } = createMode({
        speechOptions: {
            snapshot: {
                runtime: 'partial_only',
                transcript: 'Я вижу',
                final_transcript: '',
                partial_transcript: 'Я вижу',
                transcript_state: 'partial_only'
            }
        },
        recorderOptions: { snapshot: { runtime: 'stopped', recording: false, blob: null, mime_type: null, duration_ms: 0 } }
    });
    await mode.init();
    await mode.start();
    await mode.stop();

    assert.equal(bridgeCalls.length, 0);
    assert.equal(recordedEvents.length, 0);
});

test('does not persist permission denial or cancellation', async () => {
    const denied = createMode({
        speechOptions: { startError: new Error('denied') },
        recorderOptions: { startError: new Error('denied') }
    });
    await denied.mode.init();
    await denied.mode.start();
    assert.equal(denied.recordedEvents.length, 0);

    const cancelled = createMode();
    await cancelled.mode.init();
    await cancelled.mode.start();
    await cancelled.mode.cancel();
    assert.equal(cancelled.recordedEvents.length, 0);
});

test('deduplicates stop submission and releases recorder result after commit', async () => {
    const { mode, recordedEvents } = createMode();
    await mode.init();
    await mode.start();
    const firstStop = mode.stop();
    const secondStop = mode.stop();
    assert.equal(firstStop, secondStop);
    await firstStop;

    assert.equal(recordedEvents.length, 1);
    assert.equal(mode.recorderAdapter.releases, 1);
});
