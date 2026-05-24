/**
 * Service Worker - Offline Desteği
 */

const CACHE_NAME = 'rutr-v31';
const ASSETS = [
    './',
    './index.html',
    './kelimeler_tam.txt',
    './sentences.json',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/storage.js',
    './js/user-words.js',
    './js/trash.js',
    './js/word-categories.js',
    './js/study-selector.js',
    './js/favorites.js',
    './js/goals.js',
    './js/notifications.js',
    './js/ai.js',
    './js/flashcard.js',
    './js/quiz.js',
    './js/typing.js',
    './js/full-choice-quiz.js',
    './js/daily.js',
    './js/torfl.js',
    './js/chart.min.js',
    './js/srs.js',
    './js/tracker.js',
    './js/stats.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

const NETWORK_FIRST_PATHS = new Set([
    '/',
    '/index.html',
    '/kelimeler_tam.txt',
    '/sentences.json',
    '/manifest.json'
]);

// Install - Cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
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

function getAssetRequest(asset) {
    return new Request(new URL(asset, self.registration.scope), { cache: 'reload' });
}

function isCacheableResponse(response) {
    return response && (response.status === 200 || response.type === 'opaque');
}

function shouldUseNetworkFirst(request) {
    if (request.mode === 'navigate') return true;

    const requestUrl = new URL(request.url);
    return requestUrl.origin === self.location.origin && NETWORK_FIRST_PATHS.has(requestUrl.pathname);
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
    await Promise.all(ASSETS.map(asset => cache.add(getAssetRequest(asset))));
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
