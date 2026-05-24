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

    normalizeRelationType(value) {
        if (value === 'synonym' || value === 'antonym') return value;
        return 'none';
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

        const relationType = this.normalizeRelationType(rawRecord.relationType);
        const pairedRussian = this.normalizeText(rawRecord.pairedRussian);
        const pairedTurkish = this.normalizeText(rawRecord.pairedTurkish);
        const hasPair = relationType !== 'none' && pairedRussian && pairedTurkish;
        const fallbackId = this.baseId + (index * 2);
        const id = this.getSafePositiveInteger(rawRecord.id) || fallbackId;
        const pairedId = hasPair
            ? this.getSafePositiveInteger(rawRecord.pairedId) || id + 1
            : null;

        return {
            id,
            russian,
            turkish,
            relationType: hasPair ? relationType : 'none',
            pairedId,
            pairedRussian: hasPair ? pairedRussian : '',
            pairedTurkish: hasPair ? pairedTurkish : '',
            createdAt: rawRecord.createdAt || new Date().toISOString(),
            updatedAt: rawRecord.updatedAt || rawRecord.createdAt || new Date().toISOString()
        };
    }

    validateFormValues(formValues) {
        const russian = this.normalizeText(formValues.russian);
        const turkish = this.normalizeText(formValues.turkish);
        const relationType = this.normalizeRelationType(formValues.relationType);
        const pairedRussian = this.normalizeText(formValues.pairedRussian);
        const pairedTurkish = this.normalizeText(formValues.pairedTurkish);

        if (!russian) throw new Error('Rusça kelime boş olamaz.');
        if (!turkish) throw new Error('Türkçe karşılık boş olamaz.');
        if (relationType === 'none') return { russian, turkish, relationType, pairedRussian: '', pairedTurkish: '' };
        if (!pairedRussian || !pairedTurkish) throw new Error('Eş/Zıt anlam için ikinci kelime ve anlamı zorunlu.');
        if (this.buildNormalizedPairKey({ russian, turkish }) === this.buildNormalizedPairKey({ russian: pairedRussian, turkish: pairedTurkish })) {
            throw new Error('İkinci kelime ilk kelimeyle aynı olamaz.');
        }

        return { russian, turkish, relationType, pairedRussian, pairedTurkish };
    }

    buildNormalizedPairKey(word) {
        return `${this.normalizeText(word.russian).toLowerCase()}::${this.normalizeText(word.turkish).toLowerCase()}`;
    }

    generateId(records) {
        const maxRecordId = records.reduce((maxId, record) => {
            return Math.max(maxId, record.id || 0, record.pairedId || 0);
        }, this.baseId - 1);

        return maxRecordId + 1;
    }

    buildRecord(formValues, records) {
        const validatedValues = this.validateFormValues(formValues);
        const id = this.generateId(records);
        const hasPair = validatedValues.relationType !== 'none';
        const createdAt = new Date().toISOString();

        return {
            ...validatedValues,
            id,
            pairedId: hasPair ? id + 1 : null,
            createdAt,
            updatedAt: createdAt
        };
    }

    buildWord(record, options = {}) {
        const isPairedWord = options.variant === 'paired';
        const id = isPairedWord ? record.pairedId : record.id;
        if (!id) return null;

        const word = {
            id,
            russian: isPairedWord ? record.pairedRussian : record.russian,
            turkish: isPairedWord ? record.pairedTurkish : record.turkish,
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
        const words = [this.buildWord(record)];
        if (record.relationType !== 'none') {
            words.push(this.buildWord(record, { variant: 'paired' }));
        }

        return words.filter(Boolean);
    }

    buildWords() {
        return this.readRecords().flatMap(record => this.buildWordsForRecord(record));
    }

    buildSynonymPairs() {
        return this.readRecords()
            .filter(record => record.relationType !== 'none' && record.pairedId)
            .map(record => ({
                id: record.id,
                w1: { ru: record.russian, tr: record.turkish },
                w2: { ru: record.pairedRussian, tr: record.pairedTurkish },
                type: record.relationType
            }));
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
