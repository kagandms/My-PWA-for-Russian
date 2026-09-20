import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('exposes Phase 3 Error Notebook and Grammar Lab without changing existing learning modes', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

    assert.match(indexHtml, /data-mode="errorNotebook"/u);
    assert.match(indexHtml, /data-mode="grammarLab"/u);
    assert.match(indexHtml, /id="errorNotebookMode"/u);
    assert.match(indexHtml, /id="grammarLabMode"/u);
    assert.match(indexHtml, /js\/error-taxonomy\.js/u);
    assert.match(indexHtml, /js\/error-notebook-core\.js/u);
    assert.match(indexHtml, /js\/error-notebook\.js/u);
    assert.match(indexHtml, /js\/grammar-repository\.js/u);
    assert.match(indexHtml, /js\/grammar-lab-core\.js/u);
    assert.match(appSource, /case ['"]errorNotebook['"]/u);
    assert.match(appSource, /case ['"]grammarLab['"]/u);
    assert.match(appSource, /grammarRepository\?\.load/u);
});
