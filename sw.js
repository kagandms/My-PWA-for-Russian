/**
 * Service Worker - Offline Desteği
 */

const CACHE_NAME = 'rutr-v21';
const ASSETS = [
    './',
    './index.html',
    './kelimeler_tam.txt',
    './sentences.json',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/study-selector.js',
    './js/favorites.js',
    './js/goals.js',
    './js/ai.js',
    './js/flashcard.js',
    './js/quiz.js',
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

// Fetch - Serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.startsWith('/api/')) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                // Construct a Request that will be sent to the network.
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(fetchResponse => {
                    // Check if we received a valid response.
                    // For opaque responses (status 0), like Google Fonts, we should also cache them.
                    if (!fetchResponse || (fetchResponse.status !== 200 && fetchResponse.type !== 'opaque')) {
                        return fetchResponse;
                    }

                    // Cache new resources
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return fetchResponse;
                }).catch(() => {
                    // Offline fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
