import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadAnalytics() {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-analytics.js'), 'utf8');
    const window = { console };
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'adaptive-analytics.js' });
    return window.SkillAnalytics;
}

test('reports skill analytics without inventing production accuracy', () => {
    const analytics = loadAnalytics().build({
        masteryRecords: [
            { lexical_unit_id: 'lu:1', sense_id: 'sense:1', skill: 'recognition', attempts: 2, correct_count: 1, incorrect_count: 1, almost_correct_count: 0, accuracy: 0.5, status: 'learning', last_attempt_at: '2026-09-20T09:00:00.000Z' },
            { lexical_unit_id: 'lu:1', sense_id: 'sense:1', skill: 'recall', attempts: 1, correct_count: 0, incorrect_count: 1, almost_correct_count: 0, accuracy: 0, status: 'needs_review', last_attempt_at: '2026-09-20T09:01:00.000Z' },
            { lexical_unit_id: 'lu:1', sense_id: 'sense:1', skill: 'production', attempts: 1, completed_observations: 1, target_not_detected_count: 0, empty_answer_count: 0, accuracy: null, status: 'insufficient_evidence', last_attempt_at: '2026-09-20T09:02:00.000Z' }
        ],
        grammarAttempts: [],
        eligibleSenseCount: 2,
        grammarEligibleCount: 0
    });

    assert.equal(analytics.recognition.recent_accuracy, 0.5);
    assert.equal(analytics.recall.weak_item_count, 1);
    assert.equal(analytics.production.recent_accuracy, null);
    assert.equal(analytics.production.evidence_status, 'insufficient_evidence');
    assert.equal(analytics.grammar.status, 'no_evidence');
    assert.equal(analytics.recognition.evidence_coverage, 0.5);
});

test('keeps analytics sense-level and reports grammar binary evidence separately', () => {
    const analytics = loadAnalytics().build({
        masteryRecords: [
            { lexical_unit_id: 'lu:1', sense_id: 'sense:a', skill: 'recall', attempts: 1, correct_count: 1, incorrect_count: 0, almost_correct_count: 0, accuracy: 1, status: 'learning', last_attempt_at: '2026-09-20T09:00:00.000Z' },
            { lexical_unit_id: 'lu:1', sense_id: 'sense:b', skill: 'recall', attempts: 1, correct_count: 0, incorrect_count: 1, almost_correct_count: 0, accuracy: 0, status: 'needs_review', last_attempt_at: '2026-09-20T09:01:00.000Z' }
        ],
        grammarAttempts: [
            { result: 'correct', timestamp: '2026-09-20T09:00:00.000Z' },
            { result: 'incorrect', timestamp: '2026-09-20T09:01:00.000Z' }
        ],
        eligibleSenseCount: 2,
        grammarEligibleCount: 1
    });

    assert.equal(analytics.grammar.recent_accuracy, 0.5);
    assert.equal(analytics.grammar.attempts, 2);
    assert.equal(analytics.senses['lu:1|sense:a'].recall.status, 'learning');
    assert.equal(analytics.senses['lu:1|sense:b'].recall.status, 'needs_review');
});

test('reports speaking observation metrics without accuracy or mastery scores', () => {
    const analytics = loadAnalytics().build({
        masteryRecords: [],
        grammarAttempts: [],
        eligibleSenseCount: 2,
        grammarEligibleCount: 0,
        speakingSnapshot: {
            lexical_mastery: {
                'lu:tree|sense:tree': {
                    observation_count: 2,
                    transcript_observation_count: 1,
                    target_observation_count: 2,
                    last_practiced: '2026-09-20T09:00:00.000Z'
                }
            },
            sessions: {
                'speaking:free:1': {
                    observation_count: 1,
                    transcript_available: false,
                    last_practiced: '2026-09-20T09:01:00.000Z'
                }
            }
        }
    });

    assert.equal(analytics.speaking.observation_count, 3);
    assert.equal(analytics.speaking.transcript_observation_count, 1);
    assert.equal(analytics.speaking.target_observation_count, 2);
    assert.equal(analytics.speaking.evidence_status, 'insufficient_evidence');
    assert.equal(analytics.speaking.recent_accuracy, undefined);
    assert.equal(analytics.speaking.mastery_success, undefined);
});
