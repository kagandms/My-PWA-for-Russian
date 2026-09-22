import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('wires the TRKI mode, artifacts, persisted stores, and controller in dependency order', () => {
    const index = read('index.html');
    const app = read('js/app.js');
    const serviceWorker = read('sw.js');

    assert.match(index, /data-mode="trki"/u);
    assert.match(index, /id="trkiMode"/u);
    assert.match(index, /id="trkiStudyStart"/u);
    assert.match(index, /id="trkiExamStart"/u);
    assert.ok(index.indexOf('js/trki-validator.js') < index.indexOf('js/trki-repository.js'));
    assert.ok(index.indexOf('js/trki-repository.js') < index.indexOf('js/trki-mode.js'));
    assert.match(app, /case 'trki'/u);
    assert.match(app, /'trki'/u);
    assert.match(serviceWorker, /\.\/js\/trki-validator\.js/u);
    assert.match(serviceWorker, /\.\/js\/trki-mode\.js/u);
    assert.match(serviceWorker, /\.\/data\/trki\/source-catalog\.v1\.json/u);
    assert.match(serviceWorker, /\.\/data\/trki\/exercises\.v1\.json/u);
    assert.match(serviceWorker, /rutr-v71/u);
});

test('TRKI artifacts are synthetic fixtures and objective records carry source references', () => {
    const sources = JSON.parse(read('data/trki/source-catalog.v1.json'));
    const exercises = JSON.parse(read('data/trki/exercises.v1.json'));

    assert.equal(sources.sources.some(source => source.source_type === 'official_trki_system' && source.content_policy === 'official-trki-system-metadata-only'), true);
    assert.equal(sources.sources.some(source => source.source_type === 'synthetic'), true);
    assert.equal(sources.sources.filter(source => source.official_trki_provenance === true).every(source => source.license === 'unknown'), true);
    assert.equal(sources.sources.filter(source => source.official_trki_provenance === true).every(source => source.redistribution_status === 'no_explicit_permission_identified'), true);
    assert.equal(sources.sources.filter(source => source.official_trki_provenance === true).every(source => source.full_content_bundled === false), true);
    assert.equal(exercises.exercises.every(exercise => exercise.source_reference), true);
    assert.equal(exercises.exercises.filter(exercise => exercise.section === 'writing').every(exercise => exercise.scoring.mode === 'practice_only'), true);
});

test('distinguishes the official TRKI-system source from Pushkin institutional testing blocks', () => {
    const sources = JSON.parse(read('data/trki/source-catalog.v1.json')).sources;
    const trkiSystemSource = sources.find(source => source.url === 'https://www.pushkin.institute/certificates/trki/');
    const institutionalTestingSource = sources.find(source => source.url === 'https://www.pushkin.institute/certificates/cct/tests-online/');

    assert.equal(trkiSystemSource.source_type, 'official_trki_system');
    assert.equal(trkiSystemSource.source_class, 'trki_system');
    assert.equal(trkiSystemSource.official_trki_provenance, true);
    assert.equal(trkiSystemSource.content_policy, 'official-trki-system-metadata-only');

    assert.equal(institutionalTestingSource.source_type, 'institutional_testing');
    assert.equal(institutionalTestingSource.source_class, 'pushkin_institute_institutional_testing');
    assert.equal(institutionalTestingSource.official_trki_provenance, false);
    assert.equal(institutionalTestingSource.content_policy, 'institutional-testing-metadata-only');
    assert.doesNotMatch(institutionalTestingSource.source_id, /official/u);
});
