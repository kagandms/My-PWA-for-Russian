import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

function loadStore(storage) {
    const taxonomySource = fs.readFileSync(path.join(ROOT, 'js/error-taxonomy.js'), 'utf8');
    const storeSource = fs.readFileSync(path.join(ROOT, 'js/error-notebook.js'), 'utf8');
    const window = {};
    const context = { window, globalThis: window, console };
    vm.runInNewContext(taxonomySource, context, { filename: 'error-taxonomy.js' });
    vm.runInNewContext(storeSource, context, { filename: 'error-notebook.js' });
    return new window.ErrorNotebookStore({ storage, idFactory: () => 'error:1', now: () => '2026-09-20T10:00:00.000Z' });
}

function createError() {
    return {
        error_id: 'error:1',
        lexical_unit_id: 'lu:1',
        sense_id: 'sense:1',
        skill: 'recall',
        exercise_type: 'typed_recall',
        error_type: 'recall.mismatch',
        error_subtype: 'unclassified',
        detection_method: 'deterministic',
        verification_status: 'verified',
        confidence: 'high',
        exercise_eligible: false,
        created_at: '2026-09-20T10:00:00.000Z',
        evidence: { attempt_id: 'attempt:1' }
    };
}

test('stores immutable events separately from lifecycle updates and excludes dismissed records from aggregates', () => {
    const storage = createStorage();
    const store = loadStore(storage);

    store.recordError(createError());
    store.recordLifecycleUpdate({ error_id: 'error:1', status: 'dismissed', timestamp: '2026-09-20T11:00:00.000Z' });

    const snapshot = store.getSnapshot();
    const current = store.getErrors();
    const aggregates = store.getAggregates();

    assert.equal(snapshot.events.length, 1);
    assert.equal(snapshot.lifecycle_updates.length, 1);
    assert.equal(current[0].status, 'dismissed');
    assert.equal(aggregates.total_active, 0);
    assert.equal(aggregates.by_error_type['recall.mismatch'], undefined);
});

test('recovers from malformed persisted data without deleting the namespace', () => {
    const storage = createStorage();
    storage.setItem('ru_tr_error_notebook_v1', '{malformed');
    const store = loadStore(storage);

    assert.deepEqual(Array.from(store.getSnapshot().events), []);
    assert.equal(store.getSnapshot().namespace, 'ru_tr_error_notebook_v1');
});

test('keeps resolved and dismissed lifecycle states out of active aggregates', () => {
    const store = loadStore(createStorage());

    store.recordError(createError());
    store.recordLifecycleUpdate({ error_id: 'error:1', status: 'resolved' });

    assert.equal(store.getErrors()[0].status, 'resolved');
    assert.equal(store.getAggregates().total_active, 0);
});

test('does not permit inferred error events to become verified', () => {
    const store = loadStore(createStorage());

    assert.throws(() => store.recordError({ ...createError(), detection_method: 'inferred' }), /must remain candidate/u);
});
