import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateArtifact, rollbackArtifact } from '../lib/vocabulary/migration.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const artifactPath = path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json');
const reportPath = path.join(PROJECT_ROOT, 'data/vocabulary/import-report.v1.json');
const backupDir = path.join(PROJECT_ROOT, 'data/vocabulary/backups');
const backupIndex = args.indexOf('--backup');

if (args.includes('--rollback')) {
    if (backupIndex < 0 || !args[backupIndex + 1]) throw new Error('Rollback requires --backup <path>.');
    console.log(JSON.stringify(rollbackArtifact({ backupPath: path.resolve(args[backupIndex + 1]), artifactPath }), null, 2));
} else {
    const sourcePath = path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt');
    const result = migrateArtifact({ sourcePath, artifactPath, reportPath, backupDir, dryRun: !args.includes('--apply') });
    console.log(JSON.stringify(result.migration, null, 2));
}
