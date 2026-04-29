import { updateDeviceProfile } from '../../lib/push/store.js';

function setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    setHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const record = await updateDeviceProfile({
            deviceId: req.body?.deviceId,
            profile: req.body?.profile
        });

        return res.status(200).json({
            ok: true,
            deviceId: record.deviceId,
            updatedAt: record.updatedAt
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            error: error.message || 'Profile could not be synced.'
        });
    }
}
