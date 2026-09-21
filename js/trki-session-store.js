(function exposeTrkiSessionStore(root) {
    const STORAGE_KEY = 'ru_tr_trki_sessions_v1';
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, updated_at: null, active_session_id: null, sessions: [] };
    }

    class TrkiSessionStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `trki-session:${Date.now()}`);
            this.timer = options.timer || new root.TrkiTimer({ now: () => this.now() });
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            try {
                const rawValue = this.storage?.getItem(STORAGE_KEY);
                if (!rawValue) return createEmptySnapshot();
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== SCHEMA_VERSION || parsed.namespace !== STORAGE_KEY) return createEmptySnapshot();
                return { ...createEmptySnapshot(), ...parsed, sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
            } catch (error) {
                root.console?.error?.('TRKI session read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        getSession(sessionId) {
            const session = this.snapshot.sessions.find(item => item.session_id === sessionId);
            return session ? cloneValue(session) : null;
        }

        getActiveSession() {
            return this.getSession(this.snapshot.active_session_id);
        }

        createSession(plan) {
            if (this.snapshot.sessions.some(session => ['active', 'paused'].includes(session.session_status))) {
                throw new Error('An active TRKI session already exists.');
            }
            if (!['study', 'exam'].includes(plan?.mode)) throw new Error('TRKI session mode must be study or exam.');
            if (!['B1', 'B2'].includes(plan?.level)) throw new Error('TRKI session level must be B1 or B2.');
            if (!Array.isArray(plan.planned_items)) throw new Error('TRKI planned items must be an array.');
            const session = {
                session_id: plan.session_id || this.idFactory(),
                mode: plan.mode,
                level: plan.level,
                created_at: this.now(),
                session_status: 'active',
                planned_items: cloneValue(plan.planned_items),
                completed_items: [],
                current_index: 0,
                timer: this.timer.create({ mode: plan.mode, duration_seconds: plan.duration_seconds })
            };
            this.snapshot.sessions.push(session);
            this.snapshot.active_session_id = session.session_id;
            this.persist();
            return cloneValue(session);
        }

        pause(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'active') throw new Error('Only an active TRKI session can be paused.');
            session.timer = this.timer.pause(session.timer);
            session.session_status = 'paused';
            this.persist();
            return cloneValue(session);
        }

        resume(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'paused') throw new Error('Only a paused TRKI session can be resumed.');
            session.timer = this.timer.resume(session.timer);
            session.session_status = 'active';
            this.persist();
            return cloneValue(session);
        }

        completeItem(sessionId = this.snapshot.active_session_id, itemId, outcome = {}) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'active') throw new Error('Only an active TRKI session can record an item.');
            const plannedItem = session.planned_items[session.current_index];
            if (!plannedItem || plannedItem.exercise_id !== itemId) throw new Error('TRKI session item order mismatch.');
            session.completed_items.push({
                item_id: itemId,
                completed_at: outcome.completed_at || this.now(),
                ...(outcome.result ? { result: cloneValue(outcome.result) } : {})
            });
            session.current_index += 1;
            if (session.current_index >= session.planned_items.length) {
                session.timer = this.timer.complete(session.timer);
                session.session_status = 'completed';
                this.snapshot.active_session_id = null;
            }
            this.persist();
            return cloneValue(session);
        }

        complete(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            session.timer = this.timer.complete(session.timer);
            session.session_status = 'completed';
            this.snapshot.active_session_id = null;
            this.persist();
            return cloneValue(session);
        }

        getElapsedSeconds(sessionId, at) {
            const session = this.requireSession(sessionId);
            return this.timer.getElapsedSeconds(session.timer, at);
        }

        getRemainingSeconds(sessionId, at) {
            const session = this.requireSession(sessionId);
            return Math.max(0, session.timer.duration_seconds - this.getElapsedSeconds(sessionId, at));
        }

        requireSession(sessionId) {
            const session = this.snapshot.sessions.find(item => item.session_id === sessionId);
            if (!session) throw new Error(`Unknown TRKI session: ${sessionId}`);
            return session;
        }

        persist() {
            this.snapshot.updated_at = this.now();
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.TrkiSessionStore = TrkiSessionStore;
    root.trkiSessionStore = new TrkiSessionStore();
})(typeof window !== 'undefined' ? window : globalThis);
