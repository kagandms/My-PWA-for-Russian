import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadPlayback() {
    const window = {};
    vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js/trki-listening-playback.js'), 'utf8'),
        { window, globalThis: window, console, structuredClone },
        { filename: 'trki-listening-playback.js' }
    );
    return window.ListeningPlayback;
}

function createPolicy(overrides = {}) {
    return { max_plays: 2, pause_allowed: false, seek_allowed: false, autoplay: false, ...overrides };
}

test('consumes one play across buffering and duplicate playing events', () => {
    const playback = loadPlayback().create(createPolicy());

    assert.equal(playback.requestPlay().status, 'play_requested');
    assert.equal(playback.handlePlaying().plays_consumed, 1);
    assert.equal(playback.handleBuffering().plays_consumed, 1);
    assert.equal(playback.handlePlaying().plays_consumed, 1);
    assert.equal(playback.handleEnded().status, 'ready');
});

test('does not consume a play when the browser rejects play before starting', () => {
    const playback = loadPlayback().create(createPolicy());

    playback.requestPlay();
    const failed = playback.handleFailure({ before_start: true });

    assert.equal(failed.plays_consumed, 0);
    assert.equal(failed.status, 'ready');
});

test('rejects duplicate logical starts after the package max is consumed', () => {
    const playback = loadPlayback().create(createPolicy({ max_plays: 1 }));

    playback.requestPlay();
    playback.handlePlaying();
    playback.handleEnded();

    assert.equal(playback.requestPlay().status, 'max_plays_reached');
    assert.equal(playback.getSnapshot().plays_consumed, 1);
});

test('keeps pause and seek disabled and cleanup terminal', () => {
    const playback = loadPlayback().create(createPolicy({ pause_allowed: true, seek_allowed: true }));

    assert.equal(playback.getSnapshot().pause_allowed, false);
    assert.equal(playback.getSnapshot().seek_allowed, false);
    assert.equal(playback.cleanup().status, 'cleaned_up');
    assert.equal(playback.requestPlay().status, 'cleaned_up');
});
