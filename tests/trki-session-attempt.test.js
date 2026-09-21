import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadStores() {
    const files = ['trki-timer.js', 'trki-session-store.js', 'trki-attempt-store.js', 'trki-profile-store.js'];
    const window = {};
    const context = { window, globalThis: window, console, Date, structuredClone };
    files.forEach(file => vm.runInNewContext(
        fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'),
        context,
        { filename: file }
    ));
    return window;
}

function createStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
}

test('persists a study session and allows timestamp-based pause and resume', () => {
    const { TrkiSessionStore } = loadStores();
    const storage = createStorage();
    let now = Date.parse('2026-09-21T10:00:00.000Z');
    const store = new TrkiSessionStore({ storage, now: () => new Date(now).toISOString(), idFactory: () => 'session:study:1' });

    const created = store.createSession({
        mode: 'study', level: 'B1', planned_items: [{ exercise_id: 'trki:b1:grammar:1' }], duration_seconds: 600
    });
    now += 30_000;
    const paused = store.pause(created.session_id);

    assert.equal(paused.session_status, 'paused');
    assert.equal(paused.timer.accumulated_seconds, 30);
    assert.equal(store.getElapsedSeconds(created.session_id, now + 90_000), 30);

    now += 90_000;
    const resumed = store.resume(created.session_id);
    assert.equal(resumed.session_status, 'active');
    assert.equal(resumed.timer.accumulated_seconds, 30);
    assert.equal(resumed.timer.started_at, '2026-09-21T10:02:00.000Z');
    assert.equal(store.getElapsedSeconds(created.session_id, now + 10_000), 40);
});

test('rejects silent exam pause and derives elapsed time from persisted timestamps', () => {
    const { TrkiSessionStore } = loadStores();
    const storage = createStorage();
    const start = Date.parse('2026-09-21T10:00:00.000Z');
    const store = new TrkiSessionStore({ storage, now: () => new Date(start).toISOString(), idFactory: () => 'session:exam:1' });
    const session = store.createSession({ mode: 'exam', level: 'B2', planned_items: [], duration_seconds: 3600 });

    assert.throws(() => store.pause(session.session_id), /Exam sessions cannot be paused/u);
    assert.equal(store.getElapsedSeconds(session.session_id, start + 65_000), 65);
    assert.equal(store.getRemainingSeconds(session.session_id, start + 65_000), 3535);
});

test('persists completed item order and closes the timer at the end of a session', () => {
    const { TrkiSessionStore } = loadStores();
    const storage = createStorage();
    const store = new TrkiSessionStore({ storage, now: () => '2026-09-21T10:00:00.000Z', idFactory: () => 'session:ordered:1' });
    const session = store.createSession({
        mode: 'study', level: 'B1', planned_items: [{ exercise_id: 'trki:1' }], duration_seconds: 600
    });

    const completed = store.completeItem(session.session_id, 'trki:1');

    assert.equal(completed.session_status, 'completed');
    assert.equal(completed.current_index, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(completed.completed_items)), [{ item_id: 'trki:1', completed_at: '2026-09-21T10:00:00.000Z' }]);
    assert.equal(completed.timer.status, 'completed');
});

test('returns the persisted active session for explicit resume flows', () => {
    const { TrkiSessionStore } = loadStores();
    const store = new TrkiSessionStore({ storage: createStorage(), now: () => '2026-09-21T10:00:00.000Z', idFactory: () => 'session:resume:1' });
    const created = store.createSession({ mode: 'study', level: 'B1', planned_items: [], duration_seconds: 600 });

    assert.equal(store.getActiveSession().session_id, created.session_id);
});

test('stores attempts append-only and forces writing attempts to remain practice-only', () => {
    const { TrkiAttemptStore } = loadStores();
    const storage = createStorage();
    const store = new TrkiAttemptStore({ storage });

    const attempt = store.recordAttempt({
        attempt_id: 'attempt:writing:1',
        session_id: 'session:study:1',
        exercise_id: 'trki:b1:writing:1',
        level: 'B1',
        section: 'writing',
        result: 'practice_submitted',
        scoring_status: 'practice_only',
        objective_scoreable: false,
        score: null,
        mastery_eligible: false,
        error_notebook_eligible: false,
        adaptive_eligible: false
    });

    assert.equal(attempt.scoring_status, 'practice_only');
    assert.equal(store.getSnapshot().attempts.length, 1);
    assert.throws(() => store.recordAttempt({ ...attempt }), /Duplicate TRKI attempt ID/u);
    assert.equal(typeof store.deleteAttempt, 'undefined');
});

test('rejects scored attempts without objective provenance and records only scored outcomes in profile progress', () => {
    const { TrkiAttemptStore, TrkiProfileStore } = loadStores();
    const storage = createStorage();
    const attempts = new TrkiAttemptStore({ storage });
    const profile = new TrkiProfileStore({ storage });

    assert.throws(() => attempts.recordAttempt({
        attempt_id: 'attempt:invalid:1', session_id: 'session:exam:1', exercise_id: 'trki:b1:reading:1',
        level: 'B1', section: 'reading', result: 'correct', scoring_status: 'scored',
        objective_scoreable: false, score: 1, mastery_eligible: true,
        error_notebook_eligible: true, adaptive_eligible: true
    }), /objective scoreable/u);

    const scored = attempts.recordAttempt({
        attempt_id: 'attempt:reading:1', session_id: 'session:exam:1', exercise_id: 'trki:b1:reading:1',
        level: 'B1', section: 'reading', result: 'correct', scoring_status: 'scored',
        objective_scoreable: true, score: 1, mastery_eligible: true,
        error_notebook_eligible: true, adaptive_eligible: true
    });
    const practice = attempts.recordAttempt({
        attempt_id: 'attempt:writing:2', session_id: 'session:study:1', exercise_id: 'trki:b1:writing:1',
        level: 'B1', section: 'writing', result: 'practice_submitted', scoring_status: 'practice_only',
        objective_scoreable: false, score: null, mastery_eligible: false,
        error_notebook_eligible: false, adaptive_eligible: false
    });

    profile.applyAttempt(scored);
    profile.applyAttempt(practice);
    assert.equal(profile.getSnapshot().objective_attempt_count, 1);
    assert.equal(profile.getSnapshot().practice_attempt_count, 1);
    assert.equal(profile.getSnapshot().section_progress.reading.correct, 1);
    assert.equal(profile.getSnapshot().section_progress.writing, undefined);
});
