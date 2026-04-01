function setCorsHeaders(req, res) {
    const allowedOrigins = ['https://moyslovar.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
}

export default function handler(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const siteKey = process.env.TURNSTILE_SITE_KEY || '';
    return res.status(200).json({
        turnstileEnabled: Boolean(siteKey),
        turnstileSiteKey: siteKey
    });
}
