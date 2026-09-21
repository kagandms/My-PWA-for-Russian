import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadRepository() {
    const validatorSource = fs.readFileSync(path.join(ROOT, 'js/trki-validator.js'), 'utf8');
    const repositorySource = fs.readFileSync(path.join(ROOT, 'js/trki-repository.js'), 'utf8');
    const window = {};
    vm.runInNewContext(validatorSource, { window, globalThis: window, console }, { filename: 'trki-validator.js' });
    vm.runInNewContext(repositorySource, { window, globalThis: window, console }, { filename: 'trki-repository.js' });
    return window.TrkiRepository;
}

function createSource() {
    return {
        source_id: 'src:synthetic-trki-b1',
        document_id: 'doc:synthetic-trki-b1',
        version: '2026-09-fixture',
        title: 'Synthetic TRKI B1 fixture',
        publisher: 'Ru-Tr test fixture',
        source_type: 'synthetic',
        license: 'test-only',
        provenance_status: 'verified'
    };
}

function createExercise(overrides = {}) {
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
        verification_status: 'candidate',
        exercise_eligible: false,
        scoring: { mode: 'objective', points: 1 },
        ...overrides
    };
}

test('loads source-catalogued exercises and exposes only verified eligible objective content for scoring', () => {
    const Repository = loadRepository();
    const repository = new Repository();
    repository.loadFromArtifacts({ sourceCatalog: [createSource()], exercises: [
        createExercise(),
        createExercise({ exercise_id: 'trki:b1:reading:2', verification_status: 'verified', exercise_eligible: true })
    ] });

    assert.equal(repository.getSourceCatalog().length, 1);
    assert.equal(repository.getAllExercises().length, 2);
    assert.deepEqual(Array.from(repository.getObjectiveExercises(), item => item.exercise_id), ['trki:b1:reading:2']);
    assert.deepEqual(Array.from(repository.getPracticeExercises(), item => item.exercise_id), ['trki:b1:reading:1']);
});

test('promotes a structurally valid candidate to verified objective content with review provenance', () => {
    const Repository = loadRepository();
    const repository = new Repository({ now: () => '2026-09-21T10:00:00.000Z' });
    repository.loadFromArtifacts({ sourceCatalog: [createSource()], exercises: [createExercise()] });

    const promoted = repository.promoteCandidate('trki:b1:reading:1', {
        reviewer_id: 'reviewer:test',
        decision: 'verified'
    });

    assert.equal(promoted.verification_status, 'verified');
    assert.equal(promoted.exercise_eligible, true);
    assert.deepEqual(JSON.parse(JSON.stringify(promoted.review)), {
        reviewer_id: 'reviewer:test',
        decision: 'verified',
        reviewed_at: '2026-09-21T10:00:00.000Z'
    });
    assert.equal(repository.getObjectiveExercises().length, 1);
});

test('keeps writing candidates practice-only and rejects an attempt to promote them into scoring', () => {
    const Repository = loadRepository();
    const repository = new Repository();
    repository.loadFromArtifacts({ sourceCatalog: [createSource()], exercises: [createExercise({
        exercise_id: 'trki:b1:writing:1',
        section: 'writing',
        exercise_type: 'writing_prompt',
        prompt: 'Опишите свой день.',
        answer_key: undefined,
        numbering: undefined,
        passage_alignment: undefined,
        scoring: { mode: 'practice_only' },
        ai_candidate: true
    })] });

    assert.throws(() => repository.promoteCandidate('trki:b1:writing:1', {
        reviewer_id: 'reviewer:test',
        decision: 'verified'
    }), /practice-only/u);
    assert.equal(repository.getObjectiveExercises().length, 0);
    assert.equal(repository.getPracticeExercises().length, 1);
});

test('rejects duplicate exercise identities and unverified source identities at load time', () => {
    const Repository = loadRepository();
    const repository = new Repository();
    const source = createSource();

    assert.throws(() => repository.loadFromArtifacts({
        sourceCatalog: [source],
        exercises: [createExercise(), createExercise()]
    }), /Duplicate TRKI exercise ID/u);

    assert.throws(() => repository.loadFromArtifacts({
        sourceCatalog: [{ ...source, provenance_status: 'candidate' }],
        exercises: [createExercise({ verification_status: 'verified', exercise_eligible: true })]
    }), /verified source catalog/u);
});

test('loads versioned source catalog and exercise artifacts through the bound fetch implementation', async () => {
    const Repository = loadRepository();
    const sourceCatalog = [createSource()];
    const exercises = [createExercise({ verification_status: 'verified', exercise_eligible: true })];
    const window = {};
    const validatorSource = fs.readFileSync(path.join(ROOT, 'js/trki-validator.js'), 'utf8');
    const repositorySource = fs.readFileSync(path.join(ROOT, 'js/trki-repository.js'), 'utf8');
    window.fetch = requestedPath => Promise.resolve({
        ok: true,
        json: async () => String(requestedPath).includes('source-catalog')
            ? { schema_version: 1, artifact: 'trki-source-catalog', sources: sourceCatalog }
            : { schema_version: 1, artifact: 'trki-exercises', exercises }
    });
    const context = { window, globalThis: window, console, Promise, structuredClone };
    vm.runInNewContext(validatorSource, context, { filename: 'trki-validator.js' });
    vm.runInNewContext(repositorySource, context, { filename: 'trki-repository.js' });
    const repository = new window.TrkiRepository();

    const result = await repository.load();

    assert.equal(result.source_count, 1);
    assert.deepEqual(Array.from(repository.getObjectiveExercises(), item => item.exercise_id), ['trki:b1:reading:1']);
});
