/**
 * Service Worker - Offline Desteği
 */

const CACHE_NAME = 'rutr-v24';
const ASSETS = [
    './',
    './index.html',
    './kelimeler_tam.txt',
    './sentences.json',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/storage.js',
    './js/word-categories.js',
    './js/study-selector.js',
    './js/favorites.js',
    './js/goals.js',
    './js/ai.js',
    './js/flashcard.js',
    './js/quiz.js',
    './js/full-choice-quiz.js',
    './js/reversequiz.js',
    './js/synonyms.js',
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
