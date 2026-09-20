(function exposeSpeakingEventStore(root) {
    const STORAGE_KEY = 'ru_tr_speaking_events_v1';
    const SCHEMA_VERSION = 1;
    const VALID_EXERCISE_TYPES = new Set(['read_aloud', 'prompted_speech', 'free_speech']);
    const VALID_TRANSCRIPT_STATES = new Set([
        'final_result',
        'partial_only',
        'no_result',
        'error',
        'unavailable'
    ]);
    const RAW_AUDIO_KEYS = new Set([
        'audio_blob',
        'blob',
        'media_stream',
        'stream',
        'object_url',
        'upload_url'
    ]);

    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return {
            schema_version: SCHEMA_VERSION,
            namespace: STORAGE_KEY,
            updated_at: null,
            events: []
        };
    }

    function isRecord(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function assertNonEmptyString(value, fieldName) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Speaking event ' + fieldName + ' is required.');
        }
    }

    function assertTimestamp(value, fieldName) {
        assertNonEmptyString(value, fieldName);
        if (Number.isNaN(Date.parse(value))) throw new Error('Speaking event ' + fieldName + ' is invalid.');
    }

    function assertSerializableValue(value, key = '') {
        if (RAW_AUDIO_KEYS.has(key)) throw new Error('Speaking event raw audio is not serializable.');
        if (value && typeof value === 'object') {
            const tag = Object.prototype.toString.call(value);
            if (tag === '[object Blob]' || tag === '[object MediaStream]') {
                throw new Error('Speaking event raw audio or media stream is not serializable.');
            }
            Object.entries(value).forEach(([childKey, childValue]) => assertSerializableValue(childValue, childKey));
        }
    }

    function validateTarget(target) {
        if (!isRecord(target)) throw new Error('Speaking target must be an object.');
        assertNonEmptyString(target.lexical_unit_id, 'target lexical_unit_id');
        assertNonEmptyString(target.sense_id, 'target sense_id');
        assertNonEmptyString(target.target_surface, 'target_surface');
        if (target.accepted_forms !== undefined) {
            if (!Array.isArray(target.accepted_forms) || target.accepted_forms.some((form) => typeof form !== 'string')) {
                throw new Error('Speaking target accepted_forms must contain strings.');
            }
        }
    }

    function validateRecording(recording) {
        if (!isRecord(recording)) throw new Error('Speaking recording metadata is required.');
        if (typeof recording.available !== 'boolean') throw new Error('Speaking recording availability is required.');
        if (recording.mime_type !== null && typeof recording.mime_type !== 'string') {
            throw new Error('Speaking recording MIME metadata is invalid.');
        }
        if (!Number.isFinite(recording.duration_ms) || recording.duration_ms < 0) {
            throw new Error('Speaking recording duration is invalid.');
        }
        if (recording.stored !== false || recording.uploaded !== false || recording.retention !== 'session_only') {
            throw new Error('Speaking audio must remain session-only.');
        }
    }

    function validateObservation(observation) {
        if (!isRecord(observation)) throw new Error('Speaking observation must be an object.');
        assertNonEmptyString(observation.kind, 'observation kind');
        assertNonEmptyString(observation.status, 'observation status');
        if (Object.keys(observation).some((key) => key.endsWith('_score') || key.includes('accuracy'))) {
            throw new Error('Speaking observations cannot contain scores.');
        }
    }

    function validateEvaluation(event) {
        const evaluation = event.evaluation;
        const observation = evaluation?.transcript_observation;
        if (!isRecord(evaluation) || !isRecord(observation)) {
            throw new Error('Speaking evaluation is required.');
        }
        if (!['not_evaluated', 'insufficient_evidence'].includes(evaluation.pronunciation)
            || evaluation.stress !== 'not_evaluated'
            || evaluation.fluency !== 'not_evaluated'
            || evaluation.overall !== 'insufficient_evidence') {
            throw new Error('Speaking evaluation must remain non-scoring.');
        }
        if (typeof observation.available !== 'boolean' || !Array.isArray(observation.observations)) {
            throw new Error('Speaking transcript observation shape is invalid.');
        }
        observation.observations.forEach(validateObservation);
        if (observation.available) {
            if (event.transcript_state !== 'final_result'
                || observation.evidence_scope !== 'stt_final_transcript'
                || !['transcript_alignment', 'target_presence_in_transcript'].includes(observation.assertion_scope)
                || observation.detection_method !== 'deterministic'
                || observation.verification_status !== 'verified'
                || observation.adaptive_eligible !== false
                || observation.exercise_eligible !== false) {
                throw new Error('Verified speaking observations require a final deterministic transcript scope.');
            }
        } else if (observation.evidence_scope !== 'none'
            || observation.assertion_scope !== 'none'
            || observation.detection_method !== 'none'
            || observation.verification_status !== 'not_evaluated'
            || observation.adaptive_eligible !== false
            || observation.exercise_eligible !== false
            || observation.observations.length > 0) {
            throw new Error('Unavailable speaking observations must remain unevaluated.');
        }
        const expectedAvailability = observation.available ? 'transcript_observation' : 'none';
        if (event.evaluation_availability !== expectedAvailability) {
            throw new Error('Speaking evaluation availability is inconsistent.');
        }
    }

    function validateEvent(event) {
        if (!isRecord(event)) throw new Error('Speaking event must be an object.');
        assertSerializableValue(event);
        if (event.schema_version !== SCHEMA_VERSION || event.namespace !== STORAGE_KEY) {
            throw new Error('Speaking event schema or namespace is invalid.');
        }
        assertNonEmptyString(event.event_id, 'event_id');
        assertNonEmptyString(event.attempt_id, 'attempt_id');
        assertTimestamp(event.started_at, 'started_at');
        assertTimestamp(event.completed_at, 'completed_at');
        if (event.skill !== 'speaking') throw new Error('Speaking event skill is invalid.');
        if (!VALID_EXERCISE_TYPES.has(event.exercise_type)) throw new Error('Speaking exercise type is invalid.');
        if (event.attempt_status !== 'completed') throw new Error('Only completed speaking attempts are learning events.');
        if (!Array.isArray(event.targets)) throw new Error('Speaking targets are required.');
        event.targets.forEach(validateTarget);
        if (event.exercise_type === 'free_speech' && event.targets.length > 0) {
            throw new Error('Free Speech cannot create lexical targets by default.');
        }
        if (event.exercise_type === 'read_aloud') assertNonEmptyString(event.expected_text, 'expected_text');
        if (event.expected_text !== null && typeof event.expected_text !== 'string') {
            throw new Error('Speaking expected_text must be a string or null.');
        }
        if (typeof event.transcript_text !== 'string') throw new Error('Speaking transcript_text is required.');
        if (!VALID_TRANSCRIPT_STATES.has(event.transcript_state)) throw new Error('Speaking transcript state is invalid.');
        validateRecording(event.recording);
        validateEvaluation(event);
    }

    function isValidStoredEvent(event) {
        try {
            validateEvent(event);
            return true;
        } catch {
            return false;
        }
    }

    class SpeakingEventStore {
        constructor(options = {}) {
            this.storage = options.storage ?? root.localStorage;
            this.now = options.now ?? (() => new Date().toISOString());
            this.idFactory = options.idFactory ?? (() => 'speaking:event:' + Date.now() + ':' + Math.random().toString(36).slice(2));
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            const rawValue = this.storage?.getItem(STORAGE_KEY);
            if (!rawValue) return createEmptySnapshot();
            try {
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== SCHEMA_VERSION
                    || parsed.namespace !== STORAGE_KEY
                    || !Array.isArray(parsed.events)
                    || parsed.events.some((event) => !isValidStoredEvent(event))) {
                    return createEmptySnapshot();
                }
                return {
                    schema_version: SCHEMA_VERSION,
                    namespace: STORAGE_KEY,
                    updated_at: parsed.updated_at ?? null,
                    events: parsed.events.map(cloneValue)
                };
            } catch (error) {
                root.console?.error?.('Speaking event store read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        hasAttempt(attemptId) {
            return this.snapshot.events.some((event) => event.attempt_id === attemptId);
        }

        recordEvent(event) {
            const candidate = {
                ...event,
                event_id: event?.event_id || this.idFactory()
            };
            validateEvent(candidate);
            const existing = this.snapshot.events.find((storedEvent) => storedEvent.attempt_id === candidate.attempt_id);
            if (existing) return cloneValue(existing);
            const storedEvent = cloneValue(candidate);
            this.snapshot.events.push(storedEvent);
            this.persist(candidate.completed_at);
            return cloneValue(storedEvent);
        }

        clearHistory() {
            this.snapshot = createEmptySnapshot();
            this.persist(this.now());
        }

        persist(timestamp) {
            this.snapshot.updated_at = timestamp;
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.SpeakingEventStore = SpeakingEventStore;
})(typeof window !== 'undefined' ? window : globalThis);

