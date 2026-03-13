/**
 * Günün Kelimeleri Modu
 */
class DailyMode {
    constructor() {
        this.dailyWords = [];
    }

    init() {
        this.checkAndSetDailyWords();
        this.renderList();

        document.getElementById('dailyTestBtn').onclick = () => this.startTest();
    }

    checkAndSetDailyWords() {
        const today = new Date().toDateString(); // "Fri Feb 14 2026"
        const savedDate = localStorage.getItem('dailyWordsDate');
        const savedIds = localStorage.getItem('dailyWordsIds');

        if (savedDate === today && savedIds) {
            try {
                const ids = JSON.parse(savedIds);
                this.dailyWords = window.studySelector
                    ? window.studySelector.resolveWords(ids, WORDS)
                    : WORDS.filter(w => ids.includes(w.id));

                if (this.dailyWords.length < 5) {
                    this.dailyWords = [];
                }
            } catch (e) {
                this.dailyWords = [];
            }
        }

        if (this.dailyWords.length === 0) {
            this.dailyWords = this.selectDailyWords();

            // Kaydet
            const selectedIds = this.dailyWords.map(w => w.id);
            localStorage.setItem('dailyWordsDate', today);
            localStorage.setItem('dailyWordsIds', JSON.stringify(selectedIds));
        }

        // Başlığı güncelle
        const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
        document.getElementById('dailyDate').textContent = dateStr;
    }

    selectDailyWords() {
        if (!window.studySelector) {
            return app.shuffleArray([...app.getLearningWords(5)]).slice(0, 5);
        }

        const learningWords = app.getLearningWords(3);
        const dueCount = window.studySelector.getReviewCandidates(WORDS).length;
        const reviewCount = window.studySelector.getReviewTarget({ count: 5, dueCount, ratio: 0.4 });
        const reviewIds = window.studySelector.selectReviewIds({ words: WORDS, count: reviewCount });
        const coverageIds = window.studySelector.selectCoverageIds({
            words: learningWords,
            count: 5 - reviewIds.length,
            excludeIds: reviewIds
        });
        const selectedIds = app.shuffleArray([...coverageIds, ...reviewIds]);

        window.studySelector.rememberIds(selectedIds);
        return window.studySelector.resolveWords(selectedIds, WORDS);
    }

    renderList() {
        const container = document.getElementById('dailyWordsList');
        container.innerHTML = '';

        if (this.dailyWords.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:1rem;">Kelime verisi yok.</p>';
            return;
        }

        this.dailyWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'word-item daily-item';
            // Custom style for daily items if needed, mostly re-using word-item
            item.innerHTML = `
                <div class="word-text" style="width:100%; text-align:center;">
                    <span class="russian" style="font-size:1.2rem; font-weight:bold; display:block;">${word.russian}</span>
                    <span class="turkish" style="color:var(--text-muted);">${word.turkish}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    startTest() {
        // Use quiz mode with daily words via proper app flow
        if (window.quizMode) {
            document.getElementById('dailyMode')?.classList.add('hidden');
            document.getElementById('quizMode')?.classList.remove('hidden');
            app.currentMode = 'quiz';
            window.quizMode.startWithWords(this.dailyWords);
        }
    }

    reset() {
        // Moddan çıkınca yapılacaklar
    }
}

window.dailyMode = new DailyMode();
