import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/grammar-lab-core.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'grammar-lab-core.js' });
    return window.GrammarLabCore;
}

test('accepts only a normalized exact answer from the exercise answer key', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({
        exercise: { accepted_answers: ['времени'] },
        userAnswer: '  ВРЕМЕНИ  '
    });

    assert.equal(result.result, 'correct');
    assert.equal(result.isCorrect, true);
});

test('does not infer a grammar answer from an unlisted form', () => {
    const core = loadCore();

    const result = core.evaluateAnswer({
        exercise: { accepted_answers: ['времени'] },
        userAnswer: 'время'
    });

    assert.equal(result.result, 'incorrect');
    assert.equal(result.isCorrect, false);
});
