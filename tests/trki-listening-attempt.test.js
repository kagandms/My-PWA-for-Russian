import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

function loadStore() {
    const window = {};
    vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js/trki-listening-attempt-store.js'), 'utf8'),
        { window, globalThis: window, console, structuredClone },
        { filename: 'trki-listening-attempt-store.js' }
    );
    return window.TrkiListeningAttemptStore;
}

function createEvaluation(result = 'correct') {
    return {
        identity: {
            parts: {
                package_id: 'package-1', package_version: '1.0.0', task_id: 'task-1',
                audio_id: 'audio-1', question_id: 'question-1'
            },
            key: 'package-1@1.0.0/task-1/audio-1/question-1'
        },
        package_hash: 'sha256:package-1',
        task_hash: 'sha256:task-1',
        audio_hash: 'sha256:audio-1',
        question_hash: 'sha256:question-1',
        answer_key_hash: 'sha256:answer-1',
        alignment_hash: 'sha256:alignment-1',
        replay_policy_hash: 'sha256:replay-1',
        transcript_hash: 'sha256:transcript-1',
        answer_key_snapshot: { option_index: 0 },
        alignment_snapshot: { audio_id: 'audio-1', offset_ms: 0, duration_ms: 1200 },
        replay_policy_snapshot: { max_plays: 2, pause_allowed: false, seek_allowed: false, autoplay: false },
        verification_status: 'verified',
        exercise_eligible: true,
        source_reference: { source_id: 'src:synthetic', content_policy: 'synthetic-not-official' },
        result,
        score: result === 'correct' ? 1 : 0,
        evaluator_version: 'trki-listening-evaluator-v1'
    };
}

function createAttempt(overrides = {}) {
    return {
        attempt_id: 'listening-attempt:1',
        session_id: 'listening-session:1',
        level: 'B1',
        section: 'listening',
        exercise_type: 'multiple_choice',
        identity: createEvaluation().identity,
        submitted_answer: { option_index: 0 },
        result: 'correct',
        scoring_status: 'scored',
        objective_scoreable: true,
        score: 1,
        mastery_eligible: true,
        error_notebook_eligible: false,
        adaptive_eligible: false,
        replay: { plays_consumed: 1, max_plays: 2 },
        evaluation: createEvaluation(),
        answered_at: '2026-09-21T10:00:00.000Z',
        ...overrides
    };
}

test('stores complete historical evaluation evidence append-only', () => {
    const Store = loadStore();
    const store = new Store({ storage: createStorage() });
    const attempt = store.recordAttempt(createAttempt());

    assert.equal(attempt.evaluation.answer_key_snapshot.option_index, 0);
    assert.equal(attempt.evaluation.alignment_snapshot.audio_id, 'audio-1');
    assert.equal(attempt.evaluation.evaluator_version, 'trki-listening-evaluator-v1');
    assert.equal(attempt.evaluation.exercise_eligible, true);
    assert.equal(attempt.evaluation.source_reference.content_policy, 'synthetic-not-official');
    assert.equal(store.getSnapshot().attempts.length, 1);
});

test('keeps an old evaluation snapshot after the caller mutates a revised package object', () => {
    const Store = loadStore();
    const store = new Store({ storage: createStorage() });
    const attempt = createAttempt();
    store.recordAttempt(attempt);
    attempt.evaluation.answer_key_snapshot.option_index = 1;
    attempt.evaluation.question_hash = 'sha256:question-revised';

    const stored = store.getSnapshot().attempts[0];
    assert.equal(stored.evaluation.answer_key_snapshot.option_index, 0);
    assert.equal(stored.evaluation.question_hash, 'sha256:question-1');
    const duplicate = store.recordAttempt(attempt);
    assert.equal(duplicate.evaluation.answer_key_snapshot.option_index, 0);
});

test('records technical unavailability as non-scorable with no learning effects', () => {
    const Store = loadStore();
    const store = new Store({ storage: createStorage() });
    const attempt = store.recordAttempt(createAttempt({
        attempt_id: 'listening-attempt:technical',
        result: 'technical_unavailable',
        scoring_status: 'non_scorable',
        objective_scoreable: false,
        score: null,
        mastery_eligible: false,
        error_notebook_eligible: false,
        adaptive_eligible: false,
        technical_reason: 'required_audio_unavailable',
        evaluation: null
    }));

    assert.equal(attempt.result, 'technical_unavailable');
    assert.equal(attempt.score, null);
    assert.equal(attempt.mastery_eligible, false);
    assert.equal(attempt.error_notebook_eligible, false);
    assert.equal(attempt.adaptive_eligible, false);
});

test('rejects raw audio or transcript content in an attempt', () => {
    const Store = loadStore();
    const store = new Store({ storage: createStorage() });

    assert.throws(() => store.recordAttempt(createAttempt({ audio_blob: { size: 10 } })), /raw Listening content/iu);
    assert.throws(() => store.recordAttempt(createAttempt({ transcript_text: 'Анна читает' })), /raw Listening content/iu);
});
