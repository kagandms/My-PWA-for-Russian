class NotificationManager {
    constructor() {
        this.deviceIdKey = 'ru_tr_push_device_id';
        this.syncTimeout = null;
        this.button = null;
        this.status = null;
    }

    init() {
        this.button = document.getElementById('notificationsToggleBtn');
        this.status = document.getElementById('notificationsStatus');
        if (!this.button || !this.status) return;

        this.button.addEventListener('click', () => this.enableNotifications());
        this.refreshStatus();
        this.syncProfileDebounced();
    }

    isSupported() {
        return Boolean(
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        );
    }

    getDeviceId() {
        const existingDeviceId = localStorage.getItem(this.deviceIdKey);
        if (existingDeviceId) return existingDeviceId;

        const deviceId = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `device_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        localStorage.setItem(this.deviceIdKey, deviceId);
        return deviceId;
    }

    async fetchConfig() {
        const response = await fetch('/api/push/config', { cache: 'no-store' });
        if (!response.ok) throw new Error('Bildirim ayarı alınamadı.');

        return response.json();
    }

    async refreshStatus() {
        if (!this.isSupported()) {
            this.setStatus('Bu cihaz bildirimleri desteklemiyor.', 'error');
            this.setButtonState('Desteklenmiyor', true);
            return;
        }

        if (Notification.permission === 'denied') {
            this.setStatus('Bildirim izni kapalı. iPhone ayarlarından tekrar açman gerekir.', 'error');
            this.setButtonState('İzin Kapalı', true);
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            this.setStatus('Bildirimler aktif. Gün içinde hedef durumuna göre hatırlatma gelecek.', 'success');
            this.setButtonState('Bildirimler Aktif', false);
            return;
        }

        this.setStatus('Seri ve kelime hatırlatmaları için bildirimi açabilirsin.');
        this.setButtonState('Bildirimleri Aç', false);
    }

    async enableNotifications() {
        if (!this.isSupported()) {
            this.setStatus('Bu cihaz bildirimleri desteklemiyor.', 'error');
            return;
        }

        this.setButtonState('Hazırlanıyor...', true);

        try {
            // İzin isteme işlemini hiçbir await (bekleme) olmadan en başta yapmalıyız.
            // Aksi takdirde mobil tarayıcılar (özellikle Safari/Yandex) bunu güvenlik gerekçesiyle engeller.
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.setStatus('Bildirim izni verilmedi. Tarayıcı ayarlarını kontrol et.', 'error');
                this.setButtonState('Bildirimleri Aç', false);
                return;
            }

            const config = await this.fetchConfig();
            if (!config.enabled || !config.publicKey) {
                this.setStatus('Sunucuda bildirim anahtarı henüz tanımlı değil.', 'error');
                this.setButtonState('Bildirimleri Aç', false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await this.getOrCreateSubscription(registration, config.publicKey);

            await this.saveSubscription(subscription);
            this.setStatus('Bildirimler aktif. Hedef tamamlanana kadar seri hatırlatması öncelikli olacak.', 'success');
            this.setButtonState('Bildirimler Aktif', false);
        } catch (error) {
            console.error('Bildirim kurulumu başarısız oldu', error);
            this.setStatus('Bildirim kurulamadı. Bağlantıyı ve Vercel ayarlarını kontrol et.', 'error');
            this.setButtonState('Bildirimleri Aç', false);
        }
    }

    async getOrCreateSubscription(registration, publicKey) {
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) return existingSubscription;

        return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(publicKey)
        });
    }

    async saveSubscription(subscription) {
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: this.getDeviceId(),
                subscription: subscription.toJSON(),
                profile: this.buildProfile()
            })
        });

        if (!response.ok) throw new Error('Subscription kaydedilemedi.');
    }

    syncProfileDebounced() {
        window.clearTimeout(this.syncTimeout);
        this.syncTimeout = window.setTimeout(() => this.syncProfile(), 1500);
    }

    async syncProfile() {
        if (!this.isSupported() || Notification.permission !== 'granted') return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) return;

            await fetch('/api/push/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.getDeviceId(),
                    profile: this.buildProfile()
                })
            });
        } catch (error) {
            console.error('Bildirim profili senkronize edilemedi', error);
        }
    }

    buildProfile() {
        const goals = window.goalsManager;

        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
            dailyGoal: goals?.getDailyGoal?.() || 20,
            todayProgress: goals?.getTodayProgress?.() || 0,
            streak: goals?.getStreak?.() || 0,
            isGoalCompleted: goals?.isGoalCompleted?.() || false,
            favoriteWords: this.getFavoriteWords(),
            sampleWords: this.getSampleWords()
        };
    }

    getFavoriteWords() {
        const favorites = window.favoritesManager?.getFavoriteWords?.() || [];
        return this.sanitizeWords(favorites).slice(0, 30);
    }

    getSampleWords() {
        const words = Array.isArray(window.WORDS) ? window.WORDS : [];
        return this.shuffle(words).slice(0, 60).map(word => ({
            russian: word.russian,
            turkish: word.turkish
        }));
    }

    sanitizeWords(words) {
        return words
            .map(word => ({
                russian: String(word?.russian || '').trim(),
                turkish: String(word?.turkish || '').trim()
            }))
            .filter(word => word.russian && word.turkish);
    }

    shuffle(words) {
        const shuffled = [...words];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }

        return shuffled;
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let index = 0; index < rawData.length; index++) {
            outputArray[index] = rawData.charCodeAt(index);
        }

        return outputArray;
    }

    setButtonState(text, disabled) {
        if (!this.button) return;

        this.button.textContent = text;
        this.button.disabled = Boolean(disabled);
    }

    setStatus(message, type = 'info') {
        if (!this.status) return;

        this.status.textContent = message;
        this.status.dataset.type = type;
        this.status.classList.toggle('hidden', !message);
    }
}

window.notificationManager = new NotificationManager();
