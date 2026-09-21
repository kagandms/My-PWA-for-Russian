(function exposeTrkiListeningSessionStore(root) {
    const STORAGE_KEY = 'ru_tr_trki_listening_sessions_v1';
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return { schema_version: SCHEMA_VERSION, namespace: STORAGE_KEY, updated_at: null, active_session_id: null, sessions: [] };
    }

    function createIdentityKey(item) {
        return item?.item_id || item?.identity?.key || item?.identity;
    }

    class TrkiListeningSessionStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `trki-listening-session:${Date.now()}`);
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
                root.console?.error?.('TRKI Listening session read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        getSession(sessionId) {
            const session = this.snapshot.sessions.find((item) => item.session_id === sessionId);
            return session ? cloneValue(session) : null;
        }

        getActiveSession() {
            return this.getSession(this.snapshot.active_session_id);
        }

        createSession(plan) {
            if (this.snapshot.sessions.some((session) => ['active', 'paused'].includes(session.session_status))) {
                throw new Error('An active TRKI Listening session already exists.');
            }
            if (!['study', 'exam'].includes(plan?.mode)) throw new Error('TRKI Listening session mode is invalid.');
            if (!['B1', 'B2'].includes(plan?.level)) throw new Error('TRKI Listening session level is invalid.');
            if (!Array.isArray(plan.planned_items) || plan.planned_items.length === 0) throw new Error('TRKI Listening planned items are required.');
            const session = {
                session_id: plan.session_id || this.idFactory(),
                mode: plan.mode,
                level: plan.level,
                created_at: this.now(),
                session_status: 'active',
                planned_items: cloneValue(plan.planned_items),
                completed_items: [],
                current_index: 0,
                audio_bindings: cloneValue(plan.audio_bindings || {}),
                timer: this.timer.create({ mode: plan.mode, duration_seconds: plan.duration_seconds })
            };
            this.snapshot.sessions.push(session);
            this.snapshot.active_session_id = session.session_id;
            this.persist();
            return cloneValue(session);
        }

        pause(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.mode === 'exam') throw new Error('Exam Listening sessions cannot be paused.');
            if (session.session_status !== 'active') throw new Error('Only an active TRKI Listening session can be paused.');
            session.timer = this.timer.pause(session.timer);
            session.session_status = 'paused';
            this.persist();
            return cloneValue(session);
        }

        resume(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'paused') throw new Error('Only a paused TRKI Listening session can resume.');
            session.timer = this.timer.resume(session.timer);
            session.session_status = 'active';
            this.persist();
            return cloneValue(session);
        }

        updateAudioBinding(sessionId, audioId, changes) {
            const session = this.requireSession(sessionId);
            const binding = session.audio_bindings?.[audioId];
            if (!binding) throw new Error(`Unknown TRKI Listening audio: ${audioId}`);
            session.audio_bindings[audioId] = { ...binding, ...cloneValue(changes) };
            this.persist();
            return cloneValue(session);
        }

        completeItem(sessionId = this.snapshot.active_session_id, itemId, outcome = {}) {
            const session = this.requireSession(sessionId);
            if (session.session_status !== 'active') throw new Error('Only an active TRKI Listening session can record an item.');
            const plannedItem = session.planned_items[session.current_index];
            if (!plannedItem || createIdentityKey(plannedItem) !== itemId) throw new Error('TRKI Listening item order mismatch.');
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

        timeout(sessionId = this.snapshot.active_session_id) {
            const session = this.requireSession(sessionId);
            if (!['active', 'paused'].includes(session.session_status)) throw new Error('TRKI Listening session is already closed.');
            session.timer = this.timer.complete(session.timer);
            session.session_status = 'timed_out';
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
            const session = this.snapshot.sessions.find((item) => item.session_id === sessionId);
            if (!session) throw new Error(`Unknown TRKI Listening session: ${sessionId}`);
            return session;
        }

        persist() {
            this.snapshot.updated_at = this.now();
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.TrkiListeningSessionStore = TrkiListeningSessionStore;
})(typeof window !== 'undefined' ? window : globalThis);
