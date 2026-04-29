/**
 * Favori Kelime Yönetimi
 */

class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
    }

    loadFavorites() {
        try {
            const saved = localStorage.getItem('favorites');
            const favorites = saved ? JSON.parse(saved) : [];

            if (!window.storageManager?.canResolveWordKeys()) {
                return Array.isArray(favorites) ? favorites : [];
            }

            return window.storageManager.normalizeWordKeyList(favorites);
        } catch (e) {
            console.error('Favoriler yüklenirken hata oluştu', e);
            return [];
        }
    }

    reload() {
        this.favorites = this.loadFavorites();
    }

    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        window.notificationManager?.syncProfileDebounced?.();
    }

    getWordKey(wordId) {
        return window.storageManager?.getWordStorageKey(wordId) || String(wordId);
    }

    isFavorite(wordId) {
        const aliases = window.storageManager?.getWordKeyAliases(wordId) || [String(wordId), wordId];
        return aliases.some(alias => this.favorites.includes(alias));
    }

    toggleFavorite(wordId) {
        if (this.isFavorite(wordId)) {
            const aliases = window.storageManager?.getWordKeyAliases(wordId) || [String(wordId), wordId];
            this.favorites = this.favorites.filter(id => !aliases.includes(id));
        } else {
            this.favorites.push(this.getWordKey(wordId));
        }
        this.saveFavorites();
        return this.isFavorite(wordId);
    }

    getFavorites() {
        return this.favorites;
    }

    getFavoriteWords() {
        return WORDS.filter(word => this.isFavorite(word.id));
    }
}

window.favoritesManager = new FavoritesManager();
