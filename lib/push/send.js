import webpush from 'web-push';
import { buildNotificationPayload } from './messages.js';
import { deleteSubscription, listSubscriptions } from './store.js';

function getVapidConfig() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!publicKey || !privateKey) {
        throw new Error('VAPID keys are missing.');
    }

    return { publicKey, privateKey, subject };
}

function configureWebPush() {
    const config = getVapidConfig();
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
}

function shouldDeleteSubscription(error) {
    return error?.statusCode === 404 || error?.statusCode === 410;
}

async function sendToDevice(record, slot) {
    const payload = buildNotificationPayload(record.profile || {}, slot);

    try {
        await webpush.sendNotification(record.subscription, JSON.stringify(payload), {
            TTL: 60 * 60 * 8,
            urgency: 'normal'
        });

        return { deviceId: record.deviceId, ok: true, type: payload.type };
    } catch (error) {
        if (shouldDeleteSubscription(error)) {
            await deleteSubscription(record.deviceId);
        }

        return {
            deviceId: record.deviceId,
            ok: false,
            statusCode: error?.statusCode || 500
        };
    }
}

export async function sendScheduledNotifications(slot = '') {
    configureWebPush();
    const records = await listSubscriptions();
    const results = [];

    for (const record of records) {
        results.push(await sendToDevice(record, slot));
    }

    return {
        ok: true,
        slot,
        attempted: records.length,
        sent: results.filter(result => result.ok).length,
        failed: results.filter(result => !result.ok).length,
        results
    };
}

export function isCronAuthorized(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    return req.headers.authorization === `Bearer ${secret}`;
}
