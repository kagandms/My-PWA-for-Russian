(function exposeAdaptiveEngine(root) {
    class AdaptiveEngine {
        constructor(options = {}) {
            this.sessionStore = options.sessionStore || root.adaptiveSessionStore;
            this.mastery = options.mastery || root.adaptiveMasteryReadModel;
            this.planner = options.planner || root.buildAdaptivePlan;
            this.repository = options.repository || root.vocabularyRepository;
            this.errorStore = options.errorStore || root.errorNotebookStore;
            this.grammarRepository = options.grammarRepository || root.grammarRepository;
            this.speakingProvider = options.speakingProvider || root.SpeakingAdaptiveProvider;
            this.speakingRepository = options.speakingRepository || root.speakingExerciseRepository;
            this.speakingMastery = options.speakingMastery || root.speakingMasteryReadModel;
        }

        rebuildMastery() {
            return this.mastery?.rebuildFromProgress?.();
        }

        startSession(durationMinutes, options = {}) {
            this.rebuildMastery();
            const additionalCandidates = options.includeSpeaking === true
                ? this.speakingProvider?.buildSpeakingAdaptiveCandidates?.({
                    includeSpeaking: true,
                    includeFreeSpeech: options.includeFreeSpeech === true,
                    repository: options.speakingRepository || this.speakingRepository,
                    speakingMastery: this.speakingMastery
                }) || []
                : [];
            const plan = this.planner({
                durationMinutes,
                repository: this.repository,
                masteryReadModel: this.mastery,
                errorStore: this.errorStore,
                grammarRepository: this.grammarRepository,
                additionalCandidates
            });
            return this.sessionStore.createSession(plan);
        }

        getActiveSession() {
            return this.sessionStore.getActiveSession();
        }

        getCurrentItem() {
            const session = this.getActiveSession();
            return session?.planned_items?.[session.current_index] || null;
        }

        completeItem(itemId, outcome) {
            return this.sessionStore.completeItem(this.getActiveSession()?.session_id, itemId, outcome);
        }

        pause() {
            return this.sessionStore.pause();
        }

        resume() {
            return this.sessionStore.resume();
        }

        complete() {
            return this.sessionStore.complete();
        }
    }

    root.AdaptiveEngine = AdaptiveEngine;
    root.adaptiveEngine = new AdaptiveEngine();
})(typeof window !== 'undefined' ? window : globalThis);
