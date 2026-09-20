import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCorpusQualityGate } from '../lib/vocabulary/corpus-quality-gate-runner.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function getArgument(name, fallback) {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
}

const sourceOverlayPath = path.resolve(getArgument('--source-overlay', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus.v1b.json')));
const sourceReportPath = path.resolve(getArgument('--source-report', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus-report.v1b.json')));
const artifactPath = path.resolve(getArgument('--artifact', path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json')));
const corpusPath = path.resolve(getArgument('--corpus', path.join(PROJECT_ROOT, 'sentences_strict.json')));
const outputPath = path.resolve(getArgument('--output', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus-quality.v1b3.json')));
const reportPath = path.resolve(getArgument('--report', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus-quality-report.v1b3.json')));
const backupDir = path.resolve(getArgument('--backup-dir', path.join(PROJECT_ROOT, 'data/vocabulary/backups')));
const isApply = argumentsList.includes('--apply');
const isSample = argumentsList.includes('--sample');
if (isApply && isSample) throw new Error('Quality-gate sample is always dry-run; do not combine --sample and --apply.');

const result = runCorpusQualityGate({
    sourceOverlayPath,
    sourceReportPath,
    artifactPath,
    corpusPath,
    outputPath,
    reportPath,
    backupDir,
    dryRun: !isApply,
    mode: isSample ? 'sample' : 'full',
    updatedAt: getArgument('--updated-at', new Date().toISOString()),
    protectedPaths: [
        path.join(PROJECT_ROOT, 'kelimeler_tam_strict.txt'),
        path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt')
    ]
});

console.log(JSON.stringify(result.report, null, 2));
