import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadBridge() {
    const files = ['js/error-taxonomy.js', 'js/error-notebook.js', 'js/speaking-error-bridge.js'];
    const window = { console };
    const context = { window, globalThis: window, console, structuredClone };
    for (const file of files) {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInNewContext(source, context, { filename: file });
    }
    return window;
}

function createReadAloudMismatch() {
    return {
        exercise_type: 'read_aloud',
        exercise_id: 'speaking:read-aloud:1',
        lexical_unit_id: 'lu:tree',
        sense_id: 'sense:tree',
        target_surface: 'ёлка',
        expected_text: 'Я вижу ёлку.',
        transcript_text: 'Я вижу дом.',
        transcript_state: 'final_result',
        alignment_status: 'mismatch'
    };
}

test('creates a neutral verified transcript mismatch only from final STT transcript', () => {
    const window = loadBridge();
    const record = window.SpeakingErrorBridge.createFromObservation(createReadAloudMismatch());

    assert.equal(record.error_type, 'speaking.transcript_mismatch');
    assert.equal(record.evidence_scope, 'stt_final_transcript');
    assert.equal(record.assertion_scope, 'transcript_alignment');
    assert.equal(record.detection_method, 'deterministic');
    assert.equal(record.verification_status, 'verified');
    assert.equal(record.adaptive_eligible, false);
    assert.equal(record.exercise_eligible, false);
    assert.equal(window.ErrorTaxonomy.getGrammarTopic(record.error_type), null);
    assert.equal('pronunciation' in record, false);
    assert.equal('grammar_topic' in record, false);
});

test('creates target-not-observed without treating it as pronunciation or grammar weakness', () => {
    const window = loadBridge();
    const record = window.SpeakingErrorBridge.createFromObservation({
        exercise_type: 'prompted_speech',
        exercise_id: 'speaking:prompted:1',
        transcript_state: 'final_result',
        transcript_text: 'Я читаю книгу.',
        target_observation: {
            lexical_unit_id: 'lu:tree',
            sense_id: 'sense:tree',
            target_surface: 'ёлка',
            observed: false
        }
    });

    assert.equal(record.error_type, 'speaking.transcript_target_not_observed');
    assert.equal(record.assertion_scope, 'target_presence_in_transcript');
    assert.equal(record.lexical_unit_id, 'lu:tree');
    assert.equal(record.sense_id, 'sense:tree');
    assert.equal(record.adaptive_eligible, false);
    assert.equal(window.ErrorTaxonomy.getGrammarTopic(record.error_type), null);
});

test('does not create Error Notebook truth for partial empty unavailable or confidence-only input', () => {
    const window = loadBridge();
    const observations = [
        { ...createReadAloudMismatch(), transcript_state: 'partial_only' },
        { ...createReadAloudMismatch(), transcript_state: 'no_result', transcript_text: '' },
        { ...createReadAloudMismatch(), transcript_state: 'unavailable' },
        { ...createReadAloudMismatch(), provider_confidence: 0.2, alignment_status: undefined }
    ];

    assert.equal(observations.every((observation) => (
        window.SpeakingErrorBridge.createFromObservation(observation) === null
    )), true);
});

test('records only the bridge output in the Error Notebook store', () => {
    const window = loadBridge();
    const storage = {
        value: null,
        setItem(key, value) {
            this.value = value;
        },
        getItem() {
            return this.value;
        }
    };
    const errorStore = new window.ErrorNotebookStore({ storage });
    const stored = window.SpeakingErrorBridge.recordObservation({
        observation: createReadAloudMismatch(),
        errorStore
    });

    assert.equal(stored.error_type, 'speaking.transcript_mismatch');
    assert.equal(errorStore.getErrors().length, 1);
    assert.equal(errorStore.getErrors()[0].status, 'active');
});

