import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    const writes = [];
    return {
        writes,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => {
            writes.push(key);
            values.set(key, String(value));
        },
        getValue: key => values.get(key) ?? null
    };
}

function createStore(storage) {
    const source = fs.readFileSync(path.join(ROOT, 'js/learning-progress.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console, Date }, { filename: 'learning-progress.js' });
    return new window.LearningProgressStore({
        storage,
        now: () => '2026-09-20T12:00:00.000Z',
        idFactory: () => 'event:fixed'
    });
}

test('keeps recognition and recall mastery independent under the new namespace', () => {
    const storage = createStorage({ stats: '{"legacy":true}' });
    const store = createStore(storage);

    store.recordAttempt({
        lexical_unit_id: 'lu:1',
        sense_id: 'sense:1',
        skill: 'recognition',
        exercise_type: 'flashcard',
        result: 'correct',
        user_answer: null,
        expected_answers: ['учиться']
    });
    store.recordAttempt({
        lexical_unit_id: 'lu:1',
        sense_id: 'sense:1',
        skill: 'recall',
        exercise_type: 'typed_recall',
        result: 'incorrect',
        user_answer: 'говорить',
        expected_answers: ['учиться']
    });

    assert.equal(store.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:1', skill: 'recognition' }).correct, 1);
    assert.equal(store.getMastery({ lexicalUnitId: 'lu:1', senseId: 'sense:1', skill: 'recall' }).correct, 0);
    assert.equal(storage.getValue('stats'), '{"legacy":true}');
    assert.deepEqual([...new Set(storage.writes)], ['ru_tr_skill_progress_v1']);
});

test('stores a versioned attempt with all required fields', () => {
    const storage = createStorage();
    const store = createStore(storage);

    const event = store.recordAttempt({
        lexical_unit_id: 'lu:phrase',
        sense_id: 'sense:phrase',
        skill: 'recall',
        exercise_type: 'typed_recall',
        result: 'valid_other_sense',
        user_answer: 'дом',
        expected_answers: ['домой']
    });
    const snapshot = store.getSnapshot();

    assert.equal(snapshot.schema_version, 1);
    assert.equal(snapshot.namespace, 'ru_tr_skill_progress_v1');
    assert.deepEqual(
        Object.keys(event).sort(),
        ['event_id', 'expected_answers', 'exercise_type', 'lexical_unit_id', 'result', 'sense_id', 'skill', 'timestamp', 'user_answer'].sort()
    );
    assert.equal(snapshot.attempts.length, 1);
    assert.equal(snapshot.mastery['lu:phrase|sense:phrase|recall'].correct, 0);
});

test('reload-style store reconstruction keeps new skill progress without touching legacy data', () => {
    const storage = createStorage({ stats: '{"legacy":true}' });
    const firstStore = createStore(storage);

    firstStore.recordAttempt({
        lexical_unit_id: 'lu:reload',
        sense_id: 'sense:reload',
        skill: 'recall',
        exercise_type: 'typed_recall',
        result: 'correct',
        user_answer: 'учиться',
        expected_answers: ['учиться']
    });

    const reloadedStore = createStore(storage);

    assert.equal(reloadedStore.getSnapshot().attempts.length, 1);
    assert.equal(reloadedStore.getMastery({ lexicalUnitId: 'lu:reload', senseId: 'sense:reload', skill: 'recall' }).correct, 1);
    assert.equal(storage.getValue('stats'), '{"legacy":true}');
});

test('stores production events with target identity and isolated mastery counters', () => {
    const storage = createStorage({ stats: '{"legacy":true}' });
    const store = createStore(storage);

    const event = store.recordAttempt({
        event_id: 'event:production',
        exercise_id: 'exercise:lu:production:sense:production:target_word_sentence',
        lexical_unit_id: 'lu:production',
        sense_id: 'sense:production',
        skill: 'production',
        exercise_type: 'target_word_sentence',
        result: 'completed',
        timestamp: '2026-09-20T12:01:00.000Z',
        user_answer: 'Я хочу учиться.',
        target_form: 'учиться',
        expected_answers: ['учиться']
    });

    assert.equal(event.exercise_id, 'exercise:lu:production:sense:production:target_word_sentence');
    assert.equal(event.target_form, 'учиться');
    assert.equal(event.skill, 'production');
    assert.equal(event.result, 'completed');
    assert.equal(Object.hasOwn(event, 'grammatically_correct'), false);
    assert.equal(Object.hasOwn(event, 'successful_production'), false);
    const productionMastery = store.getMastery({ lexicalUnitId: 'lu:production', senseId: 'sense:production', skill: 'production' });
    assert.equal(productionMastery.completed, 1);
    assert.equal(productionMastery.correct, 0);
    assert.equal(productionMastery.incorrect, 0);
    assert.equal(Object.hasOwn(productionMastery, 'mastery_success'), false);
    assert.equal(store.getMastery({ lexicalUnitId: 'lu:production', senseId: 'sense:production', skill: 'recall' }).attempts, 0);
    assert.equal(store.getMastery({ lexicalUnitId: 'lu:production', senseId: 'sense:production', skill: 'recognition' }).attempts, 0);
    assert.equal(storage.getValue('stats'), '{"legacy":true}');
});

test('persists non-completed production results without treating them as recognition or recall failures', () => {
    const storage = createStorage();
    const store = createStore(storage);
    const baseAttempt = {
        exercise_id: 'exercise:lu:uncertain:sense:uncertain:target_word_sentence',
        lexical_unit_id: 'lu:uncertain',
        sense_id: 'sense:uncertain',
        skill: 'production',
        exercise_type: 'target_word_sentence',
        target_form: 'избежать',
        expected_answers: ['избежать'],
        user_answer: 'Я избежал ошибки.'
    };

    store.recordAttempt({ ...baseAttempt, result: 'target_not_detected' });
    store.recordAttempt({ ...baseAttempt, result: 'empty_answer', user_answer: '' });
    const productionMastery = store.getMastery({ lexicalUnitId: 'lu:uncertain', senseId: 'sense:uncertain', skill: 'production' });

    assert.equal(productionMastery.target_not_detected, 1);
    assert.equal(productionMastery.empty_answer, 1);
    assert.equal(productionMastery.incorrect, 0);
    assert.equal(store.getSnapshot().attempts.length, 2);
});
