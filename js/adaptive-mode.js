(function exposeAdaptiveMode(root) {
    class AdaptiveMode {
        constructor() {
            this.answered = false;
            this.setupComplete = false;
        }

        init() {
            this.setupListeners();
            const session = root.adaptiveEngine?.getActiveSession?.();
            if (session && ['active', 'paused'].includes(session.session_status) && session.current_index < session.planned_items.length) {
                this.renderSession(session);
                return;
            }
            this.showStart(session?.session_status === 'completed' ? 'Son oturum tamamlandı. Yeni bir süre seçebilirsin.' : '');
        }

        setupListeners() {
            if (this.setupComplete) return;
            document.querySelectorAll('[data-adaptive-duration]').forEach(button => {
                button.onclick = () => this.start(Number(button.dataset.adaptiveDuration));
            });
            this.element('adaptiveResume').onclick = () => this.resume();
            this.element('adaptiveSubmit').onclick = () => this.submit();
            this.element('adaptiveNext').onclick = () => this.next();
            this.element('adaptivePause').onclick = () => this.pause();
            this.element('adaptiveRecognizeKnown').onclick = () => this.recordRecognition('correct');
            this.element('adaptiveRecognizeAgain').onclick = () => this.recordRecognition('incorrect');
            this.element('adaptiveReviewDone').onclick = () => this.completeCurrent('reviewed');
            this.element('adaptiveSpeakingStart')?.addEventListener?.('click', () => { void this.startSpeaking(); });
            this.element('adaptiveSpeakingStop')?.addEventListener?.('click', () => { void this.stopSpeaking(); });
            this.setupComplete = true;
        }

        start(durationMinutes) {
            try {
                const session = root.adaptiveEngine.startSession(durationMinutes, {
                    includeSpeaking: this.element('adaptiveIncludeSpeaking')?.checked === true,
                    includeFreeSpeech: this.element('adaptiveIncludeFreeSpeech')?.checked === true
                });
                this.renderSession(session);
            } catch (error) {
                root.console?.error?.('Adaptive session start failed.', error);
                this.showStart(error.message);
            }
        }

        resume() {
            try {
                const session = root.adaptiveEngine.resume();
                this.renderSession(session);
            } catch (error) {
                root.console?.error?.('Adaptive session resume failed.', error);
                this.showStart(error.message);
            }
        }

        pause() {
            const session = root.adaptiveEngine.pause();
            this.showStart('Oturum duraklatıldı. Aynı oturumdan devam edebilirsin.', session);
        }

        showStart(message = '', session = null) {
            this.hide('adaptiveExercise');
            this.hide('adaptiveCompletion');
            this.show('adaptiveStart');
            const resume = this.element('adaptiveResume');
            const active = session || root.adaptiveEngine?.getActiveSession?.();
            const canResume = active?.session_status === 'paused';
            resume.classList.toggle('hidden', !canResume);
            this.element('adaptiveStatus').textContent = message;
            this.element('adaptiveProgress').textContent = active?.session_status === 'paused' ? `${active.current_index}/${active.planned_items.length}` : '0/0';
        }

        renderSession(session) {
            if (session.session_status === 'paused') {
                this.showStart('Oturum duraklatıldı. Devam etmek için butona bas.', session);
                return;
            }
            const item = session.planned_items[session.current_index];
            if (!item) {
                this.showCompletion(session);
                return;
            }
            this.hide('adaptiveStart');
            this.hide('adaptiveCompletion');
            this.show('adaptiveExercise');
            this.renderItem(item, session);
        }

        renderItem(item, session) {
            this.answered = false;
            this.element('adaptiveProgress').textContent = `${session.current_index + 1}/${session.planned_items.length}`;
            this.element('adaptiveModule').textContent = this.getModuleLabel(item.module);
            this.element('adaptivePrompt').textContent = item.module === 'error_review' ? this.getErrorPrompt(item) : item.prompt || '';
            this.element('adaptiveInput').value = '';
            this.element('adaptiveInput').disabled = item.module === 'recognition' || item.module === 'error_review';
            this.hide('adaptiveFeedback');
            this.hide('adaptiveNext');
            this.element('adaptiveReviewDone').classList.toggle('hidden', item.module !== 'error_review');
            this.showOrHideRecognition(item.module === 'recognition');
            this.showOrHideSpeaking(item.module === 'speaking');
            if (item.module === 'speaking') return;
            this.element('adaptiveSubmit').disabled = false;
            this.element('adaptiveSubmit').classList.toggle('hidden', ['recognition', 'error_review'].includes(item.module));
            this.element('adaptivePause').disabled = false;
        }

        showOrHideRecognition(isRecognition) {
            this.element('adaptiveRecognitionControls').classList.toggle('hidden', !isRecognition);
        }

        showOrHideSpeaking(isSpeaking) {
            this.element('adaptiveSpeakingControls')?.classList.toggle?.('hidden', !isSpeaking);
            if (!isSpeaking) return;
            this.element('adaptiveInput').disabled = true;
            this.element('adaptiveSpeakingStart').disabled = false;
            this.element('adaptiveSpeakingStop').disabled = true;
            this.element('adaptiveSpeakingStatus').textContent = 'Speaking etkinliğini başlatmak için açıkça Start düğmesine bas.';
        }

        async startSpeaking() {
            const item = root.adaptiveEngine.getCurrentItem();
            const speakingMode = root.speakingController;
            if (!item || !speakingMode?.configureAdaptiveExercise) return;
            speakingMode.configureAdaptiveExercise(item, event => {
                if (event) this.finishAnswer(item, 'speaking_event_recorded');
            });
            this.element('adaptiveSpeakingStart').disabled = true;
            this.element('adaptiveSpeakingStop').disabled = false;
            this.element('adaptiveSpeakingStatus').textContent = 'Mikrofon ve transcript hazırlığı başlatılıyor.';
            const started = await speakingMode.start();
            if (!started) {
                this.element('adaptiveSpeakingStart').disabled = false;
                this.element('adaptiveSpeakingStop').disabled = true;
                this.element('adaptiveSpeakingStatus').textContent = `Speaking başlatılamadı: ${speakingMode.state}.`;
            }
        }

        async stopSpeaking() {
            const speakingMode = root.speakingController;
            if (!speakingMode?.stop) return;
            this.element('adaptiveSpeakingStop').disabled = true;
            await speakingMode.stop();
        }

        submit() {
            if (this.answered) return;
            const item = root.adaptiveEngine.getCurrentItem();
            const userAnswer = this.element('adaptiveInput').value;
            if (!item) return;
            const result = this.evaluate(item, userAnswer);
            this.recordAttempt(item, result, userAnswer);
            this.finishAnswer(item, result.result);
        }

        evaluate(item, userAnswer) {
            if (item.module === 'recall') return root.TypedRecallCore.evaluateAnswer({ question: item, userAnswer });
            if (item.module === 'production') return root.ProductionCore.evaluateTargetPresence({ targetForm: item.target_form, userAnswer });
            return root.GrammarLabCore.evaluateAnswer({ exercise: item, userAnswer });
        }

        recordAttempt(item, result, userAnswer) {
            if (item.module === 'grammar') {
                root.grammarProgressStore?.recordAttempt?.({ exercise_id: item.exercise_id, grammar_topic: item.grammar_topic, result: result.result, user_answer: userAnswer, expected_answers: result.expected_answers, verification_status: 'verified', exercise_eligible: true });
                return;
            }
            const attempt = { lexical_unit_id: item.lexical_unit_id, sense_id: item.sense_id, skill: item.skill, exercise_type: item.exercise_type, result: result.result, timestamp: new Date().toISOString(), user_answer: userAnswer, expected_answers: item.accepted_answers || [item.target_form] };
            if (item.module === 'production') {
                attempt.exercise_id = item.exercise_id;
                attempt.target_form = item.target_form;
            }
            const stored = root.learningProgressStore?.recordAttempt?.(attempt) || attempt;
            if (item.module === 'recall') root.errorNotebookStore?.recordFromTypedRecall?.({ attempt: stored, result });
        }

        recordRecognition(result) {
            const item = root.adaptiveEngine.getCurrentItem();
            if (!item || this.answered) return;
            root.learningProgressStore?.recordAttempt?.({ lexical_unit_id: item.lexical_unit_id, sense_id: item.sense_id, skill: 'recognition', exercise_type: item.exercise_type, result, user_answer: null, expected_answers: [] });
            this.finishAnswer(item, result);
        }

        completeCurrent(result) {
            const item = root.adaptiveEngine.getCurrentItem();
            if (!item || this.answered) return;
            this.finishAnswer(item, result);
        }

        finishAnswer(item, result) {
            this.answered = true;
            root.adaptiveEngine.completeItem(item.item_id, { result });
            this.element('adaptiveFeedback').textContent = this.getFeedback(item, result);
            this.show('adaptiveFeedback');
            this.hide('adaptiveSubmit');
            this.hide('adaptiveRecognitionControls');
            this.hide('adaptiveReviewDone');
            if (item.module === 'speaking') this.hide('adaptiveSpeakingControls');
            this.show('adaptiveNext');
        }

        next() {
            this.renderSession(root.adaptiveEngine.getActiveSession());
        }

        showCompletion(session) {
            this.hide('adaptiveStart');
            this.hide('adaptiveExercise');
            this.show('adaptiveCompletion');
            this.element('adaptiveProgress').textContent = `${session.completed_items.length}/${session.planned_items.length}`;
            const modulesByItemId = new Map(session.planned_items.map(item => [item.item_id, item.module]));
            const counts = session.completed_items.reduce((result, item) => {
                const module = modulesByItemId.get(item.item_id);
                if (!module) return result;
                result[module] = (result[module] || 0) + 1;
                return result;
            }, {});
            this.element('adaptiveCompletionSummary').textContent = Object.entries(counts).map(([module, count]) => `${this.getModuleLabel(module)}: ${count}`).join(' · ') || 'Bu oturumda tamamlanan içerik yok.';
        }

        getFeedback(item, result) {
            if (item.module === 'speaking') return result === 'speaking_event_recorded' ? 'Speaking olayı kaydedildi; akustik beceriler not_evaluated.' : `Speaking durumu: ${result}.`;
            if (item.module === 'production') return result === 'completed' ? 'Canonical hedef gözlemi kaydedildi; bu production doğruluğu değildir.' : `Production gözlemi: ${result}.`;
            if (item.module === 'error_review') return 'Verified hata gözlemi incelendi.';
            return result === 'correct' ? 'Doğru.' : `Sonuç: ${result}.`;
        }

        getErrorPrompt(item) {
            return `Hata gözlemi: ${item.prompt || '(cevap yok)'} · Beklenen: ${(item.expected_answers || []).join(', ')}`;
        }

        getModuleLabel(module) {
            return { recognition: 'Recognition', recall: 'Recall', production: 'Production', grammar: 'Grammar', error_review: 'Verified Error Review', speaking: 'Speaking' }[module] || module;
        }

        element(id) {
            return document.getElementById(id);
        }

        show(id) {
            this.element(id).classList.remove('hidden');
        }

        hide(id) {
            this.element(id).classList.add('hidden');
        }
    }

    root.AdaptiveMode = AdaptiveMode;
    root.adaptiveMode = new AdaptiveMode();
})(typeof window !== 'undefined' ? window : globalThis);
