class StudySelector {
    constructor() {
        this.storageKey = 'ru_tr_study_selector';
        this.deckKey = 'globalCoverage';
        this.recentLimit = 30;
        this.state = this.loadState();
    }

    createDefaultState() {
        return {
            version: 1,
            recentIds: [],
            decks: {}
        };
    }

    loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
            if (!saved || typeof saved !== 'object') return this.createDefaultState();

            return {
                ...this.createDefaultState(),
                ...saved,
                recentIds: this.normalizeIds(saved.recentIds),
                decks: saved.decks && typeof saved.decks === 'object' ? saved.decks : {}
            };
        } catch (error) {
            return this.createDefaultState();
        }
    }

    saveState() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }

    normalizeIds(ids) {
        if (!Array.isArray(ids)) return [];

        const normalizedIds = ids
            .map(id => Number(id))
            .filter(id => Number.isInteger(id) && id > 0);

        return [...new Set(normalizedIds)];
    }

    getWordIds(words) {
        return this.normalizeIds(words.map(word => word.id));
    }

    shuffleIds(ids) {
        const shuffled = [...ids];

        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }

        return shuffled;
    }

    resolveWords(ids, words) {
        const wordMap = new Map(words.map(word => [Number(word.id), word]));
        return ids.map(id => wordMap.get(Number(id))).filter(Boolean);
    }

    getTargetCount(options = {}) {
        const words = Array.isArray(options.words) ? options.words : [];
        const requestedCount = Number(options.count);

        if (!Number.isInteger(requestedCount) || requestedCount <= 0) {
            return words.length;
        }

        return Math.min(requestedCount, words.length);
    }

    getRecentIds() {
        return this.normalizeIds(this.state.recentIds).slice(0, this.recentLimit);
    }

    rememberIds(ids) {
        const selectedIds = this.normalizeIds(ids);
        const remainingRecentIds = this.getRecentIds().filter(id => !selectedIds.includes(id));

        this.state.recentIds = [...selectedIds, ...remainingRecentIds].slice(0, this.recentLimit);
        this.saveState();
    }

    isSameOrder(currentIds, nextIds) {
        if (currentIds.length !== nextIds.length) return false;
        return currentIds.every((id, index) => id === nextIds[index]);
    }

    buildDeck(words, blockedIds = []) {
        const blockedSet = new Set(this.normalizeIds(blockedIds));
        const freshIds = [];
        const deferredIds = [];

        this.getWordIds(words).forEach(id => {
            if (blockedSet.has(id)) {
                deferredIds.push(id);
                return;
            }

            freshIds.push(id);
        });

        return {
            order: [...this.shuffleIds(freshIds), ...this.shuffleIds(deferredIds)],
            cursor: 0
        };
    }

    sanitizeDeck(words, deck) {
        const validIds = this.getWordIds(words);
        const validIdSet = new Set(validIds);
        const currentOrder = this.normalizeIds(deck?.order).filter(id => validIdSet.has(id));
        const existingIds = new Set(currentOrder);
        const missingIds = validIds.filter(id => !existingIds.has(id));
        const rawCursor = Number(deck?.cursor) || 0;
        const cursor = Math.min(Math.max(rawCursor, 0), currentOrder.length);

        return {
            order: [
                ...currentOrder.slice(0, cursor),
                ...this.shuffleIds(missingIds),
                ...currentOrder.slice(cursor)
            ],
            cursor
        };
    }

    getDeck(words, deckName = this.deckKey) {
        this.state.decks = this.state.decks && typeof this.state.decks === 'object' ? this.state.decks : {};

        const currentDeck = this.state.decks[deckName];
        const sanitizedDeck = this.sanitizeDeck(words, currentDeck);

        if (!currentDeck || !this.isSameOrder(currentDeck.order || [], sanitizedDeck.order) || currentDeck.cursor !== sanitizedDeck.cursor) {
            this.state.decks[deckName] = sanitizedDeck;
        }

        return this.state.decks[deckName];
    }

    resetDeck(words, options = {}) {
        const deckName = options.deckName || this.deckKey;
        const blockedIds = options.blockedIds || [];

        this.state.decks[deckName] = this.buildDeck(words, blockedIds);
        return this.state.decks[deckName];
    }

    selectCoverageIds(options = {}) {
        const words = Array.isArray(options.words) ? options.words : [];
        const targetCount = this.getTargetCount({ count: options.count, words });
        const selectedIds = [];
        const excludeIds = this.normalizeIds(options.excludeIds);
        const excludeSet = new Set(excludeIds);
        const deckName = options.deckName || this.deckKey;

        while (selectedIds.length < targetCount) {
            let deck = this.getDeck(words, deckName);
            if (deck.order.length === 0) break;

            if (deck.cursor >= deck.order.length) {
                deck = this.resetDeck(words, {
                    deckName,
                    blockedIds: [...this.getRecentIds(), ...excludeIds, ...selectedIds]
                });
            }

            const candidateId = deck.order[deck.cursor];
            deck.cursor += 1;

            if (excludeSet.has(candidateId) || selectedIds.includes(candidateId)) continue;
            selectedIds.push(candidateId);
        }

        this.saveState();
        return selectedIds;
    }

    getReviewCandidates(words) {
        if (!window.srsManager?.getReviewWords) return [];
        return window.srsManager.getReviewWords(words);
    }

    getReviewTarget(options = {}) {
        const count = Number(options.count) || 0;
        const dueCount = Number(options.dueCount) || 0;
        const ratio = Number(options.ratio) || 0;

        if (count <= 0 || dueCount <= 0 || ratio <= 0) return 0;

        const ratioTarget = Math.round(count * ratio);
        const minimumTarget = count >= 5 ? 1 : 0;

        return Math.min(dueCount, Math.max(minimumTarget, ratioTarget));
    }

    selectReviewIds(options = {}) {
        const words = Array.isArray(options.words) ? options.words : [];
        const dueWords = this.getReviewCandidates(words);
        const targetCount = Math.min(Number(options.count) || 0, dueWords.length);

        if (targetCount === 0) return [];

        const excludeSet = new Set(this.normalizeIds(options.excludeIds));
        const recentSet = new Set(this.getRecentIds());
        const candidateIds = dueWords
            .map(word => Number(word.id))
            .filter(id => !excludeSet.has(id));

        const freshIds = candidateIds.filter(id => !recentSet.has(id));
        const deferredIds = candidateIds.filter(id => recentSet.has(id));

        return [...this.shuffleIds(freshIds), ...this.shuffleIds(deferredIds)].slice(0, targetCount);
    }
}

window.studySelector = new StudySelector();
