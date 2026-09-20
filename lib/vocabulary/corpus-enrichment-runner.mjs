import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildCorpusEnrichmentOverlay,
    flattenSentenceCorpus,
    assertCorpusEnrichmentOverlay
} from './corpus-enrichment.mjs';
import { assertVocabularyArtifact } from './schema.mjs';

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

function toPortablePath(filePath, repositoryRoot = process.cwd()) {
    const relativePath = path.relative(repositoryRoot, filePath);
    if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        return relativePath.split(path.sep).join('/');
    }
    return path.basename(filePath);
}

function toPortablePathMap(pathMap, repositoryRoot) {
    return Object.fromEntries(Object.entries(pathMap).map(([filePath, hash]) => [toPortablePath(filePath, repositoryRoot), hash]));
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
    return [...new Set([...(options.protectedPaths || []), options.corpusPath])];
}

function getProtectedHashes(protectedPaths) {
    return Object.fromEntries(protectedPaths.filter((filePath) => fs.existsSync(filePath)).map((filePath) => [filePath, hashFile(filePath)]));
}

function protectedFilesUnchanged(before, after) {
    return Object.entries(before).every(([filePath, beforeHash]) => after[filePath] === beforeHash);
}

function readExistingRecords(existingOverlayPath) {
    if (!existingOverlayPath || !fs.existsSync(existingOverlayPath)) return [];
    const existingOverlay = readJson(existingOverlayPath);
    return Array.isArray(existingOverlay.records) ? existingOverlay.records : [];
}

function selectCorpusRows(rows, options) {
    if (options.mode !== 'sample') return rows;
    const sampleRowLimit = options.sampleRowLimit || 1000;
    return rows.slice(0, sampleRowLimit);
}

function buildContext(options) {
    const artifactBytes = fs.readFileSync(options.artifactPath);
    const corpusBytes = fs.readFileSync(options.corpusPath);
    const artifact = JSON.parse(artifactBytes.toString('utf8'));
    const corpus = JSON.parse(corpusBytes.toString('utf8'));
    assertVocabularyArtifact(artifact);
    const allRows = flattenSentenceCorpus(corpus);
    const corpusRows = selectCorpusRows(allRows, options);
    const baseArtifactHash = hashBytes(artifactBytes);
    const corpusHash = hashBytes(corpusBytes);
    const protectedPaths = getProtectedPaths(options);
    const protectedBefore = getProtectedHashes(protectedPaths);
    const result = buildCorpusEnrichmentOverlay({
        artifact,
        corpusRows,
        corpusSource: path.basename(options.corpusPath),
        corpusHash,
        existingRecords: readExistingRecords(options.existingOverlayPath),
        updatedAt: options.updatedAt,
        baseArtifact: {
            schema_version: artifact.schema_version,
            import_batch_id: artifact.import_batch_id,
            source_file_name: artifact.source.file_name,
            source_sha256: artifact.source.sha256,
            artifact_sha256: baseArtifactHash
        }
    });
    return { artifactPath: options.artifactPath, corpusPath: options.corpusPath, protectedPaths, protectedBefore, baseArtifactHash, corpusHash, allRows, result };
}

function addRunMetadata(context, options, backupPaths) {
    const repositoryRoot = options.repositoryRoot || process.cwd();
    context.result.report = {
        ...context.result.report,
        mode: options.mode || 'full',
        dry_run: Boolean(options.dryRun),
        output_path: toPortablePath(options.outputPath, repositoryRoot),
        report_path: toPortablePath(options.reportPath, repositoryRoot),
        backup_paths: backupPaths.map((filePath) => toPortablePath(filePath, repositoryRoot)),
        full_corpus_sentence_count: context.allRows.length,
        selected_corpus_sentence_count: context.result.report.corpus_source.sentence_count,
        base_artifact_sha256_before: context.baseArtifactHash,
        corpus_sha256_before: context.corpusHash,
        protected_file_hashes_before: toPortablePathMap(context.protectedBefore, repositoryRoot)
    };
}

function applyResult(context, options) {
    writeJson(options.outputPath, context.result.overlay);
    const baseArtifactUnchanged = hashFile(context.artifactPath) === context.baseArtifactHash;
    const corpusUnchanged = hashFile(context.corpusPath) === context.corpusHash;
    const protectedAfter = getProtectedHashes(context.protectedPaths);
    context.result.report.qa = {
        ...context.result.report.qa,
        base_artifact_unchanged: baseArtifactUnchanged,
        corpus_unchanged: corpusUnchanged,
        protected_files_unchanged: protectedFilesUnchanged(context.protectedBefore, protectedAfter),
        status: baseArtifactUnchanged && corpusUnchanged && protectedFilesUnchanged(context.protectedBefore, protectedAfter) ? 'passed' : 'failed'
    };
    context.result.report.base_artifact_sha256_after = hashFile(context.artifactPath);
    context.result.report.corpus_sha256_after = hashFile(context.corpusPath);
    context.result.report.protected_file_hashes_after = toPortablePathMap(protectedAfter, options.repositoryRoot || process.cwd());
    if (context.result.report.qa.status !== 'passed') throw new Error('Protected vocabulary or corpus bytes changed during corpus enrichment.');
    writeJson(options.reportPath, context.result.report);
    return context.result;
}

/**
 * Runs corpus-based Phase 1B.2 enrichment without modifying the base artifact.
 * @param {object} options runner options
 * @returns {{overlay: object, report: object}}
 */
export function runCorpusEnrichment(options) {
    const context = buildContext(options);
    const backupPaths = options.dryRun ? [] : [options.outputPath, options.reportPath].map((filePath) => backupExisting(filePath, options.backupDir, context.baseArtifactHash)).filter(Boolean);
    addRunMetadata(context, options, backupPaths);
    assertCorpusEnrichmentOverlay(context.result.overlay);
    if (context.result.report.qa.status !== 'passed') throw new Error('Corpus enrichment QA failed; overlay was not written.');
    if (options.dryRun) return context.result;
    return applyResult(context, options);
}
