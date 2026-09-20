import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLegacyIdentityMap, buildProgressMigrationDryRun } from '../lib/vocabulary/identity-mapping.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function getArgument(name, fallback) {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
}

function sha256(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const sourcePath = path.resolve(getArgument('--source', path.join(PROJECT_ROOT, 'vocab_reviewed_v1.txt')));
const artifactPath = path.resolve(getArgument('--artifact', path.join(PROJECT_ROOT, 'data/vocabulary/lexical-units.v1.json')));
const outputPath = path.resolve(getArgument('--output', path.join(PROJECT_ROOT, 'data/vocabulary/legacy-identity-map.v1.json')));
const reportPath = path.resolve(getArgument('--report', path.join(PROJECT_ROOT, 'data/vocabulary/legacy-identity-map.report.json')));
const generatedAt = getArgument('--generated-at', new Date().toISOString());
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const identityMap = buildLegacyIdentityMap({
    sourceText,
    artifact,
    sourceFileName: path.basename(sourcePath),
    sourceHash: sha256(sourceText),
    generatedAt
});
const report = {
    schema_version: 1,
    artifact_type: 'legacy-identity-map-report',
    generated_at: generatedAt,
    output_path: outputPath,
    mapping_counts: identityMap.counts,
    progress_migration: buildProgressMigrationDryRun({
        legacyRecordIds: [],
        identityMap,
        ambiguousLegacyIds: []
    }),
    data_loss: false,
    notes: [
        'Progress migration was not applied; no localStorage data was read or changed.',
        'Ambiguous and unmapped identities remain available in the map/report for manual review.'
    ]
};

if (!argumentsList.includes('--dry-run')) {
    writeJson(outputPath, identityMap);
    writeJson(reportPath, report);
}

console.log(JSON.stringify({ ...report, dry_run: argumentsList.includes('--dry-run') }, null, 2));
