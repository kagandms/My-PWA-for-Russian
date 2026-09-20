import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

class FakeElement {
    constructor() {
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.dataset = {};
        this.onclick = null;
        this.onkeydown = null;
        this.classList = {
            values: new Set(),
            add: name => this.classList.values.add(name),
            remove: name => this.classList.values.delete(name),
            contains: name => this.classList.values.has(name)
        };
    }

    focus() {}
}

function loadProductionMode({ exercises }) {
    const source = fs.readFileSync(path.join(ROOT, 'js/production-mode.js'), 'utf8');
    const coreSource = fs.readFileSync(path.join(ROOT, 'js/production-core.js'), 'utf8');
    const elements = new Map([
        'productionPrompt', 'productionInput', 'productionSubmit', 'productionFeedback',
        'productionNext', 'productionProgress', 'productionStatus'
    ].map(id => [id, new FakeElement()]));
    const attempts = [];
    const legacyAnswerCalls = [];
    const notebookEvents = [];
    const window = {
        app: {
            shuffleArray: values => [...values],
            recordAnswer: (...args) => legacyAnswerCalls.push(args)
        },
        vocabularyRepository: { getProductionExercises: () => exercises },
        learningProgressStore: { recordAttempt: attempt => attempts.push(attempt) },
        errorNotebookStore: { recordFromTypedRecall: event => notebookEvents.push(event) }
    };
    const document = { getElementById: id => elements.get(id) || null };
    vm.runInNewContext(coreSource, { window, globalThis: window, console }, { filename: 'production-core.js' });
    vm.runInNewContext(source, { window, globalThis: window, document, console }, { filename: 'production-mode.js' });
    return { mode: new window.ProductionMode(), elements, attempts, legacyAnswerCalls, notebookEvents };
}

function createExercise(overrides = {}) {
    return {
        exercise_id: 'exercise:lu:production:sense:production:target_word_sentence',
        lexical_unit_id: 'lu:production',
        sense_id: 'sense:production',
        skill: 'production',
        exercise_type: 'target_word_sentence',
        prompt: 'öğrenmek',
        target_form: 'учиться',
        entry_type: 'lemma',
        exercise_eligible: true,
        ...overrides
    };
}

test('records exact production completion without writing recognition or recall', () => {
    const { mode, elements, attempts, legacyAnswerCalls } = loadProductionMode({ exercises: [createExercise()] });
    mode.init(1);

    elements.get('productionInput').value = 'учиться';
    mode.submitAnswer();

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].skill, 'production');
    assert.equal(attempts[0].exercise_id, 'exercise:lu:production:sense:production:target_word_sentence');
    assert.equal(attempts[0].result, 'completed');
    assert.equal(legacyAnswerCalls.length, 0);
    assert.equal(elements.get('productionFeedback').dataset.result, 'completed');
    assert.match(elements.get('productionFeedback').textContent, /Canonical hedef biçim tespit edildi/u);
});

test('preserves uncertainty for an inflected or transformed non-exact answer', () => {
    const { mode, elements, attempts } = loadProductionMode({
        exercises: [createExercise({ target_form: 'избежать' })]
    });
    mode.init(1);

    elements.get('productionInput').value = 'Я избежал этой ошибки.';
    mode.submitAnswer();

    assert.equal(attempts[0].result, 'target_not_detected');
    assert.equal(elements.get('productionFeedback').dataset.result, 'target_not_detected');
    assert.match(elements.get('productionFeedback').textContent, /otomatik olarak tespit edemedim/u);
    assert.equal(elements.get('productionFeedback').textContent.includes('kullanmadın'), false);
});

test('does not create automatic Error Notebook grammar events for production observations', () => {
    const { mode, elements, notebookEvents } = loadProductionMode({ exercises: [createExercise()] });
    mode.init(1);

    elements.get('productionInput').value = 'Я избежать ошибка.';
    mode.submitAnswer();

    assert.equal(notebookEvents.length, 0);
});

test('supports an eligible phrase target without converting it to a lemma', () => {
    const { mode, elements, attempts } = loadProductionMode({
        exercises: [createExercise({
            lexical_unit_id: 'lu:phrase',
            sense_id: 'sense:phrase',
            exercise_id: 'exercise:lu:phrase:sense:phrase:target_word_sentence',
            target_form: 'Мир тесен',
            entry_type: 'phrase'
        })]
    });
    mode.init(1);

    elements.get('productionInput').value = 'Мир тесен.';
    mode.submitAnswer();

    assert.equal(attempts[0].result, 'completed');
    assert.equal(attempts[0].target_form, 'Мир тесен');
});
