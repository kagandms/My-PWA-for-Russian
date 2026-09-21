import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadRepository() {
    const window = {};
    const context = { window, globalThis: window, console, structuredClone, Promise };
    ['trki-listening-core.js', 'trki-listening-repository.js'].forEach((file) => {
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file });
    });
    return window.TrkiListeningRepository;
}

function artifactResponse(relativePath) {
    const payload = JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
    return { ok: true, json: async () => payload };
}

function createFetch() {
    return async (requestPath) => {
        const paths = {
            '/data/trki/source-catalog.v1.json': 'data/trki/source-catalog.v1.json',
            '/data/trki/listening-packages.v1.json': 'data/trki/listening-packages.v1.json'
        };
        return artifactResponse(paths[requestPath]);
    };
}

test('loads verified synthetic Listening tasks without changing source provenance', async () => {
    const Repository = loadRepository();
    const repository = new Repository({ fetch: createFetch() });

    await repository.load();

    const tasks = repository.getObjectiveTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].package.source.source_type, 'synthetic');
    assert.equal(tasks[0].package.source.official_trki_provenance, false);
    assert.equal(tasks[0].package.source.content_policy, 'synthetic-not-official');
    assert.equal(tasks[0].audio.storage_mode, 'bundled_synthetic');
});

test('keeps candidate and source-preserved Listening questions practice-only', async () => {
    const Repository = loadRepository();
    const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/trki/listening-packages.v1.json'), 'utf8'));
    const candidate = JSON.parse(JSON.stringify(artifact));
    candidate.packages[0].tasks[0].questions[0].verification_status = 'candidate';
    candidate.packages[0].tasks[0].questions[0].exercise_eligible = false;
    const repository = new Repository({
        fetch: async (requestPath) => requestPath.includes('source-catalog')
            ? artifactResponse('data/trki/source-catalog.v1.json')
            : { ok: true, json: async () => candidate }
    });

    await repository.load();

    assert.equal(repository.getObjectiveTasks().length, 1);
    assert.equal(repository.getObjectiveTasks()[0].questions.some((question) => question.question_id.endsWith('q-1')), false);
    assert.equal(repository.getPracticeTasks().length, 1);
    assert.equal(repository.getPracticeTasks()[0].questions.length, 2);
});

test('rejects a question whose alignment points to another audio identity', async () => {
    const Repository = loadRepository();
    const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/trki/listening-packages.v1.json'), 'utf8'));
    artifact.packages[0].tasks[0].questions[0].alignment.audio_id = 'audio-from-another-task';
    const repository = new Repository({
        fetch: async (requestPath) => requestPath.includes('source-catalog')
            ? artifactResponse('data/trki/source-catalog.v1.json')
            : { ok: true, json: async () => artifact }
    });

    await assert.rejects(() => repository.load(), /alignment audio identity mismatch/u);
});

test('does not rewrite institutional source provenance as local-user storage', async () => {
    const Repository = loadRepository();
    const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/trki/listening-packages.v1.json'), 'utf8'));
    artifact.packages[0].source = {
        ...artifact.packages[0].source,
        source_type: 'institutional_testing',
        source_class: 'pushkin_institute_institutional_testing',
        official_trki_provenance: false,
        content_policy: 'institutional-testing-metadata-only',
        full_content_bundled: false,
        provenance_status: 'catalogued'
    };
    artifact.packages[0].tasks[0].audio.storage_mode = 'local_restricted';
    const repository = new Repository({
        fetch: async (requestPath) => requestPath.includes('source-catalog')
            ? artifactResponse('data/trki/source-catalog.v1.json')
            : { ok: true, json: async () => artifact }
    });

    await repository.load();

    const practiceTask = repository.getPracticeTasks()[0];
    assert.equal(practiceTask.package.source.source_type, 'institutional_testing');
    assert.equal(practiceTask.audio.storage_mode, 'local_restricted');
    assert.notEqual(practiceTask.package.source.source_type, 'local_user');
});
