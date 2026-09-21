(function exposeTrkiRepository(root) {
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createSourceKey(source) {
        return [source?.source_id, source?.document_id, source?.version].join('::');
    }

    function assertUnique(items, field, label) {
        const identities = new Set();
        items.forEach(item => {
            if (!item?.[field]) throw new Error(`${label} ID is required.`);
            if (identities.has(item[field])) throw new Error(`Duplicate ${label} ID: ${item[field]}`);
            identities.add(item[field]);
        });
    }

    function validateSourceCatalog(sourceCatalog) {
        if (!Array.isArray(sourceCatalog)) throw new Error('TRKI source catalog must be an array.');
        assertUnique(sourceCatalog, 'source_id', 'TRKI source');
        const keys = new Set();
        sourceCatalog.forEach(source => {
            const requiredFields = ['document_id', 'version', 'title', 'publisher', 'source_type', 'license', 'provenance_status'];
            if (requiredFields.some(field => !source[field])) throw new Error('TRKI source catalog fields are incomplete.');
            const key = createSourceKey(source);
            if (keys.has(key)) throw new Error(`Duplicate TRKI source document: ${key}`);
            keys.add(key);
        });
    }

    function assertExerciseResult(result, exerciseId) {
        if (result.valid) return;
        const reason = result.errors.map(error => error.message).join(' ');
        throw new Error(`Invalid TRKI exercise ${exerciseId}: ${reason}`);
    }

    class TrkiRepository {
        constructor(options = {}) {
            this.now = options.now || (() => new Date().toISOString());
            this.fetch = options.fetch || (typeof root.fetch === 'function' ? root.fetch.bind(root) : null);
            this.paths = {
                sourceCatalog: '/data/trki/source-catalog.v1.json',
                exercises: '/data/trki/exercises.v1.json',
                ...(options.paths || {})
            };
            this.validator = options.validator || new root.TrkiValidator({ sourceCatalog: [] });
            this.sourceCatalog = [];
            this.exercises = [];
        }

        async load() {
            if (typeof this.fetch !== 'function') throw new Error('TRKI artifact loader is unavailable.');
            const responses = await Promise.all([
                this.fetch(this.paths.sourceCatalog),
                this.fetch(this.paths.exercises)
            ]);
            const artifacts = await Promise.all(responses.map(response => {
                if (!response.ok) throw new Error(`TRKI artifact request failed: ${response.status}`);
                return response.json();
            }));
            return this.loadFromArtifacts({
                sourceCatalog: artifacts[0].sources || artifacts[0].source_catalog,
                exercises: artifacts[1].exercises
            });
        }

        loadFromArtifacts({ sourceCatalog, exercises }) {
            validateSourceCatalog(sourceCatalog);
            const validator = new root.TrkiValidator({ sourceCatalog });
            assertUnique(exercises, 'exercise_id', 'TRKI exercise');
            exercises.forEach(exercise => {
                const result = validator.validateExercise(exercise);
                assertExerciseResult(result, exercise.exercise_id);
                if (exercise.verification_status === 'verified' && exercise.exercise_eligible === true && !result.objective_scoreable) {
                    throw new Error(`Verified TRKI exercise ${exercise.exercise_id} is not objectively scoreable.`);
                }
            });
            this.validator = validator;
            this.sourceCatalog = cloneValue(sourceCatalog);
            this.exercises = cloneValue(exercises);
            return { source_count: this.sourceCatalog.length, exercise_count: this.exercises.length };
        }

        getSourceCatalog() {
            return cloneValue(this.sourceCatalog);
        }

        getAllExercises() {
            return cloneValue(this.exercises);
        }

        getExercise(exerciseId) {
            const exercise = this.exercises.find(item => item.exercise_id === exerciseId);
            return exercise ? cloneValue(exercise) : null;
        }

        getObjectiveExercises() {
            return this.exercises.filter(exercise => this.isObjectiveScoreable(exercise)).map(cloneValue);
        }

        getPracticeExercises() {
            return this.exercises.filter(exercise => !this.isObjectiveScoreable(exercise)).map(cloneValue);
        }

        isObjectiveScoreable(exercise) {
            return this.validator.validateExercise(exercise).objective_scoreable;
        }

        promoteCandidate(exerciseId, review) {
            const current = this.exercises.find(exercise => exercise.exercise_id === exerciseId);
            if (!current) throw new Error(`Unknown TRKI exercise: ${exerciseId}`);
            if (current.verification_status !== 'candidate') throw new Error('Only candidate TRKI exercises can be promoted.');
            if (current.section === 'writing' || current.scoring?.mode === 'practice_only') {
                throw new Error('Writing TRKI candidates are practice-only.');
            }
            if (!review?.reviewer_id || review.decision !== 'verified') throw new Error('A verified review decision is required.');

            const promoted = {
                ...cloneValue(current),
                verification_status: 'verified',
                exercise_eligible: true,
                review: {
                    reviewer_id: review.reviewer_id,
                    decision: review.decision,
                    reviewed_at: review.reviewed_at || this.now()
                }
            };
            const result = this.validator.validateExercise(promoted);
            if (!result.objective_scoreable) throw new Error('Candidate cannot be promoted to objective scoring.');
            this.exercises = this.exercises.map(exercise => exercise.exercise_id === exerciseId ? promoted : exercise);
            return cloneValue(promoted);
        }
    }

    root.TrkiRepository = TrkiRepository;
    root.trkiRepository = new TrkiRepository();
})(typeof window !== 'undefined' ? window : globalThis);
