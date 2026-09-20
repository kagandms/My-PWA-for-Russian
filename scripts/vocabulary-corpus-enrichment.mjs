import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCorpusEnrichment } from '../lib/vocabulary/corpus-enrichment-runner.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function getArgument(name, fallback) {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
}

const artifactPath = path.resolve(getArgument('--artifact', path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json')));
const corpusPath = path.resolve(getArgument('--corpus', path.join(PROJECT_ROOT, 'sentences_strict.json')));
const existingOverlayPath = path.resolve(getArgument('--existing-overlay', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment.v1b.json')));
const outputPath = path.resolve(getArgument('--output', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus.v1b.json')));
const reportPath = path.resolve(getArgument('--report', path.join(PROJECT_ROOT, 'data/vocabulary/enrichment-corpus-report.v1b.json')));
const backupDir = path.resolve(getArgument('--backup-dir', path.join(PROJECT_ROOT, 'data/vocabulary/backups')));
const isSample = argumentsList.includes('--sample');
const isApply = argumentsList.includes('--apply');
if (isSample && isApply) throw new Error('Corpus sample enrichment is always dry-run; do not combine --sample and --apply.');
const result = runCorpusEnrichment({
    artifactPath,
    corpusPath,
    existingOverlayPath,
    outputPath,
    reportPath,
    backupDir,
    dryRun: !isApply,
    mode: isSample ? 'sample' : 'full',
    sampleRowLimit: Number(getArgument('--sample-rows', '1000')),
    updatedAt: getArgument('--updated-at', new Date().toISOString()),
    repositoryRoot: PROJECT_ROOT,
    protectedPaths: [
        path.join(PROJECT_ROOT, 'kelimeler_tam_strict.txt'),
        path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt')
    ]
});

console.log(JSON.stringify(result.report, null, 2));
