(function exposeTrkiTimer(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function toMilliseconds(value) {
        if (typeof value === 'number') return value;
        const milliseconds = Date.parse(value);
        if (Number.isNaN(milliseconds)) throw new Error('TRKI timer timestamp is invalid.');
        return milliseconds;
    }

    function toIso(value) {
        return new Date(toMilliseconds(value)).toISOString();
    }

    class TrkiTimer {
        constructor(options = {}) {
            this.now = options.now || (() => Date.now());
        }

        create({ mode, duration_seconds, started_at } = {}) {
            if (!['study', 'exam'].includes(mode)) throw new Error('TRKI timer mode must be study or exam.');
            if (!Number.isInteger(duration_seconds) || duration_seconds <= 0) throw new Error('TRKI timer duration must be positive.');
            return {
                mode,
                duration_seconds,
                status: 'active',
                started_at: toIso(started_at ?? this.now()),
                paused_at: null,
                completed_at: null,
                accumulated_seconds: 0
            };
        }

        getElapsedSeconds(timer, at = this.now()) {
            const accumulated = Math.max(0, Number(timer?.accumulated_seconds) || 0);
            if (timer?.status !== 'active' || !timer.started_at) return Math.floor(accumulated);
            const runningSeconds = Math.max(0, (toMilliseconds(at) - toMilliseconds(timer.started_at)) / 1000);
            return Math.floor(accumulated + runningSeconds);
        }

        pause(timer, at = this.now()) {
            if (timer.mode === 'exam') throw new Error('Exam sessions cannot be paused.');
            if (timer.status !== 'active') throw new Error('Only an active TRKI timer can be paused.');
            const pausedAt = toIso(at);
            return {
                ...cloneValue(timer),
                status: 'paused',
                started_at: null,
                paused_at: pausedAt,
                accumulated_seconds: this.getElapsedSeconds(timer, at)
            };
        }

        resume(timer, at = this.now()) {
            if (timer.status !== 'paused') throw new Error('Only a paused TRKI timer can be resumed.');
            return { ...cloneValue(timer), status: 'active', started_at: toIso(at), paused_at: null };
        }

        complete(timer, at = this.now()) {
            if (!['active', 'paused'].includes(timer.status)) throw new Error('TRKI timer is already closed.');
            return {
                ...cloneValue(timer),
                status: 'completed',
                started_at: null,
                completed_at: toIso(at),
                accumulated_seconds: this.getElapsedSeconds(timer, at)
            };
        }
    }

    root.TrkiTimer = TrkiTimer;
})(typeof window !== 'undefined' ? window : globalThis);
