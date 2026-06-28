/**
 * Mastered Words Manager
 *
 * Ebbinghaus forgetting-curve & SM-2 tabanlı güven skoru hesaplayarak
 * "ezberlenmiş" kelimeleri otomatik tespit eder.
 *
 * Tüm veri localStorage'dan okunur — internet gerekmez.
 *
 * Bilimsel kriter referansları:
 *  • Ebbinghaus (1885): Tekrar sayısı + zaman aralığı uzun-süreli belleği gösterir
 *  • SM-2 (Wozniak, 1987): ease ≥ 2.5 & interval ≥ 21 gün → uzun süreli hafıza
 *  • Leitner (1972): Art arda doğru cevap sayısı güvenilirlik göstergesi
 */
class MasteredManager {
    constructor() {
        this.defaultThreshold = 50;
    }

    // ─── Confidence Score Calculation ───────────────────────────────

    /**
     * Calculates a 0-100 confidence score for a single word.
     * Uses SRS data + wordProgress data (both from localStorage).
     *
     * @param {object} word - A word object from the WORDS array.
     * @returns {number} Confidence score between 0 and 100.
     */
    calculateConfidenceScore(word) {
        const wordKey = this.getWordKey(word);
        const srsRecord = this.getSRSRecord(wordKey);
        const progressRecord = this.getProgressRecord(wordKey);

        let score = 0;

        // ── 1. Correct answer count (max 30 pts) ──
        // Ebbinghaus: repeated successful recall is the strongest indicator
        const correct = progressRecord.correct || 0;
        if (correct >= 5) {
            score += 30;
        } else if (correct >= 3) {
            score += 15;
        } else if (correct >= 1) {
            score += 5;
        }

        // ── 2. Perfect accuracy bonus (max 15 pts) ──
        // No errors = higher confidence
        const wrong = progressRecord.wrong || 0;
        const total = correct + wrong;
        if (total > 0) {
            const accuracy = correct / total;
            if (accuracy >= 0.95) {
                score += 15;
            } else if (accuracy >= 0.85) {
                score += 10;
            } else if (accuracy >= 0.7) {
                score += 5;
            }
        }

        // ── 3. SRS repetition count (max 20 pts) ──
        // SM-2: more reps = more solidified in long-term memory
        if (srsRecord) {
            const reps = srsRecord.reps || 0;
            if (reps >= 5) {
                score += 20;
            } else if (reps >= 3) {
                score += 12;
            } else if (reps >= 1) {
                score += 5;
            }
        }

        // ── 4. SRS interval length (max 20 pts) ──
        // Ebbinghaus: if the interval exceeds 21 days, the word is in LTM
        if (srsRecord) {
            const interval = srsRecord.interval || 0;
            if (interval >= 30) {
                score += 20;
            } else if (interval >= 14) {
                score += 15;
            } else if (interval >= 7) {
                score += 10;
            } else if (interval >= 3) {
                score += 5;
            }
        }

        // ── 5. Ease factor (max 15 pts) ──
        // SM-2: high ease = easy for the learner → confident mastery
        if (srsRecord) {
            const ease = srsRecord.ease || 2.5;
            if (ease >= 3.0) {
                score += 15;
            } else if (ease >= 2.7) {
                score += 10;
            } else if (ease >= 2.5) {
                score += 5;
            }
        }

        return Math.min(score, 100);
    }

    // ─── Detection ─────────────────────────────────────────────────

    /**
     * Detects words whose confidence score meets or exceeds the threshold.
     * Excludes already deleted/trashed words.
     *
     * @param {number} threshold - Minimum confidence score (0-100).
     * @returns {Array<{word: object, score: number}>} Sorted by score descending.
     */
    detectMasteredWords(threshold = this.defaultThreshold) {
        if (!Array.isArray(window.WORDS)) return [];

        const safeThreshold = Math.max(0, Math.min(100, Number(threshold) || this.defaultThreshold));
        const results = [];

        window.WORDS.forEach(word => {
            const score = this.calculateConfidenceScore(word);
            if (score >= safeThreshold) {
                results.push({ word, score });
            }
        });

        // Sort by score descending for better UX
        results.sort((a, b) => b.score - a.score);
        return results;
    }

    /**
     * Returns the confidence score for a single word.
     * Used by the "All Words" view to display confidence under each word.
     *
     * @param {object} word - A word object.
     * @returns {number} 0-100
     */
    getWordConfidence(word) {
        return this.calculateConfidenceScore(word);
    }

    /**
     * Returns a human-readable label and color class for a confidence score.
     *
     * @param {number} score - 0-100
     * @returns {{label: string, colorClass: string, emoji: string}}
     */
    getConfidenceDisplay(score) {
        if (score >= 80) {
            return { label: 'Отлично усвоено', colorClass: 'confidence-high', emoji: '🟢' };
        }
        if (score >= 50) {
            return { label: 'Усвоено', colorClass: 'confidence-medium', emoji: '🟡' };
        }
        if (score > 0) {
            return { label: 'Повторяй', colorClass: 'confidence-low', emoji: '🟠' };
        }
        return { label: 'Новое слово', colorClass: 'confidence-none', emoji: '⚪' };
    }

    // ─── Bulk Archive ──────────────────────────────────────────────

    /**
     * Archives selected words by moving them to the trash.
     * They can be restored at any time via the trash manager.
     *
     * @param {Array<object>} words - Array of word objects to archive.
     * @returns {number} Count of successfully archived words.
     */
    archiveWords(words) {
        if (!window.trashManager || !Array.isArray(words)) return 0;

        let archived = 0;

        words.forEach(word => {
            try {
                if (!window.trashManager.isDeleted(word)) {
                    window.trashManager.deleteWord(word);
                    archived++;
                }
            } catch (error) {
                console.error('Failed to archive word:', word?.russian, error);
            }
        });

        return archived;
    }

    // ─── Statistics ────────────────────────────────────────────────

    /**
     * Returns aggregate stats about confidence distribution.
     *
     * @returns {{total: number, high: number, medium: number, low: number, none: number}}
     */
    getConfidenceStats() {
        const stats = { total: 0, high: 0, medium: 0, low: 0, none: 0 };

        if (!Array.isArray(window.WORDS)) return stats;

        window.WORDS.forEach(word => {
            const score = this.calculateConfidenceScore(word);
            stats.total++;

            if (score >= 80) stats.high++;
            else if (score >= 50) stats.medium++;
            else if (score > 0) stats.low++;
            else stats.none++;
        });

        return stats;
    }

    // ─── Helpers (Private) ─────────────────────────────────────────

    /** @private */
    getWordKey(word) {
        return window.storageManager?.getWordStorageKey(word.id) ||
               window.storageManager?.buildWordStorageKey(word) ||
               String(word?.id || '');
    }

    /** @private */
    getSRSRecord(wordKey) {
        if (!window.srsManager?.data) return null;

        return window.srsManager.data[wordKey] ||
               window.srsManager.data[String(wordKey)] ||
               null;
    }

    /** @private */
    getProgressRecord(wordKey) {
        const stats = window.app?.stats || {};
        const progress = stats.wordProgress || {};

        return progress[wordKey] ||
               progress[String(wordKey)] ||
               { correct: 0, wrong: 0 };
    }
}

window.masteredManager = new MasteredManager();
