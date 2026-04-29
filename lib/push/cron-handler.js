import { isCronAuthorized, sendScheduledNotifications } from './send.js';

export async function handleCronRequest(req, res, slot) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isCronAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await sendScheduledNotifications(slot);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            ok: false,
            error: error.message || 'Scheduled notifications failed.'
        });
    }
}
