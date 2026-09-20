import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createElement() {
    const classNames = new Set();
    return {
        textContent: '',
        value: '',
        disabled: false,
        dataset: {},
        classList: {
            add: className => classNames.add(className),
            remove: className => classNames.delete(className),
            toggle: (className, force) => {
                const shouldAdd = force === undefined ? !classNames.has(className) : force;
                if (shouldAdd) classNames.add(className);
                else classNames.delete(className);
                return shouldAdd;
            },
            contains: className => classNames.has(className)
        },
        focus() {},
        onclick: null,
        onkeydown: null
    };
}

test('exposes Today and Analytics navigation without removing existing modes', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

    assert.match(indexHtml, /data-mode="adaptive"/u);
    assert.match(indexHtml, /data-mode="analytics"/u);
    assert.match(indexHtml, /id="adaptiveMode"/u);
    assert.match(indexHtml, /id="analyticsMode"/u);
    assert.match(indexHtml, /js\/adaptive-engine\.js/u);
    assert.match(indexHtml, /js\/adaptive-mode\.js/u);
    assert.match(indexHtml, /js\/analytics-mode\.js/u);
    assert.match(appSource, /case ['"]adaptive['"]/u);
    assert.match(appSource, /case ['"]analytics['"]/u);
    assert.match(appSource, /case ['"]typedRecall['"]/u);
    assert.match(appSource, /case ['"]production['"]/u);
});

test('adaptive Recall item uses canonical evaluator and existing recall/error stores', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-mode.js'), 'utf8');
    const ids = ['adaptiveStart', 'adaptiveExercise', 'adaptivePrompt', 'adaptiveInput', 'adaptiveSubmit', 'adaptiveNext', 'adaptivePause', 'adaptiveFeedback', 'adaptiveProgress', 'adaptiveModule', 'adaptiveRecognitionControls', 'adaptiveRecognizeKnown', 'adaptiveRecognizeAgain', 'adaptiveReviewDone', 'adaptiveCompletion', 'adaptiveCompletionSummary', 'adaptiveResume'];
    const elements = new Map(ids.map(id => [id, createElement()]));
    const attempts = [];
    const completed = [];
    const session = {
        session_id: 'session:1',
        session_status: 'active',
        current_index: 0,
        planned_items: [{ item_id: 'recall:lu:1:sense:1', module: 'recall', skill: 'recall', exercise_type: 'typed_recall', lexical_unit_id: 'lu:1', sense_id: 'sense:1', prompt: 'öğrenmek', accepted_answers: ['учиться'], estimated_seconds: 45 }],
        completed_items: []
    };
    const window = {
        adaptiveEngine: {
            getActiveSession: () => session,
            getCurrentItem: () => session.planned_items[0],
            completeItem: (itemId, outcome) => completed.push({ itemId, outcome }),
            pause: () => undefined,
            resume: () => undefined,
            startSession: () => session
        },
        TypedRecallCore: {
            evaluateAnswer: () => ({ result: 'correct', isCorrect: true, expected_answers: ['учиться'], user_answer: 'учиться' })
        },
        learningProgressStore: { recordAttempt: attempt => attempts.push(attempt) },
        errorNotebookStore: { recordFromTypedRecall: () => undefined },
        SkillAnalytics: { build: () => ({}) }
    };
    const document = {
        getElementById: id => elements.get(id),
        querySelectorAll: () => []
    };
    vm.runInNewContext(source, { window, globalThis: window, document, console, Date }, { filename: 'adaptive-mode.js' });

    window.adaptiveMode.init();
    assert.equal(elements.get('adaptivePrompt').textContent, 'öğrenmek');
    elements.get('adaptiveInput').value = 'учиться';
    elements.get('adaptiveSubmit').onclick();

    assert.equal(attempts[0].skill, 'recall');
    assert.equal(attempts[0].lexical_unit_id, 'lu:1');
    assert.equal(completed[0].outcome.result, 'correct');
});

test('adaptive completion summary resolves module labels from planned items', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-mode.js'), 'utf8');
    const ids = ['adaptiveStart', 'adaptiveExercise', 'adaptivePrompt', 'adaptiveInput', 'adaptiveSubmit', 'adaptiveNext', 'adaptivePause', 'adaptiveFeedback', 'adaptiveProgress', 'adaptiveModule', 'adaptiveRecognitionControls', 'adaptiveRecognizeKnown', 'adaptiveRecognizeAgain', 'adaptiveReviewDone', 'adaptiveCompletion', 'adaptiveCompletionSummary', 'adaptiveResume', 'adaptiveStatus'];
    const elements = new Map(ids.map(id => [id, createElement()]));
    const window = {};
    const document = {
        getElementById: id => elements.get(id),
        querySelectorAll: () => []
    };
    vm.runInNewContext(source, { window, globalThis: window, document, console, Date }, { filename: 'adaptive-mode.js' });

    new window.AdaptiveMode().showCompletion({
        planned_items: [
            { item_id: 'production:1', module: 'production' },
            { item_id: 'recall:1', module: 'recall' }
        ],
        completed_items: [
            { item_id: 'production:1', result: 'target_not_detected' },
            { item_id: 'recall:1', result: 'incorrect' }
        ]
    });

    assert.equal(elements.get('adaptiveCompletionSummary').textContent, 'Production: 1 · Recall: 1');
});

test('adaptive error review exposes its completion control', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-mode.js'), 'utf8');
    const ids = ['adaptiveStart', 'adaptiveExercise', 'adaptivePrompt', 'adaptiveInput', 'adaptiveSubmit', 'adaptiveNext', 'adaptivePause', 'adaptiveFeedback', 'adaptiveProgress', 'adaptiveModule', 'adaptiveRecognitionControls', 'adaptiveRecognizeKnown', 'adaptiveRecognizeAgain', 'adaptiveReviewDone', 'adaptiveCompletion', 'adaptiveCompletionSummary', 'adaptiveResume', 'adaptiveStatus'];
    const elements = new Map(ids.map(id => [id, createElement()]));
    const session = {
        session_status: 'active',
        current_index: 0,
        planned_items: [{ item_id: 'error_review:error:1', module: 'error_review', prompt: 'Hata', expected_answers: ['учиться'] }]
    };
    const window = { adaptiveEngine: { getActiveSession: () => session } };
    const document = {
        getElementById: id => elements.get(id),
        querySelectorAll: () => []
    };
    vm.runInNewContext(source, { window, globalThis: window, document, console, Date }, { filename: 'adaptive-mode.js' });

    window.adaptiveMode.init();

    assert.equal(elements.get('adaptiveReviewDone').classList.contains('hidden'), false);
    assert.equal(elements.get('adaptiveSubmit').classList.contains('hidden'), true);
});
