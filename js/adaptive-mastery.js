(function exposeAdaptiveMastery(root) {
    const STORAGE_KEY = 'ru_tr_mastery_v1';
    const SCHEMA_VERSION = 1;
    const SKILLS = new Set(['recognition', 'recall', 'production']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function buildIdentityKey(lexicalUnitId, senseId, skill) {
        return `${lexicalUnitId}|${senseId || 'sense:unknown'}|${skill}`;
    }

    function createMasteryRecord(lexicalUnitId, senseId, skill) {
        return {
            lexical_unit_id: lexicalUnitId,
            sense_id: senseId || null,
            skill,
            attempts: 0,
            correct_count: 0,
            incorrect_count: 0,
            almost_correct_count: 0,
            valid_other_sense_count: 0,
            completed_observations: 0,
            target_not_detected_count: 0,
            empty_answer_count: 0,
            needs_review_count: 0,
            accuracy: null,
            evidence_strength: skill === 'production' ? 'observation_only' : 'direct_observation',
            status: 'unseen',
            last_result: null,
            last_attempt_at: null,
            recent_results: []
        };
    }

    function createEmptySnapshot() {
        return {
            schema_version: SCHEMA_VERSION,
            namespace: STORAGE_KEY,
            updated_at: null,
            records: {}
        };
    }

    function deriveStatus(record) {
        if (record.attempts === 0) return 'unseen';
        if (record.skill === 'production') return 'insufficient_evidence';
        const meaningfulAttempts = record.correct_count + record.incorrect_count;
        if (meaningfulAttempts === 0) return 'learning';
        if (record.incorrect_count > record.correct_count) return 'needs_review';
        if (meaningfulAttempts >= 3 && record.accuracy >= 0.75) return 'stable';
        if (record.correct_count > 0) return 'developing';
        return 'needs_review';
    }

    function updateAccuracy(record) {
        const meaningfulAttempts = record.correct_count + record.incorrect_count;
        record.accuracy = meaningfulAttempts > 0
            ? record.correct_count / meaningfulAttempts
            : null;
        record.status = deriveStatus(record);
    }

    function applyAttempt(record, attempt) {
        record.attempts += 1;
        if (record.skill === 'production') {
            if (attempt.result === 'completed') record.completed_observations += 1;
            if (attempt.result === 'target_not_detected') record.target_not_detected_count += 1;
            if (attempt.result === 'empty_answer') record.empty_answer_count += 1;
            if (attempt.result === 'needs_review') record.needs_review_count += 1;
        } else if (attempt.result === 'correct') {
            record.correct_count += 1;
        } else if (attempt.result === 'incorrect') {
            record.incorrect_count += 1;
        } else if (attempt.result === 'almost_correct') {
            record.almost_correct_count += 1;
        } else if (attempt.result === 'valid_other_sense') {
            record.valid_other_sense_count += 1;
        }
        record.last_result = attempt.result;
        record.last_attempt_at = attempt.timestamp || record.last_attempt_at;
        record.recent_results = [...record.recent_results, attempt.result].slice(-5);
        updateAccuracy(record);
    }

    function isUsableAttempt(attempt) {
        return Boolean(
            attempt?.lexical_unit_id
            && attempt?.skill
            && SKILLS.has(attempt.skill)
            && attempt?.result
        );
    }

    class AdaptiveMasteryReadModel {
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
                return { ...createEmptySnapshot(), ...parsed, records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {} };
            } catch (error) {
                root.console?.error?.('Adaptive mastery read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        getRecords() {
            return Object.values(this.snapshot.records).map(cloneValue);
        }

        getMastery({ lexicalUnitId, senseId, skill }) {
            const key = buildIdentityKey(lexicalUnitId, senseId, skill);
            return cloneValue(this.snapshot.records[key] || createMasteryRecord(lexicalUnitId, senseId, skill));
        }

        rebuild(attempts = []) {
            const records = {};
            const usableAttempts = attempts.filter(isUsableAttempt);
            usableAttempts.forEach(attempt => {
                const key = buildIdentityKey(attempt.lexical_unit_id, attempt.sense_id, attempt.skill);
                const record = records[key] || createMasteryRecord(attempt.lexical_unit_id, attempt.sense_id, attempt.skill);
                applyAttempt(record, attempt);
                records[key] = record;
            });
            this.snapshot = {
                ...createEmptySnapshot(),
                updated_at: this.findLatestTimestamp(usableAttempts) || this.now(),
                records
            };
            this.persist();
            return this.getSnapshot();
        }

        rebuildFromProgress(progressStore = root.learningProgressStore) {
            const attempts = progressStore?.getSnapshot?.().attempts || [];
            return this.rebuild(attempts);
        }

        findLatestTimestamp(attempts) {
            return attempts.map(attempt => attempt.timestamp).filter(Boolean).sort().at(-1) || null;
        }

        persist() {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.AdaptiveMasteryReadModel = AdaptiveMasteryReadModel;
    root.adaptiveMasteryReadModel = new AdaptiveMasteryReadModel();
})(typeof window !== 'undefined' ? window : globalThis);
