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
        setItem: (key, value) => values.set(key, String(value))
    };
}

test('stores versioned grammar attempts without touching skill progress', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/grammar-progress.js'), 'utf8');
    const storage = createStorage();
    const window = { localStorage: storage, console };
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'grammar-progress.js' });
    const store = new window.GrammarProgressStore({ storage, now: () => '2026-09-20T10:00:00.000Z', idFactory: () => 'grammar-event:1' });

    const event = store.recordAttempt({
        exercise_id: 'grammar:1',
        grammar_topic: 'cases.genitive',
        result: 'incorrect',
        user_answer: 'дом',
        expected_answers: ['дома'],
        timestamp: '2026-09-20T09:00:00.000Z'
    });

    assert.equal(event.event_id, 'grammar-event:1');
    assert.equal(store.getAttempts().length, 1);
    assert.equal(storage.getItem('ru_tr_skill_progress_v1'), null);
});
