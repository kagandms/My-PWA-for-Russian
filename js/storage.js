/**
 * Kullanıcı verisi, kelime kimliği migrasyonu ve yedekleme yönetimi.
 */
class StorageManager {
    constructor() {
        this.schemaVersion = 1;
        this.userDataKeys = [
            'favorites',
            'stats',
            'goals',
            'ru_tr_srs_data',
            'ru_tr_tracker_data',
            'ru_tr_study_selector',
            'ru_tr_full_choice_quiz_progress',
            'ru_tr_user_words',
            'ru_tr_deleted_words',
            'dailyWordsDate',
            'dailyWordsIds',
            'theme'
        ];
        this.isImporting = false;
        this.syncTimeout = null;
    }

    canResolveWordKeys() {
        return Array.isArray(window.WORDS) && window.WORDS.length > 0;
    }

    normalizeText(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    }

    buildWordStorageKey(word) {
        const russian = this.normalizeText(word?.russian);
        const turkish = this.normalizeText(word?.turkish);
        if (!russian || !turkish) return '';
        return `word:${russian}::${turkish}`;
    }

    getWordById(wordId) {
        if (!this.canResolveWordKeys()) return null;
        return window.WORDS.find(word => String(word.id) === String(wordId)) || null;
    }

    getWordStorageKey(wordId) {
        if (typeof wordId === 'string' && wordId.startsWith('word:')) return wordId;
        if (wordId && typeof wordId === 'object') return this.buildWordStorageKey(wordId);

        const word = this.getWordById(wordId);
        if (word) return this.buildWordStorageKey(word);

        return String(wordId || '');
    }

    getWordKeyAliases(wordId) {
        const aliases = [
            this.getWordStorageKey(wordId),
            String(wordId)
        ];
        const numericId = Number(wordId);

        if (Number.isInteger(numericId)) aliases.push(numericId);

        return [...new Set(aliases.filter(Boolean))];
    }

    readJson(key, fallback) {
        try {
            const rawValue = localStorage.getItem(key);
            return rawValue ? JSON.parse(rawValue) : fallback;
        } catch (error) {
            console.error(`Storage read failed for ${key}`, error);
            return fallback;
        }
    }

    writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    normalizeWordKeyList(keys) {
        if (!Array.isArray(keys)) return [];

        const normalizedKeys = keys
            .map(key => this.getWordStorageKey(key))
            .filter(Boolean);

        return [...new Set(normalizedKeys)];
    }

    normalizeWordRecordMap(recordMap) {
        if (!recordMap || typeof recordMap !== 'object' || Array.isArray(recordMap)) return {};

        return Object.entries(recordMap).reduce((normalizedMap, [rawKey, value]) => {
            const wordKey = this.getWordStorageKey(rawKey);
            if (!wordKey) return normalizedMap;

            normalizedMap[wordKey] = value;
            return normalizedMap;
        }, {});
    }

    normalizeProgressMap(progressMap) {
        if (!progressMap || typeof progressMap !== 'object' || Array.isArray(progressMap)) return {};

        return Object.entries(progressMap).reduce((normalizedMap, [rawKey, value]) => {
            const wordKey = this.getWordStorageKey(rawKey);
            if (!wordKey) return normalizedMap;

            const current = normalizedMap[wordKey] || { correct: 0, wrong: 0 };
            normalizedMap[wordKey] = {
                correct: current.correct + (Number(value?.correct) || 0),
                wrong: current.wrong + (Number(value?.wrong) || 0)
            };
            return normalizedMap;
        }, {});
    }

    normalizeStats(stats) {
        const defaults = {
            totalCorrect: 0,
            totalWrong: 0,
            masteredWords: [],
            wordProgress: {}
        };
        const safeStats = stats && typeof stats === 'object' ? stats : {};

        return {
            ...defaults,
            ...safeStats,
            masteredWords: this.normalizeWordKeyList(safeStats.masteredWords),
            wordProgress: this.normalizeProgressMap(safeStats.wordProgress)
        };
    }

    migrateUserData() {
        if (!this.canResolveWordKeys()) return;

        const favorites = this.readJson('favorites', []);
        const stats = this.readJson('stats', null);
        const srsData = this.readJson('ru_tr_srs_data', null);

        this.writeJson('favorites', this.normalizeWordKeyList(favorites));
        this.writeJson('stats', this.normalizeStats(stats));
        this.writeJson('ru_tr_srs_data', this.normalizeWordRecordMap(srsData));
    }

    createUserDataSnapshot() {
        const data = this.userDataKeys.reduce((snapshot, key) => {
            const value = localStorage.getItem(key);
            if (value === null) return snapshot;

            snapshot[key] = value;
            return snapshot;
        }, {});

        const exportedAt = new Date().toISOString();
        localStorage.setItem('last_local_export_time', exportedAt);

        return {
            schemaVersion: this.schemaVersion,
            exportedAt: exportedAt,
            wordCount: Array.isArray(window.WORDS) ? window.WORDS.length : 0,
            data
        };
    }

    getBackupFileName() {
        const date = new Date().toISOString().slice(0, 10);
        return `ru-tr-pwa-backup-${date}.json`;
    }

    downloadUserDataBackup() {
        const snapshot = this.createUserDataSnapshot();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = this.getBackupFileName();
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Dosya okunamadı'));
            reader.readAsText(file);
        });
    }

    validateImportPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Yedek dosyası geçersiz.');
        }

        if (!payload.data || typeof payload.data !== 'object') {
            throw new Error('Yedek verisi bulunamadı.');
        }
    }

    applyImportedData(payload) {
        this.isImporting = true;
        try {
            Object.entries(payload.data).forEach(([key, value]) => {
                if (!this.userDataKeys.includes(key)) return;

                const storageValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, storageValue);
            });

            this.migrateUserData();
        } finally {
            this.isImporting = false;
        }
    }

    async importUserDataBackup(file) {
        const fileText = await this.readFileAsText(file);
        const payload = JSON.parse(fileText);

        this.validateImportPayload(payload);
        this.applyImportedData(payload);
    }

    // --- Cloud Sync Methods ---

    getSyncSecret() {
        return 'kagan_gizli_sifre_123';
    }

    getSyncUrl() {
        return '/api/sync';
    }

    async uploadToCloud(showNotification = false) {
        if (!navigator.onLine) {
            if (showNotification && window.app && window.app.showNotification) {
                window.app.showNotification('İnternet bağlantısı yok', 'warning');
            }
            return false;
        }

        try {
            const snapshot = this.createUserDataSnapshot();
            
            const response = await fetch(this.getSyncUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getSyncSecret()}`
                },
                body: JSON.stringify(snapshot)
            });

            if (response.ok) {
                if (showNotification && window.app && window.app.showNotification) {
                    window.app.showNotification('Buluta kaydedildi ☁️', 'success');
                }
                return true;
            } else {
                throw new Error('Sunucu hatası');
            }
        } catch (error) {
            console.error('Buluta yükleme başarısız:', error);
            if (showNotification && window.app && window.app.showNotification) {
                window.app.showNotification('Buluta kaydetme başarısız', 'error');
            }
            return false;
        }
    }

    async downloadFromCloud(showNotification = false, force = false) {
        if (!navigator.onLine) {
            if (showNotification && window.app && window.app.showNotification) {
                window.app.showNotification('İnternet bağlantısı yok', 'warning');
            }
            return false;
        }

        try {
            const response = await fetch(this.getSyncUrl(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getSyncSecret()}`
                }
            });

            if (response.status === 404) return false;
            if (!response.ok) throw new Error('Sunucu hatası');

            const payload = await response.json();
            
            if (!force) {
                const localExportTime = localStorage.getItem('last_local_export_time');
                if (localExportTime && payload.exportedAt) {
                    const localDate = new Date(localExportTime).getTime();
                    const cloudDate = new Date(payload.exportedAt).getTime();
                    if (cloudDate <= localDate) return false;
                }
            }

            this.validateImportPayload(payload);
            this.applyImportedData(payload);
            
            localStorage.setItem('last_local_export_time', payload.exportedAt);
            
            if (showNotification && window.app && window.app.showNotification) {
                window.app.showNotification('Buluttan yüklendi ☁️', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Buluttan indirme başarısız:', error);
            if (showNotification && window.app && window.app.showNotification) {
                window.app.showNotification('Buluttan yükleme başarısız', 'error');
            }
            return false;
        }
    }

    triggerAutoSync() {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            this.uploadToCloud(false);
        }, 3000); // 3 saniye debounce
    }
}

// LocalStorage interceptor for auto-sync
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (window.storageManager && window.storageManager.userDataKeys && window.storageManager.userDataKeys.includes(key)) {
        if (!window.storageManager.isImporting) {
            window.storageManager.triggerAutoSync();
        }
    }
};

window.storageManager = new StorageManager();
