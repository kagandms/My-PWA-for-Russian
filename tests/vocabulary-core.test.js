import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildVocabularyArtifact } from '../lib/vocabulary/importer.mjs';
import { runImport } from '../lib/vocabulary/import-runner.mjs';
import { migrateArtifact, rollbackArtifact } from '../lib/vocabulary/migration.mjs';
import { parseSource } from '../lib/vocabulary/parse.mjs';
import { freezeSource, SOURCE_CORRECTIONS } from '../lib/vocabulary/source-freeze.mjs';

const PROJECT_ROOT = process.cwd();
const SOURCE_PATH = path.join(PROJECT_ROOT, 'kelimeler_tam_strict.txt');

function createFreezePaths() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ru-tr-vocab-'));
    return {
        directory,
        reviewedPath: path.join(directory, 'vocab_reviewed_v1.txt'),
        snapshotPath: path.join(directory, 'source-original.txt'),
        manifestPath: path.join(directory, 'source-manifest.v1.json')
    };
}

test('freezes all 15 Ek A corrections without changing the fallback source', () => {
    const paths = createFreezePaths();
    const originalSource = fs.readFileSync(SOURCE_PATH, 'utf8');

    const result = freezeSource({
        requestedPath: path.join(paths.directory, 'kelimeler_tam_strict(3).txt'),
        fallbackPath: SOURCE_PATH,
        reviewedPath: paths.reviewedPath,
        snapshotPath: paths.snapshotPath,
        manifestPath: paths.manifestPath,
        importedAt: '2026-09-20T00:00:00.000Z'
    });

    const reviewedSource = fs.readFileSync(paths.reviewedPath, 'utf8');

    assert.equal(SOURCE_CORRECTIONS.length, 15);
    assert.equal(result.manifest.appliedCorrectionIds.length, 15);
    assert.equal(result.manifest.requestedSource.exists, false);
    assert.equal(result.manifest.resolvedSource.fileName, 'kelimeler_tam_strict.txt');
    assert.equal(result.manifest.sourceLineCount, 2339);
    assert.equal(result.manifest.reviewedLineCount, 2339);
    assert.equal(fs.readFileSync(paths.snapshotPath, 'utf8'), originalSource);
    assert.equal(fs.readFileSync(SOURCE_PATH, 'utf8'), originalSource);
    assert.match(reviewedSource, /^Изжога : mide ekşimesi; mide yanması$/m);
    assert.match(reviewedSource, /^Проспать : fazla uyumak; uyuyup bir şeyi kaçırmak$/m);
    assert.match(reviewedSource, /^Пломбировать : mühürlemek; plomba vurmak$/m);
    assert.match(reviewedSource, /^Пломбировать : \(diş\) dolgu yapmak$/m);
    assert.match(reviewedSource, /^Всплакнуть : biraz ağlamak; hafifçe ağlamak; birkaç gözyaşı dökmek$/m);
    assert.equal(JSON.parse(fs.readFileSync(paths.manifestPath, 'utf8')).reviewedSource.sha256, result.manifest.reviewedSource.sha256);
});

test('parses entry types and preserves source provenance without forcing lemmas', () => {
    const sourceText = [
        'Учиться : öğrenmek',
        'Это не моё : bu bana göre değil',
        'Какая картинка! : ne güzel bir resim',
        'Великие умы думают одинаково : aklın yolu bir',
        'Про- : içinden geçip gitmek',
        '...-нибудь : soru ve rica yapılarında kullanılır',
        'красивый : прекрасный',
        'bozuk satır'
    ].join('\n');

    const result = parseSource(sourceText, {
        sourceFileName: 'vocab_reviewed_v1.txt',
        sourceHash: 'source-hash',
        importBatchId: 'batch-1',
        importedAt: '2026-09-20T00:00:00.000Z'
    });

    assert.equal(result.sourceLineCount, 8);
    assert.equal(result.rows.length, 7);
    assert.equal(result.invalidRows.length, 1);
    assert.equal(result.rows[0].raw_entry, 'Учиться : öğrenmek');
    assert.equal(result.rows[1].entry_type, 'expression');
    assert.equal(result.rows[2].entry_type, 'sentence');
    assert.equal(result.rows[3].entry_type, 'proverb');
    assert.equal(result.rows[4].entry_type, 'prefix_affix');
    assert.equal(result.rows[5].entry_type, 'grammar_pattern');
    assert.equal(result.rows[6].source_direction, 'ru→ru');
    assert.equal(result.rows[6].verification_status, 'needs_review');
    assert.equal(result.rows[6].provenance.source_line_number, 7);
});

test('imports losslessly, merges only exact duplicates, and stores RU→RU as relations', () => {
    const sourceText = [
        'Учиться : öğrenmek',
        'Учиться : öğrenmek',
        'Учиться : eğitim görmek',
        'красивый : güzel',
        'красивый : harika',
        'Про- : içinden geçip gitmek',
        'красивый : güzel',
        'красивый : прекрасный'
    ].join('\n');

    const result = buildVocabularyArtifact({
        sourceText,
        sourceFileName: 'vocab_reviewed_v1.txt',
        sourceHash: 'source-hash',
        importBatchId: 'batch-1',
        importedAt: '2026-09-20T00:00:00.000Z'
    });

    assert.equal(result.report.source_line_count, 8);
    assert.equal(result.report.parsed_record_count, 8);
    assert.equal(result.report.invalid_record_count, 0);
    assert.equal(result.report.created_lexical_unit_count, 3);
    assert.equal(result.report.created_sense_count, 5);
    assert.equal(result.report.duplicate_merge_count, 2);
    assert.equal(result.report.review_required_row_count, 2);
    assert.equal(result.report.relation_count, 1);

    const studyUnit = result.artifact.lexical_units.find(unit => unit.surface_form === 'красивый');
    assert.equal(studyUnit.senses.length, 2);
    assert.equal(studyUnit.relations[0].relation_type, 'related');
    assert.equal(studyUnit.relations[0].target_surface_form, 'прекрасный');
    assert.equal(studyUnit.relations[0].verification_status, 'needs_review');
    assert.equal(studyUnit.relations[0].raw_entry, 'красивый : прекрасный');
    assert.equal(studyUnit.senses.every(sense => sense.definitions.length > 0), true);

    const learningUnit = result.artifact.lexical_units.find(unit => unit.surface_form === 'Учиться');
    assert.equal(learningUnit.senses.length, 2);
    assert.deepEqual(learningUnit.senses[0].provenance.source_line_numbers, [1, 2]);
});

test('dry-run reports the import without writing an artifact or report', () => {
    const paths = createFreezePaths();
    const sourcePath = path.join(paths.directory, 'source.txt');
    const outputPath = path.join(paths.directory, 'lexical-units.v1.json');
    const reportPath = path.join(paths.directory, 'import-report.v1.json');
    fs.writeFileSync(sourcePath, 'Учиться : öğrenmek\n', 'utf8');

    const result = runImport({
        sourcePath,
        outputPath,
        reportPath,
        backupDir: path.join(paths.directory, 'backups'),
        dryRun: true,
        importedAt: '2026-09-20T00:00:00.000Z'
    });

    assert.equal(result.report.dry_run, true);
    assert.equal(result.report.parsed_record_count, 1);
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(fs.existsSync(reportPath), false);
});

test('migration backs up the old artifact and rollback restores exact bytes', () => {
    const paths = createFreezePaths();
    const sourcePath = path.join(paths.directory, 'source.txt');
    const artifactPath = path.join(paths.directory, 'lexical-units.v1.json');
    const reportPath = path.join(paths.directory, 'import-report.v1.json');
    const backupDir = path.join(paths.directory, 'backups');
    const oldArtifact = JSON.stringify({
        schema_version: 1,
        artifact_type: 'vocabulary',
        import_batch_id: 'old-batch',
        imported_at: '2026-09-19T00:00:00.000Z',
        source: { file_name: 'old.txt', sha256: 'old-hash', line_count: 0 },
        lexical_units: []
    }, null, 2) + '\n';
    fs.writeFileSync(sourcePath, 'Учиться : öğrenmek\n', 'utf8');
    fs.writeFileSync(artifactPath, oldArtifact, 'utf8');

    const migration = migrateArtifact({ sourcePath, artifactPath, reportPath, backupDir, importedAt: '2026-09-20T00:00:00.000Z' });
    const migratedBytes = fs.readFileSync(artifactPath, 'utf8');

    assert.equal(migration.migration.status, 'applied');
    assert.equal(migration.migration.post_migration_valid, true);
    assert.ok(migration.migration.backup_path);
    assert.equal(fs.readFileSync(migration.migration.backup_path, 'utf8'), oldArtifact);
    assert.notEqual(migratedBytes, oldArtifact);

    const secondMigration = migrateArtifact({ sourcePath, artifactPath, reportPath, backupDir, importedAt: '2026-09-20T00:00:00.000Z' });

    assert.notEqual(secondMigration.migration.backup_path, migration.migration.backup_path);
    assert.equal(fs.readFileSync(migration.migration.backup_path, 'utf8'), oldArtifact);

    const rollback = rollbackArtifact({ backupPath: migration.migration.backup_path, artifactPath });

    assert.equal(rollback.restored, true);
    assert.equal(fs.readFileSync(artifactPath, 'utf8'), oldArtifact);
});
