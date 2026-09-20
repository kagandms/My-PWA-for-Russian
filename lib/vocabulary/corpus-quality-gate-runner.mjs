import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertVocabularyArtifact } from './schema.mjs';
import {
    assertQualityOverlay,
    buildQualityOverlay,
    buildQualityReport
} from './corpus-quality-gate.mjs';

function hashBytes(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hashFile(filePath) {
    return hashBytes(fs.readFileSync(filePath));
}

function backupExisting(filePath, backupDir, sourceHash) {
    if (!fs.existsSync(filePath)) return null;
    fs.mkdirSync(backupDir, { recursive: true });
    const basePath = path.join(backupDir, `${path.basename(filePath)}.${sourceHash.slice(0, 12)}`);
    let backupPath = `${basePath}.bak`;
    let suffix = 1;
    while (fs.existsSync(backupPath)) backupPath = `${basePath}.${suffix++}.bak`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function getProtectedPaths(options) {
    return [...new Set([
        ...(options.protectedPaths || []),
        options.sourceOverlayPath,
        options.artifactPath,
        options.corpusPath
    ])];
}

function getProtectedHashes(protectedPaths) {
    return Object.fromEntries(protectedPaths.filter((filePath) => fs.existsSync(filePath)).map((filePath) => [filePath, hashFile(filePath)]));
}

function protectedFilesUnchanged(before, after) {
    return Object.entries(before).every(([filePath, beforeHash]) => after[filePath] === beforeHash);
}

function buildContext(options) {
    const artifactBytes = fs.readFileSync(options.artifactPath);
    const sourceOverlayBytes = fs.readFileSync(options.sourceOverlayPath);
    const corpusBytes = fs.readFileSync(options.corpusPath);
    const artifact = JSON.parse(artifactBytes.toString('utf8'));
    const sourceOverlay = JSON.parse(sourceOverlayBytes.toString('utf8'));
    const sourceReport = readJson(options.sourceReportPath);
    assertVocabularyArtifact(artifact);
    if (!Array.isArray(sourceOverlay.records)) throw new Error('Corpus source overlay records must be an array.');
    const baseArtifactHash = hashBytes(artifactBytes);
    const sourceOverlayHash = hashBytes(sourceOverlayBytes);
    const corpusHash = hashBytes(corpusBytes);
    const protectedPaths = getProtectedPaths(options);
    const protectedBefore = getProtectedHashes(protectedPaths);
    const overlay = buildQualityOverlay({
        sourceRecords: sourceOverlay.records,
        lexicalUnits: artifact.lexical_units,
        sourceOverlay: { file_name: path.basename(options.sourceOverlayPath), sha256: sourceOverlayHash },
        baseArtifact: {
            schema_version: artifact.schema_version,
            import_batch_id: artifact.import_batch_id,
            source_file_name: artifact.source.file_name,
            source_sha256: artifact.source.sha256,
            artifact_sha256: baseArtifactHash
        },
        corpusSource: { file_name: path.basename(options.corpusPath), sha256: corpusHash },
        updatedAt: options.updatedAt
    });
    const report = buildQualityReport({ overlay, sourceReport, updatedAt: options.updatedAt });
    return { artifactPath: options.artifactPath, sourceOverlayPath: options.sourceOverlayPath, corpusPath: options.corpusPath, protectedPaths, protectedBefore, baseArtifactHash, sourceOverlayHash, corpusHash, overlay, report };
}

function addRunMetadata(context, options, backupPaths) {
    context.report = {
        ...context.report,
        mode: options.mode || 'full',
        dry_run: Boolean(options.dryRun),
        output_path: options.outputPath,
        report_path: options.reportPath,
        backup_paths: backupPaths,
        base_artifact_sha256_before: context.baseArtifactHash,
        source_overlay_sha256_before: context.sourceOverlayHash,
        corpus_sha256_before: context.corpusHash,
        protected_file_hashes_before: context.protectedBefore
    };
}

function applyResult(context, options) {
    writeJson(options.outputPath, context.overlay);
    const baseArtifactUnchanged = hashFile(context.artifactPath) === context.baseArtifactHash;
    const sourceOverlayUnchanged = hashFile(context.sourceOverlayPath) === context.sourceOverlayHash;
    const corpusUnchanged = hashFile(context.corpusPath) === context.corpusHash;
    const protectedAfter = getProtectedHashes(context.protectedPaths);
    const protectedUnchanged = protectedFilesUnchanged(context.protectedBefore, protectedAfter);
    context.report.qa = {
        ...context.report.qa,
        base_artifact_unchanged: baseArtifactUnchanged,
        source_overlay_unchanged: sourceOverlayUnchanged,
        corpus_unchanged: corpusUnchanged,
        protected_files_unchanged: protectedUnchanged,
        status: baseArtifactUnchanged && sourceOverlayUnchanged && corpusUnchanged && protectedUnchanged ? 'passed' : 'failed'
    };
    context.report.base_artifact_sha256_after = hashFile(context.artifactPath);
    context.report.source_overlay_sha256_after = hashFile(context.sourceOverlayPath);
    context.report.corpus_sha256_after = hashFile(context.corpusPath);
    context.report.protected_file_hashes_after = protectedAfter;
    if (context.report.qa.status !== 'passed') throw new Error('Protected quality-gate source bytes changed during apply.');
    writeJson(options.reportPath, context.report);
    return { overlay: context.overlay, report: context.report };
}

/**
 * Runs the Phase 1B.3 quality gate without mutating the source overlay or base artifacts.
 * @param {object} options quality gate runner options
 * @returns {{overlay: object, report: object}}
 */
export function runCorpusQualityGate(options) {
    const context = buildContext(options);
    const backupPaths = options.dryRun ? [] : [options.outputPath, options.reportPath].map((filePath) => backupExisting(filePath, options.backupDir, context.baseArtifactHash)).filter(Boolean);
    addRunMetadata(context, options, backupPaths);
    assertQualityOverlay(context.overlay);
    if (context.report.qa.status !== 'passed') throw new Error('Quality gate QA failed; overlay was not written.');
    if (options.dryRun) return { overlay: context.overlay, report: context.report };
    return applyResult(context, options);
}
