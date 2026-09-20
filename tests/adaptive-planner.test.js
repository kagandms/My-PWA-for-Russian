import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadPlanner() {
    const source = fs.readFileSync(path.join(ROOT, 'js/adaptive-planner.js'), 'utf8');
    const window = { console, ErrorTaxonomy: { getGrammarTopic: errorType => errorType === 'verb.aspect' ? 'verb.aspect' : null } };
    vm.runInNewContext(source, { window, globalThis: window, console, structuredClone }, { filename: 'adaptive-planner.js' });
    return window.buildAdaptivePlan;
}

function createRepository() {
    return {
        getTypedRecallQuestions: () => [
            { lexical_unit_id: 'lu:1', sense_id: 'sense:1', prompt: 'öğrenmek', accepted_answers: ['учиться'], entry_type: 'lemma' },
            { lexical_unit_id: 'lu:2', sense_id: 'sense:2', prompt: 'kaçınmak', accepted_answers: ['избежать'], entry_type: 'lemma' }
        ],
        getProductionExercises: () => [{
            exercise_id: 'exercise:lu:2:sense:2:target_word_sentence',
            lexical_unit_id: 'lu:2',
            sense_id: 'sense:2',
            skill: 'production',
            exercise_type: 'target_word_sentence',
            prompt: 'kaçınmak',
            target_form: 'избежать',
            entry_type: 'lemma',
            exercise_eligible: true
        }]
    };
}

function createMastery(records = []) {
    const map = new Map(records.map(record => [`${record.lexical_unit_id}|${record.sense_id}|${record.skill}`, record]));
    return { getMastery: identity => map.get(`${identity.lexicalUnitId}|${identity.senseId}|${identity.skill}`) || { attempts: 0, status: 'unseen', incorrect_count: 0, correct_count: 0, last_attempt_at: null } };
}

test('prioritizes verified active errors and keeps generic recall mismatch non-grammar', () => {
    const buildPlan = loadPlanner();
    const plan = buildPlan({
        durationMinutes: 10,
        repository: createRepository(),
        masteryReadModel: createMastery(),
        errorStore: {
            getErrors: () => [
                { error_id: 'error:verified', lexical_unit_id: 'lu:1', sense_id: 'sense:1', error_type: 'recall.mismatch', verification_status: 'verified', status: 'active' },
                { error_id: 'error:candidate', lexical_unit_id: 'lu:2', sense_id: 'sense:2', error_type: 'verb.aspect', verification_status: 'candidate', status: 'active' },
                { error_id: 'error:dismissed', lexical_unit_id: 'lu:2', sense_id: 'sense:2', error_type: 'verb.aspect', verification_status: 'verified', status: 'dismissed' }
            ]
        },
        grammarRepository: { getScoredExercises: () => [{ exercise_id: 'grammar:verified', grammar_topic: 'verb.aspect', prompt: '...', accepted_answers: ['...'], source: 'fixture', verification_status: 'verified', exercise_eligible: true }] },
        now: () => '2026-09-20T10:00:00.000Z'
    });

    const errorItem = plan.planned_items.find(item => item.error_id === 'error:verified');
    const recallItem = plan.planned_items.find(item => item.lexical_unit_id === 'lu:1' && item.skill === 'recall');
    assert.ok(errorItem);
    assert.ok(errorItem.selection_reason.includes('recent_verified_error'));
    assert.ok(recallItem);
    assert.equal(recallItem.selection_reason.includes('grammar_weakness'), false);
    assert.equal(plan.planned_items.some(item => item.error_id === 'error:candidate' || item.error_id === 'error:dismissed'), false);
    assert.equal(plan.planned_items.some(item => item.exercise_id === 'grammar:verified'), true);
});

test('uses duration budget and suppresses repeated regular sense candidates', () => {
    const buildPlan = loadPlanner();
    const plan = buildPlan({
        durationMinutes: 10,
        repository: createRepository(),
        masteryReadModel: createMastery(),
        errorStore: { getErrors: () => [] },
        grammarRepository: { getScoredExercises: () => [] },
        now: () => '2026-09-20T10:00:00.000Z'
    });

    const regularKeys = plan.planned_items
        .filter(item => item.module !== 'error_review')
        .map(item => `${item.lexical_unit_id}|${item.sense_id}`);
    assert.equal(new Set(regularKeys).size, regularKeys.length);
    assert.ok(plan.estimated_seconds <= 600);
    assert.ok(plan.planned_items.every(item => Array.isArray(item.selection_reason) && item.source_refs.length > 0));
});

test('creates a useful cold-start plan without errors or grammar inventory', () => {
    const buildPlan = loadPlanner();
    const plan = buildPlan({
        durationMinutes: 10,
        repository: createRepository(),
        masteryReadModel: createMastery(),
        errorStore: { getErrors: () => [] },
        grammarRepository: { getScoredExercises: () => [] },
        now: () => '2026-09-20T10:00:00.000Z'
    });

    assert.ok(plan.planned_items.length > 0);
    assert.equal(plan.planned_items.some(item => item.module === 'grammar'), false);
    assert.equal(plan.planned_items.every(item => item.selection_reason.includes('new_item')), true);
});

test('ignores verified speaking transcript observations when adaptive eligibility is false', () => {
    const buildPlan = loadPlanner();
    const baseOptions = {
        durationMinutes: 10,
        repository: createRepository(),
        masteryReadModel: createMastery(),
        grammarRepository: { getScoredExercises: () => [] },
        now: () => '2026-09-20T10:00:00.000Z'
    };
    const before = buildPlan({ ...baseOptions, errorStore: { getErrors: () => [] } });
    const after = buildPlan({
        ...baseOptions,
        errorStore: {
            getErrors: () => [{
                error_id: 'speaking:error:1',
                error_type: 'speaking.transcript_mismatch',
                lexical_unit_id: 'lu:1',
                sense_id: 'sense:1',
                verification_status: 'verified',
                adaptive_eligible: false,
                status: 'active'
            }]
        }
    });

    assert.deepEqual(JSON.parse(JSON.stringify(after.planned_items)), JSON.parse(JSON.stringify(before.planned_items)));
    assert.equal(after.planned_items.some(item => item.selection_reason.includes('grammar_weakness')), false);
    assert.equal(after.planned_items.some(item => item.selection_reason.includes('recent_verified_error')), false);
});
