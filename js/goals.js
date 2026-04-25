/**
 * Günlük Hedef ve Streak Yönetimi
 */

class GoalsManager {
    constructor() {
        this.data = this.loadData();
        this.checkNewDay();
    }

    loadData() {
        const defaults = {
            dailyGoal: 20,
            todayProgress: 0,
            streak: 0,
            lastActiveDate: null,
            totalWordsLearned: 0
        };
        try {
            const saved = localStorage.getItem('goals');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    saveData() {
        localStorage.setItem('goals', JSON.stringify(this.data));
    }

    checkNewDay() {
        const today = this.getDateString();
        const lastActive = this.data.lastActiveDate;

        if (lastActive !== today) {
            // Yeni gün
            if (lastActive) {
                const yesterday = this.getDateString(new Date(Date.now() - 86400000));
                if (lastActive === yesterday && this.data.todayProgress >= this.data.dailyGoal) {
                    // Dün hedef tamamlandı, streak devam
                    this.data.streak++;
                } else {
                    // Gün atlandı veya hedef tamamlanmadı — streak sıfırla
                    this.data.streak = 0;
                }
            }
            this.data.todayProgress = 0;
            this.data.lastActiveDate = today;
            this.saveData();
        }
    }

    getDateString(date = new Date()) {
        // Use local date (not UTC) to prevent streak resets in UTC+3 timezone
        return date.toLocaleDateString('sv-SE'); // YYYY-MM-DD format, local timezone
    }

    recordWord() {
        this.data.todayProgress++;
        this.data.totalWordsLearned++;
        window.trackerManager?.recordActivity?.(this.getDateString());

        // Bugün hedef tamamlandıysa ve streak henüz artmadıysa
        if (this.data.todayProgress === this.data.dailyGoal) {
            // Streak bugün için sayılacak
        }

        this.saveData();
        this.updateDisplay();
    }

    getDailyGoal() {
        return this.data.dailyGoal;
    }

    setDailyGoal(goal) {
        this.data.dailyGoal = goal;
        this.saveData();
        this.updateDisplay();
    }

    getTodayProgress() {
        return this.data.todayProgress;
    }

    getStreak() {
        // Bugün hedef tamamlandıysa artı 1
        if (this.data.todayProgress >= this.data.dailyGoal) {
            return this.data.streak + 1;
        }
        return this.data.streak;
    }

    getProgressPercent() {
        return Math.min(100, Math.round((this.data.todayProgress / this.data.dailyGoal) * 100));
    }

    isGoalCompleted() {
        return this.data.todayProgress >= this.data.dailyGoal;
    }

    updateDisplay() {
        const streakEl = document.getElementById('streakCount');
        const progressEl = document.getElementById('progressBar');
        const progressTextEl = document.getElementById('progressText');

        if (streakEl) {
            streakEl.textContent = this.getStreak();
        }
        if (progressEl) {
            progressEl.style.width = this.getProgressPercent() + '%';
        }
        if (progressTextEl) {
            progressTextEl.textContent = `${this.data.todayProgress}/${this.data.dailyGoal}`;
        }

        window.trackerManager?.renderHeatmap?.();
    }
}

window.goalsManager = new GoalsManager();
