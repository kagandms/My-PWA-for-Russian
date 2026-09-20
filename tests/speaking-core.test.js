import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCore() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-core.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'speaking-core.js' });
    return window.SpeakingCore;
}

test('normalizes Russian transcript text conservatively', () => {
    const core = loadCore();

    assert.equal(core.normalizeTranscript('  ЁЛКА,\u00a0  дом!  '), 'елка дом');
    assert.deepEqual(Array.from(core.tokenizeTranscript('  ЁЛКА,\u00a0  дом!  ')), ['елка', 'дом']);
});

test('aligns exact transcript tokens without accuracy fields', () => {
    const core = loadCore();

    const result = core.alignTranscript('Я люблю русский язык.', 'я люблю русский язык', {
        transcriptState: 'final_result'
    });

    assert.equal(result.alignment_status, 'exact');
    assert.equal(result.transcript_state, 'final_result');
    assert.equal(result.observation_eligible, true);
    assert.deepEqual(Array.from(result.operations, (operation) => operation.type), ['match', 'match', 'match', 'match']);
    assert.equal(result.accuracy, undefined);
    assert.equal(result.pronunciation, undefined);
});

test('reports missing extra and substituted transcript tokens', () => {
    const core = loadCore();

    const result = core.alignTranscript('я люблю русский язык', 'я люблю английский', {
        transcriptState: 'final_result'
    });

    assert.equal(result.alignment_status, 'mismatch');
    assert.deepEqual(Array.from(result.missing_tokens), ['русский']);
    assert.deepEqual(Array.from(result.extra_tokens), []);
    assert.deepEqual(JSON.parse(JSON.stringify(result.substitutions)), [{ expected_token: 'язык', transcript_token: 'английский' }]);

    const extra = core.alignTranscript('я люблю русский язык', 'я люблю очень русский язык', {
        transcriptState: 'final_result'
    });

    assert.deepEqual(Array.from(extra.extra_tokens), ['очень']);
});

test('does not infer stemming or inflected forms during alignment', () => {
    const core = loadCore();

    const result = core.alignTranscript('учиться дома', 'учусь дома', {
        transcriptState: 'final_result'
    });

    assert.equal(result.alignment_status, 'mismatch');
    assert.deepEqual(Array.from(result.missing_tokens), []);
    assert.deepEqual(Array.from(result.extra_tokens), []);
    assert.deepEqual(JSON.parse(JSON.stringify(result.substitutions)), [{ expected_token: 'учиться', transcript_token: 'учусь' }]);
});

test('keeps partial transcript out of deterministic observation eligibility', () => {
    const core = loadCore();

    const result = core.alignTranscript('я читаю книгу', 'я читаю', {
        transcriptState: 'partial_only'
    });

    assert.equal(result.transcript_state, 'partial_only');
    assert.equal(result.observation_eligible, false);
    assert.equal(result.alignment_status, 'partial');
});

test('detects exact paired targets without cross-sense reconstruction', () => {
    const core = loadCore();

    const result = core.detectTargets('я вижу елка и дом', [
        { lexical_unit_id: 'lu:tree', sense_id: 'sense:tree', target_surface: 'ёлка' },
        { lexical_unit_id: 'lu:house', sense_id: 'sense:house', target_surface: 'дом' }
    ]);

    assert.deepEqual(result.detected.map((target) => [
        target.lexical_unit_id,
        target.sense_id,
        target.observed
    ]), [
        ['lu:tree', 'sense:tree', true],
        ['lu:house', 'sense:house', true]
    ]);
});

test('uses only explicitly curated accepted forms for target detection', () => {
    const core = loadCore();

    const result = core.detectTargets('я вижу дома', [
        {
            lexical_unit_id: 'lu:house',
            sense_id: 'sense:house',
            target_surface: 'дом',
            accepted_forms: ['дом']
        }
    ]);

    assert.equal(result.detected[0].observed, false);
    assert.equal(result.detected[0].detection_method, 'exact_normalized_surface');
});

test('transitions through speaking lifecycle states', () => {
    const core = loadCore();

    assert.equal(core.transition('idle', 'REQUEST_PERMISSION'), 'requesting_permission');
    assert.equal(core.transition('requesting_permission', 'PERMISSION_GRANTED'), 'ready');
    assert.equal(core.transition('ready', 'START'), 'recording');
    assert.equal(core.transition('recording', 'STOP'), 'processing');
    assert.equal(core.transition('processing', 'FINAL_RESULT'), 'result');
    assert.equal(core.transition('ready', 'PERMISSION_DENIED'), 'permission_denied');
    assert.equal(core.transition('ready', 'UNSUPPORTED'), 'unsupported');
    assert.equal(core.transition('recording', 'ERROR'), 'error');
    assert.equal(core.transition('result', 'RESET'), 'idle');
    assert.throws(() => core.transition('idle', 'FINAL_RESULT'), /invalid speaking transition/);
});
