(function exposeErrorNotebookCore(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createTypedRecallError({ attempt, result }) {
        if (!attempt || !result) return null;
        const isMismatch = result.result === 'incorrect';
        const isTypo = result.result === 'almost_correct' && result.typo === true && result.reason === 'typo';
        if (!isMismatch && !isTypo) return null;
        const errorType = isTypo ? 'spelling' : 'recall.mismatch';
        const subtype = isTypo ? 'typo' : 'unclassified';
        return {
            error_id: `error:${attempt.event_id || `${attempt.lexical_unit_id}:${attempt.timestamp}`}`,
            lexical_unit_id: attempt.lexical_unit_id,
            sense_id: attempt.sense_id || null,
            skill: attempt.skill,
            exercise_type: attempt.exercise_type,
            error_type: errorType,
            error_subtype: subtype,
            detection_method: 'deterministic',
            verification_status: 'verified',
            confidence: 'high',
            exercise_eligible: false,
            created_at: attempt.timestamp,
            source: 'typed_recall_evaluator',
            evidence: {
                attempt_id: attempt.event_id || null,
                evaluator_result: cloneValue(result),
                user_answer: attempt.user_answer ?? result.user_answer ?? '',
                expected_answers: [...(attempt.expected_answers || result.expected_answers || [])]
            }
        };
    }

    root.ErrorNotebookCore = Object.freeze({ createTypedRecallError });
})(typeof window !== 'undefined' ? window : globalThis);
