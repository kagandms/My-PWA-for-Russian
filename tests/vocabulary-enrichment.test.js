import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertEnrichmentOverlay, buildEnrichmentOverlay } from '../lib/vocabulary/enrichment.mjs';
import { runEnrichment } from '../lib/vocabulary/enrichment-runner.mjs';

function makeUnit(id, surfaceForm, entryType, verificationStatus, senses) {
    return {
        id,
        entry_type: entryType,
        surface_form: surfaceForm,
        lemma: null,
        language: 'ru',
        source_direction: 'ru→tr',
        source_directions: ['ru→tr'],
        raw_entry: `${surfaceForm} : source`,
        raw_entries: [`${surfaceForm} : source`],
        verification_status: verificationStatus,
        exercise_eligible: verificationStatus === 'reviewed',
        provenance: { source_file_name: 'fixture.txt', source_hash: 'fixture', source_line_numbers: [1], import_batch_ids: ['fixture'], imported_at: '2026-09-20T00:00:00.000Z' },
        senses
    };
}

function makeSense(senseId, definition, verificationStatus = 'reviewed') {
    return {
        sense_id: senseId,
        definitions: [definition],
        meaning_notes: null,
        register: null,
        domain: null,
        examples: [],
        collocations: [],
        relations: [],
        source_direction: 'ru→tr',
        verification_status: verificationStatus,
        exercise_eligible: verificationStatus === 'reviewed',
        raw_entry: `fixture : ${definition}`,
        raw_entries: [`fixture : ${definition}`],
        provenance: { source_file_name: 'fixture.txt', source_hash: 'fixture', source_line_numbers: [1], import_batch_ids: ['fixture'], imported_at: '2026-09-20T00:00:00.000Z' }
    };
}

function makeArtifact() {
    return {
        schema_version: 1,
        artifact_type: 'vocabulary',
        import_batch_id: 'fixture-batch',
        imported_at: '2026-09-20T00:00:00.000Z',
        source: { file_name: 'fixture.txt', sha256: 'fixture-hash', line_count: 4 },
        lexical_units: [
            makeUnit('lu:depend', 'Зависеть', 'lemma', 'reviewed', [makeSense('sense:depend', '...-e bağlı olmak')]),
            makeUnit('lu:dependence', 'Зависимость', 'lemma', 'reviewed', [makeSense('sense:dependence', 'Bağımlılık')]),
            makeUnit('lu:phrase', 'Развивать навыки', 'phrase', 'needs_review', [makeSense('sense:phrase', 'Becerileri geliştirmek', 'needs_review')]),
            makeUnit('lu:ambiguous', 'Разрешать', 'lemma', 'reviewed', [makeSense('sense:allow', 'İzin vermek'), makeSense('sense:solve', 'Çözmek')])
        ]
    };
}

test('builds sense-level enrichment with mandatory metadata and no exercise eligibility', () => {
    const artifact = makeArtifact();
    const seed = {
        schema_version: 1,
        enrichment_version: '1B',
        source: 'fixture-seed',
        entries: [
            {
                surface_form: 'Зависеть',
                entry_type: 'lemma',
                sense_definition: '...-e bağlı olmak',
                field: 'government',
                value: { pattern: 'зависеть от + GEN', preposition: 'от', required_cases: ['genitive'] },
                source: 'fixture-seed:government',
                confidence: 0.91
            }
        ],
        ambiguous: []
    };

    const result = buildEnrichmentOverlay({ artifact, seed, updatedAt: '2026-09-20T10:00:00.000Z' });

    assert.equal(result.overlay.records.length, 1);
    assert.equal(result.overlay.records[0].lexical_unit_id, 'lu:depend');
    assert.equal(result.overlay.records[0].sense_id, 'sense:depend');
    assert.equal(result.overlay.records[0].verification_status, 'candidate');
    assert.equal(result.overlay.records[0].exercise_eligible, false);
    assert.equal(result.overlay.records[0].updated_at, '2026-09-20T10:00:00.000Z');
    assert.equal(result.overlay.records[0].source, 'fixture-seed:government');
    assertEnrichmentOverlay(result.overlay);
});

test('skips needs_review targets and reports unresolved or ambiguous candidates', () => {
    const artifact = makeArtifact();
    const seed = {
        schema_version: 1,
        enrichment_version: '1B',
        source: 'fixture-seed',
        entries: [
            { surface_form: 'Развивать навыки', entry_type: 'phrase', field: 'collocation', value: 'развивать навыки', source: 'fixture-seed:phrase', confidence: 0.8 },
            { surface_form: 'Разрешать', entry_type: 'lemma', field: 'aspect_pair', counterpart_surface_form: 'Разрешить', source: 'fixture-seed:aspect', confidence: 0.7 }
        ],
        ambiguous: [
            { surface_form: 'Привыкать', field: 'aspect_pair', candidate_surface_forms: ['привыкнуть'], reason: 'counterpart is absent', verification_status: 'needs_review' }
        ]
    };

    const result = buildEnrichmentOverlay({ artifact, seed, updatedAt: '2026-09-20T10:00:00.000Z' });

    assert.equal(result.overlay.records.length, 0);
    assert.equal(result.report.skipped_needs_review_count, 1);
    assert.equal(result.report.ambiguous_count, 2);
    assert.equal(result.report.review_status_distribution.needs_review, 3);
    assert.match(result.report.ambiguous[0].reason, /sense|counterpart/u);
});

test('does not mutate the base artifact while deduplicating exact enrichment records', () => {
    const artifact = makeArtifact();
    const before = JSON.stringify(artifact);
    const seed = {
        schema_version: 1,
        enrichment_version: '1B',
        source: 'fixture-seed',
        entries: [
            { surface_form: 'Зависеть', entry_type: 'lemma', field: 'cefr', value: 'B1', source: 'fixture-seed:cefr', confidence: 0.8 },
            { surface_form: 'Зависеть', entry_type: 'lemma', field: 'cefr', value: 'B1', source: 'fixture-seed:cefr', confidence: 0.8 }
        ],
        ambiguous: []
    };

    const result = buildEnrichmentOverlay({ artifact, seed, updatedAt: '2026-09-20T10:00:00.000Z' });

    assert.equal(result.overlay.records.length, 1);
    assert.equal(result.report.duplicate_record_count, 1);
    assert.equal(JSON.stringify(artifact), before);
});

test('dry-run does not write and apply preserves the base artifact and protected source', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ru-tr-enrichment-'));
    const artifactPath = path.join(directory, 'lexical-units.v1.json');
    const seedPath = path.join(directory, 'enrichment-seed.v1b.json');
    const outputPath = path.join(directory, 'enrichment.v1b.json');
    const reportPath = path.join(directory, 'enrichment-report.v1b.json');
    const backupDir = path.join(directory, 'backups');
    const protectedPath = path.join(directory, 'vocab_reviewed_v1.txt');
    const artifact = makeArtifact();
    const seed = {
        schema_version: 1,
        enrichment_version: '1B',
        source: 'fixture-seed',
        entries: [{ surface_form: 'Зависеть', entry_type: 'lemma', field: 'cefr', value: 'B1', source: 'fixture-seed:cefr', confidence: 0.8 }],
        ambiguous: []
    };
    fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
    fs.writeFileSync(protectedPath, 'raw-source\n', 'utf8');
    const baseBefore = fs.readFileSync(artifactPath);
    const protectedBefore = fs.readFileSync(protectedPath);

    const dryRun = runEnrichment({ artifactPath, seedPath, outputPath, reportPath, backupDir, protectedPaths: [protectedPath], dryRun: true, updatedAt: '2026-09-20T10:00:00.000Z' });
    assert.equal(dryRun.report.dry_run, true);
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(fs.existsSync(reportPath), false);

    const applied = runEnrichment({ artifactPath, seedPath, outputPath, reportPath, backupDir, protectedPaths: [protectedPath], dryRun: false, updatedAt: '2026-09-20T10:00:00.000Z' });
    assert.equal(applied.report.qa.status, 'passed');
    assert.deepEqual(fs.readFileSync(artifactPath), baseBefore);
    assert.deepEqual(fs.readFileSync(protectedPath), protectedBefore);
    assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).records.length, 1);
});
