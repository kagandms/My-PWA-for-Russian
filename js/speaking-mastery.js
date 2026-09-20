(function exposeSpeakingMastery(root) {
    const STORAGE_KEY = 'ru_tr_speaking_mastery_v1';
    const SCHEMA_VERSION = 1;
    const EVENT_NAMESPACE = 'ru_tr_speaking_events_v1';

    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return {
            schema_version: SCHEMA_VERSION,
            namespace: STORAGE_KEY,
            updated_at: null,
            lexical_mastery: {},
            sessions: {}
        };
    }

    function createDefaultMastery(lexicalUnitId, senseId) {
        return {
            skill: 'speaking',
            lexical_unit_id: lexicalUnitId,
            sense_id: senseId,
            status: 'not_evaluated',
            evidence_status: 'insufficient_evidence',
            observation_count: 0,
            transcript_observation_count: 0,
            target_observation_count: 0,
            target_observed_count: 0,
            target_not_observed_count: 0,
            last_practiced: null,
            pronunciation: 'not_evaluated',
            stress: 'not_evaluated',
            fluency: 'not_evaluated',
            overall: 'insufficient_evidence'
        };
    }

    function isUsableEvent(event) {
        return event?.schema_version === 1
            && event.namespace === EVENT_NAMESPACE
            && typeof event.attempt_id === 'string'
            && Array.isArray(event.targets)
            && typeof event.completed_at === 'string';
    }

    function getIdentityKey(target) {
        return target.lexical_unit_id + '|' + target.sense_id;
    }

    function findTargetObservation(event, target) {
        return event.evaluation?.transcript_observation?.observations?.find((observation) => (
            observation.lexical_unit_id === target.lexical_unit_id
            && observation.sense_id === target.sense_id
        ));
    }

    function updateLastPracticed(record, timestamp) {
        if (!record.last_practiced || timestamp > record.last_practiced) record.last_practiced = timestamp;
    }

    function updateLexicalRecord(snapshot, event, target) {
        const key = getIdentityKey(target);
        const record = snapshot.lexical_mastery[key] ?? createDefaultMastery(
            target.lexical_unit_id,
            target.sense_id
        );
        record.observation_count += 1;
        record.target_observation_count += 1;
        if (event.evaluation?.transcript_observation?.available === true) {
            record.transcript_observation_count += 1;
        }
        const targetObservation = findTargetObservation(event, target);
        if (targetObservation?.status === 'observed' || targetObservation?.status === 'exact') {
            record.target_observed_count += 1;
        }
        if (targetObservation?.status === 'not_observed') record.target_not_observed_count += 1;
        updateLastPracticed(record, event.completed_at);
        snapshot.lexical_mastery[key] = record;
    }

    function addSession(snapshot, event) {
        const transcriptAvailable = event.transcript_state === 'final_result'
            && typeof event.transcript_text === 'string'
            && event.transcript_text.trim().length > 0;
        snapshot.sessions[event.attempt_id] = {
            attempt_id: event.attempt_id,
            exercise_type: event.exercise_type,
            observation_count: 1,
            target_count: event.targets.length,
            transcript_available: transcriptAvailable,
            evidence_status: event.evaluation?.transcript_observation?.available === true
                ? 'transcript_observed'
                : 'insufficient_evidence',
            last_practiced: event.completed_at
        };
    }

    class SpeakingMasteryReadModel {
        constructor(options = {}) {
            this.storage = options.storage ?? root.localStorage;
            this.now = options.now ?? (() => new Date().toISOString());
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            const rawValue = this.storage?.getItem(STORAGE_KEY);
            if (!rawValue) return createEmptySnapshot();
            try {
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== SCHEMA_VERSION || parsed.namespace !== STORAGE_KEY) {
                    return createEmptySnapshot();
                }
                return {
                    ...createEmptySnapshot(),
                    updated_at: parsed.updated_at ?? null,
                    lexical_mastery: parsed.lexical_mastery && typeof parsed.lexical_mastery === 'object'
                        ? parsed.lexical_mastery
                        : {},
                    sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {}
                };
            } catch (error) {
                root.console?.error?.('Speaking mastery read-model read failed.', error);
                return createEmptySnapshot();
            }
        }

        rebuild(events = []) {
            const rebuilt = createEmptySnapshot();
            events.filter(isUsableEvent).forEach((event) => {
                addSession(rebuilt, event);
                event.targets.forEach((target) => updateLexicalRecord(rebuilt, event, target));
                if (!rebuilt.updated_at || event.completed_at > rebuilt.updated_at) {
                    rebuilt.updated_at = event.completed_at;
                }
            });
            if (!rebuilt.updated_at) rebuilt.updated_at = this.now();
            this.snapshot = rebuilt;
            this.persist();
            return this.getSnapshot();
        }

        getMastery({ lexicalUnitId, senseId }) {
            const key = lexicalUnitId + '|' + senseId;
            return cloneValue(this.snapshot.lexical_mastery[key] ?? createDefaultMastery(lexicalUnitId, senseId));
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        persist() {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.SpeakingMasteryReadModel = SpeakingMasteryReadModel;
})(typeof window !== 'undefined' ? window : globalThis);

