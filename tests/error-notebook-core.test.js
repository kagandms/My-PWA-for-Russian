import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const taxonomySource = fs.readFileSync(path.join(ROOT, 'js/error-taxonomy.js'), 'utf8');
    const coreSource = fs.readFileSync(path.join(ROOT, 'js/error-notebook-core.js'), 'utf8');
    const window = {};
    const context = { window, globalThis: window, console };
    vm.runInNewContext(taxonomySource, context, { filename: 'error-taxonomy.js' });
    vm.runInNewContext(coreSource, context, { filename: 'error-notebook-core.js' });
    return window.ErrorNotebookCore;
}

function createAttempt() {
    return {
        event_id: 'attempt:1',
        lexical_unit_id: 'lu:1',
        sense_id: 'sense:1',
        skill: 'recall',
        exercise_type: 'typed_recall',
        result: 'incorrect',
        timestamp: '2026-09-20T10:00:00.000Z',
        user_answer: 'говорить',
        expected_answers: ['учиться']
    };
}

test('maps generic Typed Recall incorrect to a verified neutral recall mismatch', () => {
    const core = loadCore();

    const error = core.createTypedRecallError({ attempt: createAttempt(), result: { result: 'incorrect' } });

    assert.equal(error.error_type, 'recall.mismatch');
    assert.equal(error.error_subtype, 'unclassified');
    assert.equal(error.detection_method, 'deterministic');
    assert.equal(error.verification_status, 'verified');
    assert.equal(error.exercise_eligible, false);
    assert.equal(error.evidence.attempt_id, 'attempt:1');
});

test('maps typo feedback to spelling without misclassifying it as lexical choice', () => {
    const core = loadCore();

    const error = core.createTypedRecallError({
        attempt: { ...createAttempt(), result: 'almost_correct' },
        result: { result: 'almost_correct', typo: true, reason: 'typo' }
    });

    assert.equal(error.error_type, 'spelling');
    assert.equal(error.error_subtype, 'typo');
    assert.equal(error.verification_status, 'verified');
    assert.notEqual(error.error_type, 'lexical-choice');
});

test('does not create an Error Notebook event for a valid answer belonging to another sense', () => {
    const core = loadCore();

    const error = core.createTypedRecallError({
        attempt: createAttempt(),
        result: { result: 'valid_other_sense', matched_sense_id: 'sense:other' }
    });

    assert.equal(error, null);
});
