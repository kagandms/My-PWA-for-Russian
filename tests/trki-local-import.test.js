import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadImport() {
    const source = fs.readFileSync(path.join(ROOT, 'js/trki-local-import.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'trki-local-import.js' });
    return window.TrkiLocalImport;
}

function createBundle(overrides = {}) {
    return {
        schema_version: 1,
        artifact: 'trki-local-candidate-bundle',
        source_catalog: [{
            source_id: 'src:local:1', document_id: 'doc:local:1', version: 'v1', title: 'My notes',
            publisher: 'user', source_type: 'local_user', license: 'user-owned', provenance_status: 'candidate'
        }],
        exercises: [{
            exercise_id: 'trki:local:1', level: 'B1', section: 'grammar', exercise_type: 'multiple_choice',
            prompt: 'candidate', answer_key: { option_index: 0 }, numbering: { section_number: 1, item_number: 1 },
            source_reference: { source_id: 'src:local:1', document_id: 'doc:local:1', version: 'v1', locator: 'notes/1' },
            verification_status: 'candidate', exercise_eligible: false, scoring: { mode: 'objective', points: 1 }
        }],
        ...overrides
    };
}

test('imports and exports only explicitly local candidate content', () => {
    const Importer = loadImport();
    const loaded = [];
    const importer = new Importer({ repository: {
        loadFromArtifacts: artifacts => { loaded.push(artifacts); return { source_count: 1, exercise_count: 1 }; },
        getSourceCatalog: () => createBundle().source_catalog,
        getAllExercises: () => createBundle().exercises
    } });

    const result = importer.importBundle(createBundle());
    const exported = importer.exportBundle();

    assert.equal(result.exercise_count, 1);
    assert.equal(loaded.length, 1);
    assert.equal(exported.artifact, 'trki-local-candidate-bundle');
    assert.equal(exported.exercises[0].verification_status, 'candidate');
    assert.equal(exported.exercises[0].exercise_eligible, false);
});

test('rejects remote or verified content in the restricted local import path', () => {
    const Importer = loadImport();
    const importer = new Importer({ repository: { loadFromArtifacts() {} } });

    assert.throws(() => importer.importBundle(createBundle({
        source_catalog: [{ ...createBundle().source_catalog[0], source_type: 'official' }]
    })), /local_user or synthetic/u);
    assert.throws(() => importer.importBundle(createBundle({
        exercises: [{ ...createBundle().exercises[0], verification_status: 'verified', exercise_eligible: true }]
    })), /candidate and not eligible/u);
});
