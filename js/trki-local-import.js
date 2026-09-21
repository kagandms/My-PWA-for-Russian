(function exposeTrkiLocalImport(root) {
    const SCHEMA_VERSION = 1;
    const ARTIFACT = 'trki-local-candidate-bundle';
    const ALLOWED_SOURCE_TYPES = new Set(['local_user', 'synthetic']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function assertBundle(bundle) {
        if (bundle?.schema_version !== SCHEMA_VERSION || bundle.artifact !== ARTIFACT) {
            throw new Error('TRKI local candidate bundle schema is invalid.');
        }
        if (!Array.isArray(bundle.source_catalog) || !Array.isArray(bundle.exercises)) {
            throw new Error('TRKI local candidate bundle must contain source catalog and exercises.');
        }
        bundle.source_catalog.forEach(source => {
            if (!ALLOWED_SOURCE_TYPES.has(source.source_type)) throw new Error('TRKI local sources must be local_user or synthetic.');
            if (!source.license || source.provenance_status !== 'candidate') throw new Error('TRKI local sources require candidate provenance and license.');
        });
        bundle.exercises.forEach(exercise => {
            if (exercise.verification_status !== 'candidate' || exercise.exercise_eligible !== false) {
                throw new Error('TRKI local exercises must remain candidate and not eligible.');
            }
            if (exercise.source_content || exercise.source_document) throw new Error('Raw TRKI source documents cannot enter the local candidate bundle.');
        });
    }

    class TrkiLocalImport {
        constructor(options = {}) {
            this.repository = options.repository || root.trkiRepository;
        }

        importBundle(bundle) {
            assertBundle(bundle);
            return this.repository.loadFromArtifacts({
                sourceCatalog: cloneValue(bundle.source_catalog),
                exercises: cloneValue(bundle.exercises)
            });
        }

        exportBundle() {
            const sources = this.repository.getSourceCatalog().filter(source => ALLOWED_SOURCE_TYPES.has(source.source_type));
            const exercises = this.repository.getAllExercises().filter(exercise => exercise.verification_status === 'candidate' && exercise.exercise_eligible === false);
            return {
                schema_version: SCHEMA_VERSION,
                artifact: ARTIFACT,
                source_catalog: cloneValue(sources),
                exercises: cloneValue(exercises)
            };
        }
    }

    root.TrkiLocalImport = TrkiLocalImport;
    root.trkiLocalImport = new TrkiLocalImport();
})(typeof window !== 'undefined' ? window : globalThis);
