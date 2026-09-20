import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadMastery() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-mastery.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'speaking-mastery.js' });
    return window.SpeakingMasteryReadModel;
}

class MemoryStorage {
    constructor() {
        this.value = null;
    }

    getItem() {
        return this.value;
    }

    setItem(key, value) {
        assert.equal(key, 'ru_tr_speaking_mastery_v1');
        this.value = value;
    }

    removeItem() {
        this.value = null;
    }
}

function createEvent(overrides = {}) {
    return {
        schema_version: 1,
        namespace: 'ru_tr_speaking_events_v1',
        attempt_id: 'speaking:attempt:1',
        exercise_type: 'read_aloud',
        completed_at: '2026-09-20T10:00:10.000Z',
        transcript_text: 'Я вижу елку.',
        transcript_state: 'final_result',
        targets: [{
            lexical_unit_id: 'lu:tree',
            sense_id: 'sense:tree',
            target_surface: 'ёлка'
        }],
        evaluation: {
            transcript_observation: {
                available: true,
                observations: [{ kind: 'alignment', status: 'exact' }]
            }
        },
        ...overrides
    };
}

test('fans out paired targets into separate speaking observations', () => {
    const SpeakingMasteryReadModel = loadMastery();
    const model = new SpeakingMasteryReadModel({ storage: new MemoryStorage() });

    model.rebuild([
        createEvent(),
        createEvent({
            attempt_id: 'speaking:attempt:prompted',
            exercise_type: 'prompted_speech',
            completed_at: '2026-09-20T10:01:10.000Z',
            targets: [
                { lexical_unit_id: 'lu:tree', sense_id: 'sense:other', target_surface: 'учить' },
                { lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }
            ],
            evaluation: {
                transcript_observation: {
                    available: true,
                    observations: [
                        { kind: 'target_presence', status: 'not_observed', lexical_unit_id: 'lu:tree', sense_id: 'sense:other' },
                        { kind: 'target_presence', status: 'observed', lexical_unit_id: 'lu:house', sense_id: 'sense:house' }
                    ]
                }
            }
        })
    ]);

    const tree = model.getMastery({ lexicalUnitId: 'lu:tree', senseId: 'sense:tree' });
    const otherSense = model.getMastery({ lexicalUnitId: 'lu:tree', senseId: 'sense:other' });
    const house = model.getMastery({ lexicalUnitId: 'lu:house', senseId: 'sense:house' });

    assert.equal(tree.observation_count, 1);
    assert.equal(otherSense.target_not_observed_count, 1);
    assert.equal(house.target_observed_count, 1);
    assert.notDeepEqual(JSON.parse(JSON.stringify(tree)), JSON.parse(JSON.stringify(otherSense)));
    assert.equal(tree.pronunciation, 'not_evaluated');
    assert.equal(tree.stress, 'not_evaluated');
    assert.equal(tree.fluency, 'not_evaluated');
    assert.equal(tree.overall, 'insufficient_evidence');
});

test('keeps targetless Free Speech observations outside lexical mastery', () => {
    const SpeakingMasteryReadModel = loadMastery();
    const model = new SpeakingMasteryReadModel({ storage: new MemoryStorage() });

    model.rebuild([createEvent({
        attempt_id: 'speaking:attempt:free',
        exercise_type: 'free_speech',
        targets: [],
        transcript_state: 'partial_only',
        transcript_text: 'Я думаю',
        evaluation: { transcript_observation: { available: false, observations: [] } }
    })]);

    const snapshot = model.getSnapshot();

    assert.deepEqual(JSON.parse(JSON.stringify(snapshot.lexical_mastery)), {});
    assert.equal(snapshot.sessions['speaking:attempt:free'].transcript_available, false);
    assert.equal(snapshot.sessions['speaking:attempt:free'].observation_count, 1);
});

test('rebuilds the same read-model after deleting the cache', () => {
    const SpeakingMasteryReadModel = loadMastery();
    const storage = new MemoryStorage();
    const events = [createEvent()];
    const firstModel = new SpeakingMasteryReadModel({ storage });
    const firstSnapshot = firstModel.rebuild(events);
    storage.removeItem('ru_tr_speaking_mastery_v1');
    const secondModel = new SpeakingMasteryReadModel({ storage });
    const secondSnapshot = secondModel.rebuild(events);

    assert.deepEqual(JSON.parse(JSON.stringify(secondSnapshot)), JSON.parse(JSON.stringify(firstSnapshot)));
});

test('returns an unevaluated default without inventing speaking scores', () => {
    const SpeakingMasteryReadModel = loadMastery();
    const model = new SpeakingMasteryReadModel({ storage: new MemoryStorage() });
    const mastery = model.getMastery({ lexicalUnitId: 'lu:missing', senseId: 'sense:missing' });
    const forbiddenFields = [
        'speaking_accuracy',
        'mastery_success',
        'pronunciation_percent',
        'stress_percent',
        'fluency_percent',
        'accent_percent'
    ];

    assert.equal(mastery.status, 'not_evaluated');
    assert.equal(mastery.overall, 'insufficient_evidence');
    assert.equal(forbiddenFields.some((field) => field in mastery), false);
    assert.equal(Object.values(model.getSnapshot().lexical_mastery).some((record) => (
        forbiddenFields.some((field) => field in record)
    )), false);
});

test('does not turn exact transcript or provider confidence into mastery', () => {
    const SpeakingMasteryReadModel = loadMastery();
    const model = new SpeakingMasteryReadModel({ storage: new MemoryStorage() });

    model.rebuild([createEvent({
        provider_confidence: 0.99,
        evaluation: {
            transcript_observation: {
                available: true,
                observations: [{ kind: 'alignment', status: 'exact' }]
            }
        }
    })]);

    const mastery = model.getMastery({ lexicalUnitId: 'lu:tree', senseId: 'sense:tree' });
    assert.equal(mastery.status, 'not_evaluated');
    assert.equal(mastery.overall, 'insufficient_evidence');
    assert.equal(mastery.transcript_observation_count, 1);
});

