(function exposeGrammarProgress(root) {
    const STORAGE_KEY = 'ru_tr_grammar_progress_v1';
    const SCHEMA_VERSION = 1;
    const RESULTS = new Set(['correct', 'incorrect']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, updated_at: null, attempts: [] };
    }

    class GrammarProgressStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `grammar-event:${Date.now()}:${Math.random().toString(36).slice(2)}`);
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
                root.console?.error?.('Grammar progress read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        getAttempts() {
            return this.snapshot.attempts.map(cloneValue);
        }

        recordAttempt(attempt) {
            this.validateAttempt(attempt);
            const event = {
                event_id: attempt.event_id || this.idFactory(),
                exercise_id: attempt.exercise_id,
                grammar_topic: attempt.grammar_topic || null,
                result: attempt.result,
                timestamp: attempt.timestamp || this.now(),
                user_answer: attempt.user_answer ?? '',
                expected_answers: [...new Set((attempt.expected_answers || []).map(String).map(value => value.trim()).filter(Boolean))],
                verification_status: 'verified',
                exercise_eligible: true
            };
            this.snapshot.attempts.push(event);
            this.snapshot.updated_at = event.timestamp;
            this.persist();
            return cloneValue(event);
        }

        validateAttempt(attempt) {
            if (!attempt?.exercise_id || !RESULTS.has(attempt.result)) throw new Error('Grammar attempt identity and result are required.');
            if (attempt.verification_status && attempt.verification_status !== 'verified') throw new Error('Only verified grammar exercises may record attempts.');
            if (attempt.exercise_eligible !== undefined && attempt.exercise_eligible !== true) throw new Error('Grammar attempt must be exercise eligible.');
        }

        persist() {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.GrammarProgressStore = GrammarProgressStore;
    root.grammarProgressStore = new GrammarProgressStore();
})(typeof window !== 'undefined' ? window : globalThis);
