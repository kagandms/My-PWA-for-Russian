import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('wires Listening and TRKI Speaking routes with dependency order', () => {
    const index = read('index.html');
    const app = read('js/app.js');

    assert.match(index, /data-mode="trkiListening"/u);
    assert.match(index, /data-mode="trkiSpeaking"/u);
    assert.match(index, /id="trkiListeningMode"/u);
    assert.ok(index.indexOf('js/trki-listening-core.js') < index.indexOf('js/trki-listening-repository.js'));
    assert.ok(index.indexOf('js/trki-listening-repository.js') < index.indexOf('js/trki-listening-session-coordinator.js'));
    assert.ok(index.indexOf('js/speaking-mode.js') < index.indexOf('js/trki-speaking-coordinator.js'));
    assert.match(app, /case 'trkiListening'/u);
    assert.match(app, /trkiSpeaking/u);
});

test('ships only synthetic Listening metadata and static runtime modules in v71', () => {
    const source = read('sw.js');
    const assetsBlock = source.match(/const ASSETS = \[(.*?)\];/s)?.[1] || '';

    assert.match(source, /rutr-v71/u);
    for (const asset of [
        './js/trki-listening-core.js',
        './js/trki-listening-repository.js',
        './js/trki-listening-playback.js',
        './js/trki-listening-audio.js',
        './js/trki-listening-session-store.js',
        './js/trki-listening-attempt-store.js',
        './js/trki-listening-session-coordinator.js',
        './js/trki-speaking-coordinator.js',
        './data/trki/listening-packages.v1.json'
    ]) {
        assert.match(assetsBlock, new RegExp(`\\./${asset.slice(2).replaceAll('/', '\\/')}`));
        assert.equal(fs.existsSync(path.join(ROOT, asset.slice(2))), true, `missing ${asset}`);
    }
    assert.doesNotMatch(source, /local_restricted|audio_blob|raw_audio|MediaStream|Blob/u);
    assert.doesNotMatch(source, /trki_listening_(sessions|attempts)|trkiListening.*audio/u);
});

test('keeps the planner and flashcard boundaries explicit for Phase 7', () => {
    const plan = read('docs/superpowers/specs/2026-09-21-phase-7-listening-speaking-design.md');
    const adaptivePlanner = read('js/adaptive-planner.js');
    const flashcard = read('js/flashcard.js');

    assert.match(plan, /no planner policy change warranted from current verified evidence/u);
    assert.doesNotMatch(adaptivePlanner, /trkiListening|listening.*difficulty/iu);
    assert.doesNotMatch(flashcard, /trkiListening|trki-listening/iu);
});
