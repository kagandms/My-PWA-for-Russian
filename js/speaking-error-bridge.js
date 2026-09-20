(function exposeSpeakingErrorBridge(root) {
    function hasFinalTranscript(observation) {
        return observation?.transcript_state === 'final_result'
            && typeof observation.transcript_text === 'string'
            && observation.transcript_text.trim().length > 0;
    }

    function createErrorId(observation, errorType, lexicalUnitId, senseId) {
        return [
            'speaking',
            observation.exercise_id || 'exercise',
            errorType,
            lexicalUnitId || 'none',
            senseId || 'none'
        ].join(':');
    }

    function createRecord(observation, errorType, assertionScope, target) {
        const lexicalUnitId = target?.lexical_unit_id ?? observation.lexical_unit_id;
        const senseId = target?.sense_id ?? observation.sense_id;
        if (!lexicalUnitId || !senseId) return null;
        return {
            error_id: createErrorId(observation, errorType, lexicalUnitId, senseId),
            lexical_unit_id: lexicalUnitId,
            sense_id: senseId,
            exercise_type: observation.exercise_type,
            error_type: errorType,
            detection_method: 'deterministic',
            verification_status: 'verified',
            exercise_eligible: false,
            adaptive_eligible: false,
            evidence_scope: 'stt_final_transcript',
            assertion_scope: assertionScope,
            evidence: {
                exercise_id: observation.exercise_id || null,
                expected_text: observation.expected_text || null,
                user_transcript: observation.transcript_text,
                target_surface: target?.target_surface || observation.target_surface || null
            }
        };
    }

    function createFromObservation(observation) {
        if (!hasFinalTranscript(observation)) return null;
        if (observation.exercise_type === 'read_aloud'
            && observation.alignment_status === 'mismatch') {
            return createRecord(
                observation,
                'speaking.transcript_mismatch',
                'transcript_alignment'
            );
        }
        if (observation.exercise_type === 'prompted_speech'
            && observation.target_observation?.observed === false) {
            return createRecord(
                observation,
                'speaking.transcript_target_not_observed',
                'target_presence_in_transcript',
                observation.target_observation
            );
        }
        return null;
    }

    function recordObservation({ observation, errorStore }) {
        const record = createFromObservation(observation);
        return record ? errorStore.recordError(record) : null;
    }

    root.SpeakingErrorBridge = Object.freeze({
        createFromObservation,
        recordObservation
    });
})(typeof window !== 'undefined' ? window : globalThis);

