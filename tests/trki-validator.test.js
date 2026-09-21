import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadValidator() {
    const source = fs.readFileSync(path.join(ROOT, 'js/trki-validator.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'trki-validator.js' });
    return window.TrkiValidator;
}

function createSourceCatalog() {
    return [{
        source_id: 'src:synthetic-trki-b1',
        document_id: 'doc:synthetic-trki-b1',
        version: '2026-09-fixture',
        title: 'Synthetic TRKI B1 fixture',
        publisher: 'Ru-Tr test fixture',
        source_type: 'synthetic',
        license: 'test-only',
        provenance_status: 'verified'
    }];
}

function createObjectiveExercise(overrides = {}) {
    return {
        exercise_id: 'trki:b1:reading:1',
        level: 'B1',
        section: 'reading',
        exercise_type: 'multiple_choice',
        prompt: 'Что произошло?',
        options: ['A', 'B', 'C', 'D'],
        answer_key: { option_index: 1 },
        numbering: { section_number: 1, item_number: 1 },
        passage_alignment: { passage_id: 'passage:1', paragraph_ids: ['p1'] },
        source_reference: {
            source_id: 'src:synthetic-trki-b1',
            document_id: 'doc:synthetic-trki-b1',
            version: '2026-09-fixture',
            locator: 'fixture/page/1/item/1'
        },
        verification_status: 'verified',
        exercise_eligible: true,
        scoring: { mode: 'objective', points: 1 },
        ...overrides
    };
}

test('accepts an objectively scoreable exercise only with verified source alignment', () => {
    const Validator = loadValidator();
    const validator = new Validator({ sourceCatalog: createSourceCatalog() });

    const result = validator.validateExercise(createObjectiveExercise());

    assert.equal(result.valid, true);
    assert.equal(result.objective_scoreable, true);
    assert.equal(result.errors.length, 0);
});

test('rejects objective eligibility when numbering, answer key, or passage alignment is incomplete', () => {
    const Validator = loadValidator();
    const validator = new Validator({ sourceCatalog: createSourceCatalog() });
    const exercise = createObjectiveExercise({
        numbering: null,
        answer_key: null,
        passage_alignment: null
    });

    const result = validator.validateExercise(exercise);

    assert.equal(result.valid, false);
    assert.equal(result.objective_scoreable, false);
    assert.deepEqual(Array.from(result.errors, error => error.code), [
        'numbering_required',
        'answer_key_required',
        'passage_alignment_required'
    ]);
});

test('keeps writing candidates practice-only even when a source is present', () => {
    const Validator = loadValidator();
    const validator = new Validator({ sourceCatalog: createSourceCatalog() });
    const exercise = createObjectiveExercise({
        exercise_id: 'trki:b1:writing:1',
        section: 'writing',
        exercise_type: 'writing_prompt',
        prompt: 'Опишите свой день.',
        options: undefined,
        answer_key: undefined,
        numbering: undefined,
        passage_alignment: undefined,
        scoring: { mode: 'practice_only' },
        verification_status: 'candidate',
        exercise_eligible: false,
        ai_candidate: true
    });

    const result = validator.validateExercise(exercise);

    assert.equal(result.valid, true);
    assert.equal(result.objective_scoreable, false);
    assert.equal(result.practice_only, true);
    assert.equal(result.errors.length, 0);
});

test('never accepts a verified exercise whose source identity does not match the catalog', () => {
    const Validator = loadValidator();
    const validator = new Validator({ sourceCatalog: createSourceCatalog() });
    const exercise = createObjectiveExercise({
        source_reference: {
            source_id: 'src:unknown',
            document_id: 'doc:unknown',
            version: 'unknown',
            locator: 'unknown'
        }
    });

    const result = validator.validateExercise(exercise);

    assert.equal(result.valid, false);
    assert.equal(result.objective_scoreable, false);
    assert.deepEqual(Array.from(result.errors, error => error.code), ['source_not_catalogued']);
});
