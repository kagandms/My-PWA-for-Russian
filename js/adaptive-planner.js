(function exposeAdaptivePlanner(root) {
    const PLANNER_VERSION = 'adaptive-planner-v1';
    const POLICY_VERSION = 'adaptive-policy-v1';
    const ESTIMATED_SECONDS = Object.freeze({ recognition: 20, recall: 45, production: 90, grammar: 60, error_review: 45 });
    const PRIORITY_WEIGHTS = Object.freeze({ recent_verified_error: 100, weak_recall: 60, weak_production: 45, grammar_weakness: 40, due_review: 30, repeated_incorrect: 20, new_item: 10, maintenance_review: 5 });
    const DEFAULT_POLICY = Object.freeze({ new_max_ratio: 0.35, max_items_per_sense: 1 });

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function identityKey(item) {
        return `${item.lexical_unit_id || 'none'}|${item.sense_id || 'none'}`;
    }

    function isEligibleError(error) {
        return error?.status === 'active'
            && error.verification_status === 'verified'
            && error.adaptive_eligible !== false;
    }

    function getActiveErrors(errorStore) {
        return (errorStore?.getErrors?.() || []).filter(isEligibleError);
    }

    function matchesError(error, item) {
        return Boolean(error.lexical_unit_id === item.lexical_unit_id && (!error.sense_id || error.sense_id === item.sense_id));
    }

    function isDue(mastery, now) {
        if (!mastery.last_attempt_at) return false;
        const elapsed = Date.parse(now) - Date.parse(mastery.last_attempt_at);
        return Number.isFinite(elapsed) && elapsed >= 24 * 60 * 60 * 1000;
    }

    function chooseReasons(item, mastery, errors, now) {
        const reasons = [];
        const matchingErrors = errors.filter(error => matchesError(error, item));
        if (item.skill === 'recall' && matchingErrors.some(error => error.error_type === 'recall.mismatch')) reasons.push('recent_verified_error');
        if (item.module === 'grammar' && matchingErrors.some(error => root.ErrorTaxonomy?.getGrammarTopic(error.error_type) === item.grammar_topic)) reasons.push('grammar_weakness');
        if (item.skill === 'recall' && mastery.status === 'needs_review') reasons.push('weak_recall');
        if (item.skill === 'production' && mastery.attempts > 0) reasons.push('weak_production');
        if (mastery.incorrect_count >= 2) reasons.push('repeated_incorrect');
        if (isDue(mastery, now)) reasons.push('due_review');
        if (mastery.attempts === 0) reasons.push('new_item');
        if (reasons.length === 0) reasons.push('maintenance_review');
        return [...new Set(reasons)];
    }

    function calculatePriority(reasons) {
        return reasons.reduce((total, reason) => total + (PRIORITY_WEIGHTS[reason] || 0), 0);
    }

    function createRegularCandidate({ module, skill, exerciseType, source, prompt, acceptedAnswers, targetForm, exerciseId, lexicalUnitId, senseId, entryType, grammarTopic, masteryReadModel, errors, now }) {
        const mastery = masteryReadModel.getMastery({ lexicalUnitId, senseId, skill });
        const item = { module, skill, exercise_type: exerciseType, prompt, accepted_answers: acceptedAnswers, target_form: targetForm, exercise_id: exerciseId, lexical_unit_id: lexicalUnitId, sense_id: senseId, entry_type: entryType, grammar_topic: grammarTopic };
        const selectionReason = chooseReasons(item, mastery, errors, now);
        return { ...item, item_id: `${module}:${lexicalUnitId || 'none'}:${senseId || grammarTopic || exerciseId}`, selection_reason: selectionReason, priority: calculatePriority(selectionReason), estimated_seconds: ESTIMATED_SECONDS[module] || 45, source_refs: [source] };
    }

    function createErrorCandidate(error) {
        return {
            item_id: `error_review:${error.error_id}`,
            module: 'error_review',
            exercise_type: 'error_review',
            skill: null,
            error_id: error.error_id,
            lexical_unit_id: error.lexical_unit_id,
            sense_id: error.sense_id || null,
            prompt: error.evidence?.user_answer || '',
            expected_answers: error.evidence?.expected_answers || [],
            selection_reason: ['recent_verified_error'],
            priority: PRIORITY_WEIGHTS.recent_verified_error,
            estimated_seconds: ESTIMATED_SECONDS.error_review,
            source_refs: [`error_notebook:${error.error_id}`]
        };
    }

    function buildCandidates({ repository, masteryReadModel, errorStore, grammarRepository, now }) {
        const errors = getActiveErrors(errorStore);
        const candidates = errors.map(createErrorCandidate);
        const questions = repository?.getTypedRecallQuestions?.() || [];
        questions.forEach(question => {
            for (const skill of ['recognition', 'recall']) {
                candidates.push(createRegularCandidate({
                    module: skill,
                    skill,
                    exerciseType: skill === 'recall' ? 'typed_recall' : 'adaptive_recognition',
                    source: `vocabulary:${question.lexical_unit_id}:${question.sense_id}`,
                    prompt: question.prompt,
                    acceptedAnswers: question.accepted_answers,
                    lexicalUnitId: question.lexical_unit_id,
                    senseId: question.sense_id,
                    entryType: question.entry_type,
                    masteryReadModel,
                    errors,
                    now
                }));
            }
        });
        (repository?.getProductionExercises?.() || []).forEach(exercise => candidates.push(createRegularCandidate({
            module: 'production',
            skill: 'production',
            exerciseType: exercise.exercise_type,
            source: `vocabulary:${exercise.lexical_unit_id}:${exercise.sense_id}`,
            prompt: exercise.prompt,
            targetForm: exercise.target_form,
            exerciseId: exercise.exercise_id,
            lexicalUnitId: exercise.lexical_unit_id,
            senseId: exercise.sense_id,
            entryType: exercise.entry_type,
            masteryReadModel,
            errors,
            now
        })));
        (grammarRepository?.getScoredExercises?.() || []).forEach(exercise => candidates.push(createRegularCandidate({
            module: 'grammar',
            skill: 'grammar',
            exerciseType: 'grammar_lab',
            source: `grammar:${exercise.exercise_id}`,
            prompt: exercise.prompt,
            acceptedAnswers: exercise.accepted_answers,
            exerciseId: exercise.exercise_id,
            grammarTopic: exercise.grammar_topic || null,
            lexicalUnitId: null,
            senseId: null,
            entryType: 'grammar_pattern',
            masteryReadModel,
            errors,
            now
        })));
        return candidates;
    }

    function sortCandidates(left, right) {
        if (right.priority !== left.priority) return right.priority - left.priority;
        return left.item_id.localeCompare(right.item_id);
    }

    function selectCandidates(candidates, durationMinutes, policy) {
        const secondsBudget = Math.max(60, Number(durationMinutes) * 60);
        const maxItems = Math.max(1, Math.floor(secondsBudget / 45));
        const maxNewItems = Math.max(1, Math.ceil(maxItems * policy.new_max_ratio));
        const selected = [];
        const seenRegularSenses = new Set();
        let newItemCount = 0;
        for (const candidate of [...candidates].sort(sortCandidates)) {
            const isErrorReview = candidate.module === 'error_review';
            const senseKey = identityKey(candidate);
            if (!isErrorReview && seenRegularSenses.has(senseKey)) continue;
            if (!isErrorReview && candidate.selection_reason.includes('new_item') && newItemCount >= maxNewItems) continue;
            const nextSeconds = selected.reduce((sum, item) => sum + item.estimated_seconds, 0) + candidate.estimated_seconds;
            if (nextSeconds > secondsBudget && selected.length > 0) continue;
            selected.push(candidate);
            if (!isErrorReview) seenRegularSenses.add(senseKey);
            if (candidate.selection_reason.includes('new_item')) newItemCount += 1;
            if (selected.length >= maxItems) break;
        }
        return selected;
    }

    function buildAdaptivePlan(options = {}) {
        const durationMinutes = Number(options.durationMinutes);
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new Error('Session duration must be positive.');
        const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
        const now = options.now ? options.now() : new Date().toISOString();
        const candidates = buildCandidates({ ...options, now });
        const plannedItems = selectCandidates(candidates, durationMinutes, policy);
        return {
            schema_version: 1,
            planner_version: PLANNER_VERSION,
            policy_version: POLICY_VERSION,
            requested_duration_minutes: durationMinutes,
            planned_items: cloneValue(plannedItems),
            estimated_seconds: plannedItems.reduce((sum, item) => sum + item.estimated_seconds, 0)
        };
    }

    root.buildAdaptivePlan = buildAdaptivePlan;
    root.AdaptivePlanner = Object.freeze({ buildAdaptivePlan, PLANNER_VERSION, POLICY_VERSION, PRIORITY_WEIGHTS });
})(typeof window !== 'undefined' ? window : globalThis);
