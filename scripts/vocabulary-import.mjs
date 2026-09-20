import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runImport } from '../lib/vocabulary/import-runner.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function getArgument(name, fallback) {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
}

const sourcePath = path.resolve(getArgument('--source', path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt')));
const outputPath = path.resolve(getArgument('--output', path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json')));
const reportPath = path.resolve(getArgument('--report', path.join(PROJECT_ROOT, 'data/vocabulary/import-report.v1.json')));
const backupDir = path.resolve(getArgument('--backup-dir', path.join(PROJECT_ROOT, 'data/vocabulary/backups')));
const result = runImport({ sourcePath, outputPath, reportPath, backupDir, dryRun: !argumentsList.includes('--apply') });

console.log(JSON.stringify(result.report, null, 2));
