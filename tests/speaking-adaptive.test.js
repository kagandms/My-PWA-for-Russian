import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = process.cwd();

function loadProvider() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-adaptive-provider.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, structuredClone }, { filename: 'speaking-adaptive-provider.js' });
    return window.SpeakingAdaptiveProvider;
}

function loadPlannerAndEngine({ speakingProvider } = {}) {
    const plannerSource = fs.readFileSync(path.join(ROOT, 'js/adaptive-planner.js'), 'utf8');
    const engineSource = fs.readFileSync(path.join(ROOT, 'js/adaptive-engine.js'), 'utf8');
    const window = {
        console,
        ErrorTaxonomy: { getGrammarTopic: () => null },
        SpeakingAdaptiveProvider: speakingProvider
    };
    const context = { window, globalThis: window, console, structuredClone, Date };
    vm.runInNewContext(plannerSource, context, { filename: 'adaptive-planner.js' });
    vm.runInNewContext(engineSource, context, { filename: 'adaptive-engine.js' });
    return { AdaptiveEngine: window.AdaptiveEngine, buildAdaptivePlan: window.buildAdaptivePlan };
}

function createMastery() {
    return { rebuildFromProgress() {}, getMastery: () => ({ attempts: 0, status: 'unseen', incorrect_count: 0, correct_count: 0 }) };
}

function createRepository() {
    return {
        getTypedRecallQuestions: () => [],
        getProductionExercises: () => []
    };
}

function createSpeakingExercise(overrides = {}) {
    return {
        exercise_id: 'speaking:read:1',
        exercise_type: 'read_aloud',
        expected_text: 'Я вижу дом.',
        prompt: 'Я вижу дом.',
        verification_status: 'verified',
        exercise_eligible: true,
        targets: [{ lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }],
        ...overrides
    };
}

test('keeps Speaking out of the planner unless includeSpeaking is explicitly enabled', () => {
    const provider = loadProvider();
    const { buildAdaptivePlan } = loadPlannerAndEngine({ speakingProvider: provider });
    const baseOptions = {
        durationMinutes: 10,
        repository: createRepository(),
        masteryReadModel: createMastery(),
        errorStore: { getErrors: () => [] },
        grammarRepository: { getScoredExercises: () => [] },
        speakingRepository: { getReadAloudExercises: () => [createSpeakingExercise()] },
        now: () => '2026-09-20T10:00:00.000Z'
    };

    const defaultPlan = buildAdaptivePlan(baseOptions);
    const explicitFalsePlan = buildAdaptivePlan({ ...baseOptions, includeSpeaking: false });

    assert.deepEqual(explicitFalsePlan.planned_items, defaultPlan.planned_items);
    assert.equal(defaultPlan.planned_items.some(item => item.module === 'speaking'), false);
});

test('adds only verified eligible scored speaking exercises when opt-in is enabled', () => {
    const provider = loadProvider();
    const candidates = provider.buildSpeakingAdaptiveCandidates({
        includeSpeaking: true,
        exercises: [
            createSpeakingExercise(),
            createSpeakingExercise({ exercise_id: 'speaking:candidate', verification_status: 'candidate' }),
            createSpeakingExercise({ exercise_id: 'speaking:ineligible', exercise_eligible: false }),
            createSpeakingExercise({
                exercise_id: 'speaking:prompted',
                exercise_type: 'prompted_speech',
                expected_text: null,
                targets: [
                    { lexical_unit_id: 'lu:1', sense_id: 'sense:1', target_surface: 'обсуждать' },
                    { lexical_unit_id: 'lu:2', sense_id: 'sense:2', target_surface: 'план' }
                ]
            })
        ]
    });

    assert.deepEqual(candidates.map(item => item.exercise_id), ['speaking:read:1', 'speaking:prompted']);
    assert.equal(candidates[0].lexical_unit_id, 'lu:house');
    assert.equal(candidates[0].sense_id, 'sense:house');
    assert.deepEqual(candidates[0].targets, [{ lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }]);
    assert.equal('accuracy' in candidates[0], false);
    assert.equal('mastery' in candidates[0], false);
});

test('keeps Free Speech practice-only and requires a separate explicit opt-in', () => {
    const provider = loadProvider();
    const topic = { topic_id: 'topic:weekend', prompt: 'Расскажи о выходных.', duration_seconds: 45 };

    const withoutFreeSpeech = provider.buildSpeakingAdaptiveCandidates({ includeSpeaking: true, freeSpeechTopics: [topic] });
    const withFreeSpeech = provider.buildSpeakingAdaptiveCandidates({ includeSpeaking: true, includeFreeSpeech: true, freeSpeechTopics: [topic] });

    assert.equal(withoutFreeSpeech.some(item => item.exercise_type === 'free_speech'), false);
    assert.equal(withFreeSpeech.length, 1);
    assert.equal(withFreeSpeech[0].practice_only, true);
    assert.equal(withFreeSpeech[0].lexical_unit_id, null);
    assert.equal(withFreeSpeech[0].sense_id, null);
    assert.equal('selection_reason' in withFreeSpeech[0], true);
    assert.equal('weakness_score' in withFreeSpeech[0], false);
});

test('engine builds opt-in speaking candidates without requesting microphone permission', () => {
    const provider = loadProvider();
    const { AdaptiveEngine, buildAdaptivePlan } = loadPlannerAndEngine({ speakingProvider: provider });
    const plans = [];
    let permissionRequests = 0;
    const engine = new AdaptiveEngine({
        sessionStore: { createSession: plan => { plans.push(plan); return plan; } },
        planner: buildAdaptivePlan,
        repository: createRepository(),
        mastery: createMastery(),
        errorStore: { getErrors: () => [] },
        grammarRepository: { getScoredExercises: () => [] },
        speakingRepository: { getReadAloudExercises: () => [createSpeakingExercise()], getPromptedExercises: () => [], getFreeSpeechTopics: () => [] },
        speakingCapabilities: { detect: () => { permissionRequests += 1; return {}; } }
    });

    engine.startSession(10, { includeSpeaking: true });

    assert.equal(permissionRequests, 0);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].planned_items.some(item => item.module === 'speaking'), true);
});

test('adaptive mode exposes explicit speaking start/stop controls and completes after an event', () => {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-mode.js'), 'utf8');
    const elements = new Map(['adaptiveStart', 'adaptiveExercise', 'adaptivePrompt', 'adaptiveInput', 'adaptiveSubmit', 'adaptiveNext', 'adaptivePause', 'adaptiveFeedback', 'adaptiveProgress', 'adaptiveModule', 'adaptiveRecognitionControls', 'adaptiveRecognizeKnown', 'adaptiveRecognizeAgain', 'adaptiveReviewDone', 'adaptiveCompletion', 'adaptiveCompletionSummary', 'adaptiveResume', 'adaptiveStatus', 'adaptiveSpeakingControls', 'adaptiveSpeakingStart', 'adaptiveSpeakingStop', 'adaptiveSpeakingStatus'].map(id => [id, {
        textContent: '', value: '', disabled: false, onclick: null,
        classList: { add() {}, remove() {}, toggle() {} }
    }]));
    const completed = [];
    const session = {
        session_status: 'active',
        current_index: 0,
        planned_items: [{ item_id: 'speaking:speaking:read:1', module: 'speaking', exercise_type: 'read_aloud', prompt: 'Я вижу дом.', targets: [] }],
        completed_items: []
    };
    const window = {
        adaptiveEngine: {
            getActiveSession: () => session,
            getCurrentItem: () => session.planned_items[0],
            completeItem: (itemId, outcome) => completed.push({ itemId, outcome })
        },
        speakingMode: {
            configureAdaptiveExercise: (item, callback) => { window.callback = callback; },
            start: () => Promise.resolve(true),
            stop: () => Promise.resolve({ event_id: 'event:1' })
        }
    };
    const document = { getElementById: id => elements.get(id), querySelectorAll: () => [] };
    vm.runInNewContext(source, { window, globalThis: window, document, console, Date }, { filename: 'adaptive-mode.js' });

    window.adaptiveMode.init();
    window.adaptiveMode.startSpeaking();
    window.callback({ event_id: 'event:1' });

    assert.equal(elements.get('adaptiveSpeakingControls').classList.toggle !== undefined, true);
    assert.equal(completed[0].outcome.result, 'speaking_event_recorded');
});
