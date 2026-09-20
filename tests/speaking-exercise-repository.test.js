import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = process.cwd();

function loadRepository() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-exercise-repository.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'speaking-exercise-repository.js' });
    return window.SpeakingExerciseRepository;
}

function loadArtifact(filePath) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
}

function createVocabularyRepository() {
    const base = loadArtifact('data/vocabulary/lexical-units.v1.json');
    const byUnit = new Map(base.lexical_units.map((unit) => [unit.id, unit]));
    const bySense = new Map(base.lexical_units.flatMap((unit) => unit.senses.map((sense) => [sense.sense_id, sense])));
    return {
        getLexicalUnit: (id) => byUnit.get(id) ?? null,
        getSense: (id) => bySense.get(id) ?? null
    };
}

test('returns only verified and eligible Read Aloud exercises', async () => {
    const SpeakingExerciseRepository = loadRepository();
    const repository = new SpeakingExerciseRepository({
        readAloudArtifact: loadArtifact('data/speaking/read-aloud-exercises.v1.json'),
        freeSpeechArtifact: loadArtifact('data/speaking/free-speech-topics.v1.json'),
        vocabularyRepository: createVocabularyRepository()
    });

    await repository.load();
    const exercises = repository.getReadAloudExercises();

    assert.equal(exercises.length, 3);
    assert.equal(exercises.every((exercise) => (
        exercise.verification_status === 'verified'
        && exercise.exercise_eligible === true
        && exercise.source.source_sha256 === 'd16bdbd8d166057365b510a12c6b886931fa08d6f55b1e250cd1359a10c7bb3a'
    )), true);
});

test('keeps candidate and source-preserved entries as practice metadata only', async () => {
    const SpeakingExerciseRepository = loadRepository();
    const repository = new SpeakingExerciseRepository({
        readAloudArtifact: loadArtifact('data/speaking/read-aloud-exercises.v1.json'),
        freeSpeechArtifact: loadArtifact('data/speaking/free-speech-topics.v1.json'),
        vocabularyRepository: createVocabularyRepository()
    });

    await repository.load();
    const scoredIds = new Set(repository.getReadAloudExercises().map((exercise) => exercise.exercise_id));
    const practice = repository.getReadAloudPracticeMetadata();

    assert.equal(practice.length, 1);
    assert.equal(scoredIds.has(practice[0].exercise_id), false);
    assert.equal(practice[0].exercise_eligible, false);
    assert.equal(practice[0].verification_status, 'source_preserved');
});

test('preserves paired lexical and sense identity in every scored target', async () => {
    const SpeakingExerciseRepository = loadRepository();
    const repository = new SpeakingExerciseRepository({
        readAloudArtifact: loadArtifact('data/speaking/read-aloud-exercises.v1.json'),
        freeSpeechArtifact: loadArtifact('data/speaking/free-speech-topics.v1.json'),
        vocabularyRepository: createVocabularyRepository()
    });

    await repository.load();
    const targets = repository.getReadAloudExercises().flatMap((exercise) => exercise.targets);

    assert.equal(targets.every((target) => target.lexical_unit_id && target.sense_id && target.target_surface), true);
    assert.equal(targets.every((target) => !('lexical_unit_ids' in target) && !('sense_ids' in target)), true);
});

test('returns Prompted Speech exercises with two to four canonical paired targets', async () => {
    const SpeakingExerciseRepository = loadRepository();
    const repository = new SpeakingExerciseRepository({
        readAloudArtifact: loadArtifact('data/speaking/read-aloud-exercises.v1.json'),
        freeSpeechArtifact: loadArtifact('data/speaking/free-speech-topics.v1.json'),
        vocabularyRepository: createVocabularyRepository()
    });

    await repository.load();
    const exercises = repository.getPromptedExercises();

    assert.equal(exercises.length, 1);
    assert.equal(exercises[0].targets.length >= 2 && exercises[0].targets.length <= 4, true);
    assert.equal(exercises[0].targets.every((target) => target.lexical_unit_id && target.sense_id), true);
});

test('keeps Free Speech topics free of lexical mastery identity', async () => {
    const SpeakingExerciseRepository = loadRepository();
    const repository = new SpeakingExerciseRepository({
        readAloudArtifact: loadArtifact('data/speaking/read-aloud-exercises.v1.json'),
        freeSpeechArtifact: loadArtifact('data/speaking/free-speech-topics.v1.json'),
        vocabularyRepository: createVocabularyRepository()
    });

    await repository.load();
    const topics = repository.getFreeSpeechTopics();

    assert.equal(topics.length >= 3, true);
    assert.equal(topics.every((topic) => !topic.lexical_unit_id && !topic.sense_id && !topic.targets), true);
    assert.equal(topics.every((topic) => topic.duration_seconds >= 30 && topic.duration_seconds <= 60), true);
});

