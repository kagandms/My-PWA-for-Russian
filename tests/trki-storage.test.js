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
        keys: () => [...values.keys()]
    };
}

test('adds only the three TRKI user namespaces to the normal backup allowlist', () => {
    const localStorage = createStorage();
    localStorage.setItem('ru_tr_trki_sessions_v1', '{}');
    localStorage.setItem('ru_tr_trki_attempts_v1', '{}');
    localStorage.setItem('ru_tr_trki_profile_v1', '{}');
    localStorage.setItem('ru_tr_trki_listening_sessions_v1', '{"restricted":true}');
    localStorage.setItem('ru_tr_trki_listening_attempts_v1', '{"restricted":true}');
    localStorage.setItem('ru_tr_trki_source_content_v1', 'restricted');
    const window = { localStorage, WORDS: [] };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/storage.js'), 'utf8'), {
        window, globalThis: window, localStorage, console
    }, { filename: 'storage.js' });

    assert.deepEqual(
        Array.from(window.storageManager.userDataKeys.filter(key => key.startsWith('ru_tr_trki_'))),
        ['ru_tr_trki_sessions_v1', 'ru_tr_trki_attempts_v1', 'ru_tr_trki_profile_v1']
    );
    assert.deepEqual(JSON.parse(JSON.stringify(window.storageManager.createUserDataSnapshot().data)), {
        ru_tr_trki_sessions_v1: '{}',
        ru_tr_trki_attempts_v1: '{}',
        ru_tr_trki_profile_v1: '{}'
    });
    assert.equal(window.storageManager.userDataKeys.includes('ru_tr_trki_source_content_v1'), false);
    assert.equal(window.storageManager.userDataKeys.includes('ru_tr_trki_listening_sessions_v1'), false);
    assert.equal(window.storageManager.userDataKeys.includes('ru_tr_trki_listening_attempts_v1'), false);
});
