(function exposeSkillAnalytics(root) {
    const SKILLS = Object.freeze(['recognition', 'recall', 'production', 'grammar']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function emptyMetric(skill, eligibleCount) {
        return {
            skill,
            status: 'no_evidence',
            attempts: 0,
            recent_accuracy: null,
            weak_item_count: 0,
            last_practiced: null,
            evidence_coverage: 0,
            eligible_count: eligibleCount
        };
    }

    function addMasteryMetric(metric, record) {
        metric.attempts += record.attempts || 0;
        metric.weak_item_count += record.status === 'needs_review' ? 1 : 0;
        metric.last_practiced = [metric.last_practiced, record.last_attempt_at].filter(Boolean).sort().at(-1) || null;
        if (record.skill === 'production') return;
        metric.correct_count = (metric.correct_count || 0) + (record.correct_count || 0);
        metric.incorrect_count = (metric.incorrect_count || 0) + (record.incorrect_count || 0);
    }

    function finalizeMetric(metric, seenCount) {
        if (metric.skill === 'production') {
            metric.completed_observations = metric.completed_observations || 0;
            metric.target_not_detected_count = metric.target_not_detected_count || 0;
            metric.empty_answer_count = metric.empty_answer_count || 0;
            metric.evidence_status = metric.attempts > 0 ? 'insufficient_evidence' : 'no_evidence';
        } else if ((metric.correct_count || 0) + (metric.incorrect_count || 0) > 0) {
            const denominator = metric.correct_count + metric.incorrect_count;
            metric.recent_accuracy = metric.correct_count / denominator;
            metric.status = metric.weak_item_count > 0 ? 'needs_review' : 'evidence_available';
        }
        metric.evidence_coverage = metric.eligible_count > 0 ? Math.min(1, seenCount / metric.eligible_count) : 0;
        delete metric.correct_count;
        delete metric.incorrect_count;
        return metric;
    }

    function buildGrammarMetric(attempts, eligibleCount) {
        const metric = emptyMetric('grammar', eligibleCount);
        const correct = attempts.filter(attempt => attempt.result === 'correct').length;
        const incorrect = attempts.filter(attempt => attempt.result === 'incorrect').length;
        metric.attempts = attempts.length;
        metric.weak_item_count = new Set(attempts.filter(attempt => attempt.result === 'incorrect').map(attempt => attempt.exercise_id)).size;
        metric.last_practiced = attempts.map(attempt => attempt.timestamp).filter(Boolean).sort().at(-1) || null;
        if (correct + incorrect > 0) {
            metric.recent_accuracy = correct / (correct + incorrect);
            metric.status = 'evidence_available';
        }
        metric.evidence_coverage = eligibleCount > 0 ? Math.min(1, new Set(attempts.map(attempt => attempt.exercise_id)).size / eligibleCount) : 0;
        return metric;
    }

    function buildSpeakingMetric(snapshot) {
        const lexicalRecords = Object.values(snapshot?.lexical_mastery || {});
        const sessionRecords = Object.values(snapshot?.sessions || {});
        const records = [...lexicalRecords, ...sessionRecords];
        const observationCount = records.reduce((total, record) => total + (record.observation_count || 0), 0);
        const transcriptObservationCount = records.reduce((total, record) => total + (record.transcript_observation_count || 0), 0);
        const targetObservationCount = lexicalRecords.reduce((total, record) => total + (record.target_observation_count || 0), 0);
        const lastPracticed = records.map(record => record.last_practiced).filter(Boolean).sort().at(-1) || null;
        return {
            skill: 'speaking',
            status: observationCount > 0 ? 'insufficient_evidence' : 'no_evidence',
            evidence_status: observationCount > 0 ? 'insufficient_evidence' : 'no_evidence',
            observation_count: observationCount,
            transcript_observation_count: transcriptObservationCount,
            target_observation_count: targetObservationCount,
            transcript_availability: {
                available: sessionRecords.filter(record => record.transcript_available === true).length,
                unavailable: sessionRecords.filter(record => record.transcript_available === false).length
            },
            last_practiced: lastPracticed,
            eligible_count: lexicalRecords.length
        };
    }

    function buildSenseMetrics(records) {
        return records.reduce((result, record) => {
            const key = `${record.lexical_unit_id}|${record.sense_id || 'sense:unknown'}`;
            result[key] = result[key] || {};
            result[key][record.skill] = cloneValue(record);
            return result;
        }, {});
    }

    function build({ masteryRecords = [], grammarAttempts = [], eligibleSenseCount = 0, grammarEligibleCount = 0, speakingSnapshot = null } = {}) {
        const metrics = Object.fromEntries(SKILLS.map(skill => [
            skill,
            emptyMetric(skill, skill === 'grammar' ? grammarEligibleCount : eligibleSenseCount)
        ]));
        const seenBySkill = Object.fromEntries(SKILLS.filter(skill => skill !== 'grammar').map(skill => [skill, new Set()]));
        masteryRecords.forEach(record => {
            const metric = metrics[record.skill];
            if (!metric) return;
            addMasteryMetric(metric, record);
            seenBySkill[record.skill]?.add(`${record.lexical_unit_id}|${record.sense_id || 'sense:unknown'}`);
            if (record.skill === 'production') {
                metric.completed_observations = (metric.completed_observations || 0) + (record.completed_observations || 0);
                metric.target_not_detected_count = (metric.target_not_detected_count || 0) + (record.target_not_detected_count || 0);
                metric.empty_answer_count = (metric.empty_answer_count || 0) + (record.empty_answer_count || 0);
            }
        });
        SKILLS.filter(skill => skill !== 'grammar').forEach(skill => finalizeMetric(metrics[skill], seenBySkill[skill].size));
        metrics.grammar = buildGrammarMetric(grammarAttempts, grammarEligibleCount);
        return { ...metrics, speaking: buildSpeakingMetric(speakingSnapshot), senses: buildSenseMetrics(masteryRecords) };
    }

    root.SkillAnalytics = Object.freeze({ build });
})(typeof window !== 'undefined' ? window : globalThis);
