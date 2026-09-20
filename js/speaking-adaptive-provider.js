(function exposeSpeakingAdaptiveProvider(root) {
    const SPEAKING_SECONDS = 60;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function isScoredExercise(exercise) {
        return ['read_aloud', 'prompted_speech'].includes(exercise?.exercise_type)
            && exercise.verification_status === 'verified'
            && exercise.exercise_eligible === true
            && Array.isArray(exercise.targets)
            && exercise.targets.every(target => target?.lexical_unit_id && target.sense_id && target.target_surface);
    }

    function createScoredCandidate(exercise) {
        const firstTarget = exercise.targets[0];
        return {
            item_id: `speaking:${exercise.exercise_type}:${exercise.exercise_id}`,
            module: 'speaking',
            skill: 'speaking',
            exercise_type: exercise.exercise_type,
            exercise_id: exercise.exercise_id,
            prompt: exercise.expected_text || exercise.prompt || '',
            expected_text: exercise.expected_text || null,
            targets: cloneValue(exercise.targets),
            lexical_unit_id: firstTarget.lexical_unit_id,
            sense_id: firstTarget.sense_id,
            entry_type: 'speaking_exercise',
            selection_reason: ['speaking_practice'],
            priority: 8,
            estimated_seconds: SPEAKING_SECONDS,
            source_refs: [`speaking:${exercise.exercise_id}`],
            practice_only: false
        };
    }

    function createFreeSpeechCandidate(topic) {
        return {
            item_id: `speaking:free_speech:${topic.topic_id}`,
            module: 'speaking',
            skill: 'speaking_practice',
            exercise_type: 'free_speech',
            exercise_id: topic.topic_id,
            topic_id: topic.topic_id,
            prompt: topic.prompt,
            expected_text: null,
            targets: [],
            lexical_unit_id: null,
            sense_id: null,
            selection_reason: ['speaking_practice_only'],
            priority: 1,
            estimated_seconds: topic.duration_seconds,
            source_refs: [`speaking:free_speech:${topic.topic_id}`],
            practice_only: true
        };
    }

    function buildSpeakingAdaptiveCandidates(options = {}) {
        if (options.includeSpeaking !== true) return [];
        const exercises = Array.isArray(options.exercises)
            ? options.exercises
            : [
                ...(options.repository?.getReadAloudExercises?.() || []),
                ...(options.repository?.getPromptedExercises?.() || [])
            ];
        const candidates = exercises.filter(isScoredExercise).map(createScoredCandidate);
        if (options.includeFreeSpeech !== true) return candidates;
        const topics = Array.isArray(options.freeSpeechTopics)
            ? options.freeSpeechTopics
            : options.repository?.getFreeSpeechTopics?.() || [];
        return [
            ...candidates,
            ...topics
                .filter(topic => topic?.topic_id && Number.isInteger(topic.duration_seconds))
                .map(createFreeSpeechCandidate)
        ];
    }

    root.SpeakingAdaptiveProvider = Object.freeze({ buildSpeakingAdaptiveCandidates });
})(typeof window !== 'undefined' ? window : globalThis);
