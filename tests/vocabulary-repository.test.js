import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadRepository(fetchImpl, config = {}) {
    const source = fs.readFileSync(path.join(ROOT, 'js/vocabulary-repository.js'), 'utf8');
    const window = { VOCABULARY_RUNTIME_CONFIG: config };
    const context = {
        window,
        globalThis: window,
        console,
        structuredClone: globalThis.structuredClone,
        fetch: fetchImpl,
        Promise,
        URL
    };
    vm.runInNewContext(source, context, { filename: 'vocabulary-repository.js' });
    return window.vocabularyRepository;
}

function createFetch(fixtures) {
    return async requestedPath => {
        const key = String(requestedPath).replace(/^\.\//u, '');
        if (!fixtures[key]) return { ok: false, status: 404, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => fixtures[key] };
    };
}

function readFixtures() {
    const files = [
        'data/vocabulary/lexical-units.v1.json',
        'data/vocabulary/enrichment.v1b.json',
        'data/vocabulary/enrichment-corpus.v1b.json',
        'data/vocabulary/enrichment-corpus-quality.v1b3.json',
        'data/vocabulary/legacy-identity-map.v1.json'
    ];
    return Object.fromEntries(files.map(file => [file, JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))]));
}

test('loads v1 artifacts and preserves lookup and non-lemma entry types', async () => {
    const repository = loadRepository(createFetch(readFixtures()));

    const loaded = await repository.load();
    const phrase = repository.findBySurfaceForm('Мир тесен')[0];

    assert.equal(loaded, true);
    assert.equal(repository.getDiagnostics().mode, 'v1');
    assert.equal(phrase.entry_type, 'phrase');
    assert.equal(repository.getSensesForLexicalUnit(phrase.id).length, 1);
});

test('binds a window-owned fetch implementation before loading browser artifacts', async () => {
    const fixtures = readFixtures();
    let receiver = null;
    const window = {
        fetch(requestedPath) {
            receiver = this;
            const key = String(requestedPath).replace(/^\.\//u, '');
            if (!fixtures[key]) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
            return Promise.resolve({ ok: true, status: 200, json: async () => fixtures[key] });
        }
    };
    const source = fs.readFileSync(path.join(ROOT, 'js/vocabulary-repository.js'), 'utf8');
    const context = { window, globalThis: window, console, structuredClone: globalThis.structuredClone, Promise, URL };
    vm.runInNewContext(source, context, { filename: 'vocabulary-repository.js' });

    const loaded = await window.vocabularyRepository.load();

    assert.equal(loaded, true);
    assert.equal(receiver, window);
});

test('keeps candidate enrichment out of exercise-eligible data', async () => {
    const repository = loadRepository(createFetch(readFixtures()));

    await repository.load();
    const enrichment = repository.getEnrichment('lu:0dbdc08f0f476bc09a40');
    const exerciseData = repository.getExerciseEligibleData('lu:0dbdc08f0f476bc09a40');

    assert.ok(enrichment.records.length > 0);
    assert.ok(enrichment.records.every(record => record.verification_status === 'candidate'));
    assert.deepEqual(exerciseData.enrichment, []);
});

test('builds Typed Recall questions only from eligible canonical senses', async () => {
    const fixtures = readFixtures();
    const repository = loadRepository(createFetch(fixtures));

    await repository.load();
    const questions = repository.getTypedRecallQuestions();

    assert.equal(questions.length, 2011);
    assert.ok(questions.every(question => question.lexical_unit_id && question.sense_id));
    assert.ok(questions.every(question => question.accepted_answers.length > 0));
    assert.ok(questions.every(question => question.entry_type === 'lemma'));
    assert.ok(questions.every(question => question.other_senses.every(sense => sense.sense_id !== question.sense_id)));
});

test('builds a Typed Recall question for an eligible canonical phrase from surface_form', async () => {
    const fixtures = readFixtures();
    const phrase = fixtures['data/vocabulary/lexical-units.v1.json'].lexical_units.find(unit => unit.entry_type === 'phrase');
    phrase.verification_status = 'reviewed';
    phrase.exercise_eligible = true;
    phrase.senses[0].verification_status = 'reviewed';
    phrase.senses[0].exercise_eligible = true;
    const repository = loadRepository(createFetch(fixtures));

    await repository.load();
    const question = repository.getTypedRecallQuestions().find(item => item.lexical_unit_id === phrase.id);

    assert.equal(question.entry_type, 'phrase');
    assert.equal(question.prompt, phrase.senses[0].definitions.join('; '));
    assert.deepEqual(question.accepted_answers, [phrase.surface_form]);
    assert.equal(question.accepted_answers.includes('Dünya küçük'), false);
});

test('builds Production exercises from canonical lemma targets', async () => {
    const repository = loadRepository(createFetch(readFixtures()));

    await repository.load();
    const exercises = repository.getProductionExercises();

    assert.equal(exercises.length, 2011);
    assert.ok(exercises.every(exercise => exercise.skill === 'production'));
    assert.ok(exercises.every(exercise => exercise.exercise_type === 'target_word_sentence'));
    assert.ok(exercises.every(exercise => exercise.exercise_eligible === true));
    assert.ok(exercises.every(exercise => exercise.target_form));
    assert.ok(exercises.every(exercise => exercise.entry_type === 'lemma'));
});

test('builds a Production exercise for an explicitly eligible phrase surface_form', async () => {
    const fixtures = readFixtures();
    const phrase = fixtures['data/vocabulary/lexical-units.v1.json'].lexical_units.find(unit => unit.entry_type === 'phrase');
    phrase.verification_status = 'reviewed';
    phrase.exercise_eligible = true;
    phrase.senses[0].verification_status = 'reviewed';
    phrase.senses[0].exercise_eligible = true;
    const repository = loadRepository(createFetch(fixtures));

    await repository.load();
    const exercise = repository.getProductionExercises().find(item => item.lexical_unit_id === phrase.id);

    assert.equal(exercise.entry_type, 'phrase');
    assert.equal(exercise.target_form, phrase.surface_form);
    assert.equal(exercise.target_form, 'Мир тесен');
    assert.equal(exercise.prompt, phrase.senses[0].definitions.join('; '));
});

test('does not use candidate enrichment values as Production targets', async () => {
    const fixtures = readFixtures();
    const repository = loadRepository(createFetch(fixtures));
    const candidateValues = fixtures['data/vocabulary/enrichment-corpus.v1b.json'].records
        .map(record => typeof record.value === 'string' ? record.value : null)
        .filter(Boolean);

    await repository.load();
    const exercises = repository.getProductionExercises();

    assert.equal(candidateValues.some(value => exercises.some(exercise => exercise.target_form === value)), false);
});

test('does not use candidate enrichment values as Typed Recall answers', async () => {
    const fixtures = readFixtures();
    const repository = loadRepository(createFetch(fixtures));
    const candidateValues = fixtures['data/vocabulary/enrichment-corpus.v1b.json'].records
        .map(record => typeof record.value === 'string' ? record.value : null)
        .filter(Boolean);

    await repository.load();
    const questions = repository.getTypedRecallQuestions();
    const acceptedAnswers = questions.flatMap(question => question.accepted_answers);

    assert.equal(candidateValues.some(value => acceptedAnswers.includes(value)), false);
});

test('keeps base sense definitions authoritative when an overlay contains a conflicting field', async () => {
    const fixtures = readFixtures();
    const unit = fixtures['data/vocabulary/lexical-units.v1.json'].lexical_units[0];
    fixtures['data/vocabulary/enrichment.v1b.json'] = {
        ...fixtures['data/vocabulary/enrichment.v1b.json'],
        records: [{
            ...fixtures['data/vocabulary/enrichment.v1b.json'].records[0],
            lexical_unit_id: unit.id,
            sense_id: unit.senses[0].sense_id,
            definitions: ['overlay must not replace this']
        }]
    };
    const repository = loadRepository(createFetch(fixtures));
    const baseDefinitions = [...unit.senses[0].definitions];

    await repository.load();

    assert.deepEqual(repository.getSense(unit.senses[0].sense_id).definitions, baseDefinitions);
    assert.ok(repository.getDiagnostics().conflicts.some(conflict => conflict.reason === 'base_field_overwrite_blocked'));
});

test('reports validation failure instead of accepting dangling overlay references', async () => {
    const fixtures = readFixtures();
    fixtures['data/vocabulary/enrichment.v1b.json'] = {
        ...fixtures['data/vocabulary/enrichment.v1b.json'],
        records: [{
            ...fixtures['data/vocabulary/enrichment.v1b.json'].records[0],
            lexical_unit_id: 'lu:missing'
        }]
    };
    const repository = loadRepository(createFetch(fixtures));

    const loaded = await repository.load();
    const diagnostics = repository.getDiagnostics();

    assert.equal(loaded, false);
    assert.equal(diagnostics.mode, 'error');
    assert.match(diagnostics.error, /unknown lexical unit/u);
});

test('uses explicit legacy mode when the feature flag is disabled', async () => {
    const repository = loadRepository(async () => ({ ok: false, status: 500 }), { USE_VOCABULARY_V1: false });

    const loaded = await repository.load();

    assert.equal(loaded, false);
    assert.equal(repository.getDiagnostics().fallback_reason, 'feature_disabled');
});

test('legacy bridge reports the v1 failure and still loads the strict source', async () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
    const window = {
        storageManager: { buildWordStorageKey: word => `word:${word.russian}::${word.turkish}` },
        wordCategoryManager: { getCategory: () => 'Kategorize Edilmemiş' },
        vocabularyRepository: {
            load: async () => false,
            getDiagnostics: () => ({ mode: 'error', error: 'artifact mismatch' })
        }
    };
    const context = {
        window,
        console,
        fetch: async requestedPath => {
            if (requestedPath === 'sentences_strict.json') return { ok: true, json: async () => ({}) };
            return { ok: true, text: async () => 'Учиться : öğrenmek\n' };
        }
    };
    vm.runInNewContext(source, context, { filename: 'data.js' });

    const loaded = await context.loadWords();

    assert.equal(loaded, true);
    assert.equal(window.WORDS.length, 1);
    assert.equal(window.WORDS[0].russian, 'Учиться');
    assert.equal(window.vocabularyRuntimeDiagnostics.mode, 'legacy');
    assert.equal(window.vocabularyRuntimeDiagnostics.fallback_error, 'artifact mismatch');
});
