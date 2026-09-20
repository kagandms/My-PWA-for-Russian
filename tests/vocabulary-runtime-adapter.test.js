import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadRepository() {
    const source = fs.readFileSync(path.join(ROOT, 'js/vocabulary-repository.js'), 'utf8');
    const files = [
        'data/vocabulary/lexical-units.v1.json',
        'data/vocabulary/enrichment.v1b.json',
        'data/vocabulary/enrichment-corpus.v1b.json',
        'data/vocabulary/enrichment-corpus-quality.v1b3.json',
        'data/vocabulary/legacy-identity-map.v1.json'
    ];
    const fixtures = Object.fromEntries(files.map(file => [file, JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))]));
    const window = { VOCABULARY_RUNTIME_CONFIG: { USE_VOCABULARY_V1: true } };
    const context = {
        window,
        globalThis: window,
        console,
        structuredClone: globalThis.structuredClone,
        Promise,
        URL,
        fetch: async requestedPath => ({
            ok: true,
            status: 200,
            json: async () => fixtures[String(requestedPath).replace(/^\.\//u, '')]
        })
    };
    vm.runInNewContext(source, context, { filename: 'vocabulary-repository.js' });
    return window.vocabularyRepository;
}

test('builds the legacy WORDS shape from the identity map without losing source rows', async () => {
    const repository = loadRepository();

    await repository.load();
    const words = repository.buildLegacyWords({
        sentencesDb: { '1': [{ ru: 'Мир тесен.', tr: 'Dünya küçük.' }] },
        categoryResolver: () => 'Kategorize Edilmemiş',
        storageKeyBuilder: word => `word:${word.russian}::${word.turkish}`
    });

    assert.equal(words.length, 2339);
    assert.equal(words[0].id, 1);
    assert.equal(words[0].lexicalUnitId, 'lu:0dae100e5b16e427dfbd');
    assert.equal(words[0].entryType, 'phrase');
    assert.deepEqual(words[0].sentences, [{ ru: 'Мир тесен.', tr: 'Dünya küçük.' }]);
    assert.ok(words.some(word => word.entryType === 'proverb'));
    assert.ok(words.some(word => word.entryType === 'sentence'));
});
