/**
 * Service Worker - Offline Desteği
 */

const CACHE_NAME = 'rutr-v70';
// Phase 7 runtime revision: phase7-trki-listening-3
const ASSETS = [
    './',
    './index.html',
    './kelimeler_tam_strict.txt',
    './sentences_strict.json',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/vocabulary-repository.js',
    './js/learning-progress.js',
    './js/typed-recall-core.js',
    './js/production-core.js',
    './js/storage.js',
    './js/user-words.js',
    './js/trash.js',
    './js/word-categories.js',
    './js/prefixes-mode.js',
    './js/study-selector.js',
    './js/favorites.js',
    './js/goals.js',
    './js/notifications.js',
    './js/ai.js',
    './js/mastered-manager.js',
    './js/flashcard.js',
    './js/quiz.js',
    './js/typed-recall.js',
    './js/production-mode.js',
    './js/error-taxonomy.js',
    './js/trki-error-taxonomy.js',
    './js/error-notebook-core.js',
    './js/error-notebook.js',
    './js/trki-error-bridge.js',
    './js/speaking-core.js',
    './js/speaking-capabilities.js',
    './js/speech-recognition-adapter.js',
    './js/audio-recorder-adapter.js',
    './js/speaking-store.js',
    './js/speaking-exercise-repository.js',
    './js/speaking-mastery.js',
    './js/speaking-error-bridge.js',
    './js/speaking-adaptive-provider.js',
    './js/grammar-repository.js',
    './js/grammar-lab-core.js',
    './js/grammar-progress.js',
    './js/adaptive-mastery.js',
    './js/adaptive-session-store.js',
    './js/adaptive-planner.js',
    './js/adaptive-analytics.js',
    './js/adaptive-engine.js',
    './js/trki-validator.js',
    './js/trki-repository.js',
    './js/trki-timer.js',
    './js/trki-session-store.js',
    './js/trki-attempt-store.js',
    './js/trki-profile-store.js',
    './js/trki-local-import.js',
    './js/trki-listening-core.js',
    './js/trki-listening-repository.js',
    './js/trki-listening-playback.js',
    './js/trki-listening-audio.js',
    './js/trki-listening-session-store.js',
    './js/trki-listening-attempt-store.js',
    './js/trki-listening-session-coordinator.js',
    './js/trki-speaking-coordinator.js',
    './js/error-notebook-mode.js',
    './js/grammar-lab-mode.js',
    './js/adaptive-mode.js',
    './js/analytics-mode.js',
    './js/speaking-mode.js',
    './js/trki-mode.js',
    './js/daily.js',
    './js/torfl.js',
    './js/chart.min.js',
    './js/srs.js',
    './js/tracker.js',
    './js/stats.js',
    './data/vocabulary/lexical-units.v1.json',
    './data/vocabulary/enrichment.v1b.json',
    './data/vocabulary/enrichment-corpus.v1b.json',
    './data/vocabulary/enrichment-corpus-quality.v1b3.json',
    './data/vocabulary/legacy-identity-map.v1.json',
    './data/grammar/error-taxonomy.v1.json',
    './data/grammar/grammar-lab.v1.json',
    './data/grammar/contrast-training.v1.json',
    './data/speaking/read-aloud-exercises.v1.json',
    './data/speaking/free-speech-topics.v1.json',
    './data/trki/source-catalog.v1.json',
    './data/trki/exercises.v1.json',
    './data/trki/listening-packages.v1.json',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

const NETWORK_FIRST_PATHS = new Set([
    '/',
    '/index.html',
    '/kelimeler_tam_strict.txt',
    '/sentences_strict.json',
    '/data/vocabulary/lexical-units.v1.json',
    '/data/vocabulary/enrichment.v1b.json',
    '/data/vocabulary/enrichment-corpus.v1b.json',
    '/data/vocabulary/enrichment-corpus-quality.v1b3.json',
    '/data/vocabulary/legacy-identity-map.v1.json',
    '/data/grammar/error-taxonomy.v1.json',
    '/data/grammar/grammar-lab.v1.json',
    '/data/grammar/contrast-training.v1.json',
    '/data/speaking/read-aloud-exercises.v1.json',
    '/data/speaking/free-speech-topics.v1.json',
    '/data/trki/listening-packages.v1.json',
    '/manifest.json'
]);

// Install - Cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    ASSETS.map(asset => {
                        return cache.add(new Request(asset, { cache: 'reload' })).catch(err => {
                            console.error('Failed to cache:', asset, err);
                        });
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - Clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

function isCacheableResponse(response) {
    return response && (response.status === 200 || response.type === 'opaque');
}

function shouldUseNetworkFirst(request) {
    if (request.mode === 'navigate') return true;

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) return false;

    // Support subdirectories like GitHub pages by checking if pathname ends with the asset path
    const paths = Array.from(NETWORK_FIRST_PATHS);
    return paths.some(path => requestUrl.pathname === path || requestUrl.pathname.endsWith(path));
}

async function putInCache(request, response) {
    if (!isCacheableResponse(response)) return;

    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
}

async function fetchAndCache(request) {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
}

async function networkFirst(request) {
    try {
        return await fetchAndCache(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }

        throw error;
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    return fetchAndCache(request);
}

async function refreshAppCache() {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
        ASSETS.map(asset => cache.add(new Request(asset, { cache: 'reload' })).catch(err => {
            console.warn('Cache refresh failed for:', asset, err);
        }))
    );
    return { ok: true, cacheName: CACHE_NAME };
}

function postMessageResult(port, promise) {
    if (!port) return;

    promise
        .then(result => port.postMessage(result))
        .catch(error => port.postMessage({
            ok: false,
            message: error.message || 'Cache yenilenemedi.'
        }));
}

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }

    if (event.data?.type === 'REFRESH_CACHE') {
        const refreshPromise = refreshAppCache();
        event.waitUntil(refreshPromise);
        postMessageResult(event.ports[0], refreshPromise);
    }
});

function parsePushPayload(event) {
    if (!event.data) {
        return {
            title: 'Rusça-Türkçe Sözlük',
            body: 'Bugünkü tekrarını unutma.',
            url: '/'
        };
    }

    try {
        return event.data.json();
    } catch (error) {
        return {
            title: 'Rusça-Türkçe Sözlük',
            body: event.data.text(),
            url: '/'
        };
    }
}

self.addEventListener('push', event => {
    const payload = parsePushPayload(event);
    const title = payload.title || 'Rusça-Türkçe Sözlük';
    const options = {
        body: payload.body || 'Kısa bir tekrar zamanı.',
        icon: payload.icon || './icon-192.png',
        badge: payload.badge || './icon-192.png',
        tag: payload.tag || 'ru-tr-reminder',
        data: {
            url: payload.url || '/',
            type: payload.type || 'reminder'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const targetUrl = new URL(event.notification.data?.url || '/', self.registration.scope).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            const matchingClient = clientList.find(client => client.url.startsWith(self.registration.scope));
            if (matchingClient) {
                return matchingClient.navigate(targetUrl)
                    .then(client => (client || matchingClient).focus());
            }

            return clients.openWindow(targetUrl);
        })
    );
});

// Fetch - Serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.startsWith('/api/')) return;

    event.respondWith(
        shouldUseNetworkFirst(event.request)
            ? networkFirst(event.request)
            : cacheFirst(event.request)
    );
});
