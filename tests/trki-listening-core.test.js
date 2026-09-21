import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const window = {};
    const context = { window, globalThis: window, console, structuredClone };
    vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js/trki-listening-core.js'), 'utf8'),
        context,
        { filename: 'trki-listening-core.js' }
    );
    return window.TrkiListeningCore;
}

function createQuestion(overrides = {}) {
    return {
        question_id: 'question-1',
        prompt: 'Что делает Анна?',
        options: ['Читает', 'Спит'],
        answer_key: { option_index: 0 },
        answer_key_hash: 'sha256:answer-1',
        alignment: { audio_id: 'audio-1', offset_ms: 0, duration_ms: 1200 },
        alignment_hash: 'sha256:alignment-1',
        question_hash: 'sha256:question-1',
        numbering: { section_number: 1, item_number: 1 },
        verification_status: 'verified',
        exercise_eligible: true,
        ...overrides
    };
}

function createTask(overrides = {}) {
    return {
        task_id: 'task-1',
        task_type: 'multiple_choice',
        task_hash: 'sha256:task-1',
        audio: {
            audio_id: 'audio-1',
            audio_hash: 'sha256:audio-1',
            mime_type: 'audio/wav',
            duration_ms: 1200,
            storage_mode: 'bundled_synthetic'
        },
        replay_policy: {
            max_plays: 2,
            pause_allowed: false,
            seek_allowed: false,
            autoplay: false
        },
        replay_policy_hash: 'sha256:replay-1',
        transcript: 'Анна читает.',
        transcript_hash: 'sha256:transcript-1',
        questions: [createQuestion()],
        ...overrides
    };
}

function createPackage(overrides = {}) {
    return {
        package_id: 'trki-listening-synthetic-b1',
        package_version: '1.0.0',
        package_hash: 'sha256:package-1',
        level: 'B1',
        source: {
            source_id: 'src:synthetic-trki-b1-b2',
            document_id: 'doc:synthetic-trki-b1-b2',
            version: '2026-09-fixture',
            source_type: 'synthetic',
            source_class: 'synthetic_fixture',
            official_trki_provenance: false,
            content_policy: 'synthetic-not-official',
            license: 'test-only',
            redistribution_status: 'allowed_for_repository_fixture',
            full_content_bundled: true,
            provenance_status: 'verified'
        },
        tasks: [createTask()],
        ...overrides
    };
}

test('creates the immutable five-part Listening identity', () => {
    const identity = loadCore().createIdentity({
        package_id: 'trki-listening-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'task-1',
        audio_id: 'audio-1',
        question_id: 'question-1'
    });

    assert.equal(identity.key, 'trki-listening-synthetic-b1@1.0.0/task-1/audio-1/question-1');
    assert.deepEqual(JSON.parse(JSON.stringify(identity.parts)), {
        package_id: 'trki-listening-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'task-1',
        audio_id: 'audio-1',
        question_id: 'question-1'
    });
});

test('rejects a package without an immutable version', () => {
    const core = loadCore();

    assert.throws(() => core.validatePackage(createPackage({ package_version: '' })), /package_version/u);
});

test('rejects duplicate question identities inside one package', () => {
    const core = loadCore();
    const duplicateTask = createTask({ questions: [createQuestion(), createQuestion()] });

    assert.throws(() => core.validatePackage(createPackage({ tasks: [duplicateTask] })), /duplicate.*question/iu);
});

test('requires hash and alignment evidence for objective questions', () => {
    const core = loadCore();
    const invalidQuestion = createQuestion({ alignment_hash: null });

    assert.throws(
        () => core.validateQuestion(invalidQuestion, createTask(), createPackage()),
        /alignment_hash/u
    );
});

test('does not treat an official source as verified extracted Listening content', () => {
    const core = loadCore();
    const officialPackage = createPackage({
        source: {
            source_id: 'src:official',
            document_id: 'doc:official',
            version: '2026-01',
            source_type: 'official_trki_system',
            source_class: 'trki_system',
            official_trki_provenance: true,
            content_policy: 'official-trki-system-metadata-only',
            license: 'unknown',
            redistribution_status: 'no_explicit_permission_identified',
            full_content_bundled: false,
            provenance_status: 'catalogued'
        }
    });

    assert.equal(core.isObjectiveEligible(officialPackage.tasks[0].questions[0], {
        package: officialPackage,
        sourceVerification: 'catalogued'
    }), false);
});

test('keeps restricted local storage separate from local-user provenance', () => {
    const core = loadCore();
    const question = createQuestion();
    const task = createTask({ audio: { ...createTask().audio, storage_mode: 'local_restricted' } });
    const packageRecord = createPackage({
        source: {
            ...createPackage().source,
            source_type: 'institutional_testing',
            source_class: 'pushkin_institute_institutional_testing',
            official_trki_provenance: false,
            content_policy: 'institutional-testing-metadata-only',
            full_content_bundled: false
        },
        tasks: [task]
    });

    assert.equal(core.isObjectiveEligible(question, { package: packageRecord, sourceVerification: 'verified' }), false);
    assert.equal(packageRecord.source.source_type, 'institutional_testing');
    assert.equal(task.audio.storage_mode, 'local_restricted');
});

test('evaluates answers and snapshots immutable historical evidence without diagnosis fields', () => {
    const core = loadCore();
    const packageRecord = createPackage();
    const task = packageRecord.tasks[0];
    const question = task.questions[0];
    const result = core.evaluateAnswer(question, 0);
    const snapshot = core.createEvaluationSnapshot(question, result, { package: packageRecord, task });

    assert.deepEqual(JSON.parse(JSON.stringify(result)), { result: 'correct', score: 1 });
    assert.equal(snapshot.answer_key_snapshot.option_index, 0);
    assert.equal(snapshot.alignment_snapshot.audio_id, 'audio-1');
    assert.equal(snapshot.verification_status, 'verified');
    assert.equal(snapshot.exercise_eligible, true);
    assert.equal(Object.hasOwn(snapshot, 'error_type'), false);
    assert.equal(Object.hasOwn(snapshot, 'grammar'), false);
});

test('loads a synthetic package artifact with explicit non-official provenance', () => {
    const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/trki/listening-packages.v1.json'), 'utf8'));

    assert.equal(artifact.content_policy, 'synthetic-not-official');
    assert.equal(artifact.packages.every((item) => item.source.source_type === 'synthetic'), true);
    assert.equal(artifact.packages.every((item) => item.source.official_trki_provenance === false), true);
});
