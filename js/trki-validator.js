(function exposeTrkiValidator(root) {
    const SCHEMA_VERSION = 1;
    const LEVELS = new Set(['B1', 'B2']);
    const SECTIONS = new Set(['grammar', 'lexicon', 'reading', 'writing', 'study', 'exam']);
    const VERIFICATION_STATUSES = new Set(['candidate', 'verified', 'rejected', 'needs_review']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createError(code, message) {
        return { code, message };
    }

    function isRecord(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function createSourceKey(reference) {
        return [reference?.source_id, reference?.document_id, reference?.version].join('::');
    }

    function indexSources(sourceCatalog) {
        const sources = Array.isArray(sourceCatalog) ? sourceCatalog : [];
        return new Map(sources.map(source => [createSourceKey(source), source]));
    }

    function validateIdentity(exercise) {
        const errors = [];
        if (!exercise?.exercise_id) errors.push(createError('exercise_id_required', 'Exercise identity is required.'));
        if (!LEVELS.has(exercise?.level)) errors.push(createError('level_required', 'TRKI level must be B1 or B2.'));
        if (!SECTIONS.has(exercise?.section)) errors.push(createError('section_required', 'TRKI section is unsupported or missing.'));
        if (!exercise?.exercise_type) errors.push(createError('exercise_type_required', 'Exercise type is required.'));
        if (!exercise?.prompt) errors.push(createError('prompt_required', 'Exercise prompt is required.'));
        if (!VERIFICATION_STATUSES.has(exercise?.verification_status)) {
            errors.push(createError('verification_status_required', 'A supported verification status is required.'));
        }
        return errors;
    }

    function validateSource(exercise, sources) {
        const reference = exercise?.source_reference;
        if (!isRecord(reference) || !reference.source_id || !reference.document_id || !reference.version || !reference.locator) {
            return [createError('source_reference_required', 'A complete source reference is required.')];
        }

        const source = sources.get(createSourceKey(reference));
        if (!source) return [createError('source_not_catalogued', 'Source identity is not present in the catalog.')];
        if (source.provenance_status !== 'verified'
            && (exercise.verification_status === 'verified' || exercise.exercise_eligible === true)) {
            return [createError('source_not_verified', 'Objective content requires a verified source catalog record.')];
        }
        return [];
    }

    function validateNumbering(numbering) {
        if (!isRecord(numbering)
            || !Number.isInteger(numbering.section_number)
            || !Number.isInteger(numbering.item_number)
            || numbering.section_number < 1
            || numbering.item_number < 1) {
            return [createError('numbering_required', 'Section and item numbering are required.')];
        }
        return [];
    }

    function validateAnswerKey(answerKey) {
        const hasOption = Number.isInteger(answerKey?.option_index) && answerKey.option_index >= 0;
        const hasAnswers = Array.isArray(answerKey?.accepted_answers) && answerKey.accepted_answers.length > 0;
        if (!hasOption && !hasAnswers) return [createError('answer_key_required', 'Objective content requires an answer key.')];
        return [];
    }

    function validatePassageAlignment(alignment) {
        if (!isRecord(alignment)
            || !alignment.passage_id
            || !Array.isArray(alignment.paragraph_ids)
            || alignment.paragraph_ids.length === 0) {
            return [createError('passage_alignment_required', 'Reading content requires passage alignment.')];
        }
        return [];
    }

    function isObjectiveExercise(exercise) {
        return exercise?.scoring?.mode === 'objective';
    }

    function validateWritingPolicy(exercise) {
        if (exercise?.section !== 'writing') return [];
        if (exercise?.scoring?.mode === 'objective' || exercise?.exercise_eligible === true) {
            return [createError('writing_objective_forbidden', 'Writing content is practice-only and cannot be objectively scored.')];
        }
        return [];
    }

    class TrkiValidator {
        constructor(options = {}) {
            this.schemaVersion = SCHEMA_VERSION;
            this.sources = indexSources(options.sourceCatalog);
        }

        validateExercise(exercise) {
            const errors = [
                ...validateIdentity(exercise),
                ...validateSource(exercise, this.sources),
                ...validateWritingPolicy(exercise)
            ];
            const objective = isObjectiveExercise(exercise);

            if (objective) {
                errors.push(...validateNumbering(exercise.numbering));
                errors.push(...validateAnswerKey(exercise.answer_key));
                if (exercise.section === 'reading') errors.push(...validatePassageAlignment(exercise.passage_alignment));
            }

            const objectiveScoreable = objective
                && errors.length === 0
                && exercise.verification_status === 'verified'
                && exercise.exercise_eligible === true;
            const practiceOnly = exercise?.section === 'writing'
                || exercise?.scoring?.mode === 'practice_only'
                || exercise?.exercise_eligible !== true;

            return {
                valid: errors.length === 0,
                errors,
                objective_scoreable: objectiveScoreable,
                practice_only: practiceOnly
            };
        }

        assertExercise(exercise) {
            const result = this.validateExercise(exercise);
            if (!result.valid) throw new Error(result.errors.map(error => error.message).join(' '));
            return cloneValue(exercise);
        }
    }

    root.TrkiValidator = TrkiValidator;
    root.TRKI_SCHEMA_VERSION = SCHEMA_VERSION;
})(typeof window !== 'undefined' ? window : globalThis);
