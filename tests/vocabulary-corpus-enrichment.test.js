import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildCorpusEnrichmentOverlay } from '../lib/vocabulary/corpus-enrichment.mjs';
import { runCorpusEnrichment } from '../lib/vocabulary/corpus-enrichment-runner.mjs';

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

function makeUnit(id, surfaceForm, senses, verificationStatus = 'reviewed') {
    return {
        id,
        entry_type: 'lemma',
        surface_form: surfaceForm,
        lemma: null,
        language: 'ru',
        source_direction: 'ru→tr',
        source_directions: ['ru→tr'],
        raw_entry: `${surfaceForm} : fixture`,
        raw_entries: [`${surfaceForm} : fixture`],
        verification_status: verificationStatus,
        exercise_eligible: verificationStatus === 'reviewed',
        provenance: { source_file_name: 'fixture.txt', source_hash: 'fixture', source_line_numbers: [1], import_batch_ids: ['fixture'], imported_at: '2026-09-20T00:00:00.000Z' },
        senses
    };
}

function makeArtifact() {
    return {
        schema_version: 1,
        artifact_type: 'vocabulary',
        import_batch_id: 'fixture-batch',
        imported_at: '2026-09-20T00:00:00.000Z',
        source: { file_name: 'fixture.txt', sha256: 'fixture-hash', line_count: 10 },
        lexical_units: [
            makeUnit('lu:check', 'Проверять', [makeSense('sense:check', 'Kontrol etmek')]),
            makeUnit('lu:speak', 'Говорить', [makeSense('sense:speak-1', 'Konuşmak'), makeSense('sense:speak-2', 'Söylemek')]),
            makeUnit('lu:review', 'Вспоминать', [makeSense('sense:review', 'Hatırlamak')], 'needs_review'),
            makeUnit('lu:rare', 'Учить', [makeSense('sense:rare', 'Öğrenmek')])
        ]
    };
}

function makeCorpusRows() {
    return [
        { sentence_id: '1:1', corpus_key: '1', source_index: 1, ru: 'Мы будем проверять документ.', tr: 'Belgeyi kontrol edeceğiz.' },
        { sentence_id: '2:1', corpus_key: '2', source_index: 1, ru: 'Важно проверять документ перед отправкой.', tr: 'Göndermeden önce belgeyi kontrol etmek önemlidir.' },
        { sentence_id: '3:1', corpus_key: '3', source_index: 1, ru: 'Нужно проверять документ сегодня.', tr: 'Bugün belgeyi kontrol etmek gerekiyor.' },
        { sentence_id: '4:1', corpus_key: '4', source_index: 1, ru: 'Мы будем говорить по-русски.', tr: 'Rusça konuşacağız.' },
        { sentence_id: '5:1', corpus_key: '5', source_index: 1, ru: 'Важно говорить по-русски каждый день.', tr: 'Her gün Rusça konuşmak önemlidir.' },
        { sentence_id: '6:1', corpus_key: '6', source_index: 1, ru: 'Нужно говорить по-русски.', tr: 'Rusça konuşmak gerekiyor.' },
        { sentence_id: '7:1', corpus_key: '7', source_index: 1, ru: 'Мы будем вспоминать этот день.', tr: 'Bu günü hatırlayacağız.' },
        { sentence_id: '8:1', corpus_key: '8', source_index: 1, ru: 'Важно вспоминать этот день.', tr: 'Bu günü hatırlamak önemlidir.' },
        { sentence_id: '9:1', corpus_key: '9', source_index: 1, ru: 'Нужно вспоминать этот день.', tr: 'Bu günü hatırlamak gerekiyor.' },
        { sentence_id: '10:1', corpus_key: '10', source_index: 1, ru: 'Он будет учить русский язык.', tr: 'Rusça öğrenecek.' },
        { sentence_id: '11:1', corpus_key: '11', source_index: 1, ru: 'Она будет учить русский язык.', tr: 'Rusça öğrenecek.' }
    ];
}

test('emits repeated single-sense collocation with evidence and required metadata', () => {
    const result = buildCorpusEnrichmentOverlay({
        artifact: makeArtifact(),
        corpusRows: makeCorpusRows(),
        corpusSource: 'sentences_strict.json',
        corpusHash: 'corpus-hash',
        updatedAt: '2026-09-20T12:00:00.000Z'
    });

    const record = result.overlay.records.find((item) => item.lexical_unit_id === 'lu:check');

    assert.ok(record);
    assert.equal(record.sense_id, 'sense:check');
    assert.equal(record.field, 'collocation');
    assert.equal(record.collocation, 'проверять документ');
    assert.equal(record.value, 'проверять документ');
    assert.equal(record.evidence_sentences.length, 3);
    assert.deepEqual(record.source_reference.corpus_references, ['1:1', '2:1', '3:1']);
    assert.equal(record.source, 'sentences_strict.json');
    assert.equal(record.source_reference.sha256, 'corpus-hash');
    assert.equal(record.verification_status, 'candidate');
    assert.equal(record.exercise_eligible, false);
});

test('blocks sense ambiguity, needs_review, and insufficient corpus support', () => {
    const result = buildCorpusEnrichmentOverlay({
        artifact: makeArtifact(),
        corpusRows: makeCorpusRows(),
        corpusSource: 'sentences_strict.json',
        corpusHash: 'corpus-hash',
        updatedAt: '2026-09-20T12:00:00.000Z'
    });

    assert.equal(result.overlay.records.some((item) => item.lexical_unit_id === 'lu:speak'), false);
    assert.equal(result.overlay.records.some((item) => item.lexical_unit_id === 'lu:review'), false);
    assert.equal(result.overlay.records.some((item) => item.lexical_unit_id === 'lu:rare'), false);
    assert.equal(result.report.collocation.skipped_sense_ambiguity_count, 1);
    assert.equal(result.report.collocation.skipped_needs_review_count, 1);
    assert.equal(result.report.collocation.skipped_insufficient_evidence_count, 1);
    assert.equal(result.report.coverage.aspect_pair.needs_review_count, 1);
});

test('does not count exact duplicate corpus text as independent collocation support', () => {
    const result = buildCorpusEnrichmentOverlay({
        artifact: makeArtifact(),
        corpusRows: [
            { sentence_id: '1:1', corpus_key: '1', source_index: 1, ru: 'Мы будем проверять документ.', tr: 'Belgeyi kontrol edeceğiz.' },
            { sentence_id: '2:1', corpus_key: '2', source_index: 1, ru: 'Мы будем проверять документ.', tr: 'Belgeyi kontrol edeceğiz.' },
            { sentence_id: '3:1', corpus_key: '3', source_index: 1, ru: 'Мы будем проверять документ.', tr: 'Belgeyi kontrol edeceğiz.' }
        ],
        corpusSource: 'sentences_strict.json',
        corpusHash: 'corpus-hash',
        updatedAt: '2026-09-20T12:00:00.000Z'
    });

    assert.equal(result.overlay.records.some((item) => item.lexical_unit_id === 'lu:check'), false);
    assert.equal(result.report.collocation.skipped_insufficient_evidence_count, 1);
});

test('reports all requested fields and suppresses an existing duplicate collocation', () => {
    const first = buildCorpusEnrichmentOverlay({
        artifact: makeArtifact(),
        corpusRows: makeCorpusRows(),
        corpusSource: 'sentences_strict.json',
        corpusHash: 'corpus-hash',
        updatedAt: '2026-09-20T12:00:00.000Z'
    });
    const second = buildCorpusEnrichmentOverlay({
        artifact: makeArtifact(),
        corpusRows: makeCorpusRows(),
        corpusSource: 'sentences_strict.json',
        corpusHash: 'corpus-hash',
        existingRecords: first.overlay.records,
        updatedAt: '2026-09-20T12:00:00.000Z'
    });
    const fields = ['aspect_pair', 'government', 'preposition', 'case', 'collocation', 'word_family', 'stress', 'cefr', 'theme', 'tag'];

    assert.equal(second.report.duplicate_collocation_count, first.overlay.records.length);
    assert.equal(second.overlay.records.length, 0);
    assert.deepEqual(Object.keys(second.report.coverage).sort(), [...fields].sort());
    fields.forEach((field) => {
        assert.ok(Number.isInteger(second.report.coverage[field].eligible_count));
        assert.ok(Number.isInteger(second.report.coverage[field].enriched_count));
        assert.ok(typeof second.report.coverage[field].blocked_reason === 'string');
        assert.ok(Array.isArray(second.report.audit_examples[field]));
    });
});

test('sample dry-run writes nothing and full apply preserves protected files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ru-tr-corpus-enrichment-'));
    const artifactPath = path.join(directory, 'lexical-units.v1.json');
    const corpusPath = path.join(directory, 'sentences_strict.json');
    const existingOverlayPath = path.join(directory, 'enrichment.v1b.json');
    const outputPath = path.join(directory, 'enrichment-corpus.v1b.json');
    const reportPath = path.join(directory, 'enrichment-corpus-report.v1b.json');
    const backupDir = path.join(directory, 'backups');
    const protectedPath = path.join(directory, 'vocab_reviewed_v1.txt');
    fs.writeFileSync(artifactPath, `${JSON.stringify(makeArtifact(), null, 2)}\n`, 'utf8');
    fs.writeFileSync(corpusPath, `${JSON.stringify(Object.fromEntries(makeCorpusRows().map((row) => [row.corpus_key, [{ ru: row.ru, tr: row.tr }]])), null, 2)}\n`, 'utf8');
    fs.writeFileSync(existingOverlayPath, `${JSON.stringify({ records: [] }, null, 2)}\n`, 'utf8');
    fs.writeFileSync(protectedPath, 'protected-source\n', 'utf8');
    const artifactBefore = fs.readFileSync(artifactPath);
    const protectedBefore = fs.readFileSync(protectedPath);

    const sample = runCorpusEnrichment({ artifactPath, corpusPath, existingOverlayPath, outputPath, reportPath, backupDir, dryRun: true, mode: 'sample', sampleRowLimit: 11, updatedAt: '2026-09-20T12:00:00.000Z', protectedPaths: [protectedPath] });
    assert.equal(sample.report.dry_run, true);
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(fs.existsSync(reportPath), false);

    const applied = runCorpusEnrichment({ artifactPath, corpusPath, existingOverlayPath, outputPath, reportPath, backupDir, dryRun: false, mode: 'full', updatedAt: '2026-09-20T12:00:00.000Z', protectedPaths: [protectedPath], repositoryRoot: directory });
    assert.equal(applied.report.qa.status, 'passed');
    assert.ok(applied.overlay.records.length > 0);
    assert.deepEqual(fs.readFileSync(artifactPath), artifactBefore);
    assert.deepEqual(fs.readFileSync(protectedPath), protectedBefore);
    assert.equal(applied.report.output_path, 'enrichment-corpus.v1b.json');
    assert.equal(applied.report.report_path, 'enrichment-corpus-report.v1b.json');
    assert.deepEqual(Object.keys(applied.report.protected_file_hashes_after).sort(), ['sentences_strict.json', 'vocab_reviewed_v1.txt']);
    assert.ok(applied.report.backup_paths.every((filePath) => !path.isAbsolute(filePath)));
});
