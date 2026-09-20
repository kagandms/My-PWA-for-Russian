(function exposeLearningProgress(root) {
    const STORAGE_KEY = 'ru_tr_skill_progress_v1';
    const SKILLS = new Set(['recognition', 'recall', 'production']);
    const RESULTS = new Set(['correct', 'incorrect', 'valid_other_sense', 'almost_correct']);
    const PRODUCTION_RESULTS = new Set(['completed', 'target_not_detected', 'empty_answer', 'needs_review']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return {
            schema_version: 1,
            namespace: STORAGE_KEY,
            updated_at: null,
            attempts: [],
            mastery: {}
        };
    }

    function normalizeAnswers(answers) {
        return [...new Set((Array.isArray(answers) ? answers : []).map(String).map(answer => answer.trim()).filter(Boolean))];
    }

    function buildProgressKey(lexicalUnitId, senseId, skill) {
        return `${lexicalUnitId}|${senseId || 'sense:unknown'}|${skill}`;
    }

    function createMasteryRecord(lexicalUnitId, senseId, skill) {
        return {
            lexical_unit_id: lexicalUnitId,
            sense_id: senseId || null,
            skill,
            attempts: 0,
            correct: 0,
            incorrect: 0,
            completed: 0,
            target_not_detected: 0,
            empty_answer: 0,
            needs_review: 0,
            last_result: null,
            last_attempt_at: null
        };
    }

    class LearningProgressStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `event:${Date.now()}:${Math.random().toString(36).slice(2)}`);
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            try {
                const rawValue = this.storage?.getItem(STORAGE_KEY);
                if (!rawValue) return createEmptySnapshot();
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== 1 || parsed.namespace !== STORAGE_KEY) return createEmptySnapshot();
                return {
                    ...createEmptySnapshot(),
                    ...parsed,
                    attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
                    mastery: parsed.mastery && typeof parsed.mastery === 'object' ? parsed.mastery : {}
                };
            } catch (error) {
                if (root.console?.error) root.console.error('Skill progress read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        getMastery({ lexicalUnitId, senseId, skill }) {
            const key = buildProgressKey(lexicalUnitId, senseId, skill);
            return cloneValue(this.snapshot.mastery[key] || createMasteryRecord(lexicalUnitId, senseId, skill));
        }

        recordAttempt(attempt) {
            this.validateAttempt(attempt);
            const timestamp = attempt.timestamp || this.now();
            const event = {
                event_id: attempt.event_id || this.idFactory(),
                lexical_unit_id: attempt.lexical_unit_id,
                sense_id: attempt.sense_id || null,
                skill: attempt.skill,
                exercise_type: attempt.exercise_type,
                result: attempt.result,
                timestamp,
                user_answer: attempt.user_answer ?? null,
                expected_answers: normalizeAnswers(attempt.expected_answers)
            };
            if (attempt.skill === 'production') {
                event.exercise_id = attempt.exercise_id;
                event.target_form = String(attempt.target_form);
            }
            this.snapshot.attempts.push(event);
            this.updateMastery(event);
            this.snapshot.updated_at = timestamp;
            this.persist();
            return cloneValue(event);
        }

        validateAttempt(attempt) {
            if (!attempt?.lexical_unit_id || !attempt.exercise_type) throw new Error('Skill attempt identity is required.');
            if (!SKILLS.has(attempt.skill)) throw new Error(`Unsupported skill: ${attempt.skill}`);
            if (attempt.skill === 'production') {
                if (!PRODUCTION_RESULTS.has(attempt.result)) throw new Error(`Unsupported production result: ${attempt.result}`);
                if (!attempt.exercise_id || !attempt.target_form) throw new Error('Production exercise identity is required.');
                return;
            }
            if (!RESULTS.has(attempt.result)) throw new Error(`Unsupported attempt result: ${attempt.result}`);
        }

        updateMastery(event) {
            const key = buildProgressKey(event.lexical_unit_id, event.sense_id, event.skill);
            const mastery = this.snapshot.mastery[key] || createMasteryRecord(event.lexical_unit_id, event.sense_id, event.skill);
            mastery.attempts += 1;
            if (event.skill === 'production') {
                for (const result of PRODUCTION_RESULTS) {
                    if (!Number.isFinite(mastery[result])) mastery[result] = 0;
                }
                mastery[event.result] += 1;
                mastery.last_result = event.result;
                mastery.last_attempt_at = event.timestamp;
                this.snapshot.mastery[key] = mastery;
                return;
            }
            if (event.result === 'correct') mastery.correct += 1;
            else mastery.incorrect += 1;
            mastery.last_result = event.result;
            mastery.last_attempt_at = event.timestamp;
            this.snapshot.mastery[key] = mastery;
        }

        persist() {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.LearningProgressStore = LearningProgressStore;
    root.learningProgressStore = new LearningProgressStore();
})(typeof window !== 'undefined' ? window : globalThis);
