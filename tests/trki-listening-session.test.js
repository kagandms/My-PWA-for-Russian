import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        raw: (key) => values.get(key)
    };
}

function loadStore() {
    const window = {};
    const context = { window, globalThis: window, console, structuredClone };
    ['trki-timer.js', 'trki-listening-session-store.js'].forEach((file) => {
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file });
    });
    return window.TrkiListeningSessionStore;
}

function createPlan(mode = 'study') {
    return {
        session_id: `listening-session:${mode}:1`,
        mode,
        level: 'B1',
        duration_seconds: 600,
        planned_items: [{
            item_id: 'item:1',
            identity: {
                package_id: 'package-1', package_version: '1.0.0', task_id: 'task-1',
                audio_id: 'audio-1', question_id: 'question-1'
            }
        }],
        audio_bindings: {
            'audio-1': {
                storage_mode: 'local_restricted',
                availability: 'available',
                sha256: 'sha256:audio-1',
                mime_type: 'audio/wav',
                size_bytes: 10,
                duration_ms: 1200
            }
        }
    };
}

test('persists version-bound Listening identity and replay metadata', () => {
    const Store = loadStore();
    const storage = createStorage();
    const store = new Store({
        storage,
        now: () => '2026-09-21T10:00:00.000Z',
        idFactory: () => 'listening-session:study:1'
    });

    const session = store.createSession(createPlan());

    assert.deepEqual(JSON.parse(JSON.stringify(session.planned_items[0].identity)), {
        package_id: 'package-1', package_version: '1.0.0', task_id: 'task-1',
        audio_id: 'audio-1', question_id: 'question-1'
    });
    assert.equal(session.audio_bindings['audio-1'].plays_consumed ?? 0, 0);
    assert.equal(JSON.parse(storage.raw('ru_tr_trki_listening_sessions_v1')).namespace, 'ru_tr_trki_listening_sessions_v1');
});

test('allows Study pause and reload resume without losing timer or audio state', () => {
    const Store = loadStore();
    const storage = createStorage();
    let now = Date.parse('2026-09-21T10:00:00.000Z');
    const options = { storage, now: () => new Date(now).toISOString(), idFactory: () => 'listening-session:study:1' };
    const store = new Store(options);
    const created = store.createSession(createPlan());
    now += 30_000;
    const paused = store.pause(created.session_id);
    const reloaded = new Store(options).getActiveSession();

    assert.equal(paused.session_status, 'paused');
    assert.equal(paused.timer.accumulated_seconds, 30);
    assert.equal(reloaded.audio_bindings['audio-1'].sha256, 'sha256:audio-1');
    assert.equal(reloaded.timer.accumulated_seconds, 30);
});

test('rejects Exam pause and derives timeout from persisted timestamps', () => {
    const Store = loadStore();
    const start = Date.parse('2026-09-21T10:00:00.000Z');
    const store = new Store({
        storage: createStorage(),
        now: () => new Date(start).toISOString(),
        idFactory: () => 'listening-session:exam:1'
    });
    const session = store.createSession(createPlan('exam'));

    assert.throws(() => store.pause(session.session_id), /Exam Listening sessions cannot be paused/u);
    assert.equal(store.getRemainingSeconds(session.session_id, start + 601_000), 0);
    const timedOut = store.timeout(session.session_id);
    assert.equal(timedOut.session_status, 'timed_out');
});

test('completes item order once and preserves playback counters in the session', () => {
    const Store = loadStore();
    const store = new Store({ storage: createStorage(), now: () => '2026-09-21T10:00:00.000Z' });
    const created = store.createSession(createPlan());
    const updated = store.updateAudioBinding(created.session_id, 'audio-1', { plays_consumed: 1, availability: 'available' });
    const completed = store.completeItem(updated.session_id, 'item:1', { result: 'correct' });

    assert.equal(completed.audio_bindings['audio-1'].plays_consumed, 1);
    assert.equal(completed.completed_items[0].item_id, 'item:1');
    assert.equal(completed.session_status, 'completed');
});
