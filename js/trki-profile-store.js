(function exposeTrkiProfileStore(root) {
    const STORAGE_KEY = 'ru_tr_trki_profile_v1';
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return {
            schema_version: SCHEMA_VERSION,
            namespace: STORAGE_KEY,
            updated_at: null,
            target_level: 'B1',
            objective_attempt_count: 0,
            practice_attempt_count: 0,
            objective_score_total: 0,
            section_progress: {}
        };
    }

    class TrkiProfileStore {
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
                return { ...createEmptySnapshot(), ...parsed, section_progress: parsed.section_progress || {} };
            } catch (error) {
                root.console?.error?.('TRKI profile read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        setTargetLevel(level) {
            if (!['B1', 'B2'].includes(level)) throw new Error('TRKI target level must be B1 or B2.');
            this.snapshot.target_level = level;
            this.persist();
            return cloneValue(this.snapshot);
        }

        applyAttempt(attempt) {
            if (attempt.scoring_status === 'practice_only') {
                this.snapshot.practice_attempt_count += 1;
                this.persist();
                return cloneValue(this.snapshot);
            }
            if (attempt.scoring_status !== 'scored') return cloneValue(this.snapshot);
            const section = this.snapshot.section_progress[attempt.section] || { attempts: 0, correct: 0, incorrect: 0, score: 0 };
            const isCorrect = attempt.result === 'correct';
            this.snapshot.objective_attempt_count += 1;
            this.snapshot.objective_score_total += attempt.score;
            this.snapshot.section_progress[attempt.section] = {
                attempts: section.attempts + 1,
                correct: section.correct + (isCorrect ? 1 : 0),
                incorrect: section.incorrect + (isCorrect ? 0 : 1),
                score: section.score + attempt.score
            };
            this.persist();
            return cloneValue(this.snapshot);
        }

        persist() {
            this.snapshot.updated_at = this.now();
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.TrkiProfileStore = TrkiProfileStore;
    root.trkiProfileStore = new TrkiProfileStore();
})(typeof window !== 'undefined' ? window : globalThis);
