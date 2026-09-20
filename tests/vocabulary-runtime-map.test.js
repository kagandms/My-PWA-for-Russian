import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildProgressMigrationDryRun, buildLegacyIdentityMap } from '../lib/vocabulary/identity-mapping.mjs';

const ROOT = process.cwd();

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

test('builds a complete source-line identity map for the current corpus', () => {
    const sourceText = fs.readFileSync(path.join(ROOT, 'vocab_reviewed_v1.txt'), 'utf8');
    const artifact = readJson('data/vocabulary/lexical-units.v1.json');

    const result = buildLegacyIdentityMap({
        sourceText,
        artifact,
        sourceFileName: 'vocab_reviewed_v1.txt',
        sourceHash: artifact.source.sha256,
        generatedAt: '2026-09-20T00:00:00.000Z'
    });

    assert.equal(result.counts.source_record_count, 2339);
    assert.equal(result.counts.matched, 2339);
    assert.equal(result.counts.ambiguous, 0);
    assert.equal(result.counts.unmapped, 0);
    assert.equal(result.entries[0].legacy_index, 0);
    assert.equal(result.entries[0].legacy_id, 1);
    assert.ok(result.entries.every(entry => entry.lexical_unit_id));
});

test('dry-run progress mapping preserves ambiguous and unmapped records without mutation', () => {
    const identityMap = {
        entries: [
            { legacy_index: 0, legacy_id: 1, lexical_unit_id: 'lu:one', status: 'matched' },
            { legacy_index: 1, legacy_id: 2, lexical_unit_id: 'lu:two', status: 'matched' }
        ]
    };
    const progressSnapshot = { '1': { repetitions: 2 }, 'missing': { repetitions: 1 } };
    const before = JSON.stringify(progressSnapshot);

    const result = buildProgressMigrationDryRun({
        legacyRecordIds: ['1', 'ambiguous', 'missing'],
        identityMap,
        ambiguousLegacyIds: ['ambiguous']
    });

    assert.deepEqual(result.counts, { matched: 1, ambiguous: 1, unmapped: 1 });
    assert.equal(JSON.stringify(progressSnapshot), before);
    assert.equal(result.applied_count, 0);
    assert.equal(result.deleted_count, 0);
});
