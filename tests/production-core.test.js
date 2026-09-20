import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/production-core.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'production-core.js' });
    return window.ProductionCore;
}

test('detects an exact canonical lemma', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'учиться', userAnswer: 'Я хочу учиться каждый день.' });

    assert.equal(result.result, 'completed');
});

test('detects an exact standalone Russian target', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'мир', userAnswer: 'Мир важен для всех.' });

    assert.equal(result.result, 'completed');
});

test('detects an exact canonical phrase', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'обращать внимание', userAnswer: 'Нужно обращать внимание на детали.' });

    assert.equal(result.result, 'completed');
});

test('returns empty_answer for blank input', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'учиться', userAnswer: '   ' });

    assert.equal(result.result, 'empty_answer');
});

test('normalizes case whitespace punctuation and ё/е', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'ёлка', userAnswer: '  Я   вижу ЕЛКА!  ' });

    assert.equal(result.result, 'completed');
});

test('does not infer an inflected verb form', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'избежать', userAnswer: 'Я избежал этой ошибки.' });

    assert.equal(result.result, 'target_not_detected');
    assert.notEqual(result.result, 'target_missing');
    assert.notEqual(result.result, 'wrong');
});

test('completed reports canonical presence without claiming grammatical correctness', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'избежать', userAnswer: 'Я избежать ошибка.' });

    assert.equal(result.result, 'completed');
});

test('does not infer a transformed phrase', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'обращать внимание', userAnswer: 'Я обратил внимание на эту проблему.' });

    assert.equal(result.result, 'target_not_detected');
    assert.notEqual(result.result, 'wrong');
});

test('does not match a canonical word inside another word', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'дом', userAnswer: 'Я иду домой.' });

    assert.equal(result.result, 'target_not_detected');
});

test('does not treat мир inside мировой as a completed target', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: 'мир', userAnswer: 'Это мировой рынок.' });

    assert.equal(result.result, 'target_not_detected');
});

test('returns needs_review for a malformed target', () => {
    const core = loadCore();

    const result = core.evaluateTargetPresence({ targetForm: '', userAnswer: 'Любой текст.' });

    assert.equal(result.result, 'needs_review');
});
