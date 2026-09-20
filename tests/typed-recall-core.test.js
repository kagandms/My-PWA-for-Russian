import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/typed-recall-core.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'typed-recall-core.js' });
    return window.TypedRecallCore;
}

function createQuestion(overrides = {}) {
    return {
        lexical_unit_id: 'lu:target',
        sense_id: 'sense:target',
        prompt: 'öğrenmek',
        accepted_answers: ['учиться'],
        other_senses: [{ sense_id: 'sense:other', accepted_answers: ['обучаться'] }],
        ...overrides
    };
}

test('accepts an exact canonical answer', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({ question: createQuestion(), userAnswer: 'учиться' });

    assert.equal(result.result, 'correct');
    assert.equal(result.isCorrect, true);
    assert.equal(result.matched_sense_id, 'sense:target');
});

test('normalizes case whitespace punctuation and ё/е conservatively', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({
        question: createQuestion({ accepted_answers: ['ёлка'] }),
        userAnswer: '  ЕЛКА!  '
    });

    assert.equal(result.result, 'correct');
});

test('accepts one of multiple canonical answers for the target sense', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({
        question: createQuestion({ accepted_answers: ['изучать', 'учиться'] }),
        userAnswer: 'изучать'
    });

    assert.equal(result.result, 'correct');
    assert.equal(result.matched_answer, 'изучать');
});

test('reports a canonical answer for another sense without scoring it as target correct', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({ question: createQuestion(), userAnswer: 'обучаться' });

    assert.equal(result.result, 'valid_other_sense');
    assert.equal(result.isCorrect, false);
    assert.equal(result.matched_sense_id, 'sense:other');
});

test('reports a conservative typo as almost correct without awarding correctness', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({
        question: createQuestion({ accepted_answers: ['дом'] }),
        userAnswer: 'дон'
    });

    assert.equal(result.result, 'almost_correct');
    assert.equal(result.isCorrect, false);
});

test('supports canonical phrase and expression answers without inflection guessing', () => {
    const core = loadCore();

    const phraseResult = core.evaluateAnswer({
        question: createQuestion({ entry_type: 'phrase', accepted_answers: ['день рождения'], other_senses: [] }),
        userAnswer: 'день рождения'
    });
    const inflectedResult = core.evaluateAnswer({
        question: createQuestion({ accepted_answers: ['учиться'], other_senses: [] }),
        userAnswer: 'учусь'
    });

    assert.equal(phraseResult.result, 'correct');
    assert.equal(inflectedResult.result, 'incorrect');
});

test('reports wrong answers with expected answers and user answer', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({ question: createQuestion(), userAnswer: 'говорить' });

    assert.equal(result.result, 'incorrect');
    assert.deepEqual(Array.from(result.expected_answers), ['учиться']);
    assert.equal(result.user_answer, 'говорить');
    assert.equal(result.target_sense_id, 'sense:target');
});
