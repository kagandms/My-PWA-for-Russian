import { parseSource } from './parse.mjs';
import { assertVocabularyArtifact } from './schema.mjs';

function addIndexedValue(index, key, value) {
    const values = index.get(key) || [];
    values.push(value);
    index.set(key, values);
}

function indexArtifactBySourceLine(artifact) {
    const unitsByLine = new Map();
    const sensesByLine = new Map();
    const relationsByLine = new Map();

    for (const unit of artifact.lexical_units) {
        for (const lineNumber of unit.provenance?.source_line_numbers || []) {
            addIndexedValue(unitsByLine, lineNumber, unit);
        }
        for (const sense of unit.senses) {
            for (const lineNumber of sense.provenance?.source_line_numbers || []) {
                addIndexedValue(sensesByLine, lineNumber, sense);
            }
        }
        for (const relation of unit.relations || []) {
            for (const lineNumber of relation.provenance?.source_line_numbers || []) {
                addIndexedValue(relationsByLine, lineNumber, relation);
            }
        }
    }

    return { unitsByLine, sensesByLine, relationsByLine };
}

function createMappingEntry(row, legacyIndex, indexes) {
    const sourceLineNumber = row.provenance.source_line_number;
    const units = indexes.unitsByLine.get(sourceLineNumber) || [];
    const senses = indexes.sensesByLine.get(sourceLineNumber) || [];
    const relations = indexes.relationsByLine.get(sourceLineNumber) || [];
    const status = units.length === 1 ? 'matched' : units.length > 1 ? 'ambiguous' : 'unmapped';
    const unit = units[0] || null;

    return {
        legacy_index: legacyIndex,
        legacy_id: sourceLineNumber,
        source_line_number: sourceLineNumber,
        russian: row.surface_form,
        turkish: row.target_text,
        entry_type: row.entry_type,
        source_direction: row.source_direction,
        status,
        lexical_unit_id: unit?.id || null,
        sense_ids: [...new Set(senses.map(sense => sense.sense_id))],
        relation_ids: [...new Set(relations.map(relation => relation.relation_id))]
    };
}

function countStatuses(entries) {
    return entries.reduce((counts, entry) => {
        counts[entry.status] += 1;
        return counts;
    }, { matched: 0, ambiguous: 0, unmapped: 0 });
}

/**
 * Builds a stable source-line identity map without changing the vocabulary artifact.
 * @param {object} options Source text, canonical artifact, and provenance metadata.
 * @returns {object} Versioned identity-map payload.
 */
export function buildLegacyIdentityMap(options) {
    assertVocabularyArtifact(options.artifact);
    const parsed = parseSource(options.sourceText, {
        sourceFileName: options.sourceFileName,
        sourceHash: options.sourceHash,
        importBatchId: options.importBatchId || options.artifact.import_batch_id,
        importedAt: options.importedAt || options.artifact.imported_at
    });
    const indexes = indexArtifactBySourceLine(options.artifact);
    const entries = parsed.rows.map((row, index) => createMappingEntry(row, index, indexes));
    const counts = countStatuses(entries);

    return {
        schema_version: 1,
        mapping_version: '1C',
        artifact_type: 'legacy-identity-map',
        generated_at: options.generatedAt || new Date().toISOString(),
        source: {
            file_name: options.sourceFileName,
            sha256: options.sourceHash,
            line_count: parsed.sourceLineCount,
            parsed_record_count: parsed.rows.length,
            invalid_record_count: parsed.invalidRows.length
        },
        base_artifact: {
            schema_version: options.artifact.schema_version,
            source_hash: options.artifact.source?.sha256 || null,
            lexical_unit_count: options.artifact.lexical_units.length
        },
        counts: { source_record_count: entries.length, ...counts },
        entries,
        invalid_source_rows: parsed.invalidRows
    };
}

function resolveLegacyEntry(identifier, identityMap) {
    return identityMap.entries.find(entry => (
        String(entry.legacy_id) === String(identifier)
        || String(entry.legacy_index) === String(identifier)
    )) || null;
}

/**
 * Classifies progress identities without writing, deleting, or rewriting user data.
 * @param {object} options Legacy IDs, identity map, and known ambiguous IDs.
 * @returns {object} Dry-run classification report.
 */
export function buildProgressMigrationDryRun(options) {
    const ambiguousIds = new Set((options.ambiguousLegacyIds || []).map(String));
    const records = options.legacyRecordIds.map(identifier => {
        const entry = resolveLegacyEntry(identifier, options.identityMap);
        const key = String(identifier);
        const status = ambiguousIds.has(key) ? 'ambiguous' : entry?.status === 'matched' ? 'matched' : 'unmapped';
        return {
            legacy_identifier: identifier,
            status,
            lexical_unit_id: status === 'matched' ? entry.lexical_unit_id : null
        };
    });
    const counts = records.reduce((result, record) => {
        result[record.status] += 1;
        return result;
    }, { matched: 0, ambiguous: 0, unmapped: 0 });

    return {
        mode: 'dry-run',
        applied_count: 0,
        deleted_count: 0,
        counts,
        records
    };
}
