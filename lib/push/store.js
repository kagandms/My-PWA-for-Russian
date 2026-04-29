import { Redis } from '@upstash/redis';

const DEVICE_SET_KEY = 'push:devices';

let redisClient = null;

function getRedisConfig() {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
        throw new Error('Upstash Redis environment variables are missing.');
    }

    return { url, token };
}

export function getRedis() {
    if (!redisClient) {
        redisClient = new Redis(getRedisConfig());
    }

    return redisClient;
}

export function getSubscriptionKey(deviceId) {
    return `push:subscription:${deviceId}`;
}

export function normalizeDeviceId(deviceId) {
    const value = String(deviceId || '').trim();
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(value)) return '';

    return value;
}

export function sanitizeWords(words, limit = 40) {
    if (!Array.isArray(words)) return [];

    return words
        .map(word => ({
            russian: String(word?.russian || '').trim().slice(0, 120),
            turkish: String(word?.turkish || '').trim().slice(0, 160)
        }))
        .filter(word => word.russian && word.turkish)
        .slice(0, limit);
}

export function sanitizeProfile(profile = {}) {
    const dailyGoal = Math.max(Number(profile.dailyGoal) || 20, 1);
    const todayProgress = Math.max(Number(profile.todayProgress) || 0, 0);

    return {
        timezone: String(profile.timezone || 'Europe/Istanbul').slice(0, 80),
        dailyGoal,
        todayProgress,
        streak: Math.max(Number(profile.streak) || 0, 0),
        isGoalCompleted: Boolean(profile.isGoalCompleted || todayProgress >= dailyGoal),
        favoriteWords: sanitizeWords(profile.favoriteWords, 30),
        sampleWords: sanitizeWords(profile.sampleWords, 60),
        syncedAt: new Date().toISOString()
    };
}

export function isValidSubscription(subscription) {
    return Boolean(
        subscription &&
        typeof subscription.endpoint === 'string' &&
        subscription.endpoint.startsWith('https://') &&
        subscription.keys &&
        typeof subscription.keys.p256dh === 'string' &&
        typeof subscription.keys.auth === 'string'
    );
}

function parseStoredRecord(record) {
    if (!record || typeof record !== 'string') return record;

    try {
        return JSON.parse(record);
    } catch (error) {
        return null;
    }
}

export async function saveSubscription({ deviceId, subscription, profile }) {
    const safeDeviceId = normalizeDeviceId(deviceId);
    if (!safeDeviceId) throw new Error('Invalid device id.');
    if (!isValidSubscription(subscription)) throw new Error('Invalid push subscription.');

    const redis = getRedis();
    const existing = parseStoredRecord(await redis.get(getSubscriptionKey(safeDeviceId)));
    const createdAt = existing?.createdAt || new Date().toISOString();
    const record = {
        deviceId: safeDeviceId,
        subscription,
        profile: sanitizeProfile(profile),
        createdAt,
        updatedAt: new Date().toISOString()
    };

    await redis.set(getSubscriptionKey(safeDeviceId), record);
    await redis.sadd(DEVICE_SET_KEY, safeDeviceId);

    return record;
}

export async function updateDeviceProfile({ deviceId, profile }) {
    const safeDeviceId = normalizeDeviceId(deviceId);
    if (!safeDeviceId) throw new Error('Invalid device id.');

    const redis = getRedis();
    const key = getSubscriptionKey(safeDeviceId);
    const existing = parseStoredRecord(await redis.get(key));
    if (!existing) throw new Error('Subscription not found.');

    const record = {
        ...existing,
        profile: sanitizeProfile(profile),
        updatedAt: new Date().toISOString()
    };

    await redis.set(key, record);
    return record;
}

export async function listSubscriptions() {
    const redis = getRedis();
    const deviceIds = await redis.smembers(DEVICE_SET_KEY);
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) return [];

    const records = [];
    for (const deviceId of deviceIds) {
        const record = parseStoredRecord(await redis.get(getSubscriptionKey(deviceId)));
        if (record?.subscription) records.push(record);
    }

    return records;
}

export async function deleteSubscription(deviceId) {
    const safeDeviceId = normalizeDeviceId(deviceId);
    if (!safeDeviceId) return;

    const redis = getRedis();
    await redis.del(getSubscriptionKey(safeDeviceId));
    await redis.srem(DEVICE_SET_KEY, safeDeviceId);
}
