class SRSManager {
    constructor() {
        this.storageKey = 'ru_tr_srs_data';
        this.data = this.loadData();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : {};

            if (!window.storageManager?.canResolveWordKeys()) return data;
            return window.storageManager.normalizeWordRecordMap(data);
        } catch (error) {
            console.error('SRS verisi yüklenirken hata oluştu', error);
            return {};
        }
    }

    reload() {
        this.data = this.loadData();
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    getWordKey(wordId) {
        return window.storageManager?.getWordStorageKey(wordId) || String(wordId);
    }

    /**
     * @param {string|number} wordId
     * @param {boolean} isCorrect
     */
    updateWord(wordId, isCorrect) {
        const wordKey = this.getWordKey(wordId);
        let record = this.data[wordKey];

        // Eğer kelime ilk kez test ediliyorsa default değerleri ata
        if (!record) {
            record = {
                reps: 0,
                interval: 0,
                ease: 2.5,
                dueDate: Date.now()
            };
        }

        if (isCorrect) {
            // Doğru bilme durumunda SM-2 algoritması:
            if (record.reps === 0) {
                record.interval = 1;
            } else if (record.reps === 1) {
                record.interval = 6;
            } else {
                record.interval = Math.round(record.interval * record.ease);
            }
            record.reps += 1;
            // Kolay/Zor dereceleri (SM-2 Grade: 4 olarak kabul ediliyor)
            // ease = ease + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)) => ease += 0.0
            // Grade 3 (Zorlayarak doğru bilme) olsa ease -= 0.14 yapardık, şimdilik sabit doğru.
            // Ama pratik olması adına hafiften artırıp dengeleyelim:
            record.ease += 0.1;
        } else {
            // Yanlış bilindiğinde ceza:
            record.reps = 0;
            record.interval = 1; // Yarın tekrar sor
            record.ease = Math.max(1.3, record.ease - 0.2); // Ease factor 1.3'ün altına düşemez
        }

        // Interval gün olarak hesaplandığından milliseconds'a çeviriyoruz (interval * 24 saat)
        // Ancak test amaçlı interval sürelerini kısaltıp "1 saat" gibi de yapabiliriz. Normali 24 saattir.
        const dayInMs = 24 * 60 * 60 * 1000;
        record.dueDate = Date.now() + (record.interval * dayInMs);

        this.data[wordKey] = record;
        this.saveData();
    }

    /**
     * Vakti gelmiş olan kelimeleri bulur.
     * @param {Array} wordsArray Tüm WORDS array'i
     * @returns {Array} Sadece dueDate'i gelmiş veya henüz test edilmemiş kelimeler
     */
    getDueWords(wordsArray) {
        const now = Date.now();
        const dueWords = [];

        wordsArray.forEach(word => {
            const record = this.data[this.getWordKey(word.id)] || this.data[String(word.id)];
            if (!record) {
                // Hiç sorulmamış yeni kelimeler
                dueWords.push(word);
            } else if (now >= record.dueDate) {
                // Vakti gelmiş eski kelimeler
                dueWords.push(word);
            }
        });

        return dueWords;
    }

    getReviewWords(wordsArray) {
        const now = Date.now();

        return wordsArray.filter(word => {
            const record = this.data[this.getWordKey(word.id)] || this.data[String(word.id)];
            return Boolean(record && now >= record.dueDate);
        });
    }
}

// Global scope'a ekliyoruz
window.srsManager = new SRSManager();
