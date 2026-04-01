const RATE_LIMIT = new Map();
const MAX_REQ_PER_MIN = 30;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PROMPT_BUILDERS = {
    checkGrammar: ({ sentence }) => ({
        systemPrompt: 'Sen bir Rusça dil öğretmenisin. Kullanıcının yazdığı Rusça cümleyi kontrol et. Gramer hatalarını bul ve düzelt. Cevabını Türkçe ver. Kısa ve öz ol. Yıldız işareti (*) veya markdown kullanma. Sadece düz metin kullan.',
        userPrompt: `Şu cümleyi kontrol et: "${sanitizeInput(sentence)}"`
    }),
    generateExample: ({ word }) => ({
        systemPrompt: 'Sen bir Rusça dil öğretmenisin. Verilen kelime için basit ve anlaşılır bir örnek cümle oluştur. Cümleyi hem Rusça hem Türkçe yaz. Çok kısa ol. Yıldız işareti (*) veya markdown kullanma. Sadece düz metin kullan.',
        userPrompt: `Şu kelime için örnek cümle yaz: ${sanitizeInput(word?.russian)} (${sanitizeInput(word?.turkish)})`
    }),
    explainWord: ({ word }) => ({
        systemPrompt: 'Sen bir Rusça dil öğretmenisin. Verilen kelimeyi Türkçe açıkla: kullanım alanları, dikkat edilecekler, eş/zıt anlamlar. Kısa ve öz ol. Yıldız işareti (*) veya markdown kullanma. Sadece düz metin kullan.',
        userPrompt: `Şu kelimeyi açıkla: ${sanitizeInput(word?.russian)} (${sanitizeInput(word?.turkish)})`
    }),
    checkTranslation: ({ word, userTranslation, correctTranslation }) => ({
        systemPrompt: 'Sen bir Rusça-Türkçe çeviri uzmanısın. Kullanıcının çevirisini değerlendir. Doğruysa onayla, yanlışsa düzelt ve açıkla. Türkçe cevap ver, kısa ol. Yıldız işareti (*) veya markdown kullanma. Sadece düz metin kullan.',
        userPrompt: `Rusça: "${sanitizeInput(word?.russian)}"\nKullanıcının çevirisi: "${sanitizeInput(userTranslation)}"\nDoğru çeviri: "${sanitizeInput(correctTranslation)}"`
    })
};

function setCorsHeaders(req, res) {
    const allowedOrigins = ['https://moyslovar.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }

    return req.socket?.remoteAddress || 'unknown';
}

function sanitizeInput(value) {
    if (!value) return '';
    return String(value).slice(0, 500).replace(/[\r\n]/g, ' ').trim();
}

function isRateLimited(ip, now) {
    const entry = RATE_LIMIT.get(ip) || { count: 0, ts: now };

    if (now - entry.ts > 60000) {
        entry.count = 0;
        entry.ts = now;
    }

    entry.count += 1;
    RATE_LIMIT.set(ip, entry);

    return entry.count > MAX_REQ_PER_MIN;
}

function cleanupRateLimit(now) {
    if (RATE_LIMIT.size <= 100) return;

    for (const [key, value] of RATE_LIMIT) {
        if (now - value.ts > 120000) {
            RATE_LIMIT.delete(key);
        }
    }
}

function buildPrompts(body) {
    const builder = PROMPT_BUILDERS[body?.action];
    if (!builder) return null;
    return builder(body);
}

async function verifyTurnstile(token, ip) {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const siteKey = process.env.TURNSTILE_SITE_KEY;

    if (!secretKey || !siteKey) {
        return { ok: false, status: 503, message: 'AI verification not configured' };
    }

    if (!token) {
        return { ok: false, status: 403, message: 'Verification required' };
    }

    const body = new URLSearchParams({
        secret: secretKey,
        response: token
    });

    if (ip && ip !== 'unknown') {
        body.set('remoteip', ip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    if (!response.ok) {
        return { ok: false, status: 502, message: 'Verification service unavailable' };
    }

    const data = await response.json();
    if (!data.success || (data.action && data.action !== 'ai_request')) {
        return { ok: false, status: 403, message: 'Verification failed' };
    }

    return { ok: true, status: 200, message: '' };
}

async function requestAI(apiKey, prompts) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://moyslovar.vercel.app',
            'X-Title': 'Rusca-Turkce Kelime'
        },
        body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [
                { role: 'system', content: prompts.systemPrompt },
                { role: 'user', content: prompts.userPrompt }
            ],
            max_tokens: 300,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Cevap alınamadı';
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = extractClientIp(req);
    const now = Date.now();
    if (isRateLimited(clientIp, now)) {
        return res.status(429).json({ error: 'Too many requests. Please wait.' });
    }

    cleanupRateLimit(now);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const verification = await verifyTurnstile(req.body?.turnstileToken, clientIp);
    if (!verification.ok) {
        return res.status(verification.status).json({ error: verification.message });
    }

    const prompts = buildPrompts(req.body || {});
    if (!prompts) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const aiResponse = await requestAI(apiKey, prompts);
        if (!aiResponse) {
            return res.status(502).json({ error: 'AI API error' });
        }

        return res.status(200).json({ result: aiResponse });
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
