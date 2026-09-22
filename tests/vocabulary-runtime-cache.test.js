import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

test('service worker ships a v71 schema-compatible runtime artifact set', () => {
    const serviceWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const expectedAssets = [
        './js/vocabulary-repository.js',
        './js/learning-progress.js',
        './js/typed-recall-core.js',
        './js/production-core.js',
        './js/typed-recall.js',
        './js/production-mode.js',
        './js/error-taxonomy.js',
        './js/error-notebook-core.js',
        './js/error-notebook.js',
        './js/grammar-repository.js',
        './js/grammar-lab-core.js',
        './js/grammar-progress.js',
        './js/adaptive-mastery.js',
        './js/adaptive-session-store.js',
        './js/adaptive-planner.js',
        './js/adaptive-analytics.js',
        './js/adaptive-engine.js',
        './js/error-notebook-mode.js',
        './js/grammar-lab-mode.js',
        './js/adaptive-mode.js',
        './js/analytics-mode.js',
        './data/vocabulary/lexical-units.v1.json',
        './data/vocabulary/enrichment.v1b.json',
        './data/vocabulary/enrichment-corpus.v1b.json',
        './data/vocabulary/enrichment-corpus-quality.v1b3.json',
        './data/vocabulary/legacy-identity-map.v1.json',
        './data/grammar/error-taxonomy.v1.json',
        './data/grammar/grammar-lab.v1.json',
        './data/grammar/contrast-training.v1.json'
    ];

    assert.match(serviceWorker, /rutr-v71/u);
    for (const asset of expectedAssets) assert.match(serviceWorker, new RegExp(asset.replaceAll('.', '\\.'), 'u'));
    assert.match(serviceWorker, /NETWORK_FIRST_PATHS/u);
    assert.match(serviceWorker, /legacy-identity-map\.v1\.json/u);
});

test('versioned runtime assets exist and legacy source remains available for fallback', () => {
    const assets = [
        'js/vocabulary-repository.js',
        'js/learning-progress.js',
        'js/typed-recall-core.js',
        'js/production-core.js',
        'js/typed-recall.js',
        'js/production-mode.js',
        'js/error-taxonomy.js',
        'js/error-notebook-core.js',
        'js/error-notebook.js',
        'js/grammar-repository.js',
        'js/grammar-lab-core.js',
        'js/grammar-progress.js',
        'js/adaptive-mastery.js',
        'js/adaptive-session-store.js',
        'js/adaptive-planner.js',
        'js/adaptive-analytics.js',
        'js/adaptive-engine.js',
        'js/error-notebook-mode.js',
        'js/grammar-lab-mode.js',
        'js/adaptive-mode.js',
        'js/analytics-mode.js',
        'data/vocabulary/lexical-units.v1.json',
        'data/vocabulary/enrichment.v1b.json',
        'data/vocabulary/enrichment-corpus.v1b.json',
        'data/vocabulary/enrichment-corpus-quality.v1b3.json',
        'data/vocabulary/legacy-identity-map.v1.json',
        'data/grammar/error-taxonomy.v1.json',
        'data/grammar/grammar-lab.v1.json',
        'data/grammar/contrast-training.v1.json',
        'kelimeler_tam_strict.txt'
    ];

    assert.ok(assets.every(asset => fs.existsSync(path.join(ROOT, asset))));
});

test('repository bridge loads before data.js and does not touch localStorage', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const repositorySource = fs.readFileSync(path.join(ROOT, 'js/vocabulary-repository.js'), 'utf8');
    const repositoryIndex = indexHtml.indexOf('js/vocabulary-repository.js');
    const dataIndex = indexHtml.indexOf('js/data.js');

    assert.ok(repositoryIndex >= 0 && repositoryIndex < dataIndex);
    assert.equal(repositorySource.includes('localStorage'), false);
});

test('service worker serves the v71 artifact from cache while offline and removes v54', async () => {
    const source = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const handlers = {};
    const cacheStores = new Map([['rutr-v54', new Map()]]);
    const responseFor = url => ({ status: 200, type: 'basic', url, clone() { return this; } });
    const requestKey = request => new URL(request.url, 'https://app.test/').href;
    const createCache = name => ({
        add: async request => cacheStores.get(name).set(requestKey(request), responseFor(requestKey(request))),
        put: async (request, response) => cacheStores.get(name).set(requestKey(request), response),
        match: async request => cacheStores.get(name).get(requestKey(request)) || null
    });
    const caches = {
        open: async name => {
            if (!cacheStores.has(name)) cacheStores.set(name, new Map());
            return createCache(name);
        },
        match: async request => cacheStores.get('rutr-v71')?.get(requestKey(request)) || null,
        keys: async () => [...cacheStores.keys()],
        delete: async name => cacheStores.delete(name)
    };
    class FakeRequest {
        constructor(url) {
            this.url = new URL(url, 'https://app.test/').href;
            this.method = 'GET';
            this.mode = 'same-origin';
        }
    }
    const self = {
        location: { origin: 'https://app.test' },
        clients: { claim: async () => undefined },
        skipWaiting: () => undefined,
        registration: { scope: 'https://app.test/' },
        addEventListener: (name, handler) => { handlers[name] = handler; }
    };
    const context = {
        self,
        caches,
        Request: FakeRequest,
        URL,
        Promise,
        console,
        fetch: async () => { throw new Error('offline'); }
    };
    vm.runInNewContext(source, context, { filename: 'sw.js' });

    const installWaits = [];
    handlers.install({ waitUntil: promise => installWaits.push(promise) });
    await Promise.all(installWaits);
    cacheStores.get('rutr-v71').set(
        'https://app.test/data/vocabulary/lexical-units.v1.json',
        responseFor('https://app.test/data/vocabulary/lexical-units.v1.json')
    );

    const activateWaits = [];
    handlers.activate({ waitUntil: promise => activateWaits.push(promise) });
    await Promise.all(activateWaits);

    const fetchWaits = [];
    handlers.fetch({
        request: new FakeRequest('./data/vocabulary/lexical-units.v1.json'),
        respondWith: promise => fetchWaits.push(promise)
    });
    const response = await fetchWaits[0];

    assert.equal(cacheStores.has('rutr-v54'), false);
    assert.equal(response.status, 200);
    assert.equal(response.url, 'https://app.test/data/vocabulary/lexical-units.v1.json');
});
