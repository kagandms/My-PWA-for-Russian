(function exposeSpeakingExerciseRepository(root) {
    const READ_ALOUD_SCHEMA = 1;
    const READ_ALOUD_ARTIFACT = 'speaking-read-aloud-exercises';
    const TOPICS_ARTIFACT = 'speaking-free-speech-topics';
    const SENTENCE_SOURCE_HASH = 'd16bdbd8d166057365b510a12c6b886931fa08d6f55b1e250cd1359a10c7bb3a';

    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function assertArtifact(artifact, expectedType) {
        if (!artifact || artifact.schema_version !== READ_ALOUD_SCHEMA || artifact.artifact_type !== expectedType) {
            throw new Error('Unsupported speaking artifact: ' + expectedType);
        }
    }

    function assertSourceReference(entry) {
        if (entry.source?.source_sha256 && entry.source.source_sha256 !== SENTENCE_SOURCE_HASH) {
            throw new Error('Speaking sentence source hash mismatch.');
        }
        if (!Number.isInteger(entry.source?.source_line_number) || entry.source.source_line_number < 1) {
            throw new Error('Speaking source line reference is required.');
        }
        if (!Number.isInteger(entry.source?.sentence_index) || entry.source.sentence_index < 0) {
            throw new Error('Speaking sentence index reference is required.');
        }
    }

    function assertTargetShape(target) {
        if (!target?.lexical_unit_id || !target.sense_id || !target.target_surface) {
            throw new Error('Speaking target identity must be paired.');
        }
        if ('lexical_unit_ids' in target || 'sense_ids' in target) {
            throw new Error('Speaking targets cannot use independent identity arrays.');
        }
    }

    function assertEntryShape(entry, options = {}) {
        if (!entry?.exercise_id || !Array.isArray(entry.targets)) throw new Error('Speaking exercise identity is required.');
        entry.targets.forEach(assertTargetShape);
        if (options.readAloud) {
            if (!entry.expected_text || !entry.source) throw new Error('Read Aloud source and expected text are required.');
            assertSourceReference(entry);
        }
        if (options.prompted && (entry.targets.length < 2 || entry.targets.length > 4)) {
            throw new Error('Prompted Speech must contain two to four targets.');
        }
    }

    function isCatalogEligible(entry) {
        return entry.verification_status === 'verified' && entry.exercise_eligible === true;
    }

    function isCanonicalEligible(repository, target) {
        const unit = repository.getLexicalUnit(target.lexical_unit_id);
        const sense = repository.getSense(target.sense_id);
        const belongsToUnit = unit?.senses?.some((item) => item.sense_id === target.sense_id);
        return Boolean(
            unit
            && sense
            && belongsToUnit
            && unit.exercise_eligible === true
            && unit.verification_status !== 'needs_review'
            && sense.exercise_eligible === true
            && sense.verification_status !== 'needs_review'
        );
    }

    function mapExercise(entry, type, sourceHash = null) {
        const source = entry.source
            ? { ...cloneValue(entry.source), ...(sourceHash ? { source_sha256: sourceHash } : {}) }
            : null;
        return {
            exercise_id: entry.exercise_id,
            exercise_type: type,
            prompt: entry.prompt ?? null,
            expected_text: entry.expected_text ?? null,
            verification_status: entry.verification_status,
            exercise_eligible: entry.exercise_eligible,
            source,
            targets: entry.targets.map((target) => ({
                lexical_unit_id: target.lexical_unit_id,
                sense_id: target.sense_id,
                target_surface: target.target_surface,
                ...(target.accepted_forms ? { accepted_forms: [...target.accepted_forms] } : {})
            }))
        };
    }

    class SpeakingExerciseRepository {
        constructor(options = {}) {
            this.readAloudArtifact = options.readAloudArtifact ?? null;
            this.freeSpeechArtifact = options.freeSpeechArtifact ?? null;
            this.vocabularyRepository = options.vocabularyRepository ?? root.vocabularyRepository;
            this.fetchImpl = options.fetchImpl ?? root.fetch?.bind(root);
            this.loaded = false;
        }

        async load() {
            if (this.loaded) return true;
            if (!this.readAloudArtifact || !this.freeSpeechArtifact) {
                if (typeof this.fetchImpl !== 'function') throw new Error('Speaking artifact fetch is unavailable.');
                const [readAloudResponse, freeSpeechResponse] = await Promise.all([
                    this.fetchImpl('data/speaking/read-aloud-exercises.v1.json'),
                    this.fetchImpl('data/speaking/free-speech-topics.v1.json')
                ]);
                if (!readAloudResponse?.ok || !freeSpeechResponse?.ok) {
                    throw new Error('Speaking artifact request failed.');
                }
                this.readAloudArtifact = await readAloudResponse.json();
                this.freeSpeechArtifact = await freeSpeechResponse.json();
            }
            this.validateArtifacts();
            this.loaded = true;
            return true;
        }

        validateArtifacts() {
            assertArtifact(this.readAloudArtifact, READ_ALOUD_ARTIFACT);
            assertArtifact(this.freeSpeechArtifact, TOPICS_ARTIFACT);
            if (this.readAloudArtifact.source?.source_sha256 !== SENTENCE_SOURCE_HASH) {
                throw new Error('Speaking sentence source hash is invalid.');
            }
            for (const entry of this.readAloudArtifact.scored_read_aloud ?? []) {
                assertEntryShape(entry, { readAloud: true });
            }
            for (const entry of this.readAloudArtifact.practice_read_aloud ?? []) {
                assertEntryShape(entry, { readAloud: true });
            }
            for (const entry of this.readAloudArtifact.prompted_exercises ?? []) {
                assertEntryShape(entry, { prompted: true });
            }
            if (!Array.isArray(this.freeSpeechArtifact.topics)) throw new Error('Free Speech topics are required.');
            this.freeSpeechArtifact.topics.forEach((topic) => {
                if (!topic.topic_id || !Number.isInteger(topic.duration_seconds)
                    || topic.duration_seconds < 30 || topic.duration_seconds > 60
                    || topic.lexical_unit_id || topic.sense_id || topic.targets) {
                    throw new Error('Free Speech topic must remain targetless.');
                }
            });
        }

        ensureLoaded() {
            if (!this.loaded) throw new Error('Speaking exercise repository is not loaded.');
        }

        getReadAloudExercises() {
            this.ensureLoaded();
            return this.readAloudArtifact.scored_read_aloud
                .filter((entry) => isCatalogEligible(entry))
                .filter((entry) => entry.targets.every((target) => isCanonicalEligible(this.vocabularyRepository, target)))
                .map((entry) => mapExercise(entry, 'read_aloud', this.readAloudArtifact.source.source_sha256))
                .map(cloneValue);
        }

        getReadAloudPracticeMetadata() {
            this.ensureLoaded();
            return (this.readAloudArtifact.practice_read_aloud ?? [])
                .map((entry) => mapExercise(entry, 'read_aloud_practice', this.readAloudArtifact.source.source_sha256))
                .map(cloneValue);
        }

        getPromptedExercises() {
            this.ensureLoaded();
            return this.readAloudArtifact.prompted_exercises
                .filter((entry) => isCatalogEligible(entry))
                .filter((entry) => entry.targets.every((target) => isCanonicalEligible(this.vocabularyRepository, target)))
                .map((entry) => mapExercise(entry, 'prompted_speech'))
                .map(cloneValue);
        }

        getFreeSpeechTopics() {
            this.ensureLoaded();
            return cloneValue(this.freeSpeechArtifact.topics);
        }
    }

    root.SpeakingExerciseRepository = SpeakingExerciseRepository;
})(typeof window !== 'undefined' ? window : globalThis);
