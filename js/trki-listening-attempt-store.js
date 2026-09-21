(function exposeTrkiListeningAttemptStore(root) {
    const STORAGE_KEY = 'ru_tr_trki_listening_attempts_v1';
    const SCHEMA_VERSION = 1;
    const RAW_KEYS = new Set(['audio_blob', 'blob', 'file', 'media_stream', 'stream', 'object_url', 'transcript', 'transcript_text', 'raw_audio']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, updated_at: null, attempts: [] };
    }

    function assertNoRawContent(value, key = '') {
        if (RAW_KEYS.has(key)) throw new Error('Raw Listening content is not allowed in attempts.');
        if (value && typeof value === 'object') {
            Object.entries(value).forEach(([childKey, childValue]) => assertNoRawContent(childValue, childKey));
        }
    }

    function assertIdentity(identity) {
        const parts = identity?.parts;
        const fields = ['package_id', 'package_version', 'task_id', 'audio_id', 'question_id'];
        if (!fields.every((field) => typeof parts?.[field] === 'string' && parts[field])) throw new Error('Listening attempt identity is incomplete.');
        if (typeof identity.key !== 'string' || !identity.key) throw new Error('Listening attempt identity key is required.');
    }

    function assertHistoricalEvaluation(evaluation) {
        if (!evaluation || !evaluation.answer_key_snapshot || !evaluation.alignment_snapshot) {
            throw new Error('Historical Listening evaluation snapshot is required.');
        }
        const fields = ['package_hash', 'task_hash', 'audio_hash', 'question_hash', 'answer_key_hash', 'alignment_hash', 'replay_policy_hash', 'transcript_hash', 'evaluator_version'];
        if (!fields.every((field) => typeof evaluation[field] === 'string' && evaluation[field])) throw new Error('Historical Listening evaluation hashes are incomplete.');
        if (!['verified', 'candidate', 'needs_review', 'rejected'].includes(evaluation.verification_status)) throw new Error('Listening verification status is invalid.');
        if (typeof evaluation.exercise_eligible !== 'boolean') throw new Error('Listening exercise eligibility is required.');
    }

    function assertAttempt(attempt) {
        assertNoRawContent(attempt);
        if (!attempt?.attempt_id || !attempt.session_id || attempt.section !== 'listening') throw new Error('Listening attempt identity is required.');
        if (!['B1', 'B2'].includes(attempt.level)) throw new Error('Listening attempt level is invalid.');
        assertIdentity(attempt.identity);
        if (!attempt.submitted_answer || typeof attempt.submitted_answer !== 'object') throw new Error('Listening submitted answer is required.');
        if (attempt.result === 'technical_unavailable') {
            if (attempt.scoring_status !== 'non_scorable' || attempt.objective_scoreable !== false || attempt.score !== null
                || attempt.mastery_eligible !== false || attempt.error_notebook_eligible !== false || attempt.adaptive_eligible !== false
                || typeof attempt.technical_reason !== 'string') throw new Error('Technical Listening attempts must remain non-scorable.');
            return;
        }
        if (!['correct', 'incorrect'].includes(attempt.result) || attempt.scoring_status !== 'scored' || attempt.objective_scoreable !== true) {
            throw new Error('Objective Listening attempts must contain a scored result.');
        }
        if (typeof attempt.score !== 'number') throw new Error('Scored Listening attempts require a numeric score.');
        assertHistoricalEvaluation(attempt.evaluation);
    }

    class TrkiListeningAttemptStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            try {
                const rawValue = this.storage?.getItem(STORAGE_KEY);
                if (!rawValue) return createEmptySnapshot();
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== SCHEMA_VERSION || parsed.namespace !== STORAGE_KEY || !Array.isArray(parsed.attempts)) return createEmptySnapshot();
                return { ...createEmptySnapshot(), ...parsed, attempts: parsed.attempts.map(cloneValue) };
            } catch (error) {
                root.console?.error?.('TRKI Listening attempt read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        recordAttempt(attempt) {
            assertAttempt(attempt);
            const existing = this.snapshot.attempts.find((item) => item.attempt_id === attempt.attempt_id);
            if (existing) return cloneValue(existing);
            const record = { ...cloneValue(attempt), recorded_at: attempt.recorded_at || this.now() };
            this.snapshot.attempts.push(record);
            this.snapshot.updated_at = record.recorded_at;
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
            return cloneValue(record);
        }
    }

    root.TrkiListeningAttemptStore = TrkiListeningAttemptStore;
})(typeof window !== 'undefined' ? window : globalThis);
