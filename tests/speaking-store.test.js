import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function loadStore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-store.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console, Blob }, { filename: 'speaking-store.js' });
    return window.SpeakingEventStore;
}

class MemoryStorage {
    constructor(initialValue = null) {
        this.value = initialValue;
        this.writes = 0;
    }

    getItem() {
        return this.value;
    }

    setItem(key, value) {
        assert.equal(key, 'ru_tr_speaking_events_v1');
        this.value = value;
        this.writes += 1;
    }

    removeItem() {
        this.value = null;
    }
}

function createEvent(overrides = {}) {
    return {
        schema_version: 1,
        namespace: 'ru_tr_speaking_events_v1',
        event_id: 'speaking:event:1',
        attempt_id: 'speaking:attempt:1',
        started_at: '2026-09-20T10:00:00.000Z',
        completed_at: '2026-09-20T10:00:10.000Z',
        skill: 'speaking',
        exercise_type: 'read_aloud',
        attempt_status: 'completed',
        targets: [{
            lexical_unit_id: 'lu:tree',
            sense_id: 'sense:tree',
            target_surface: 'ёлка',
            accepted_forms: ['елка']
        }],
        expected_text: 'Я вижу ёлку.',
        transcript_text: 'Я вижу елку.',
        transcript_state: 'final_result',
        recording: {
            available: false,
            mime_type: null,
            duration_ms: 0,
            stored: false,
            uploaded: false,
            retention: 'session_only'
        },
        evaluation_availability: 'transcript_observation',
        evaluation: {
            transcript_observation: {
                available: true,
                evidence_scope: 'stt_final_transcript',
                assertion_scope: 'transcript_alignment',
                detection_method: 'deterministic',
                verification_status: 'verified',
                adaptive_eligible: false,
                exercise_eligible: false,
                observations: [{
                    kind: 'alignment',
                    status: 'exact'
                }]
            },
            pronunciation: 'not_evaluated',
            stress: 'not_evaluated',
            fluency: 'not_evaluated',
            overall: 'insufficient_evidence'
        },
        ...overrides
    };
}

test('stores a complete Read Aloud event with paired target identity', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({
        storage,
        now: () => '2026-09-20T10:00:10.000Z',
        idFactory: () => 'speaking:event:generated'
    });

    const stored = store.recordEvent(createEvent());

    assert.equal(stored.namespace, 'ru_tr_speaking_events_v1');
    assert.equal(stored.schema_version, 1);
    assert.equal(stored.skill, 'speaking');
    assert.equal(stored.targets[0].lexical_unit_id, 'lu:tree');
    assert.equal(stored.targets[0].sense_id, 'sense:tree');
    assert.equal(stored.evaluation.transcript_observation.evidence_scope, 'stt_final_transcript');
    assert.equal(stored.evaluation.transcript_observation.assertion_scope, 'transcript_alignment');
    assert.equal(stored.evaluation.transcript_observation.adaptive_eligible, false);
    assert.equal(stored.recording.stored, false);
    assert.equal(stored.recording.uploaded, false);
    assert.equal(storage.writes, 1);
});

test('stores Prompted Speech and targetless Free Speech with explicit shapes', () => {
    const SpeakingEventStore = loadStore();
    const store = new SpeakingEventStore({ storage: new MemoryStorage() });

    const prompted = store.recordEvent(createEvent({
        event_id: 'speaking:event:prompted',
        attempt_id: 'speaking:attempt:prompted',
        exercise_type: 'prompted_speech',
        expected_text: null,
        targets: [
            { lexical_unit_id: 'lu:tree', sense_id: 'sense:tree', target_surface: 'ёлка' },
            { lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }
        ]
    }));
    const free = store.recordEvent(createEvent({
        event_id: 'speaking:event:free',
        attempt_id: 'speaking:attempt:free',
        exercise_type: 'free_speech',
        expected_text: null,
        targets: [],
        transcript_text: 'Сегодня хорошая погода.'
    }));

    assert.equal(prompted.targets.length, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(free.targets)), []);
    assert.equal(store.getSnapshot().events.length, 2);
});

test('rejects incomplete events before writing storage', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({ storage });
    const invalidEvent = createEvent();
    delete invalidEvent.evaluation;

    assert.throws(() => store.recordEvent(invalidEvent), /evaluation/i);
    assert.equal(storage.writes, 0);
    assert.equal(store.getSnapshot().events.length, 0);
});

test('rejects raw audio and media objects before writing storage', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({ storage });
    const invalidEvent = createEvent({ audio_blob: new Blob(['audio']) });

    assert.throws(() => store.recordEvent(invalidEvent), /serializable|audio|blob/i);
    assert.equal(storage.writes, 0);
});

test('returns the original event for duplicate attempt_id', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({ storage });
    const first = store.recordEvent(createEvent());
    const duplicate = store.recordEvent(createEvent({
        event_id: 'speaking:event:different',
        transcript_text: 'changed'
    }));

    assert.deepEqual(JSON.parse(JSON.stringify(duplicate)), JSON.parse(JSON.stringify(first)));
    assert.equal(store.getSnapshot().events.length, 1);
    assert.equal(storage.writes, 1);
    assert.equal(store.hasAttempt('speaking:attempt:1'), true);
});

test('does not accept cancelled, denied, or unsupported attempts as learning events', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({ storage });

    for (const attemptStatus of ['cancelled', 'permission_denied', 'unsupported']) {
        assert.throws(() => store.recordEvent(createEvent({
            attempt_id: 'speaking:attempt:' + attemptStatus,
            event_id: 'speaking:event:' + attemptStatus,
            attempt_status: attemptStatus
        })), /completed|learning event/i);
    }

    assert.equal(storage.writes, 0);
});

test('keeps malformed persisted JSON intact and starts with an empty snapshot', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage('{malformed');
    const store = new SpeakingEventStore({ storage });

    assert.deepEqual(JSON.parse(JSON.stringify(store.getSnapshot().events)), []);
    assert.equal(storage.value, '{malformed');
});

test('returns cloned schema-valid snapshots and clears the namespace explicitly', () => {
    const SpeakingEventStore = loadStore();
    const storage = new MemoryStorage();
    const store = new SpeakingEventStore({ storage });
    store.recordEvent(createEvent());

    const snapshot = store.getSnapshot();
    snapshot.events[0].targets[0].sense_id = 'sense:tampered';

    assert.equal(store.getSnapshot().events[0].targets[0].sense_id, 'sense:tree');
    store.clearHistory();
    assert.deepEqual(JSON.parse(JSON.stringify(store.getSnapshot().events)), []);
    assert.equal(store.getSnapshot().namespace, 'ru_tr_speaking_events_v1');
});
