(function exposeTrkiListeningAudio(root) {
    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function toHex(bytes) {
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    async function hashFile(file, cryptoApi) {
        if (!file || typeof file.arrayBuffer !== 'function') throw new Error('A readable audio file is required.');
        if (!cryptoApi?.subtle?.digest) throw new Error('SHA-256 is unavailable.');
        const digest = await cryptoApi.subtle.digest('SHA-256', await file.arrayBuffer());
        return `sha256:${toHex(new Uint8Array(digest))}`;
    }

    function createMetadata(file, digest) {
        if (typeof digest !== 'string' || !digest.startsWith('sha256:')) throw new Error('Audio SHA-256 metadata is required.');
        return {
            storage_mode: 'local_restricted',
            availability: 'available',
            sha256: digest,
            mime_type: String(file?.type || 'application/octet-stream'),
            size_bytes: Number(file?.size) || 0,
            duration_ms: Number.isFinite(file?.duration_ms) ? file.duration_ms : null
        };
    }

    function getBinding(session, audioId) {
        const binding = session?.audio_bindings?.[audioId];
        if (!binding) throw new Error(`Unknown restricted audio: ${audioId}`);
        if (binding.storage_mode !== 'local_restricted') throw new Error('Only restricted audio can be reselected.');
        return binding;
    }

    function markAwaitingReselection(session, audioId) {
        const updated = cloneValue(session);
        const binding = getBinding(updated, audioId);
        binding.availability = 'awaiting_audio_reselection';
        return updated;
    }

    async function acceptReselectedFile(session, audioId, file, cryptoApi) {
        const updated = cloneValue(session);
        const binding = getBinding(updated, audioId);
        const digest = await hashFile(file, cryptoApi);
        if (digest !== binding.sha256) throw new Error('Audio SHA-256 mismatch.');
        const metadata = createMetadata(file, digest);
        updated.audio_bindings[audioId] = { ...binding, ...metadata };
        return { session: updated, file };
    }

    function release(memoryBindings, audioId) {
        if (memoryBindings && typeof memoryBindings.delete === 'function') memoryBindings.delete(audioId);
        return true;
    }

    root.TrkiListeningAudio = Object.freeze({
        hashFile,
        createMetadata,
        markAwaitingReselection,
        acceptReselectedFile,
        release
    });
})(typeof window !== 'undefined' ? window : globalThis);
