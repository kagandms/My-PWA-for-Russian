import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildVocabularyArtifact } from './importer.mjs';

function calculateSha256(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function ensureParent(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createBackup(outputPath, backupDir, sourceHash) {
    if (!fs.existsSync(outputPath)) return null;
    fs.mkdirSync(backupDir, { recursive: true });
    const basePath = path.join(backupDir, `${path.basename(outputPath)}.${sourceHash.slice(0, 12)}`);
    let backupPath = `${basePath}.bak`;
    let suffix = 1;
    while (fs.existsSync(backupPath)) backupPath = `${basePath}.${suffix++}.bak`;
    fs.copyFileSync(outputPath, backupPath);
    return backupPath;
}

function writeJson(filePath, value) {
    ensureParent(filePath);
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function runImport(options) {
    const sourceText = fs.readFileSync(options.sourcePath, 'utf8');
    const sourceHash = calculateSha256(sourceText);
    const importBatchId = options.importBatchId || `import-${sourceHash.slice(0, 12)}`;
    const importedAt = options.importedAt || new Date().toISOString();
    const result = buildVocabularyArtifact({
        sourceText,
        sourceFileName: path.basename(options.sourcePath),
        sourceHash,
        importBatchId,
        importedAt
    });
    const backupPath = options.dryRun ? null : createBackup(options.outputPath, options.backupDir, sourceHash);
    result.report = { ...result.report, dry_run: Boolean(options.dryRun), output_path: options.outputPath, report_path: options.reportPath, backup_path: backupPath };
    if (options.dryRun) return result;
    if (result.report.invalid_record_count > 0 || result.report.qa.status !== 'passed') throw new Error('Vocabulary import QA failed; artifact was not written.');
    writeJson(options.outputPath, result.artifact);
    writeJson(options.reportPath, result.report);
    return result;
}
