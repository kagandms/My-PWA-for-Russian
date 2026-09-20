import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildEnrichmentOverlay } from './enrichment.mjs';
import { assertVocabularyArtifact } from './schema.mjs';

function hashBytes(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureParent(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
    ensureParent(filePath);
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function backupExisting(filePath, backupDir, sourceHash) {
    if (!fs.existsSync(filePath)) return null;
    ensureParent(path.join(backupDir, 'placeholder'));
    const basePath = path.join(backupDir, `${path.basename(filePath)}.${sourceHash.slice(0, 12)}`);
    let backupPath = `${basePath}.bak`;
    let suffix = 1;
    while (fs.existsSync(backupPath)) backupPath = `${basePath}.${suffix++}.bak`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function hashFile(filePath) {
    return hashBytes(fs.readFileSync(filePath));
}

function getProtectedHashes(protectedPaths) {
    return Object.fromEntries(protectedPaths.filter((filePath) => fs.existsSync(filePath)).map((filePath) => [filePath, hashFile(filePath)]));
}

function protectedFilesUnchanged(before, after) {
    return Object.entries(before).every(([filePath, beforeHash]) => after[filePath] === beforeHash);
}

function buildEnrichmentResult(options) {
    const artifactBytes = fs.readFileSync(options.artifactPath);
    const artifact = JSON.parse(artifactBytes.toString('utf8'));
    assertVocabularyArtifact(artifact);
    const seed = readJson(options.seedPath);
    const baseArtifactHash = hashBytes(artifactBytes);
    const protectedPaths = options.protectedPaths || [];
    const protectedBefore = getProtectedHashes(protectedPaths);
    const result = buildEnrichmentOverlay({
        artifact,
        seed,
        updatedAt: options.updatedAt,
        mode: options.mode || 'full',
        surfaceForms: options.surfaceForms,
        baseArtifact: {
            schema_version: artifact.schema_version,
            import_batch_id: artifact.import_batch_id,
            source_file_name: artifact.source.file_name,
            source_sha256: artifact.source.sha256,
            artifact_sha256: baseArtifactHash
        }
    });
    return { artifactPath: options.artifactPath, artifactBytes, protectedPaths, protectedBefore, baseArtifactHash, result };
}

function addRunMetadata(result, options, context, backupPaths) {
    result.report = {
        ...result.report,
        dry_run: Boolean(options.dryRun),
        output_path: options.outputPath,
        report_path: options.reportPath,
        backup_paths: backupPaths,
        base_artifact_sha256_before: context.baseArtifactHash,
        protected_file_hashes_before: context.protectedBefore
    };
}

function applyEnrichmentResult(options, context) {
    const { result, artifactPath, protectedPaths, protectedBefore, baseArtifactHash } = context;
    writeJson(options.outputPath, result.overlay);
    const baseArtifactUnchanged = hashFile(artifactPath) === baseArtifactHash;
    const protectedAfter = getProtectedHashes(protectedPaths);
    result.report.qa = {
        ...result.report.qa,
        base_artifact_unchanged: baseArtifactUnchanged,
        protected_files_unchanged: protectedFilesUnchanged(protectedBefore, protectedAfter),
        status: baseArtifactUnchanged && protectedFilesUnchanged(protectedBefore, protectedAfter) ? 'passed' : 'failed'
    };
    result.report.base_artifact_sha256_after = hashFile(options.artifactPath);
    result.report.protected_file_hashes_after = protectedAfter;
    if (result.report.qa.status !== 'passed') throw new Error('Protected vocabulary bytes changed during enrichment.');
    writeJson(options.reportPath, result.report);
    return result;
}

/**
 * Runs Phase 1B against an existing v1 artifact and writes only a new overlay on apply.
 * @param {object} options runner options
 * @returns {{overlay: object, report: object}}
 */
export function runEnrichment(options) {
    const context = buildEnrichmentResult(options);
    const backupPaths = options.dryRun ? [] : [options.outputPath, options.reportPath].map((filePath) => backupExisting(filePath, options.backupDir, context.baseArtifactHash)).filter(Boolean);
    addRunMetadata(context.result, options, context, backupPaths);
    if (context.result.report.qa.status !== 'passed') throw new Error('Vocabulary enrichment QA failed; overlay was not written.');
    if (options.dryRun) return context.result;
    return applyEnrichmentResult(options, context);
}
