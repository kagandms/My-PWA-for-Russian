(function exposeTrkiSpeakingCoordinator(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    const DEFAULT_TASK = Object.freeze({
        level: 'B1',
        package_id: 'trki-speaking-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'trki-speaking-synthetic-task-1',
        exercise_id: 'trki-speaking:synthetic:1',
        exercise_type: 'read_aloud',
        expected_text: 'Я вижу дом.',
        targets: [],
        source_reference: {
            source_id: 'src:synthetic-trki-b1-b2',
            content_policy: 'synthetic-not-official'
        }
    });

    class TrkiSpeakingCoordinator {
        constructor(options = {}) {
            this.speakingMode = options.speakingMode ?? root.speakingController;
            this.task = null;
            this.context = null;
        }

        prepare(task = DEFAULT_TASK) {
            const packageId = task.package_id || task.package?.package_id;
            const packageVersion = task.package_version || task.package?.package_version;
            if (!task.level || !packageId || !packageVersion || !task.task_id || !task.source_reference) {
                throw new Error('TRKI Speaking task identity and source reference are required.');
            }
            this.context = {
                framework: 'trki',
                level: task.level,
                package_id: packageId,
                package_version: packageVersion,
                task_id: task.task_id,
                source_reference: cloneValue(task.source_reference),
                practice_only: true
            };
            this.task = {
                ...cloneValue(task),
                trki_context: cloneValue(this.context),
                exercise_type: task.exercise_type || 'read_aloud',
                expected_text: task.expected_text ?? task.prompt ?? null,
                targets: cloneValue(task.targets || [])
            };
            return cloneValue(this.context);
        }

        getContext() {
            return this.context ? cloneValue(this.context) : null;
        }

        activate() {
            if (!this.task) this.prepare();
            if (!this.speakingMode?.configureAdaptiveExercise) throw new Error('Existing SpeakingMode is unavailable.');
            this.speakingMode.configureAdaptiveExercise(cloneValue(this.task));
            return this.getContext();
        }
    }

    root.TrkiSpeakingCoordinator = TrkiSpeakingCoordinator;
    root.trkiSpeakingController = root.trkiSpeakingController instanceof TrkiSpeakingCoordinator
        ? root.trkiSpeakingController
        : new TrkiSpeakingCoordinator();
})(typeof window !== 'undefined' ? window : globalThis);
