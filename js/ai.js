/**
 * AI Manager - DeepSeek AI entegrasyonu
 * Vercel serverless function üzerinden AI API'ye erişir
 */

class AIManager {
    constructor() {
        this.apiUrl = '/api/ai';
        this.configUrl = '/api/ai-config';
        this.loading = false;
        this.turnstileSiteKey = '';
        this.turnstileEnabled = false;
        this.configLoaded = false;
        this.turnstileWidgetId = null;
        this.turnstilePending = null;
        this.configPromise = null;
        this.turnstileScriptPromise = null;
        this.turnstileWidgetPromise = null;
        // Cache'i yükle
        try {
            this.cache = JSON.parse(localStorage.getItem('rutr_ai_cache')) || {};
        } catch (e) {
            this.cache = {};
        }
    }

    saveCache() {
        try {
            // Enforce max cache size to prevent localStorage overflow
            const MAX_CACHE_ENTRIES = 500;
            const keys = Object.keys(this.cache);
            if (keys.length > MAX_CACHE_ENTRIES) {
                // Evict oldest 100 entries
                keys.slice(0, 100).forEach(k => delete this.cache[k]);
            }
            localStorage.setItem('rutr_ai_cache', JSON.stringify(this.cache));
        } catch (e) {
            // If quota exceeded, clear cache entirely and retry
            if (e.name === 'QuotaExceededError') {
                this.cache = {};
                try { localStorage.setItem('rutr_ai_cache', '{}'); } catch (_) { }
            }
            console.error('Cache save failed', e);
        }
    }

    async loadConfig() {
        if (this.configLoaded) {
            return;
        }

        if (this.configPromise) {
            return this.configPromise;
        }

        this.configPromise = fetch(this.configUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('AI config request failed');
                }

                return response.json();
            })
            .then(config => {
                this.turnstileSiteKey = config.turnstileSiteKey || '';
                this.turnstileEnabled = Boolean(config.turnstileEnabled && this.turnstileSiteKey);
                this.configLoaded = true;
            })
            .finally(() => {
                this.configPromise = null;
            });

        return this.configPromise;
    }

    ensureTurnstileContainer() {
        let container = document.getElementById('turnstile-root');
        if (container) {
            return container;
        }

        container = document.createElement('div');
        container.id = 'turnstile-root';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
        return container;
    }

    async loadTurnstileScript() {
        if (window.turnstile?.render) {
            return window.turnstile;
        }

        if (this.turnstileScriptPromise) {
            return this.turnstileScriptPromise;
        }

        this.turnstileScriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.getElementById('turnstile-script');
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.turnstile), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Turnstile failed to load')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.id = 'turnstile-script';
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(window.turnstile);
            script.onerror = () => reject(new Error('Turnstile failed to load'));
            document.head.appendChild(script);
        }).finally(() => {
            this.turnstileScriptPromise = null;
        });

        return this.turnstileScriptPromise;
    }

    resolveTurnstile(token) {
        if (!this.turnstilePending) return;

        const { resolve, timer } = this.turnstilePending;
        window.clearTimeout(timer);
        this.turnstilePending = null;
        resolve(token);
    }

    rejectTurnstile(error) {
        if (!this.turnstilePending) return;

        const { reject, timer } = this.turnstilePending;
        window.clearTimeout(timer);
        this.turnstilePending = null;
        reject(error instanceof Error ? error : new Error(String(error)));
    }

    async ensureTurnstileWidget() {
        await this.loadConfig();
        if (!this.turnstileEnabled) {
            throw new Error('AI verification not configured');
        }

        await this.loadTurnstileScript();
        if (this.turnstileWidgetId !== null) {
            return this.turnstileWidgetId;
        }

        if (this.turnstileWidgetPromise) {
            return this.turnstileWidgetPromise;
        }

        this.turnstileWidgetPromise = new Promise((resolve, reject) => {
            const renderWidget = () => {
                if (!window.turnstile?.render) {
                    window.setTimeout(renderWidget, 50);
                    return;
                }

                try {
                    const container = this.ensureTurnstileContainer();
                    this.turnstileWidgetId = window.turnstile.render(container, {
                        sitekey: this.turnstileSiteKey,
                        size: 'invisible',
                        action: 'ai_request',
                        callback: token => this.resolveTurnstile(token),
                        'error-callback': () => this.rejectTurnstile(new Error('AI verification failed')),
                        'expired-callback': () => this.rejectTurnstile(new Error('AI verification expired'))
                    });
                    resolve(this.turnstileWidgetId);
                } catch (error) {
                    reject(error);
                }
            };

            renderWidget();
        }).finally(() => {
            this.turnstileWidgetPromise = null;
        });

        return this.turnstileWidgetPromise;
    }

    async getTurnstileToken() {
        const widgetId = await this.ensureTurnstileWidget();
        if (!window.turnstile?.execute) {
            throw new Error('AI verification unavailable');
        }

        if (this.turnstilePending) {
            throw new Error('AI verification already in progress');
        }

        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
                this.rejectTurnstile(new Error('AI verification timed out'));
            }, 10000);

            this.turnstilePending = { resolve, reject, timer };

            try {
                window.turnstile.reset(widgetId);
                window.turnstile.execute(widgetId);
            } catch (error) {
                this.rejectTurnstile(error);
            }
        });
    }

    async getErrorMessage(response) {
        try {
            const data = await response.json();
            return data?.error || 'AI request failed';
        } catch {
            return 'AI request failed';
        }
    }

    async callAI(action, data) {
        if (this.loading) return null;

        this.loading = true;

        try {
            const turnstileToken = await this.getTurnstileToken();
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, turnstileToken, ...data })
            });

            if (!response.ok) {
                const message = await this.getErrorMessage(response);
                throw new Error(message);
            }

            const result = await response.json();
            return result.result;

        } catch (error) {
            console.error('AI Error:', error);
            return null;
        } finally {
            this.loading = false;
        }
    }

    // Cümle gramer kontrolü
    async checkGrammar(sentence) {
        return await this.callAI('checkGrammar', { sentence });
    }

    // Kelime için örnek cümle üret
    async generateExample(word) {
        const key = `ex_${word.id}`;
        if (this.cache[key]) return this.cache[key];

        const result = await this.callAI('generateExample', { word });
        if (result) {
            this.cache[key] = result;
            this.saveCache();
        }
        return result;
    }

    // Kelime açıklaması
    async explainWord(word) {
        const key = `expl_${word.id}`;
        if (this.cache[key]) return this.cache[key];

        const result = await this.callAI('explainWord', { word });
        if (result) {
            this.cache[key] = result;
            this.saveCache();
        }
        return result;
    }

    // Çeviri kontrolü
    async checkTranslation(word, userTranslation, correctTranslation) {
        return await this.callAI('checkTranslation', {
            word,
            userTranslation,
            correctTranslation
        });
    }

    // Loading durumunu kontrol et
    isLoading() {
        return this.loading;
    }
}

window.aiManager = new AIManager();
