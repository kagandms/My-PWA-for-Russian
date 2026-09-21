import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadAudio() {
    const window = {};
    vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js/trki-listening-audio.js'), 'utf8'),
        { window, globalThis: window, console, structuredClone, Promise },
        { filename: 'trki-listening-audio.js' }
    );
    return window.TrkiListeningAudio;
}

function createFile(bytes, overrides = {}) {
    const content = Uint8Array.from(bytes);
    return {
        type: 'audio/wav',
        size: content.byteLength,
        duration_ms: 1250,
        arrayBuffer: async () => content.buffer,
        ...overrides
    };
}

function createSession(binding) {
    return {
        session_id: 'listening-session:1',
        session_status: 'active',
        timer: { status: 'running', accumulated_seconds: 14 },
        playback: { audio_id: 'audio-1', plays_consumed: 1 },
        audio_bindings: { 'audio-1': binding }
    };
}

test('computes a deterministic lowercase SHA-256 identity', async () => {
    const digest = await loadAudio().hashFile(createFile([1, 2, 3]), webcrypto);

    assert.equal(digest, 'sha256:039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
});

test('creates restricted metadata without retaining a binary', () => {
    const metadata = loadAudio().createMetadata(createFile([1, 2, 3]), 'sha256:stored');

    assert.deepEqual(JSON.parse(JSON.stringify(metadata)), {
        storage_mode: 'local_restricted',
        availability: 'available',
        sha256: 'sha256:stored',
        mime_type: 'audio/wav',
        size_bytes: 3,
        duration_ms: 1250
    });
    assert.equal(Object.hasOwn(metadata, 'file'), false);
});

test('marks unavailable restricted audio for explicit reselection without losing session state', () => {
    const audio = loadAudio();
    const session = createSession({
        storage_mode: 'local_restricted',
        availability: 'available',
        sha256: 'sha256:stored',
        mime_type: 'audio/wav',
        size_bytes: 3,
        duration_ms: 1250
    });

    const recovered = audio.markAwaitingReselection(session, 'audio-1');

    assert.equal(recovered.audio_bindings['audio-1'].availability, 'awaiting_audio_reselection');
    assert.equal(recovered.playback.plays_consumed, 1);
    assert.equal(recovered.timer.accumulated_seconds, 14);
    assert.equal(session.audio_bindings['audio-1'].availability, 'available');
});

test('accepts only a matching digest and returns the file outside persisted session state', async () => {
    const audio = loadAudio();
    const file = createFile([1, 2, 3]);
    const digest = await audio.hashFile(file, webcrypto);
    const session = createSession({
        storage_mode: 'local_restricted',
        availability: 'awaiting_audio_reselection',
        sha256: digest,
        mime_type: 'audio/wav',
        size_bytes: 3,
        duration_ms: 1250
    });

    const accepted = await audio.acceptReselectedFile(session, 'audio-1', file, webcrypto);

    assert.equal(accepted.file, file);
    assert.equal(accepted.session.audio_bindings['audio-1'].availability, 'available');
    assert.equal(Object.hasOwn(accepted.session.audio_bindings['audio-1'], 'file'), false);
});

test('rejects same-size different-content audio before binding it', async () => {
    const audio = loadAudio();
    const expectedFile = createFile([1, 2, 3]);
    const wrongFile = createFile([3, 2, 1]);
    const digest = await audio.hashFile(expectedFile, webcrypto);
    const session = createSession({
        storage_mode: 'local_restricted',
        availability: 'awaiting_audio_reselection',
        sha256: digest,
        mime_type: 'audio/wav',
        size_bytes: 3,
        duration_ms: 1250
    });

    await assert.rejects(
        () => audio.acceptReselectedFile(session, 'audio-1', wrongFile, webcrypto),
        /SHA-256 mismatch/u
    );
    assert.equal(session.audio_bindings['audio-1'].availability, 'awaiting_audio_reselection');
});

test('does not expose File, Blob, or ArrayBuffer values in the serializable snapshot', async () => {
    const audio = loadAudio();
    const file = createFile([1, 2, 3]);
    const session = createSession({
        storage_mode: 'local_restricted',
        availability: 'awaiting_audio_reselection',
        sha256: await audio.hashFile(file, webcrypto),
        mime_type: file.type,
        size_bytes: file.size,
        duration_ms: file.duration_ms
    });
    const accepted = await audio.acceptReselectedFile(session, 'audio-1', file, webcrypto);

    const serialized = JSON.stringify(accepted.session);
    assert.doesNotMatch(serialized, /ArrayBuffer|Blob|audioBuffer|file/iu);
});
