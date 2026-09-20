import fs from 'node:fs';
import { runImport } from './import-runner.mjs';
import { assertVocabularyArtifact } from './schema.mjs';

function readArtifact(filePath) {
    const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assertVocabularyArtifact(artifact);
    return artifact;
}

export function migrateArtifact(options) {
    const importOptions = { ...options, outputPath: options.artifactPath, dryRun: true };
    const dryRunResult = runImport(importOptions);
    if (options.dryRun) return { ...dryRunResult, migration: { status: 'dry-run', post_migration_valid: false, backup_path: null } };
    const result = runImport({ ...options, outputPath: options.artifactPath, dryRun: false });
    readArtifact(options.artifactPath);
    return {
        ...result,
        migration: {
            status: 'applied',
            post_migration_valid: true,
            backup_path: result.report.backup_path,
            dry_run_report: dryRunResult.report
        }
    };
}

export function rollbackArtifact(options) {
    if (!fs.existsSync(options.backupPath)) throw new Error('Rollback backup does not exist.');
    readArtifact(options.backupPath);
    fs.copyFileSync(options.backupPath, options.artifactPath);
    readArtifact(options.artifactPath);
    return { restored: true, backup_path: options.backupPath, artifact_path: options.artifactPath };
}
