(function exposeGrammarRepository(root) {
    const SCHEMA_VERSION = 1;
    const VERIFICATION_STATUSES = Object.freeze(['verified', 'candidate', 'unverified', 'needs_review']);
    const DEFAULT_PATHS = Object.freeze({
        grammarLab: '/data/grammar/grammar-lab.v1.json',
        contrastTraining: '/data/grammar/contrast-training.v1.json'
    });

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function assertArtifactVersion(artifact, expectedType) {
        if (artifact?.schema_version !== SCHEMA_VERSION) throw new Error(`Unsupported ${expectedType} schema version.`);
        if (artifact.artifact !== expectedType) throw new Error(`Unexpected ${expectedType} artifact.`);
    }

    function assertUniqueIds(items, field, label) {
        const ids = new Set();
        items.forEach(item => {
            const id = item?.[field];
            if (!id) throw new Error(`${label} ID is required.`);
            if (ids.has(id)) throw new Error(`Duplicate ${label} ID: ${id}`);
            ids.add(id);
        });
    }

    class GrammarRepository {
        constructor(options = {}) {
            this.fetch = options.fetch || (typeof root.fetch === 'function' ? root.fetch.bind(root) : null);
            this.paths = { ...DEFAULT_PATHS, ...(options.paths || {}) };
            this.grammarLab = { schema_version: SCHEMA_VERSION, artifact: 'grammar-lab', exercises: [] };
            this.contrastTraining = { schema_version: SCHEMA_VERSION, artifact: 'contrast-training', contrasts: [] };
        }

        async load() {
            if (typeof this.fetch !== 'function') throw new Error('Grammar artifact loader is unavailable.');
            const responses = await Promise.all([
                this.fetch(this.paths.grammarLab),
                this.fetch(this.paths.contrastTraining)
            ]);
            const artifacts = await Promise.all(responses.map(response => {
                if (!response.ok) throw new Error(`Grammar artifact request failed: ${response.status}`);
                return response.json();
            }));
            return this.loadFromArtifacts({ grammarLab: artifacts[0], contrastTraining: artifacts[1] });
        }

        loadFromArtifacts({ grammarLab, contrastTraining }) {
            this.validateGrammarLab(grammarLab);
            this.validateContrastTraining(contrastTraining);
            this.grammarLab = cloneValue(grammarLab);
            this.contrastTraining = cloneValue(contrastTraining);
            return { grammar_exercises: this.grammarLab.exercises.length, contrasts: this.contrastTraining.contrasts.length };
        }

        getAllExercises() {
            return cloneValue(this.grammarLab.exercises);
        }

        getScoredExercises() {
            return this.getAllExercises().filter(exercise => exercise.verification_status === 'verified' && exercise.exercise_eligible === true);
        }

        getAllContrasts() {
            return cloneValue(this.contrastTraining.contrasts);
        }

        getScoredContrasts() {
            return this.getAllContrasts().filter(contrast => contrast.verification_status === 'verified' && contrast.exercise_eligible === true);
        }

        validateGrammarLab(artifact) {
            assertArtifactVersion(artifact, 'grammar-lab');
            if (!Array.isArray(artifact.exercises)) throw new Error('Grammar exercises must be an array.');
            assertUniqueIds(artifact.exercises, 'exercise_id', 'grammar exercise');
            artifact.exercises.forEach(exercise => {
                if (!exercise.prompt || !Array.isArray(exercise.accepted_answers) || !exercise.source) throw new Error('Grammar exercise fields are incomplete.');
                if (!VERIFICATION_STATUSES.includes(exercise.verification_status)) throw new Error('Unsupported grammar verification status.');
                if (typeof exercise.exercise_eligible !== 'boolean') throw new Error('Grammar exercise eligibility is required.');
                if (exercise.error_type && root.ErrorTaxonomy) root.ErrorTaxonomy.assertErrorType(exercise.error_type);
            });
        }

        validateContrastTraining(artifact) {
            assertArtifactVersion(artifact, 'contrast-training');
            if (!Array.isArray(artifact.contrasts)) throw new Error('Contrast training records must be an array.');
            assertUniqueIds(artifact.contrasts, 'contrast_id', 'contrast');
            artifact.contrasts.forEach(contrast => {
                if (!contrast.topic || !contrast.option_a || !contrast.option_b || !contrast.source) throw new Error('Contrast fields are incomplete.');
                if (!VERIFICATION_STATUSES.includes(contrast.verification_status)) throw new Error('Unsupported contrast verification status.');
                if (typeof contrast.exercise_eligible !== 'boolean') throw new Error('Contrast eligibility is required.');
            });
        }
    }

    root.GrammarRepository = GrammarRepository;
    root.grammarRepository = new GrammarRepository();
})(typeof window !== 'undefined' ? window : globalThis);
