import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadRepository() {
    const source = fs.readFileSync(path.join(ROOT, 'js/grammar-repository.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'grammar-repository.js' });
    return window.GrammarRepository;
}

function createArtifacts() {
    return {
        grammarLab: {
            schema_version: 1,
            artifact: 'grammar-lab',
            exercises: [
                {
                    exercise_id: 'grammar:verified',
                    grammar_topic: 'cases.genitive',
                    grammar_subtopic: 'genitive-after-нет',
                    prompt: 'У меня нет ___',
                    exercise_type: 'typed_answer',
                    accepted_answers: ['времени'],
                    explanation: 'Reviewed example.',
                    source: 'reviewed:test',
                    verification_status: 'verified',
                    exercise_eligible: true,
                    error_type: 'case.genitive'
                },
                {
                    exercise_id: 'grammar:candidate',
                    grammar_topic: 'cases.genitive',
                    grammar_subtopic: 'candidate',
                    prompt: 'candidate',
                    exercise_type: 'typed_answer',
                    accepted_answers: ['кандидат'],
                    explanation: 'Candidate.',
                    source: 'candidate:test',
                    verification_status: 'candidate',
                    exercise_eligible: false,
                    error_type: null
                },
                {
                    exercise_id: 'grammar:unverified',
                    grammar_topic: 'cases.genitive',
                    grammar_subtopic: 'unverified',
                    prompt: 'unverified',
                    exercise_type: 'typed_answer',
                    accepted_answers: ['unverified'],
                    explanation: 'Unverified.',
                    source: 'unverified:test',
                    verification_status: 'unverified',
                    exercise_eligible: true,
                    error_type: null
                },
                {
                    exercise_id: 'grammar:needs-review',
                    grammar_topic: 'cases.genitive',
                    grammar_subtopic: 'needs-review',
                    prompt: 'needs review',
                    exercise_type: 'typed_answer',
                    accepted_answers: ['review'],
                    explanation: 'Needs review.',
                    source: 'review:test',
                    verification_status: 'needs_review',
                    exercise_eligible: true,
                    error_type: null
                }
            ]
        },
        contrastTraining: {
            schema_version: 1,
            artifact: 'contrast-training',
            contrasts: []
        }
    };
}

test('loads versioned grammar artifacts and filters scored content by verification and eligibility', () => {
    const Repository = loadRepository();
    const repository = new Repository();

    repository.loadFromArtifacts(createArtifacts());

    assert.equal(repository.getAllExercises().length, 4);
    assert.deepEqual(Array.from(repository.getScoredExercises(), item => item.exercise_id), ['grammar:verified']);
    assert.equal(repository.getAllContrasts().length, 0);
});

test('binds a window-owned fetch implementation before loading grammar artifacts', async () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/grammar-repository.js'), 'utf8');
    const artifacts = createArtifacts();
    let receiver = null;
    const window = {
        fetch(requestedPath) {
            receiver = this;
            const artifact = String(requestedPath).includes('contrast-training')
                ? artifacts.contrastTraining
                : artifacts.grammarLab;
            return Promise.resolve({ ok: true, json: async () => artifact });
        }
    };
    vm.runInNewContext(source, { window, globalThis: window, console, Promise }, { filename: 'grammar-repository.js' });

    const repository = new window.GrammarRepository();
    const result = await repository.load();

    assert.equal(result.grammar_exercises, 4);
    assert.equal(receiver, window);
});

test('loads all contrast verification states but scores only verified eligible contrasts', () => {
    const Repository = loadRepository();
    const repository = new Repository();
    const artifacts = createArtifacts();
    artifacts.contrastTraining.contrasts = [
        {
            contrast_id: 'contrast:verified',
            topic: 'verb.aspect',
            option_a: 'делать',
            option_b: 'сделать',
            explanation: 'Reviewed contrast.',
            examples: [],
            source: 'reviewed:test',
            verification_status: 'verified',
            exercise_eligible: true
        },
        {
            contrast_id: 'contrast:candidate',
            topic: 'verb.aspect',
            option_a: 'candidate-a',
            option_b: 'candidate-b',
            explanation: 'Candidate contrast.',
            examples: [],
            source: 'candidate:test',
            verification_status: 'candidate',
            exercise_eligible: true
        },
        {
            contrast_id: 'contrast:unverified',
            topic: 'verb.aspect',
            option_a: 'unverified-a',
            option_b: 'unverified-b',
            explanation: 'Unverified contrast.',
            examples: [],
            source: 'unverified:test',
            verification_status: 'unverified',
            exercise_eligible: true
        },
        {
            contrast_id: 'contrast:needs-review',
            topic: 'verb.aspect',
            option_a: 'review-a',
            option_b: 'review-b',
            explanation: 'Needs review contrast.',
            examples: [],
            source: 'review:test',
            verification_status: 'needs_review',
            exercise_eligible: true
        },
        {
            contrast_id: 'contrast:not-eligible',
            topic: 'verb.aspect',
            option_a: 'not-eligible-a',
            option_b: 'not-eligible-b',
            explanation: 'Not eligible.',
            examples: [],
            source: 'reviewed:test',
            verification_status: 'verified',
            exercise_eligible: false
        }
    ];

    repository.loadFromArtifacts(artifacts);

    assert.equal(repository.getAllContrasts().length, 5);
    assert.deepEqual(Array.from(repository.getScoredContrasts(), item => item.contrast_id), ['contrast:verified']);
});

test('rejects duplicate grammar exercise IDs', () => {
    const Repository = loadRepository();
    const repository = new Repository();
    const artifacts = createArtifacts();
    artifacts.grammarLab.exercises.push({ ...artifacts.grammarLab.exercises[0] });

    assert.throws(() => repository.loadFromArtifacts(artifacts), /Duplicate grammar exercise ID/u);
});
