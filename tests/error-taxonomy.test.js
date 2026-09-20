import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadTaxonomy() {
    const source = fs.readFileSync(path.join(ROOT, 'js/error-taxonomy.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'error-taxonomy.js' });
    return window.ErrorTaxonomy;
}

test('defines neutral recall mismatch and explicit case taxonomy values', () => {
    const taxonomy = loadTaxonomy();

    assert.equal(taxonomy.VERSION, 1);
    assert.ok(taxonomy.ERROR_TYPES.includes('recall.mismatch'));
    assert.ok(taxonomy.ERROR_TYPES.includes('case.genitive'));
    assert.ok(taxonomy.ERROR_TYPES.includes('case.prepositional'));
    assert.equal(taxonomy.ERROR_TYPES.includes('case.*'), false);
    assert.equal(taxonomy.getGrammarTopic('case.genitive'), 'cases.genitive');
});

test('rejects wildcard case values and keeps detection separate from verification', () => {
    const taxonomy = loadTaxonomy();

    assert.throws(() => taxonomy.assertErrorType('case.*'), /Unsupported error type/u);
    assert.doesNotThrow(() => taxonomy.assertDetectionMethod('deterministic'));
    assert.doesNotThrow(() => taxonomy.assertVerificationStatus('candidate'));
    assert.throws(() => taxonomy.assertVerificationStatus('deterministic'), /Unsupported verification status/u);
});
