import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        values
    };
}

function loadStore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-session-store.js'), 'utf8');
    const window = { console };
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'adaptive-session-store.js' });
    return window.AdaptiveSessionStore;
}

test('persists active session, pause/resume, completion and reload without legacy progress writes', () => {
    const storage = createStorage({ ru_tr_skill_progress_v1: '{"attempts":[]}' });
    const Store = loadStore();
    const plan = {
        session_id: 'planned',
        planned_items: [{ item_id: 'recall:lu:1:sense:1', module: 'recall', skill: 'recall', estimated_seconds: 45 }],
        estimated_seconds: 45,
        planner_version: 'adaptive-planner-v1',
        policy_version: 'adaptive-policy-v1'
    };
    const first = new Store({ storage, now: () => '2026-09-20T10:00:00.000Z', idFactory: () => 'session:1' });
    const created = first.createSession({ ...plan, requested_duration_minutes: 10 });
    first.pause(created.session_id);

    const reloaded = new Store({ storage });
    assert.equal(reloaded.getActiveSession().session_status, 'paused');
    reloaded.resume(created.session_id);
    reloaded.completeItem(created.session_id, 'recall:lu:1:sense:1', { result: 'correct', completed_at: '2026-09-20T10:01:00.000Z' });

    assert.equal(reloaded.getActiveSession().session_status, 'completed');
    assert.equal(JSON.parse(storage.values.get('ru_tr_skill_progress_v1')).attempts.length, 0);
});

test('does not overwrite an existing active session when a second session is requested', () => {
    const storage = createStorage();
    const Store = loadStore();
    const store = new Store({ storage, idFactory: () => 'session:1' });
    store.createSession({ session_id: 'one', planned_items: [], requested_duration_minutes: 10, estimated_seconds: 0, planner_version: 'adaptive-planner-v1', policy_version: 'adaptive-policy-v1' });

    assert.throws(() => store.createSession({ session_id: 'two', planned_items: [], requested_duration_minutes: 20, estimated_seconds: 0, planner_version: 'adaptive-planner-v1', policy_version: 'adaptive-policy-v1' }), /active session/u);
});
