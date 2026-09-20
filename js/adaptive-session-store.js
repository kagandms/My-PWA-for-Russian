(function exposeAdaptiveSessionStore(root) {
    const STORAGE_KEY = 'ru_tr_adaptive_sessions_v1';
    const SCHEMA_VERSION = 1;
    const ACTIVE_STATUSES = new Set(['active', 'paused']);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, active_session_id: null, sessions: [] };
    }

    class AdaptiveSessionStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `session:${Date.now()}:${Math.random().toString(36).slice(2)}`);
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
                root.console?.error?.('Adaptive session read failed.', error);
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
            const active = this.getActiveSession();
            if (active && ACTIVE_STATUSES.has(active.session_status)) throw new Error('An active session already exists.');
            const session = {
                session_id: plan.session_id || this.idFactory(),
                created_at: plan.created_at || this.now(),
                requested_duration_minutes: plan.requested_duration_minutes,
                planned_items: cloneValue(plan.planned_items || []),
                completed_items: [],
                current_index: 0,
                session_status: 'active',
                planner_version: plan.planner_version,
                policy_version: plan.policy_version,
                estimated_seconds: plan.estimated_seconds || 0
            };
            this.snapshot.sessions.push(session);
            this.snapshot.active_session_id = session.session_id;
            this.persist();
            return cloneValue(session);
        }

        pause(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'active') throw new Error('Only an active session can be paused.');
            session.session_status = 'paused';
            this.persist();
            return cloneValue(session);
        }

        resume(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'paused') throw new Error('Only a paused session can be resumed.');
            session.session_status = 'active';
            this.persist();
            return cloneValue(session);
        }

        completeItem(sessionId, itemId, outcome = {}) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'active') throw new Error('Only an active session can record an item.');
            const plannedItem = session.planned_items[session.current_index];
            if (!plannedItem || plannedItem.item_id !== itemId) throw new Error('Session item order mismatch.');
            session.completed_items.push({ item_id: itemId, completed_at: outcome.completed_at || this.now(), result: outcome.result || null });
            session.current_index += 1;
            if (session.current_index >= session.planned_items.length) session.session_status = 'completed';
            this.persist();
            return cloneValue(session);
        }

        complete(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            session.session_status = 'completed';
            this.persist();
            return cloneValue(session);
        }

        requireSession(sessionId) {
            const session = this.snapshot.sessions.find(item => item.session_id === sessionId);
            if (!session) throw new Error(`Unknown adaptive session: ${sessionId}`);
            return session;
        }

        persist() {
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.AdaptiveSessionStore = AdaptiveSessionStore;
    root.adaptiveSessionStore = new AdaptiveSessionStore();
})(typeof window !== 'undefined' ? window : globalThis);
