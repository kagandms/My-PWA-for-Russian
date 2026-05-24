/**
 * Kullanıcı tarafından eklenen kelimeleri kalıcı ve ana havuza uyumlu tutar.
 */
class UserWordsManager {
    constructor() {
        this.storageKey = 'ru_tr_user_words';
        this.baseId = 1000000;
        this.category = 'Kullanıcı Kelimeleri';
    }

    normalizeText(value) {
        return String(value || '').trim().replace(/\s+/g, ' ');
    }

    getSafePositiveInteger(value) {
        const numericValue = Number(value);
        if (Number.isSafeInteger(numericValue) && numericValue > 0) return numericValue;
        return null;
    }

    readRecords() {
        try {
            const rawRecords = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            if (!Array.isArray(rawRecords)) return [];

            return rawRecords
                .map((rawRecord, index) => this.normalizeRecord(rawRecord, index))
                .filter(Boolean);
        } catch (error) {
            console.error('Kullanıcı kelimeleri okunamadı', error);
            return [];
        }
    }

    writeRecords(records) {
        localStorage.setItem(this.storageKey, JSON.stringify(records));
    }

    normalizeRecord(rawRecord, index) {
        if (!rawRecord || typeof rawRecord !== 'object') return null;

        const russian = this.normalizeText(rawRecord.russian);
        const turkish = this.normalizeText(rawRecord.turkish);
        if (!russian || !turkish) return null;

        const fallbackId = this.baseId + index;
        const id = this.getSafePositiveInteger(rawRecord.id) || fallbackId;

        return {
            id,
            russian,
            turkish,
            createdAt: rawRecord.createdAt || new Date().toISOString(),
            updatedAt: rawRecord.updatedAt || rawRecord.createdAt || new Date().toISOString()
        };
    }

    validateFormValues(formValues) {
        const russian = this.normalizeText(formValues.russian);
        const turkish = this.normalizeText(formValues.turkish);

        if (!russian) throw new Error('Rusça kelime boş olamaz.');
        if (!turkish) throw new Error('Türkçe karşılık boş olamaz.');

        return { russian, turkish };
    }

    generateId(records) {
        const maxRecordId = records.reduce((maxId, record) => {
            return Math.max(maxId, record.id || 0);
        }, this.baseId - 1);

        return maxRecordId + 1;
    }

    buildRecord(formValues, records) {
        const validatedValues = this.validateFormValues(formValues);
        const id = this.generateId(records);
        const createdAt = new Date().toISOString();

        return {
            ...validatedValues,
            id,
            createdAt,
            updatedAt: createdAt
        };
    }

    buildWord(record) {
        const id = record.id;
        if (!id) return null;

        const word = {
            id,
            russian: record.russian,
            turkish: record.turkish,
            sourceLineNumber: id,
            category: this.category,
            example: { russian: '', turkish: '' },
            sentences: [],
            isUserWord: true
        };

        return {
            ...word,
            key: window.storageManager?.buildWordStorageKey(word) || String(id)
        };
    }

    buildWordsForRecord(record) {
        return [this.buildWord(record)].filter(Boolean);
    }

    buildWords() {
        return this.readRecords().flatMap(record => this.buildWordsForRecord(record));
    }

    ensureNoDuplicate(record) {
        const words = Array.isArray(window.WORDS) ? window.WORDS : [];
        const existingKeys = new Set(words.map(word => window.storageManager?.buildWordStorageKey(word) || ''));
        const duplicateWord = this.buildWordsForRecord(record)
            .find(word => existingKeys.has(window.storageManager?.buildWordStorageKey(word) || ''));

        if (duplicateWord) {
            throw new Error(`Bu kelime zaten var: ${duplicateWord.russian} - ${duplicateWord.turkish}`);
        }
    }

    addRecord(formValues) {
        const records = this.readRecords();
        const record = this.buildRecord(formValues, records);

        this.ensureNoDuplicate(record);
        this.writeRecords([record, ...records]);
        return record;
    }
}

window.userWordsManager = new UserWordsManager();
