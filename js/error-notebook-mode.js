(function exposeErrorNotebookMode(root) {
    class ErrorNotebookMode {
        init() {
            this.render();
        }

        render() {
            const list = document.getElementById('errorNotebookList');
            const summary = document.getElementById('errorNotebookSummary');
            const store = root.errorNotebookStore;
            if (!list || !summary) return;
            const aggregates = store?.getAggregates?.() || { total_active: 0, by_error_type: {} };
            summary.textContent = `Aktif hata gözlemleri: ${aggregates.total_active}`;
            list.textContent = '';
            const errors = store?.getErrors?.() || [];
            if (errors.length === 0) {
                list.textContent = 'Henüz Error Notebook kaydı yok.';
                return;
            }
            errors.forEach(error => this.renderError(list, error));
        }

        renderError(list, error) {
            const item = document.createElement('article');
            const title = document.createElement('strong');
            title.textContent = `${error.error_type}${error.error_subtype ? ` · ${error.error_subtype}` : ''}`;
            const details = document.createElement('p');
            details.textContent = `Kaynak: ${error.skill || 'unknown'} / ${error.exercise_type || 'unknown'} · Durum: ${error.status} · Verification: ${error.verification_status} · Tarih: ${error.created_at || 'unknown'}`;
            const answers = document.createElement('p');
            const evidence = error.evidence || {};
            const expected = evidence.expected_answers || evidence.expected_data || [];
            answers.textContent = `Kullanıcı cevabı: ${evidence.user_answer || '(boş)'} · Beklenen: ${Array.isArray(expected) ? expected.join(', ') : String(expected)}`;
            item.append(title, details, answers);
            if (error.status === 'active') this.appendLifecycleActions(item, error.error_id);
            list.append(item);
        }

        appendLifecycleActions(item, errorId) {
            const resolve = document.createElement('button');
            resolve.textContent = 'Resolve';
            resolve.onclick = () => this.updateLifecycle(errorId, 'resolved');
            const dismiss = document.createElement('button');
            dismiss.textContent = 'Dismiss';
            dismiss.onclick = () => this.updateLifecycle(errorId, 'dismissed');
            item.append(resolve, dismiss);
        }

        updateLifecycle(errorId, status) {
            root.errorNotebookStore?.recordLifecycleUpdate?.({ error_id: errorId, status });
            this.render();
        }
    }

    root.ErrorNotebookMode = ErrorNotebookMode;
    root.errorNotebookMode = new ErrorNotebookMode();
})(typeof window !== 'undefined' ? window : globalThis);
