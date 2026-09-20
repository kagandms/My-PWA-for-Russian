(function exposeAnalyticsMode(root) {
    const LABELS = Object.freeze({ recognition: 'Recognition', recall: 'Recall', production: 'Production', grammar: 'Grammar' });

    class AnalyticsMode {
        init() {
            const mastery = root.adaptiveMasteryReadModel;
            mastery?.rebuildFromProgress?.();
            const questions = root.vocabularyRepository?.getTypedRecallQuestions?.() || [];
            const grammar = root.grammarRepository?.getScoredExercises?.() || [];
            const analytics = root.SkillAnalytics.build({
                masteryRecords: mastery?.getRecords?.() || [],
                grammarAttempts: root.grammarProgressStore?.getAttempts?.() || [],
                eligibleSenseCount: questions.length,
                grammarEligibleCount: grammar.length
            });
            this.render(analytics);
        }

        render(analytics) {
            const container = document.getElementById('analyticsCards');
            if (!container) return;
            container.textContent = '';
            Object.keys(LABELS).forEach(skill => container.appendChild(this.createCard(skill, analytics[skill])));
        }

        createCard(skill, metric) {
            const card = document.createElement('article');
            const title = document.createElement('h3');
            title.textContent = LABELS[skill];
            const summary = document.createElement('p');
            summary.textContent = this.getSummary(metric);
            card.append(title, summary);
            return card;
        }

        getSummary(metric) {
            if (metric.status === 'no_evidence' && metric.evidence_status !== 'insufficient_evidence') return 'Henüz yeterli veri yok.';
            if (metric.skill === 'production') return `Deneme: ${metric.attempts} · Hedef tespit gözlemi: ${metric.completed_observations || 0} · Accuracy hesaplanmıyor (${metric.evidence_status}).`;
            const accuracy = metric.recent_accuracy === null ? 'Henüz yeterli veri yok.' : `Yakın doğruluk: %${Math.round(metric.recent_accuracy * 100)}`;
            return `${accuracy} · Deneme: ${metric.attempts} · Zayıf sense: ${metric.weak_item_count}`;
        }
    }

    root.AnalyticsMode = AnalyticsMode;
    root.analyticsMode = new AnalyticsMode();
})(typeof window !== 'undefined' ? window : globalThis);
