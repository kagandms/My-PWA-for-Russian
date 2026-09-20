import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    QUALITY_CANDIDATE_TYPES,
    buildQualityOverlay,
    classifyCorpusCandidate
} from '../lib/vocabulary/corpus-quality-gate.mjs';
import { runCorpusQualityGate } from '../lib/vocabulary/corpus-quality-gate-runner.mjs';

function makeSense(senseId = 'sense:fixture') {
    return {
        sense_id: senseId,
        definitions: ['fixture meaning'],
        verification_status: 'reviewed'
    };
}

function makeUnit(surfaceForm, sense = makeSense()) {
    return {
        id: `lu:${surfaceForm}`,
        surface_form: surfaceForm,
        verification_status: 'reviewed',
        senses: [sense]
    };
}

function makeRecord(collocation, senseId = 'sense:fixture', lexicalUnitId = 'lu:fixture') {
    return {
        enrichment_id: `corpus-enrich:${collocation}`,
        lexical_unit_id: lexicalUnitId,
        sense_id: senseId,
        field: 'collocation',
        value: collocation,
        collocation,
        evidence_sentences: [{ sentence_id: '1:1', ru: 'fixture', tr: 'örnek' }],
        source: 'sentences_strict.json',
        source_reference: { file_name: 'sentences_strict.json', sha256: 'fixture', source_lines: [], corpus_references: ['1:1'] },
        confidence: 0.72,
        verification_status: 'candidate',
        updated_at: '2026-09-20T13:00:00.000Z',
        exercise_eligible: false
    };
}

test('classifies representative candidates by linguistic role', () => {
    const examples = [
        ['Привести', 'привести к', 'government_pattern'],
        ['День', 'день рождения', 'collocation'],
        ['День', 'каждый день', 'context_phrase'],
        ['А', 'а не', 'grammar_pattern'],
        ['Никто', 'никто не', 'grammar_pattern'],
        ['Хотя', 'хотя бы', 'grammar_pattern'],
        ['Несколько', 'за несколько', 'discard']
    ];

    examples.forEach(([surfaceForm, collocation, expectedType]) => {
        const unit = makeUnit(surfaceForm);
        const result = classifyCorpusCandidate(makeRecord(collocation), unit);

        assert.equal(result.candidate_type, expectedType);
        assert.ok(result.classification_reason);
        assert.ok(result.classification_rationale.includes(surfaceForm));
    });
});

test('keeps quality-gate records as candidates and preserves discard records', () => {
    const unit = makeUnit('Несколько');
    const record = makeRecord('за несколько', 'sense:fixture', unit.id);
    const overlay = buildQualityOverlay({
        sourceRecords: [record],
        lexicalUnits: [unit],
        sourceOverlay: { file_name: 'enrichment-corpus.v1b.json', sha256: 'source-hash' },
        baseArtifact: { artifact_sha256: 'base-hash' },
        corpusSource: { file_name: 'sentences_strict.json', sha256: 'corpus-hash' },
        updatedAt: '2026-09-20T13:00:00.000Z'
    });

    assert.deepEqual(overlay.records[0].candidate_type, 'discard');
    assert.equal(overlay.records[0].candidate_text, 'за несколько');
    assert.equal(overlay.records[0].verification_status, 'candidate');
    assert.equal(overlay.records[0].exercise_eligible, false);
    assert.equal(overlay.records.length, 1);
    assert.deepEqual(overlay.type_distribution, {
        collocation: 0,
        government_pattern: 0,
        grammar_pattern: 0,
        context_phrase: 0,
        discard: 1
    });
    assert.deepEqual(QUALITY_CANDIDATE_TYPES, ['collocation', 'government_pattern', 'grammar_pattern', 'context_phrase', 'discard']);
});

test('runs a dry-run and apply without changing the source overlay or base artifacts', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ru-tr-quality-gate-'));
    const outputPath = path.join(directory, 'enrichment-corpus-quality.v1b3.json');
    const reportPath = path.join(directory, 'enrichment-corpus-quality-report.v1b3.json');
    const backupDir = path.join(directory, 'backups');
    const sourceOverlayPath = 'data/vocabulary/enrichment-corpus.v1b.json';
    const sourceReportPath = 'data/vocabulary/enrichment-corpus-report.v1b.json';
    const artifactPath = 'data/vocabulary/lexical-units.v1.json';
    const corpusPath = 'sentences_strict.json';
    const protectedBefore = {
        source: fs.readFileSync(sourceOverlayPath),
        artifact: fs.readFileSync(artifactPath),
        corpus: fs.readFileSync(corpusPath)
    };
    const options = {
        sourceOverlayPath,
        sourceReportPath,
        artifactPath,
        corpusPath,
        outputPath,
        reportPath,
        backupDir,
        dryRun: true,
        updatedAt: '2026-09-20T13:00:00.000Z',
        protectedPaths: [sourceOverlayPath, artifactPath, corpusPath]
    };

    const dryRun = runCorpusQualityGate(options);
    assert.equal(dryRun.report.dry_run, true);
    assert.equal(dryRun.overlay.candidate_count, 116);
    assert.deepEqual(dryRun.overlay.type_distribution, {
        collocation: 15,
        government_pattern: 16,
        grammar_pattern: 27,
        context_phrase: 34,
        discard: 24
    });
    assert.equal(dryRun.report.previous_audit_classifications.length, 20);
    assert.equal(fs.existsSync(outputPath), false);

    const applied = runCorpusQualityGate({ ...options, dryRun: false });
    assert.equal(applied.report.qa.status, 'passed');
    assert.equal(applied.report.audit_requirement.collocation.requirement_met, true);
    assert.equal(applied.report.audit_requirement.government_pattern.requirement_met, true);
    assert.deepEqual(fs.readFileSync(sourceOverlayPath), protectedBefore.source);
    assert.deepEqual(fs.readFileSync(artifactPath), protectedBefore.artifact);
    assert.deepEqual(fs.readFileSync(corpusPath), protectedBefore.corpus);
});
