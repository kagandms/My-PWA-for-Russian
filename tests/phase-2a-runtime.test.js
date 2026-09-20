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
        getValue: key => values.get(key) ?? null
    };
}

function loadAppClass() {
    const source = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')
        .replace('const app = new App();', 'window.App = App;');
    const localStorage = createStorage();
    const attempts = [];
    const srsCalls = [];
    const window = {
        storageManager: {
            normalizeStats: stats => stats,
            getWordStorageKey: wordId => `word:${wordId}`
        },
        srsManager: { updateWord: (wordId, isCorrect) => srsCalls.push({ wordId, isCorrect }) },
        goalsManager: { recordWord: () => undefined },
        notificationManager: { syncProfileDebounced: () => undefined },
        learningProgressStore: { recordAttempt: attempt => attempts.push(attempt) },
        WORDS: [{ id: 7, lexicalUnitId: 'lu:7', senseIds: ['sense:7'] }]
    };
    const context = {
        window,
        globalThis: window,
        localStorage,
        console,
        Date,
        Math,
        setTimeout,
        clearTimeout
    };
    vm.runInNewContext(source, context, { filename: 'app.js' });
    window.App.prototype.init = async () => undefined;
    return { App: window.App, attempts, srsCalls, localStorage };
}

test('recognition bridge records a recognition skill while preserving legacy answer behavior', () => {
    const { App, attempts, srsCalls } = loadAppClass();
    const app = new App();

    app.recordAnswer(7, true, { skill: 'recognition', exerciseType: 'flashcard', senseId: 'sense:7' });

    assert.deepEqual(srsCalls, [{ wordId: 7, isCorrect: true }]);
    assert.equal(app.stats.totalCorrect, 1);
    assert.equal(attempts.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(attempts[0])), {
        lexical_unit_id: 'lu:7',
        sense_id: 'sense:7',
        skill: 'recognition',
        exercise_type: 'flashcard',
        result: 'correct',
        user_answer: null,
        expected_answers: []
    });
});

test('existing recognition consumers pass recognition metadata and Typed Recall has a separate mode surface', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
    const flashcardSource = fs.readFileSync(path.join(ROOT, 'js/flashcard.js'), 'utf8');
    const quizSource = fs.readFileSync(path.join(ROOT, 'js/quiz.js'), 'utf8');

    assert.match(flashcardSource, /skill:\s*['"]recognition['"]/u);
    assert.match(quizSource, /skill:\s*['"]recognition['"]/u);
    assert.match(appSource, /case ['"]typedRecall['"]/u);
    assert.match(appSource, /case ['"]production['"]/u);
    assert.match(indexHtml, /data-mode="typedRecall"/u);
    assert.match(indexHtml, /data-mode="production"/u);
    assert.match(indexHtml, /id="typedRecallMode"/u);
    assert.match(indexHtml, /id="productionMode"/u);
    assert.match(indexHtml, /js\/learning-progress\.js/u);
    assert.match(indexHtml, /js\/typed-recall-core\.js/u);
    assert.match(indexHtml, /js\/typed-recall\.js/u);
    assert.match(indexHtml, /js\/production-core\.js/u);
    assert.match(indexHtml, /js\/production-mode\.js/u);
    assert.doesNotMatch(appSource, /this\.restoreSettings\(\)/u);
});

test('Typed Recall records recall only and exposes wrong-answer feedback', () => {
    const coreSource = fs.readFileSync(path.join(ROOT, 'js/typed-recall-core.js'), 'utf8');
    const modeSource = fs.readFileSync(path.join(ROOT, 'js/typed-recall.js'), 'utf8');
    const elementIds = [
        'typedRecallInput',
        'typedRecallSubmit',
        'typedRecallNext',
        'typedRecallPrompt',
        'typedRecallFeedback',
        'typedRecallProgress'
    ];
    const elements = Object.fromEntries(elementIds.map(id => [id, {
        value: '',
        textContent: '',
        disabled: false,
        dataset: {},
        classList: { add() {}, remove() {} },
        focus() {}
    }]));
    const attempts = [];
    const notebookEvents = [];
    let recognitionCalls = 0;
    const window = {
        app: {
            shuffleArray: questions => [...questions],
            showCompletion: () => undefined,
            recordAnswer: () => { recognitionCalls += 1; }
        },
        vocabularyRepository: {
            getTypedRecallQuestions: () => [{
                lexical_unit_id: 'lu:1',
                sense_id: 'sense:1',
                prompt: 'öğrenmek',
                accepted_answers: ['учиться'],
                other_senses: [],
                entry_type: 'lemma'
            }]
        },
        learningProgressStore: { recordAttempt: attempt => attempts.push(attempt) },
        errorNotebookStore: { recordFromTypedRecall: event => notebookEvents.push(event) }
    };
    const context = {
        window,
        globalThis: window,
        console,
        document: { getElementById: id => elements[id] }
    };
    vm.runInNewContext(coreSource, context, { filename: 'typed-recall-core.js' });
    vm.runInNewContext(modeSource, context, { filename: 'typed-recall.js' });

    window.typedRecallMode.init(1);
    elements.typedRecallInput.value = 'говорить';
    elements.typedRecallSubmit.onclick();

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].skill, 'recall');
    assert.equal(attempts[0].exercise_type, 'typed_recall');
    assert.equal(attempts[0].result, 'incorrect');
    assert.match(elements.typedRecallFeedback.textContent, /учиться/u);
    assert.match(elements.typedRecallFeedback.textContent, /говорить/u);
    assert.match(elements.typedRecallFeedback.textContent, /öğrenmek/u);
    assert.equal(recognitionCalls, 0);
    assert.equal(notebookEvents.length, 1);
    assert.equal(notebookEvents[0].result.result, 'incorrect');
});
