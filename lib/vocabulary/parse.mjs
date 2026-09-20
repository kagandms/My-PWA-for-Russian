import { classifyEntryType, detectSourceDirection } from './normalize.mjs';

function buildProvenance(context, sourceLineNumber, sourceDirection) {
    return {
        source_file_name: context.sourceFileName,
        source_hash: context.sourceHash,
        source_line_number: sourceLineNumber,
        import_batch_id: context.importBatchId,
        imported_at: context.importedAt,
        source_direction: sourceDirection
    };
}

function parseLine(line, sourceLineNumber, context) {
    const separatorIndex = line.indexOf(':') >= 0 ? line.indexOf(':') : line.indexOf('=');
    if (separatorIndex < 1) return { invalid: { sourceLineNumber, raw_entry: line, reason: 'missing_separator' } };
    const surfaceForm = line.slice(0, separatorIndex).trim();
    const targetText = line.slice(separatorIndex + 1).trim();
    if (!surfaceForm || !targetText) return { invalid: { sourceLineNumber, raw_entry: line, reason: 'empty_field' } };
    const sourceDirection = detectSourceDirection(surfaceForm, targetText);
    const classification = classifyEntryType(surfaceForm);
    const verificationStatus = sourceDirection === 'ru→ru' || classification.entryType !== 'lemma' ? 'needs_review' : 'reviewed';
    return {
        row: {
            raw_entry: line,
            surface_form: surfaceForm,
            target_text: targetText,
            language: 'ru',
            source_direction: sourceDirection,
            entry_type: classification.entryType,
            classification_confidence: classification.confidence,
            verification_status: verificationStatus,
            provenance: buildProvenance(context, sourceLineNumber, sourceDirection)
        }
    };
}

export function parseSource(text, context) {
    const rows = [];
    const invalidRows = [];
    const lines = String(text).split(/\r?\n/u);
    lines.forEach((line, index) => {
        if (!line.trim()) return;
        const parsed = parseLine(line, index + 1, context);
        if (parsed.row) rows.push(parsed.row);
        if (parsed.invalid) invalidRows.push(parsed.invalid);
    });
    return { rows, invalidRows, sourceLineCount: lines.filter(line => line.trim()).length };
}
