import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCoordinator() {
    const window = { console };
    const context = { window, globalThis: window, console, structuredClone };
    vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js/trki-speaking-coordinator.js'), 'utf8'),
        context,
        { filename: 'trki-speaking-coordinator.js' }
    );
    return window.TrkiSpeakingCoordinator;
}

function createTask(overrides = {}) {
    return {
        level: 'B1',
        package_id: 'trki-speaking-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'speaking-task-1',
        exercise_id: 'trki-speaking:synthetic:1',
        exercise_type: 'read_aloud',
        expected_text: 'Я вижу дом.',
        targets: [],
        source_reference: {
            source_id: 'src:synthetic-trki-b1-b2',
            content_policy: 'synthetic-not-official'
        },
        ...overrides
    };
}

test('prepares a practice-only TRKI context with version-bound task identity', () => {
    const Coordinator = loadCoordinator();
    const coordinator = new Coordinator({ speakingMode: { configureAdaptiveExercise() {} } });

    const context = coordinator.prepare(createTask());

    assert.deepEqual(JSON.parse(JSON.stringify(context)), {
        framework: 'trki',
        level: 'B1',
        package_id: 'trki-speaking-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'speaking-task-1',
        source_reference: {
            source_id: 'src:synthetic-trki-b1-b2',
            content_policy: 'synthetic-not-official'
        },
        practice_only: true
    });
});

test('activates the existing SpeakingMode instead of creating another engine', () => {
    const Coordinator = loadCoordinator();
    const calls = [];
    const speakingMode = {
        configureAdaptiveExercise: (task) => calls.push(task)
    };
    const coordinator = new Coordinator({ speakingMode });
    coordinator.prepare(createTask());

    const context = coordinator.activate();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].trki_context.practice_only, true);
    assert.equal(calls[0].trki_context.task_id, 'speaking-task-1');
    assert.deepEqual(context, coordinator.getContext());
});

test('keeps a TRKI event in the existing speaking namespace with no score fields', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-mode.js'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'js/speaking-core.js'), 'utf8');
    const window = { addEventListener() {}, removeEventListener() {}, console };
    const context = { window, globalThis: window, console, structuredClone, Date };
    vm.runInNewContext(core, context, { filename: 'speaking-core.js' });
    vm.runInNewContext(source, context, { filename: 'speaking-mode.js' });
    const mode = new window.SpeakingMode({
        window,
        document: { getElementById: () => null },
        exerciseRepository: { load: async () => {}, getReadAloudExercises: () => [], getPromptedExercises: () => [], getFreeSpeechTopics: () => [] },
        capabilityDetector: { detect: () => ({}) },
        eventStore: { recordEvent: (event) => event },
        errorBridge: { recordObservation() {} }
    });
    mode.configureAdaptiveExercise({ ...createTask(), trki_context: loadCoordinatorContext() });
    mode.attemptId = 'speaking-attempt:trki';

    const event = mode.buildEvent({
        exercise_type: 'read_aloud',
        exercise_id: 'trki-speaking:synthetic:1',
        expected_text: 'Я вижу дом.',
        transcript_text: 'Я вижу дом.',
        transcript_state: 'final_result',
        alignment_status: 'exact',
        transcript_observation_available: true,
        target_observations: []
    }, null);

    assert.equal(event.namespace, 'ru_tr_speaking_events_v1');
    assert.equal(event.trki_context.practice_only, true);
    assert.equal(event.evaluation.pronunciation, 'not_evaluated');
    assert.equal(event.evaluation.overall, 'insufficient_evidence');
    assert.equal(Object.hasOwn(event, 'score'), false);
    assert.equal(event.evaluation.transcript_observation.adaptive_eligible, false);
});

function loadCoordinatorContext() {
    return {
        framework: 'trki',
        level: 'B1',
        package_id: 'trki-speaking-synthetic-b1',
        package_version: '1.0.0',
        task_id: 'speaking-task-1',
        source_reference: { source_id: 'src:synthetic', content_policy: 'synthetic-not-official' },
        practice_only: true
    };
}

test('keeps partial transcript unevaluated and preserves normal Speaking event compatibility', () => {
    const storeSource = fs.readFileSync(path.join(ROOT, 'js/speaking-store.js'), 'utf8');
    const window = { localStorage: { getItem: () => null, setItem() {} }, console };
    const context = { window, globalThis: window, console, structuredClone };
    vm.runInNewContext(storeSource, context, { filename: 'speaking-store.js' });
    const store = new window.SpeakingEventStore({ storage: window.localStorage });
    const event = {
        schema_version: 1,
        namespace: 'ru_tr_speaking_events_v1',
        event_id: 'speaking:event:legacy',
        attempt_id: 'speaking:attempt:legacy',
        started_at: '2026-09-21T10:00:00.000Z',
        completed_at: '2026-09-21T10:00:01.000Z',
        skill: 'speaking',
        exercise_type: 'read_aloud',
        attempt_status: 'completed',
        targets: [],
        expected_text: 'Я вижу дом.',
        transcript_text: '',
        transcript_state: 'partial_only',
        recording: { available: false, mime_type: null, duration_ms: 0, stored: false, uploaded: false, retention: 'session_only' },
        evaluation_availability: 'none',
        evaluation: {
            transcript_observation: {
                available: false, evidence_scope: 'none', assertion_scope: 'none', detection_method: 'none',
                verification_status: 'not_evaluated', adaptive_eligible: false, exercise_eligible: false, observations: []
            },
            pronunciation: 'not_evaluated', stress: 'not_evaluated', fluency: 'not_evaluated', overall: 'insufficient_evidence'
        }
    };

    const stored = store.recordEvent(event);

    assert.equal(stored.namespace, 'ru_tr_speaking_events_v1');
    assert.equal(stored.evaluation.transcript_observation.available, false);
    assert.equal(stored.evaluation.transcript_observation.adaptive_eligible, false);
});
