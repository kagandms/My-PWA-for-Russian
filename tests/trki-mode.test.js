import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createElement(id) {
    return {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
        children: [],
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(type, handler) { this[`on${type}`] = handler; },
        appendChild(child) { this.children.push(child); },
        focus() {}
    };
}

function loadMode({ exercises, attempts, profiles, notebook }) {
    const ids = [
        'trkiStartPanel', 'trkiExercisePanel', 'trkiCompletionPanel', 'trkiLevel', 'trkiSection', 'trkiStudyStart',
        'trkiExamStart', 'trkiStatus', 'trkiProgress', 'trkiTimer', 'trkiSectionLabel', 'trkiSourceMeta', 'trkiPrompt', 'trkiPassage',
        'trkiOptions', 'trkiWritingInput', 'trkiWritingMeta', 'trkiWritingCount', 'trkiSubmit', 'trkiPause', 'trkiFeedback', 'trkiNext', 'trkiSummary', 'trkiRestart'
    ];
    const elements = new Map(ids.map(id => [id, createElement(id)]));
    const document = {
        getElementById: id => elements.get(id) || null,
        createElement: tag => {
            const element = createElement(tag);
            element.tagName = tag;
            return element;
        }
    };
    const session = { session_id: 'session:trki:1', session_status: 'active', current_index: 0, planned_items: exercises };
    const sessionStore = {
        createSession: ({ planned_items }) => ({ ...session, planned_items }),
        getElapsedSeconds: () => 2,
        pause: () => ({ ...session, session_status: 'paused' }),
        resume: () => ({ ...session, session_status: 'active' }),
        complete: () => ({ ...session, session_status: 'completed' })
    };
    const window = {
        document,
        trkiRepository: {
            getAllExercises: () => exercises,
            getObjectiveExercises: () => exercises.filter(exercise => exercise.exercise_eligible),
            getPracticeExercises: () => exercises.filter(exercise => !exercise.exercise_eligible)
        },
        trkiSessionStore: sessionStore,
        trkiAttemptStore: { recordAttempt: attempt => { attempts.push(attempt); return attempt; } },
        trkiProfileStore: { applyAttempt: attempt => profiles.push(attempt) },
        TrkiErrorBridge: { createNotebookError: ({ exercise, attempt }) => exercise.error_mapping ? { exercise, attempt } : null },
        errorNotebookStore: { recordError: error => notebook.push(error) },
        setInterval: () => 1,
        clearInterval() {}
    };
    const source = fs.readFileSync(path.join(ROOT, 'js/trki-mode.js'), 'utf8');
    vm.runInNewContext(source, { window, globalThis: window, document, console }, { filename: 'trki-mode.js' });
    return { window, elements };
}

function createObjective() {
    return {
        exercise_id: 'trki:b1:grammar:1', level: 'B1', section: 'grammar', exercise_type: 'multiple_choice',
        prompt: 'У меня нет ___', options: ['времени', 'время'], answer_key: { option_index: 0 },
        source_reference: { source_id: 'src:test' }, verification_status: 'verified', exercise_eligible: true,
        scoring: { mode: 'objective', points: 1 }, error_mapping: { error_type: 'trki.grammar.case.genitive' }
    };
}

function createWriting() {
    return {
        exercise_id: 'trki:b1:writing:1', level: 'B1', section: 'writing', exercise_type: 'writing_prompt',
        prompt: 'Опишите свой день.', source_reference: { source_id: 'src:test' }, verification_status: 'candidate',
        exercise_eligible: false, scoring: { mode: 'practice_only' }
    };
}

test('records a deterministic TRKI objective attempt and sends only mapped errors to Error Notebook', () => {
    const attempts = [];
    const profiles = [];
    const notebook = [];
    const { window, elements } = loadMode({ exercises: [createObjective()], attempts, profiles, notebook });
    window.trkiController.init();
    elements.get('trkiStudyStart').onclick();
    elements.get('trkiOptions').children[1].onclick();
    elements.get('trkiSubmit').onclick();

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].scoring_status, 'scored');
    assert.equal(attempts[0].objective_scoreable, true);
    assert.equal(profiles.length, 1);
    assert.equal(notebook.length, 1);
    assert.match(elements.get('trkiSourceMeta').textContent, /src:test.*verified.*objective/u);
});

test('records writing as practice-only and does not create scoring or Error Notebook side effects', () => {
    const attempts = [];
    const profiles = [];
    const notebook = [];
    const { window, elements } = loadMode({ exercises: [createWriting()], attempts, profiles, notebook });
    window.trkiController.init();
    elements.get('trkiSection').value = 'writing';
    elements.get('trkiStudyStart').onclick();
    elements.get('trkiWritingInput').value = 'Сегодня я работал и читал.';
    elements.get('trkiWritingInput').oninput();
    elements.get('trkiSubmit').onclick();

    assert.equal(elements.get('trkiWritingCount').textContent, 'Kelime sayısı: 5');
    assert.equal(attempts[0].scoring_status, 'practice_only');
    assert.equal(attempts[0].score, null);
    assert.equal(attempts[0].mastery_eligible, false);
    assert.equal(attempts[0].adaptive_eligible, false);
    assert.equal(notebook.length, 0);
    assert.equal(profiles.length, 1);
});

test('disables pause for exam sessions', () => {
    const { window, elements } = loadMode({ exercises: [createObjective()], attempts: [], profiles: [], notebook: [] });
    window.trkiController.init();
    elements.get('trkiExamStart').onclick();

    assert.equal(elements.get('trkiPause').disabled, true);
    assert.equal(elements.get('trkiTimer').textContent, 'Süre: 00:02');
});

test('keeps exam feedback neutral until the session is completed', () => {
    const { window, elements } = loadMode({ exercises: [createObjective()], attempts: [], profiles: [], notebook: [] });
    window.trkiController.init();
    elements.get('trkiExamStart').onclick();
    elements.get('trkiOptions').children[1].onclick();
    elements.get('trkiSubmit').onclick();

    assert.match(elements.get('trkiFeedback').textContent, /Yanıt kaydedildi/u);
    assert.doesNotMatch(elements.get('trkiFeedback').textContent, /Doğru seçenek/u);
    assert.doesNotMatch(elements.get('trkiFeedback').textContent, /времени/u);
});
