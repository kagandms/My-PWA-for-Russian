import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

test('Grammar Lab records verified eligible attempts in its grammar store', () => {
    const progressSource = fs.readFileSync(path.join(ROOT, 'js/grammar-progress.js'), 'utf8');
    const modeSource = fs.readFileSync(path.join(ROOT, 'js/grammar-lab-mode.js'), 'utf8');
    const elements = new Map([
        ['grammarLabSubmit', { onclick: null }],
        ['grammarLabPrompt', { textContent: '' }],
        ['grammarLabInput', { value: 'дом', disabled: false }],
        ['grammarLabFeedback', { textContent: '', dataset: {} }],
        ['grammarLabProgress', { textContent: '' }]
    ]);
    const attempts = [];
    const window = {
        localStorage: { getItem: () => null, setItem: () => undefined },
        grammarRepository: {
            getScoredExercises: () => [{
                exercise_id: 'grammar:1',
                grammar_topic: 'cases.genitive',
                prompt: '...',
                accepted_answers: ['дома'],
                source: 'fixture',
                verification_status: 'verified',
                exercise_eligible: true
            }]
        },
        GrammarLabCore: {
            evaluateAnswer: () => ({ result: 'incorrect', isCorrect: false, expected_answers: ['дома'] })
        }
    };
    const context = { window, globalThis: window, console, document: { getElementById: id => elements.get(id) } };
    vm.runInNewContext(progressSource, context, { filename: 'grammar-progress.js' });
    window.grammarProgressStore = { recordAttempt: attempt => attempts.push(attempt) };
    vm.runInNewContext(modeSource, context, { filename: 'grammar-lab-mode.js' });

    window.grammarLabMode.init();
    elements.get('grammarLabSubmit').onclick();

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].exercise_id, 'grammar:1');
    assert.equal(attempts[0].result, 'incorrect');
});
