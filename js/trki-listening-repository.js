(function exposeTrkiListeningRepository(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createSourceKey(source) {
        return [source?.source_id, source?.document_id, source?.version].join('::');
    }

    function createTaskRecord(packageRecord, task, questions) {
        return {
            package: cloneValue(packageRecord),
            task_id: task.task_id,
            task_type: task.task_type,
            task_hash: task.task_hash,
            audio: cloneValue(task.audio),
            replay_policy: cloneValue(task.replay_policy),
            replay_policy_hash: task.replay_policy_hash,
            transcript: task.transcript,
            transcript_hash: task.transcript_hash,
            questions: cloneValue(questions)
        };
    }

    class TrkiListeningRepository {
        constructor(options = {}) {
            this.fetch = options.fetch || root.fetch?.bind(root);
            this.paths = {
                sourceCatalog: '/data/trki/source-catalog.v1.json',
                packages: '/data/trki/listening-packages.v1.json',
                ...(options.paths || {})
            };
            this.sourceCatalog = [];
            this.packages = [];
            this.loaded = false;
        }

        async load() {
            if (this.loaded) return true;
            if (typeof this.fetch !== 'function') throw new Error('TRKI Listening artifact loader is unavailable.');
            const responses = await Promise.all([this.fetch(this.paths.sourceCatalog), this.fetch(this.paths.packages)]);
            const artifacts = await Promise.all(responses.map(async (response) => {
                if (!response?.ok) throw new Error('TRKI Listening artifact request failed.');
                return response.json();
            }));
            this.loadFromArtifacts({ sourceCatalog: artifacts[0].sources, packages: artifacts[1].packages });
            this.loaded = true;
            return true;
        }

        loadFromArtifacts({ sourceCatalog, packages }) {
            if (!Array.isArray(sourceCatalog) || !Array.isArray(packages) || packages.length === 0) {
                throw new Error('TRKI Listening artifacts are incomplete.');
            }
            const sourceMap = new Map(sourceCatalog.map((source) => [createSourceKey(source), source]));
            const packageIds = new Set();
            packages.forEach((packageRecord) => {
                root.TrkiListeningCore.validatePackage(packageRecord);
                const source = sourceMap.get(createSourceKey(packageRecord.source));
                if (!source) throw new Error(`Unknown TRKI Listening source: ${packageRecord.source.source_id}`);
                if (packageIds.has(`${packageRecord.package_id}@${packageRecord.package_version}`)) {
                    throw new Error('Duplicate TRKI Listening package version.');
                }
                packageIds.add(`${packageRecord.package_id}@${packageRecord.package_version}`);
            });
            this.sourceCatalog = cloneValue(sourceCatalog);
            this.packages = cloneValue(packages);
            return { source_count: sourceCatalog.length, package_count: packages.length };
        }

        ensureLoaded() {
            if (!this.loaded) throw new Error('TRKI Listening repository is not loaded.');
        }

        mapTask(packageRecord, task, questions) {
            return createTaskRecord(packageRecord, task, questions);
        }

        isObjective(question, packageRecord) {
            const source = this.sourceCatalog.find((item) => createSourceKey(item) === createSourceKey(packageRecord.source));
            return root.TrkiListeningCore.isObjectiveEligible(question, {
                package: packageRecord,
                sourceVerification: source?.provenance_status
            });
        }

        getObjectiveTasks() {
            this.ensureLoaded();
            return this.packages.flatMap((packageRecord) => packageRecord.tasks
                .map((task) => this.mapTask(packageRecord, task, task.questions.filter((question) => this.isObjective(question, packageRecord))))
                .filter((task) => task.questions.length > 0)
                .map(cloneValue));
        }

        getPracticeTasks() {
            this.ensureLoaded();
            return this.packages.flatMap((packageRecord) => packageRecord.tasks
                .map((task) => this.mapTask(packageRecord, task, task.questions))
                .map(cloneValue));
        }

        getTaskByIdentity(identity) {
            this.ensureLoaded();
            const key = identity?.key || identity;
            for (const packageRecord of this.packages) {
                for (const task of packageRecord.tasks) {
                    for (const question of task.questions) {
                        const current = root.TrkiListeningCore.createIdentity({
                            package_id: packageRecord.package_id,
                            package_version: packageRecord.package_version,
                            task_id: task.task_id,
                            audio_id: task.audio.audio_id,
                            question_id: question.question_id
                        });
                        if (current.key === key) return cloneValue({
                            ...createTaskRecord(packageRecord, task, [question]),
                            question
                        });
                    }
                }
            }
            return null;
        }

        getSourceCatalog() {
            return cloneValue(this.sourceCatalog);
        }
    }

    root.TrkiListeningRepository = TrkiListeningRepository;
    root.trkiListeningRepository = root.trkiListeningRepository ?? new TrkiListeningRepository();
})(typeof window !== 'undefined' ? window : globalThis);
