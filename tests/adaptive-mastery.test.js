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
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}

function loadMastery(storage) {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-mastery.js'), 'utf8');
    const window = { localStorage: storage, console };
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'adaptive-mastery.js' });
    return { Model: window.AdaptiveMasteryReadModel, window };
}

test('keeps recognition recall and production mastery separate at sense level', () => {
    const storage = createStorage();
    const { Model } = loadMastery(storage);
    const model = new Model({ storage, now: () => '2026-09-20T10:00:00.000Z' });

    model.rebuild([
        { lexical_unit_id: 'lu:1', sense_id: 'sense:a', skill: 'recognition', result: 'correct', timestamp: '2026-09-20T09:00:00.000Z' },
        { lexical_unit_id: 'lu:1', sense_id: 'sense:a', skill: 'recall', result: 'incorrect', timestamp: '2026-09-20T09:05:00.000Z' },
        { lexical_unit_id: 'lu:1', sense_id: 'sense:b', skill: 'recall', result: 'correct', timestamp: '2026-09-20T09:10:00.000Z' },
        { lexical_unit_id: 'lu:1', sense_id: 'sense:a', skill: 'production', result: 'completed', timestamp: '2026-09-20T09:15:00.000Z' }
    ]);

    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:a', skill: 'recognition' }).correct_count, 1);
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:a', skill: 'recall' }).incorrect_count, 1);
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:b', skill: 'recall' }).correct_count, 1);
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:a', skill: 'production' }).completed_observations, 1);
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:a', skill: 'recognition' }).attempts, 1);
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:a', skill: 'recall' }).attempts, 1);
});

test('keeps production observations out of accuracy and marks evidence insufficient', () => {
    const storage = createStorage();
    const { Model } = loadMastery(storage);
    const model = new Model({ storage });

    model.rebuild([
        { lexical_unit_id: 'lu:p', sense_id: 'sense:p', skill: 'production', result: 'completed', timestamp: '2026-09-20T09:00:00.000Z' },
        { lexical_unit_id: 'lu:p', sense_id: 'sense:p', skill: 'production', result: 'target_not_detected', timestamp: '2026-09-20T09:01:00.000Z' },
        { lexical_unit_id: 'lu:p', sense_id: 'sense:p', skill: 'production', result: 'empty_answer', timestamp: '2026-09-20T09:02:00.000Z' }
    ]);

    const mastery = model.getMastery({ lexicalUnitId: 'lu:p', senseId: 'sense:p', skill: 'production' });
    assert.equal(mastery.accuracy, null);
    assert.equal(mastery.evidence_strength, 'observation_only');
    assert.equal(mastery.status, 'insufficient_evidence');
    assert.equal(mastery.completed_observations, 1);
    assert.equal(mastery.target_not_detected_count, 1);
    assert.equal(mastery.empty_answer_count, 1);
});

test('derives explainable learning statuses from meaningful binary evidence', () => {
    const storage = createStorage();
    const { Model } = loadMastery(storage);
    const model = new Model({ storage });

    model.rebuild([
        ...Array.from({ length: 4 }, (_, index) => ({
            lexical_unit_id: 'lu:stable', sense_id: 'sense:1', skill: 'recall', result: index === 0 ? 'incorrect' : 'correct', timestamp: `2026-09-20T09:0${index}:00.000Z`
        })),
        { lexical_unit_id: 'lu:weak', sense_id: 'sense:1', skill: 'recall', result: 'incorrect', timestamp: '2026-09-20T09:10:00.000Z' }
    ]);

    assert.equal(model.getMastery({ lexicalUnitId: 'lu:stable', senseId: 'sense:1', skill: 'recall' }).status, 'stable');
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:weak', senseId: 'sense:1', skill: 'recall' }).status, 'needs_review');
    assert.equal(model.getMastery({ lexicalUnitId: 'lu:new', senseId: 'sense:1', skill: 'recall' }).status, 'unseen');
});

test('rebuild after deleting the mastery cache returns the same read-model', () => {
    const storage = createStorage();
    const attempts = [
        { lexical_unit_id: 'lu:1', sense_id: 'sense:1', skill: 'recall', result: 'correct', timestamp: '2026-09-20T09:00:00.000Z' },
        { lexical_unit_id: 'lu:1', sense_id: 'sense:1', skill: 'recall', result: 'almost_correct', timestamp: '2026-09-20T09:01:00.000Z' }
    ];
    const first = loadMastery(storage).Model;
    const firstModel = new first({ storage });
    const firstSnapshot = firstModel.rebuild(attempts);

    storage.removeItem('ru_tr_mastery_v1');
    const second = loadMastery(storage).Model;
    const secondModel = new second({ storage });
    const secondSnapshot = secondModel.rebuild(attempts);

    assert.deepEqual(secondSnapshot, firstSnapshot);
});
