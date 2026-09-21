(function exposeTrkiErrorBridge(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function isVerifiedMapping(exercise) {
        const mapping = exercise?.error_mapping;
        return exercise?.verification_status === 'verified'
            && exercise?.exercise_eligible === true
            && typeof mapping?.error_type === 'string'
            && root.TrkiErrorTaxonomy?.ERROR_TYPES.includes(mapping.error_type)
            && mapping.analytics_only !== true;
    }

    function isIncorrect(attempt) {
        return attempt?.result === 'incorrect';
    }

    function createBaseRecord({ exercise, attempt, mapping }) {
        return {
            error_id: `trki:error:${attempt.attempt_id}:${exercise.exercise_id}`,
            lexical_unit_id: `trki:${exercise.exercise_id}`,
            sense_id: null,
            skill: `trki:${exercise.section}`,
            exercise_type: exercise.exercise_type,
            error_type: mapping.error_type,
            error_subtype: mapping.error_subtype || 'unclassified',
            detection_method: 'deterministic',
            verification_status: 'verified',
            confidence: 'high',
            exercise_eligible: false,
            adaptive_eligible: false,
            evidence_scope: 'trki_objective_answer',
            assertion_scope: 'trki_verified_mapping',
            created_at: attempt.answered_at || attempt.recorded_at || new Date().toISOString(),
            source: 'trki_verified_answer_key',
            evidence: {
                attempt_id: attempt.attempt_id,
                exercise_id: exercise.exercise_id,
                user_answer: attempt.user_answer ?? '',
                source_reference: cloneValue(exercise.source_reference)
            }
        };
    }

    function createNotebookError({ exercise, attempt }) {
        if (!isIncorrect(attempt) || !isVerifiedMapping(exercise)) return null;
        return createBaseRecord({ exercise, attempt, mapping: exercise.error_mapping });
    }

    function createAnalyticsEvent({ exercise, attempt }) {
        const mapping = exercise?.error_mapping;
        if (!isIncorrect(attempt) || mapping?.analytics_only !== true || mapping.error_type !== 'trki.word_formation') return null;
        return {
            analytics_only: true,
            event_id: `trki:analytics:${attempt.attempt_id}:${exercise.exercise_id}`,
            error_type: mapping.error_type,
            exercise_id: exercise.exercise_id,
            attempt_id: attempt.attempt_id,
            user_answer: attempt.user_answer ?? '',
            created_at: attempt.answered_at || attempt.recorded_at || new Date().toISOString()
        };
    }

    root.TrkiErrorBridge = Object.freeze({ createNotebookError, createAnalyticsEvent });
})(typeof window !== 'undefined' ? window : globalThis);
