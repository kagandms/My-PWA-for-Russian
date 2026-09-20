import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readServiceWorker() {
    return fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
}

function getAssets(source) {
    const block = source.match(/const ASSETS = \[(.*?)\];/s)?.[1] || '';
    return [...block.matchAll(/^\s*['"](\.\/[^'"]+)['"],?$/gm)].map(match => match[1]);
}

test('ships every Speaking runtime and versioned artifact in the v64 cache', () => {
    const source = readServiceWorker();
    const assets = getAssets(source);
    const expectedAssets = [
        './js/speaking-core.js',
        './js/speaking-capabilities.js',
        './js/speech-recognition-adapter.js',
        './js/audio-recorder-adapter.js',
        './js/speaking-store.js',
        './js/speaking-exercise-repository.js',
        './js/speaking-mastery.js',
        './js/speaking-error-bridge.js',
        './js/speaking-adaptive-provider.js',
        './js/speaking-mode.js',
        './data/speaking/read-aloud-exercises.v1.json',
        './data/speaking/free-speech-topics.v1.json'
    ];

    assert.match(source, /rutr-v64/u);
    for (const asset of expectedAssets) {
        assert.ok(assets.includes(asset), `missing ${asset}`);
        assert.equal(fs.existsSync(path.join(ROOT, asset.slice(2))), true, `missing file ${asset}`);
    }
    assert.equal(new Set(assets).size, assets.length);
    assert.equal(assets.some(asset => /(?:\.blob|audio\/|raw_audio|media-stream)/i.test(asset)), false);
    assert.doesNotMatch(source, /localStorage|indexedDB|MediaRecorder|SpeechRecognition.*cache/i);
    assert.doesNotMatch(source, /audio_blob|object_url|raw_audio/i);
    assert.doesNotMatch(source, /data\/speaking.*(?:audio|transcript)/i);
});

test('keeps Speaking metadata network-first only through the static artifact request set', () => {
    const source = readServiceWorker();
    const networkFirst = source.match(/const NETWORK_FIRST_PATHS = new Set\(\[(.*?)\]\);/s)?.[1] || '';

    assert.match(networkFirst, /data\/speaking\/read-aloud-exercises\.v1\.json/u);
    assert.match(networkFirst, /data\/speaking\/free-speech-topics\.v1\.json/u);
    assert.doesNotMatch(networkFirst, /audio|blob|media-stream/i);
});
