import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('Production Mode uses the Phase 2B runtime surface without legacy production.js', () => {
    const indexHtml = readProjectFile('index.html');
    const appSource = readProjectFile('js/app.js');
    const serviceWorker = readProjectFile('sw.js');

    assert.equal(indexHtml.includes('data-mode="production"'), true);
    assert.equal(indexHtml.includes('id="productionMode"'), true);
    assert.equal(indexHtml.includes('js/production-core.js'), true);
    assert.equal(indexHtml.includes('js/production-mode.js'), true);
    assert.equal(indexHtml.includes('js/production.js'), false);
    assert.equal(appSource.includes("case 'production'"), true);
    assert.equal(serviceWorker.includes('./js/production-core.js'), true);
    assert.equal(serviceWorker.includes('./js/production-mode.js'), true);
    assert.equal(serviceWorker.includes('./js/production.js'), false);
});

test('removed quiz modes have no orphaned UI or navigation references', () => {
    const indexHtml = readProjectFile('index.html');
    const appSource = readProjectFile('js/app.js');
    const serviceWorker = readProjectFile('sw.js');

    for (const modeName of ['typing', 'fullchoicequiz']) {
        assert.equal(indexHtml.includes(`${modeName}Mode`), false);
        assert.equal(appSource.includes(modeName), false);
    }

    assert.equal(serviceWorker.includes('./js/typing.js'), false);
    assert.equal(serviceWorker.includes('./js/full-choice-quiz.js'), false);
});

test('runtime uses the strict dictionary and sentence database', () => {
    const dataSource = readProjectFile('js/data.js');
    const serviceWorker = readProjectFile('sw.js');

    assert.match(dataSource, /fetch\(['"]kelimeler_tam_strict\.txt['"]\)/);
    assert.match(dataSource, /fetch\(['"]sentences_strict\.json['"]\)/);
    assert.match(serviceWorker, /['"]\.\/kelimeler_tam_strict\.txt['"]/);
    assert.match(serviceWorker, /['"]\.\/sentences_strict\.json['"]/);
});

test('strict data files stay aligned and every sentence is bilingual', () => {
    const wordCount = readProjectFile('kelimeler_tam_strict.txt')
        .split(/\r?\n/)
        .filter(Boolean)
        .length;
    const sentences = JSON.parse(readProjectFile('sentences_strict.json'));

    assert.equal(Object.keys(sentences).length, wordCount);
    for (const rows of Object.values(sentences)) {
        assert.ok(Array.isArray(rows));
        for (const row of rows) {
            assert.equal(typeof row.ru, 'string');
            assert.equal(typeof row.tr, 'string');
        }
    }
});

test('verified Russian spelling corrections remain in the strict dictionary', () => {
    const lines = readProjectFile('kelimeler_tam_strict.txt').split(/\r?\n/);

    assert.equal(lines[158].split(' : ')[0], 'Ни бе ни ме ни кукареку');
    assert.equal(lines[764].split(' : ')[0], 'Писька');
    assert.equal(lines[1191].split(' : ')[0], 'Приемлемый');
    assert.equal(lines[1368].split(' : ')[0], 'Кофеёчек');
});

test('cloud sync does not ship a shared client secret or endpoint', () => {
    const storageSource = readProjectFile('js/storage.js');
    const syncEndpoint = path.join(ROOT, 'api/sync.js');

    assert.equal(storageSource.includes('kagan_gizli_sifre_123'), false);
    assert.equal(storageSource.includes("'/api/sync'"), false);
    assert.equal(fs.existsSync(syncEndpoint), false);
});

test('service worker has only existing assets and refreshes exact cache keys', () => {
    const serviceWorker = readProjectFile('sw.js');
    const assetsBlock = serviceWorker.match(/const ASSETS = \[(.*?)\];/s)?.[1] || '';
    const assetMatches = [...assetsBlock.matchAll(/^\s*['"](\.\/[^'"]+)['"],?$/gm)];
    const assetPaths = assetMatches.map(match => match[1]);

    for (const match of assetMatches) {
        assert.equal(fs.existsSync(path.join(ROOT, match[1].slice(2))), true, `missing ${match[1]}`);
    }

    assert.equal(new Set(assetPaths).size, assetPaths.length);
    assert.doesNotMatch(serviceWorker, /getAssetRequest|searchParams\.set\(['"]v['"]/);
});

test('category study launches flashcards with the selected words', () => {
    const categoriesSource = readProjectFile('js/categories.js');

    assert.match(categoriesSource, /app\.openMode\(['"]flashcard['"],\s*\{\s*customWordList:/s);
    assert.equal(categoriesSource.includes('Üniteleri Flashcard vb. diğer modlarla bağlama'), false);
});

test('prefixes script is included exactly once', () => {
    const indexHtml = readProjectFile('index.html');
    const includes = indexHtml.match(/<script\s+src=["']js\/prefixes-mode\.js["']\s*><\/script>/g) || [];

    assert.equal(includes.length, 1);
});
