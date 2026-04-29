function setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default function handler(req, res) {
    setHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    return res.status(200).json({
        enabled: Boolean(publicKey),
        publicKey
    });
}
