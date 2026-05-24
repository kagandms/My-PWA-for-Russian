class TrackerManager {
    constructor() {
        this.storageKey = 'ru_tr_tracker_data';
        this.data = this.loadData();
    }

    createDefaultData() {
        return {
            version: 1,
            streak: 0,
            bestStreak: 0,
            lastActiveDate: null,
            activity: {}
        };
    }

    loadData() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
            const data = stored && typeof stored === 'object' ? stored : this.createDefaultData();
            return this.normalizeData(data);
        } catch (error) {
            return this.createDefaultData();
        }
    }

    normalizeData(data) {
        const activity = data.activity && typeof data.activity === 'object' ? data.activity : {};
        const normalizedActivity = Object.entries(activity).reduce((result, [date, count]) => {
            if (!this.isValidDateKey(date)) return result;

            result[date] = Math.max(Number(count) || 0, 0);
            return result;
        }, {});

        return {
            ...this.createDefaultData(),
            ...data,
            streak: Math.max(Number(data.streak) || 0, 0),
            bestStreak: Math.max(Number(data.bestStreak) || 0, 0),
            activity: normalizedActivity
        };
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    getDateString(date = new Date()) {
        return date.toLocaleDateString('sv-SE');
    }

    getDateByOffset(dayOffset, baseDate = new Date()) {
        const date = new Date(baseDate);
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);
        return date;
    }

    isValidDateKey(date) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(date));
    }

    recordActivity(date = this.getDateString()) {
        if (!this.isValidDateKey(date)) return;

        this.data.activity[date] = (Number(this.data.activity[date]) || 0) + 1;
        this.data.lastActiveDate = date;
        this.refreshStreakData();
        this.saveData();
        this.renderHeatmap();
    }

    refreshStreakData() {
        const activity = this.getMergedActivity();
        const stats = this.getStreakStats(activity);

        this.data.streak = stats.currentStreak;
        this.data.bestStreak = Math.max(this.data.bestStreak, stats.bestStreak);
    }

    getGoalSnapshot() {
        const goals = window.goalsManager;
        if (!goals) return { hasGoals: false, streak: 0, isTodayComplete: false, dailyGoal: 1 };

        return {
            hasGoals: true,
            streak: Math.max(Number(goals.getStreak?.()) || 0, 0),
            isTodayComplete: Boolean(goals.isGoalCompleted?.()),
            dailyGoal: Math.max(Number(goals.getDailyGoal?.()) || 1, 1)
        };
    }

    getMergedActivity() {
        const activity = { ...this.data.activity };
        const inferredActivity = this.getInferredGoalActivity();

        Object.entries(inferredActivity).forEach(([date, count]) => {
            activity[date] = Math.max(Number(activity[date]) || 0, count);
        });

        return activity;
    }

    getInferredGoalActivity() {
        const snapshot = this.getGoalSnapshot();
        if (snapshot.streak <= 0) return {};

        const inferredActivity = {};
        const endOffset = snapshot.isTodayComplete ? 0 : -1;

        for (let index = 0; index < snapshot.streak; index++) {
            const date = this.getDateString(this.getDateByOffset(endOffset - index));
            inferredActivity[date] = snapshot.dailyGoal;
        }

        return inferredActivity;
    }

    getStreakStats(activity) {
        const snapshot = this.getGoalSnapshot();
        const currentStreak = snapshot.hasGoals ? snapshot.streak : this.calculateCurrentStreak(activity);
        const latestStreak = currentStreak > 0 ? currentStreak : this.calculateLatestStreak(activity);
        const bestStreak = Math.max(this.data.bestStreak, currentStreak);

        return {
            currentStreak,
            latestStreak,
            bestStreak,
            weekActiveDays: this.countActiveDays(activity, 7)
        };
    }

    calculateCurrentStreak(activity) {
        const today = this.getDateString();
        const activeToday = this.hasActivity(activity, today);
        return this.countBackwardStreak(activity, activeToday ? 0 : -1);
    }

    calculateLatestStreak(activity) {
        const activeDays = this.getActiveDayNumbers(activity);
        if (activeDays.length === 0) return 0;

        const latestDay = activeDays[activeDays.length - 1];
        return this.countConsecutiveDays(activeDays, latestDay);
    }

    calculateBestStreak(activity) {
        const activeDays = this.getActiveDayNumbers(activity);
        let bestStreak = 0;
        let currentStreak = 0;
        let previousDay = null;

        activeDays.forEach(day => {
            currentStreak = previousDay !== null && day - previousDay === 1 ? currentStreak + 1 : 1;
            bestStreak = Math.max(bestStreak, currentStreak);
            previousDay = day;
        });

        return bestStreak;
    }

    countBackwardStreak(activity, startOffset) {
        let streak = 0;

        for (let offset = startOffset; offset > startOffset - 365; offset--) {
            const date = this.getDateString(this.getDateByOffset(offset));
            if (!this.hasActivity(activity, date)) break;

            streak++;
        }

        return streak;
    }

    countConsecutiveDays(activeDays, latestDay) {
        const activeDaySet = new Set(activeDays);
        let streak = 0;

        for (let day = latestDay; activeDaySet.has(day); day--) {
            streak++;
        }

        return streak;
    }

    countActiveDays(activity, dayCount) {
        let activeDays = 0;

        for (let offset = 0; offset > -dayCount; offset--) {
            const date = this.getDateString(this.getDateByOffset(offset));
            if (this.hasActivity(activity, date)) activeDays++;
        }

        return activeDays;
    }

    getActiveDayNumbers(activity) {
        return Object.keys(activity)
            .filter(date => this.hasActivity(activity, date))
            .map(date => this.getDayNumber(date))
            .sort((first, second) => first - second);
    }

    getDayNumber(date) {
        const [year, month, day] = date.split('-').map(Number);
        return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
    }

    hasActivity(activity, date) {
        return Number(activity[date]) > 0;
    }

    getWeekdayLabel(date) {
        const labels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        return labels[date.getDay()];
    }

    getActivityLevel(count) {
        if (count >= 30) return 'level-3';
        if (count >= 10) return 'level-2';
        if (count > 0) return 'level-1';
        return '';
    }

    renderHeatmap() {
        const activity = this.getMergedActivity();
        const stats = this.getStreakStats(activity);

        this.renderSummary(stats);
        this.renderDays(activity);
    }

    renderSummary(stats) {
        this.setText('trackerCurrentStreak', stats.currentStreak);
        this.setText('trackerLatestStreak', stats.latestStreak);
        this.setText('trackerBestStreak', Math.max(this.data.bestStreak, stats.bestStreak));
        this.setText('trackerWeekActive', `${stats.weekActiveDays}/7`);
    }

    renderDays(activity) {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;

        container.innerHTML = '';

        for (let offset = -6; offset <= 0; offset++) {
            const date = this.getDateByOffset(offset);
            container.appendChild(this.createHeatmapItem(date, activity));
        }
    }

    createHeatmapItem(date, activity) {
        const dateString = this.getDateString(date);
        const count = Number(activity[dateString]) || 0;
        const wrapper = document.createElement('div');
        const box = document.createElement('div');
        const label = document.createElement('span');

        wrapper.className = 'heatmap-item';
        box.className = ['heatmap-box', this.getActivityLevel(count)].filter(Boolean).join(' ');
        box.textContent = count > 0 ? '✓' : '';
        box.title = `${dateString}: ${count} правильных ответов`;
        box.setAttribute('aria-label', `${this.getWeekdayLabel(date)} ${count > 0 ? 'tamamlandı' : 'boş'}`);
        label.className = 'heatmap-label';
        label.textContent = this.getWeekdayLabel(date);

        wrapper.appendChild(box);
        wrapper.appendChild(label);
        return wrapper;
    }

    setText(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = String(value);
    }
}

window.trackerManager = new TrackerManager();

document.addEventListener('DOMContentLoaded', () => {
    window.trackerManager.renderHeatmap();
});
