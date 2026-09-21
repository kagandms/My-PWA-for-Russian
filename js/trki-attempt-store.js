(function exposeTrkiAttemptStore(root) {
    const STORAGE_KEY = 'ru_tr_trki_attempts_v1';
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, updated_at: null, attempts: [] };
    }

    function isPracticeAttempt(attempt) {
        return attempt.scoring_status === 'practice_only' || attempt.section === 'writing';
    }

    function assertAttempt(attempt) {
        if (!attempt?.attempt_id || !attempt.session_id || !attempt.exercise_id) throw new Error('TRKI attempt identity is required.');
        if (!['B1', 'B2'].includes(attempt.level)) throw new Error('TRKI attempt level is invalid.');
        if (!attempt.section || !attempt.result) throw new Error('TRKI attempt outcome is incomplete.');
        if (isPracticeAttempt(attempt)) {
            if (attempt.scoring_status !== 'practice_only' || attempt.objective_scoreable !== false || attempt.score !== null
                || attempt.mastery_eligible !== false || attempt.error_notebook_eligible !== false || attempt.adaptive_eligible !== false) {
                throw new Error('TRKI practice attempts cannot enter scoring, mastery, Error Notebook, or adaptive flows.');
            }
            return;
        }
        if (attempt.scoring_status === 'scored' && attempt.objective_scoreable !== true) {
            throw new Error('Scored TRKI attempts require objective scoreable provenance.');
        }
        if (attempt.scoring_status === 'scored' && typeof attempt.score !== 'number') {
            throw new Error('Scored TRKI attempts require a numeric score.');
        }
    }

    class TrkiAttemptStore {
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
                if (parsed?.schema_version !== SCHEMA_VERSION || parsed.namespace !== STORAGE_KEY) return createEmptySnapshot();
                return { ...createEmptySnapshot(), ...parsed, attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [] };
            } catch (error) {
                root.console?.error?.('TRKI attempt read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        recordAttempt(attempt) {
            assertAttempt(attempt);
            if (this.snapshot.attempts.some(item => item.attempt_id === attempt.attempt_id)) {
                throw new Error(`Duplicate TRKI attempt ID: ${attempt.attempt_id}`);
            }
            const record = { ...cloneValue(attempt), recorded_at: attempt.recorded_at || this.now() };
            this.snapshot.attempts.push(record);
            this.snapshot.updated_at = record.recorded_at;
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
            return cloneValue(record);
        }
    }

    root.TrkiAttemptStore = TrkiAttemptStore;
    root.trkiAttemptStore = new TrkiAttemptStore();
})(typeof window !== 'undefined' ? window : globalThis);
