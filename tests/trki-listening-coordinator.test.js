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
        this.value = '';
        this.disabled = false;
        this.checked = false;
        this.classList = { add() {}, remove() {}, toggle() {} };
        this.listeners = {};
    }

    addEventListener(type, handler) { this.listeners[type] = handler; }
}

class FakeDocument {
    constructor() { this.elements = new Map(); }

    getElementById(id) {
        if (!this.elements.has(id)) this.elements.set(id, new FakeElement(id));
        return this.elements.get(id);
    }

    createElement() { return new FakeElement('created'); }
}

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

function createRepository({ storageMode = 'bundled_synthetic' } = {}) {
    const packageRecord = {
        package_id: 'trki-listening-synthetic-b1',
        package_version: '1.0.0',
        package_hash: 'sha256:package-1',
        level: 'B1',
        source: {
            source_id: 'src:synthetic',
            document_id: 'doc:synthetic',
            version: '1',
            source_type: 'synthetic',
            source_class: 'synthetic_fixture',
            official_trki_provenance: false,
            content_policy: 'synthetic-not-official',
            license: 'test-only',
            redistribution_status: 'allowed_for_repository_fixture',
            full_content_bundled: true,
            provenance_status: 'verified'
        }
    };
    const task = {
        package: packageRecord,
        task_id: 'task-1',
        task_type: 'multiple_choice',
        task_hash: 'sha256:task-1',
        audio: {
            audio_id: 'audio-1', audio_hash: 'sha256:audio-1', mime_type: 'audio/wav',
            duration_ms: 1200, storage_mode: storageMode
        },
        replay_policy: { max_plays: 2, pause_allowed: false, seek_allowed: false, autoplay: false },
        replay_policy_hash: 'sha256:replay-1',
        transcript: 'Анна читает.',
        transcript_hash: 'sha256:transcript-1',
        questions: [{
            question_id: 'question-1',
            prompt: 'Что делает Анна?',
            options: ['Читает', 'Спит'],
            answer_key: { option_index: 0 },
            answer_key_hash: 'sha256:answer-1',
            alignment: { audio_id: 'audio-1', offset_ms: 0, duration_ms: 1200 },
            alignment_hash: 'sha256:alignment-1',
            question_hash: 'sha256:question-1',
            numbering: { section_number: 1, item_number: 1 },
            verification_status: 'verified',
            exercise_eligible: true
        }]
    };
    return {
        async load() {},
        getObjectiveTasks: () => [task],
        getTaskByIdentity: () => task
    };
}

function loadCoordinator() {
    const window = { setInterval, clearInterval, addEventListener() {}, removeEventListener() {}, console };
    const context = { window, globalThis: window, console, structuredClone, Date, Promise };
    ['trki-timer.js', 'trki-listening-core.js', 'trki-listening-playback.js', 'trki-listening-session-store.js', 'trki-listening-attempt-store.js', 'trki-listening-session-coordinator.js']
        .forEach((file) => vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file }));
    return window.TrkiListeningSessionCoordinator;
}

function loadStores(storage, now) {
    const window = {};
    const context = { window, globalThis: window, console, structuredClone };
    ['trki-timer.js', 'trki-listening-session-store.js', 'trki-listening-attempt-store.js']
        .forEach((file) => vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file }));
    return {
        sessionStore: new window.TrkiListeningSessionStore({ storage, now, idFactory: () => 'listening-session:1' }),
        attemptStore: new window.TrkiListeningAttemptStore({ storage, now })
    };
}

function createCoordinator(overrides = {}) {
    const storage = overrides.storage ?? createStorage();
    const now = overrides.now ?? (() => '2026-09-21T10:00:00.000Z');
    const stores = loadStores(storage, now);
    const Coordinator = loadCoordinator();
    const audioCalls = [];
    const document = new FakeDocument();
    const coordinator = new Coordinator({
        window: { addEventListener() {}, removeEventListener() {}, setInterval, clearInterval, console },
        document,
        repository: overrides.repository ?? createRepository(),
        sessionStore: stores.sessionStore,
        attemptStore: stores.attemptStore,
        audioAdapterFactory: () => ({
            play: async () => { audioCalls.push('play'); },
            cleanup: () => { audioCalls.push('cleanup'); }
        }),
        ...overrides
    });
    return { coordinator, storage, stores, audioCalls };
}

test('starts synthetic Study without autoplay and consumes one logical play', async () => {
    const { coordinator, audioCalls } = createCoordinator();

    await coordinator.init();
    await coordinator.start('study');
    assert.equal(audioCalls.length, 0);
    await coordinator.play();
    assert.deepEqual(audioCalls, ['play']);

    coordinator.handleAudioEvent('playing');
    coordinator.handleAudioEvent('playing');
    assert.equal(coordinator.getViewState().playback.plays_consumed, 1);
    assert.equal(coordinator.getViewState().session.audio_bindings['audio-1'].plays_consumed, 1);
});

test('persists playback and restores active session without playing on reload', async () => {
    const first = createCoordinator();
    await first.coordinator.init();
    await first.coordinator.start('study');
    await first.coordinator.play();
    first.coordinator.handleAudioEvent('playing');
    first.coordinator.handleAudioEvent('ended');

    const second = createCoordinator({ storage: first.storage });
    await second.coordinator.init();

    assert.equal(second.audioCalls.length, 0);
    assert.equal(second.coordinator.getViewState().playback.plays_consumed, 1);
    assert.equal(second.coordinator.getViewState().session.session_status, 'active');
});

test('records a scored answer with the package-bound historical snapshot', async () => {
    const { coordinator, stores } = createCoordinator();
    await coordinator.init();
    await coordinator.start('study');
    coordinator.selectAnswer(0);
    const attempt = coordinator.submit();

    assert.equal(attempt.result, 'correct');
    assert.equal(attempt.evaluation.answer_key_snapshot.option_index, 0);
    assert.equal(stores.attemptStore.getSnapshot().attempts.length, 1);
});

test('times out unavailable restricted audio as technical and non-comparable', async () => {
    let now = '2026-09-21T10:00:00.000Z';
    const { coordinator, stores } = createCoordinator({
        repository: createRepository({ storageMode: 'local_restricted' }),
        now: () => now
    });
    await coordinator.init();
    await coordinator.start('exam');
    now = '2026-09-21T10:45:01.000Z';
    coordinator.handleTimerTick(now);

    const attempt = stores.attemptStore.getSnapshot().attempts[0];
    const view = coordinator.getViewState();
    assert.equal(attempt.result, 'technical_unavailable');
    assert.equal(attempt.scoring_status, 'non_scorable');
    assert.equal(attempt.score, null);
    assert.equal(attempt.mastery_eligible, false);
    assert.equal(attempt.error_notebook_eligible, false);
    assert.equal(attempt.adaptive_eligible, false);
    assert.equal(view.summary.comparable, false);
    assert.equal(view.session.session_status, 'timed_out');
});

test('dispose cleans the playback adapter and timer without submitting an attempt', async () => {
    const { coordinator, audioCalls, stores } = createCoordinator();
    await coordinator.init();
    await coordinator.start('study');
    coordinator.dispose();

    assert.equal(audioCalls.includes('cleanup'), true);
    assert.equal(stores.attemptStore.getSnapshot().attempts.length, 0);
});
