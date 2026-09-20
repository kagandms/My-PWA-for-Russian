(function exposeErrorNotebook(root) {
    const STORAGE_KEY = 'ru_tr_error_notebook_v1';
    const SCHEMA_VERSION = 1;

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createEmptySnapshot() {
        return {
            schema_version: SCHEMA_VERSION,
            namespace: STORAGE_KEY,
            updated_at: null,
            events: [],
            lifecycle_updates: []
        };
    }

    class ErrorNotebookStore {
        constructor(options = {}) {
            this.storage = options.storage || root.localStorage;
            this.now = options.now || (() => new Date().toISOString());
            this.idFactory = options.idFactory || (() => `error:${Date.now()}:${Math.random().toString(36).slice(2)}`);
            this.snapshot = this.loadSnapshot();
        }

        loadSnapshot() {
            try {
                const rawValue = this.storage?.getItem(STORAGE_KEY);
                if (!rawValue) return createEmptySnapshot();
                const parsed = JSON.parse(rawValue);
                if (parsed?.schema_version !== SCHEMA_VERSION || parsed.namespace !== STORAGE_KEY) return createEmptySnapshot();
                return {
                    ...createEmptySnapshot(),
                    ...parsed,
                    events: Array.isArray(parsed.events) ? parsed.events : [],
                    lifecycle_updates: Array.isArray(parsed.lifecycle_updates) ? parsed.lifecycle_updates : []
                };
            } catch (error) {
                root.console?.error?.('Error Notebook read failed.', error);
                return createEmptySnapshot();
            }
        }

        getSnapshot() {
            return cloneValue(this.snapshot);
        }

        recordError(errorRecord) {
            this.validateError(errorRecord);
            const existing = this.snapshot.events.find(event => event.error_id === errorRecord.error_id);
            if (existing) return cloneValue(existing);
            const event = {
                ...cloneValue(errorRecord),
                error_id: errorRecord.error_id || this.idFactory(),
                created_at: errorRecord.created_at || this.now()
            };
            this.snapshot.events.push(event);
            this.persist(event.created_at);
            return cloneValue(event);
        }

        recordFromTypedRecall({ attempt, result }) {
            const errorRecord = root.ErrorNotebookCore?.createTypedRecallError({ attempt, result });
            if (!errorRecord) return null;
            return this.recordError(errorRecord);
        }

        recordLifecycleUpdate({ error_id, status, timestamp }) {
            root.ErrorTaxonomy.assertLifecycleStatus(status);
            if (!this.snapshot.events.some(event => event.error_id === error_id)) throw new Error(`Unknown error ID: ${error_id}`);
            const update = { error_id, status, timestamp: timestamp || this.now() };
            this.snapshot.lifecycle_updates.push(update);
            this.persist(update.timestamp);
            return cloneValue(update);
        }

        getErrors() {
            const latest = new Map();
            this.snapshot.lifecycle_updates.forEach(update => latest.set(update.error_id, update.status));
            return this.snapshot.events.map(event => ({ ...cloneValue(event), status: latest.get(event.error_id) || 'active' }));
        }

        getAggregates() {
            const activeErrors = this.getErrors().filter(error => error.status === 'active');
            const byErrorType = {};
            activeErrors.forEach(error => { byErrorType[error.error_type] = (byErrorType[error.error_type] || 0) + 1; });
            return { total_active: activeErrors.length, by_error_type: byErrorType };
        }

        validateError(errorRecord) {
            if (!errorRecord?.lexical_unit_id || !errorRecord.exercise_type) throw new Error('Error event identity is required.');
            root.ErrorTaxonomy.assertErrorType(errorRecord.error_type);
            root.ErrorTaxonomy.assertDetectionMethod(errorRecord.detection_method);
            root.ErrorTaxonomy.assertVerificationStatus(errorRecord.verification_status);
            if (errorRecord.detection_method === 'inferred' && errorRecord.verification_status !== 'candidate') {
                throw new Error('Inferred error events must remain candidate.');
            }
            if (errorRecord.exercise_eligible !== false) throw new Error('Error events must not be exercise eligible.');
            if (errorRecord.error_type.startsWith('speaking.')) {
                if (errorRecord.evidence_scope !== 'stt_final_transcript'
                    || !['transcript_alignment', 'target_presence_in_transcript'].includes(errorRecord.assertion_scope)
                    || errorRecord.detection_method !== 'deterministic'
                    || errorRecord.verification_status !== 'verified'
                    || errorRecord.adaptive_eligible !== false) {
                    throw new Error('Speaking Error Notebook records must remain final-transcript observations.');
                }
            }
        }

        persist(timestamp) {
            this.snapshot.updated_at = timestamp;
            this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        }
    }

    root.ErrorNotebookStore = ErrorNotebookStore;
    root.errorNotebookStore = new ErrorNotebookStore();
})(typeof window !== 'undefined' ? window : globalThis);
