const NOTIFICATION_TYPES = [
    'word_recall',
    'favorite_review',
    'daily_goal_nudge'
];

function getTurkeyDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));

    return {
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour)
    };
}

function hashText(value) {
    return String(value).split('').reduce((hash, char) => {
        return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
    }, 0);
}

function pickItem(items, seed) {
    if (!Array.isArray(items) || items.length === 0) return null;

    return items[seed % items.length];
}

function getMissingWordCount(profile = {}) {
    const dailyGoal = Math.max(Number(profile.dailyGoal) || 20, 1);
    const todayProgress = Math.max(Number(profile.todayProgress) || 0, 0);

    return Math.max(dailyGoal - todayProgress, 0);
}

function isGoalCompleted(profile = {}) {
    return Boolean(profile.isGoalCompleted || getMissingWordCount(profile) === 0);
}

function getSeed(profile = {}, slot = '') {
    const { dateKey, hour } = getTurkeyDateParts();
    return hashText(`${profile.syncedAt || ''}:${dateKey}:${slot}:${hour}`);
}

function buildStreakReminder(profile = {}, slot = '') {
    const missingWords = getMissingWordCount(profile);
    const isLateReminder = slot === '22:00';
    const title = isLateReminder ? 'Seriyi bugün kapat' : 'Serini uzatmayı unutma';
    const body = missingWords > 0
        ? `${missingWords} kelime daha çözersen günlük hedef tamam.`
        : 'Kısa bir tekrar serini canlı tutar.';

    return {
        type: 'streak_reminder',
        title,
        body,
        tag: 'streak-reminder',
        url: '/?source=push&type=streak_reminder'
    };
}

function buildWordRecall(profile = {}, seed = 0) {
    const word = pickItem(profile.sampleWords, seed);
    if (!word) return buildDailyGoalNudge();

    return {
        type: 'word_recall',
        title: 'Hatırlıyor musun?',
        body: `"${word.russian}" kelimesinin Türkçesi neydi?`,
        tag: 'word-recall',
        url: '/?source=push&type=word_recall'
    };
}

function buildFavoriteReview(profile = {}, seed = 0) {
    const word = pickItem(profile.favoriteWords, seed);
    if (!word) return buildWordRecall(profile, seed);

    return {
        type: 'favorite_review',
        title: 'Favorilerden kısa tekrar',
        body: `"${word.russian}" favorilerinde. Karşılığını hâlâ hatırlıyor musun?`,
        tag: 'favorite-review',
        url: '/?source=push&type=favorite_review'
    };
}

function buildDailyGoalNudge() {
    return {
        type: 'daily_goal_nudge',
        title: 'Hedef tamam, ritmi koru',
        body: 'Bugünkü seri tamam. 2 dakikalık tekrar hafızayı taze tutar.',
        tag: 'daily-goal-nudge',
        url: '/?source=push&type=daily_goal_nudge'
    };
}

function buildCompletedGoalNotification(profile = {}, slot = '') {
    const seed = getSeed(profile, slot);
    const type = NOTIFICATION_TYPES[seed % NOTIFICATION_TYPES.length];

    if (type === 'word_recall') return buildWordRecall(profile, seed);
    if (type === 'favorite_review') return buildFavoriteReview(profile, seed);

    return buildDailyGoalNudge();
}

export function buildNotificationPayload(profile = {}, slot = '') {
    const notification = isGoalCompleted(profile)
        ? buildCompletedGoalNotification(profile, slot)
        : buildStreakReminder(profile, slot);

    return {
        ...notification,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        sentAt: new Date().toISOString()
    };
}
