import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadBridge() {
    const window = {};
    const context = { window, globalThis: window, console, structuredClone };
    for (const file of ['js/error-taxonomy.js', 'js/trki-error-taxonomy.js', 'js/trki-error-bridge.js']) {
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
    }
    return window;
}

function createExercise(overrides = {}) {
    return {
        exercise_id: 'trki:b1:grammar:1',
        level: 'B1',
        section: 'grammar',
        exercise_type: 'multiple_choice',
        verification_status: 'verified',
        exercise_eligible: true,
        source_reference: { source_id: 'src:test', document_id: 'doc:test', version: 'v1', locator: 'item/1' },
        error_mapping: { error_type: 'trki.grammar.case.genitive', error_subtype: 'after-negation' },
        ...overrides
    };
}

function createAttempt(overrides = {}) {
    return { attempt_id: 'attempt:1', session_id: 'session:1', user_answer: 'красивый', result: 'incorrect', ...overrides };
}

test('creates a verified TRKI namespaced Error Notebook observation only from deterministic verified mapping', () => {
    const window = loadBridge();
    const record = window.TrkiErrorBridge.createNotebookError({ exercise: createExercise(), attempt: createAttempt() });

    assert.equal(record.error_type, 'trki.grammar.case.genitive');
    assert.equal(record.verification_status, 'verified');
    assert.equal(record.detection_method, 'deterministic');
    assert.equal(record.exercise_eligible, false);
    assert.equal(record.adaptive_eligible, false);
    assert.equal(window.TrkiErrorTaxonomy.getGrammarTopic(record.error_type), null);
});

test('keeps unmapped wrong answers neutral and rejects candidate or unverified mappings', () => {
    const window = loadBridge();

    assert.equal(window.TrkiErrorBridge.createNotebookError({
        exercise: createExercise({ error_mapping: undefined }), attempt: createAttempt()
    }), null);
    assert.equal(window.TrkiErrorBridge.createNotebookError({
        exercise: createExercise({ verification_status: 'candidate' }), attempt: createAttempt()
    }), null);
    assert.equal(window.TrkiErrorBridge.createNotebookError({
        exercise: createExercise({ error_mapping: { error_type: 'case.genitive' } }), attempt: createAttempt()
    }), null);
});

test('returns word-formation information only as analytics and never as an Error Notebook diagnosis', () => {
    const window = loadBridge();
    const exercise = createExercise({ error_mapping: { error_type: 'trki.word_formation', analytics_only: true } });

    assert.equal(window.TrkiErrorBridge.createNotebookError({ exercise, attempt: createAttempt() }), null);
    const analytics = window.TrkiErrorBridge.createAnalyticsEvent({ exercise, attempt: createAttempt() });
    assert.equal(analytics.error_type, 'trki.word_formation');
    assert.equal(analytics.analytics_only, true);
});
