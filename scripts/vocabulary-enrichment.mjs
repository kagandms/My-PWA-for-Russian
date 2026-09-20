import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEnrichment } from '../lib/vocabulary/enrichment-runner.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function getArgument(name, fallback) {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
}

const artifactPath = path.resolve(getArgument('--artifact', path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json')));
const seedPath = path.resolve(getArgument('--seed', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-seed.v1b.json')));
const outputPath = path.resolve(getArgument('--output', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment.v1b.json')));
const reportPath = path.resolve(getArgument('--report', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-report.v1b.json')));
const backupDir = path.resolve(getArgument('--backup-dir', path.join(PROJECT_ROOT, 'data/vocabulary/backups')));
const isSample = argumentsList.includes('--sample');
const isApply = argumentsList.includes('--apply');
if (isSample && isApply) throw new Error('Sample enrichment is always dry-run; do not combine --sample and --apply.');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const mode = isSample ? 'sample' : 'full';
const surfaceForms = isSample ? seed.sample_surface_forms : undefined;
const updatedAt = getArgument('--updated-at', new Date().toISOString());
const result = runEnrichment({
    artifactPath,
    seedPath,
    outputPath,
    reportPath,
    backupDir,
    dryRun: !isApply,
    mode,
    surfaceForms,
    updatedAt,
    protectedPaths: [
        path.join(PROJECT_ROOT, 'kelimeler_tam_strict.txt'),
        path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt')
    ]
});

console.log(JSON.stringify({ report: result.report, records: result.overlay.records }, null, 2));
