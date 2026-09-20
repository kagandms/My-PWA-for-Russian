import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();

test('wires Speaking card, screen, dependency order, and cache-safe backup key', () => {
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const storage = fs.readFileSync(path.join(ROOT, 'js/storage.js'), 'utf8');

    assert.match(index, /data-mode="speaking"/);
    assert.match(index, /id="speakingMode"/);
    assert.ok(index.indexOf('js/speaking-core.js') < index.indexOf('js/speaking-mode.js'));
    assert.match(storage, /ru_tr_speaking_events_v1/);
});

test('keeps the Speaking controller when the DOM creates a named speakingMode property', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-mode.js'), 'utf8');
    const window = {
        speakingMode: { id: 'speakingMode' },
        addEventListener() {},
        removeEventListener() {},
        console
    };
    const context = { window, globalThis: window, console, structuredClone };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/speaking-core.js'), 'utf8'), context, { filename: 'speaking-core.js' });
    vm.runInNewContext(source, context, { filename: 'speaking-mode.js' });

    assert.equal(window.speakingController instanceof window.SpeakingMode, true);
});

test('disposes Speaking before App route replacement or close', () => {
    const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

    assert.match(app, /speakingController\?\.dispose/);
    assert.match(app, /sourceIndependentModes = \['errorNotebook', 'grammarLab', 'analytics', 'speaking'\]/);
});

function loadMode() {
    const window = { addEventListener() {}, removeEventListener() {}, console };
    const context = { window, globalThis: window, console, structuredClone };
    for (const file of ['js/speaking-core.js', 'js/speaking-mode.js']) {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInNewContext(source, context, { filename: file });
    }
    return window.SpeakingMode;
}

function createDocument() {
    const elements = new Map();
    return {
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, {
                    id,
                    textContent: '',
                    innerHTML: '',
                    disabled: false,
                    classList: { toggle() {}, add() {}, remove() {} },
                    addEventListener() {}
                });
            }
            return elements.get(id);
        },
        createElement() {
            return { textContent: '', appendChild() {} };
        }
    };
}

function createRepository() {
    const exercise = {
        exercise_id: 'speaking:read:cleanup',
        exercise_type: 'read_aloud',
        expected_text: 'Я вижу дом.',
        verification_status: 'verified',
        exercise_eligible: true,
        targets: [{ lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }]
    };
    return {
        async load() {},
        getReadAloudExercises: () => [exercise],
        getPromptedExercises: () => [],
        getFreeSpeechTopics: () => []
    };
}

class CleanupSpeech {
    constructor() { this.snapshot = { transcript_state: 'no_result', transcript: '' }; this.cancelled = 0; }
    start() { return Promise.resolve(); }
    stop() { return this.snapshot; }
    cancel() { this.cancelled += 1; }
    dispose() { this.cancelled += 1; }
    getSnapshot() { return { ...this.snapshot }; }
}

class CleanupRecorder {
    constructor() { this.cancelled = 0; this.released = 0; }
    start() { return Promise.resolve(); }
    stop() { return Promise.resolve({ blob: { size: 1 }, mime_type: 'audio/webm', duration_ms: 100 }); }
    cancel() { this.cancelled += 1; return Promise.resolve(); }
    release() { this.released += 1; }
    dispose() { this.cancelled += 1; this.released += 1; }
    getSnapshot() { return { blob: { size: 1 }, mime_type: 'audio/webm', duration_ms: 100, recording: true }; }
}

test('cleans speech and recorder resources on route change and pagehide', async () => {
    const listeners = {};
    const browserWindow = {
        addEventListener(type, handler) { listeners[type] = handler; },
        removeEventListener() {},
        console
    };
    const SpeakingMode = loadMode();
    const mode = new SpeakingMode({
        window: browserWindow,
        document: createDocument(),
        exerciseRepository: createRepository(),
        capabilityDetector: { detect: () => ({}) },
        speechAdapterFactory: () => new CleanupSpeech(),
        recorderAdapterFactory: () => new CleanupRecorder(),
        eventStore: { recordEvent: () => { throw new Error('should not commit on cleanup'); } },
        errorBridge: { recordObservation: () => null }
    });

    await mode.init();
    await mode.start();
    listeners.pagehide();
    assert.equal(mode.speechAdapter.cancelled, 1);
    assert.equal(mode.recorderAdapter.cancelled, 1);
    assert.equal(mode.recorderAdapter.released, 1);

    await mode.start();
    mode.dispose();
    assert.equal(mode.speechAdapter.cancelled >= 1, true);
    assert.equal(mode.recorderAdapter.released >= 1, true);
});

test('keeps transcript-only and recording-only completion independent', async () => {
    const SpeakingMode = loadMode();
    const createDocumentInstance = createDocument();
    const events = [];
    const speechOnly = new SpeakingMode({
        window: { addEventListener() {}, removeEventListener() {}, console },
        document: createDocumentInstance,
        exerciseRepository: createRepository(),
        capabilityDetector: { detect: () => ({}) },
        speechAdapterFactory: () => ({
            start: () => Promise.resolve(),
            stop: () => ({ transcript_state: 'final_result', transcript: 'Я вижу дом.', final_transcript: 'Я вижу дом.' }),
            cancel() {},
            dispose() {},
            getSnapshot: () => ({ transcript_state: 'final_result', transcript: 'Я вижу дом.', final_transcript: 'Я вижу дом.' })
        }),
        recorderAdapterFactory: () => ({
            start: () => Promise.reject(new Error('recorder unavailable')),
            stop: () => Promise.resolve(null),
            cancel: () => Promise.resolve(),
            release() {},
            dispose() {}
        }),
        eventStore: { recordEvent: (event) => { events.push(event); return event; } },
        errorBridge: { recordObservation: () => null }
    });
    await speechOnly.init();
    await speechOnly.start();
    await speechOnly.stop();

    assert.equal(events.length, 1);
    assert.equal(events[0].recording.available, false);
});
