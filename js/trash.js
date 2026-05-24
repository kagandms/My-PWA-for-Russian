/**
 * Kaldırılan kelimeleri ana çalışma havuzundan ayırır ve geri alınabilir tutar.
 */
class TrashManager {
    constructor() {
        this.storageKey = 'ru_tr_deleted_words';
    }

    readRecords() {
        try {
            const records = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            if (!Array.isArray(records)) return [];

            return records
                .map(record => this.normalizeRecord(record))
                .filter(Boolean);
        } catch (error) {
            console.error('Çöp kutusu verisi okunamadı', error);
            return [];
        }
    }

    writeRecords(records) {
        localStorage.setItem(this.storageKey, JSON.stringify(records));
    }

    normalizeRecord(record) {
        if (!record || typeof record !== 'object') return null;

        const wordKey = String(record.wordKey || '').trim();
        const russian = String(record.russian || '').trim();
        const turkish = String(record.turkish || '').trim();
        if (!wordKey || !russian || !turkish) return null;

        return {
            wordKey,
            id: record.id || wordKey,
            russian,
            turkish,
            english: String(record.english || '').trim(),
            deletedAt: record.deletedAt || new Date().toISOString()
        };
    }

    getWordKey(word) {
        return window.storageManager?.getWordStorageKey(word) || String(word?.key || word?.id || '');
    }

    getDeletedKeySet() {
        return new Set(this.readRecords().map(record => record.wordKey));
    }

    isDeleted(word) {
        const wordKey = this.getWordKey(word);
        if (!wordKey) return false;

        return this.getDeletedKeySet().has(wordKey);
    }

    buildRecord(word) {
        const wordKey = this.getWordKey(word);
        if (!wordKey) throw new Error('Kelime anahtarı oluşturulamadı.');

        return {
            wordKey,
            id: word?.id || wordKey,
            russian: String(word?.russian || '').trim(),
            turkish: String(word?.turkish || '').trim(),
            english: String(word?.english || '').trim(),
            deletedAt: new Date().toISOString()
        };
    }

    deleteWord(word) {
        const record = this.buildRecord(word);
        const records = this.readRecords().filter(item => item.wordKey !== record.wordKey);
        this.writeRecords([record, ...records]);
        return record;
    }

    restoreWord(wordKey) {
        const normalizedWordKey = String(wordKey || '').trim();
        if (!normalizedWordKey) return;

        const records = this.readRecords().filter(record => record.wordKey !== normalizedWordKey);
        this.writeRecords(records);
    }

    getDeletedWords() {
        return this.readRecords().map(record => ({
            ...record,
            key: record.wordKey,
            isDeletedWord: true
        }));
    }
}

window.trashManager = new TrashManager();
