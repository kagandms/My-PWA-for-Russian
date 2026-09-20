import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freezeSource } from '../lib/vocabulary/source-freeze.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = freezeSource({
    requestedPath: path.join(PROJECT_ROOT, 'kelimeler_tam_strict(3).txt'),
    fallbackPath: path.join(PROJECT_ROOT, 'kelimeler_tam_strict.txt'),
    reviewedPath: path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt'),
    snapshotPath: path.join(PROJECT_ROOT, 'data/vocabulary/source-snapshots/kelimeler_tam_strict.txt'),
    manifestPath: path.join(PROJECT_ROOT, 'data/vocabulary/source-manifest.v1.json')
});

console.log(JSON.stringify(result.manifest, null, 2));
