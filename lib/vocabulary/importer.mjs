import crypto from 'node:crypto';
import { parseSource } from './parse.mjs';
import { assertVocabularyArtifact, SCHEMA_VERSION } from './schema.mjs';
import { normalizeDedupKey, normalizeSurface } from './normalize.mjs';

function makeId(prefix, value) {
    const digest = crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 20);
    return `${prefix}:${digest}`;
}

function createProvenance(row) {
    return {
        source_file_name: row.provenance.source_file_name,
        source_hash: row.provenance.source_hash,
        source_line_numbers: [row.provenance.source_line_number],
        import_batch_ids: [row.provenance.import_batch_id],
        imported_at: row.provenance.imported_at
    };
}

function appendProvenance(target, row) {
    target.source_line_numbers.push(row.provenance.source_line_number);
    if (!target.import_batch_ids.includes(row.provenance.import_batch_id)) target.import_batch_ids.push(row.provenance.import_batch_id);
}

function relationType(targetText) {
    if (/синоним/u.test(targetText)) return 'synonym';
    if (/близк|похож/u.test(targetText)) return 'near_synonym';
    if (/антоним|противополож/u.test(targetText)) return 'antonym';
    if (/семь|родствен/u.test(targetText)) return 'word_family';
    return 'related';
}

function createUnit(row, unitKey) {
    return {
        id: makeId('lu', unitKey),
        entry_type: row.entry_type,
        surface_form: row.surface_form,
        lemma: null,
        language: row.language,
        source_direction: row.source_direction,
        source_directions: [row.source_direction],
        raw_entry: row.raw_entry,
        raw_entries: [row.raw_entry],
        verification_status: row.verification_status,
        exercise_eligible: false,
        provenance: createProvenance(row),
        senses: [],
        relations: []
    };
}

function createSense(row, unitKey) {
    return {
        sense_id: makeId('sense', `${unitKey}|${normalizeDedupKey(row.target_text)}`),
        definitions: [row.target_text],
        meaning_notes: null,
        register: null,
        domain: null,
        examples: [],
        collocations: [],
        relations: [],
        source_direction: row.source_direction,
        verification_status: row.verification_status,
        exercise_eligible: row.verification_status === 'reviewed',
        raw_entry: row.raw_entry,
        raw_entries: [row.raw_entry],
        provenance: createProvenance(row)
    };
}

function createRelation(row, unitKey) {
    return {
        relation_id: makeId('rel', `${unitKey}|${normalizeDedupKey(row.target_text)}`),
        relation_type: relationType(row.target_text),
        target_surface_form: row.target_text,
        target_lexical_unit_id: null,
        raw_entry: row.raw_entry,
        raw_entries: [row.raw_entry],
        verification_status: 'needs_review',
        provenance: createProvenance(row)
    };
}

function addUnitRow(unit, row) {
    unit.raw_entries.push(row.raw_entry);
    appendProvenance(unit.provenance, row);
    if (!unit.source_directions.includes(row.source_direction)) unit.source_directions.push(row.source_direction);
    unit.source_direction = unit.source_directions.length === 1 ? row.source_direction : 'mixed';
    if (row.verification_status === 'needs_review') unit.verification_status = 'needs_review';
}

function addSenseRow(unit, row, unitKey) {
    const senseKey = normalizeDedupKey(row.target_text);
    const existing = unit.senses.find(sense => sense.sense_id === makeId('sense', `${unitKey}|${senseKey}`));
    if (!existing) {
        unit.senses.push(createSense(row, unitKey));
        return false;
    }
    existing.raw_entries.push(row.raw_entry);
    appendProvenance(existing.provenance, row);
    return true;
}

function addRelationRow(unit, row, unitKey) {
    const relationKey = makeId('rel', `${unitKey}|${normalizeDedupKey(row.target_text)}`);
    const existing = unit.relations.find(relation => relation.relation_id === relationKey);
    if (!existing) {
        unit.relations.push(createRelation(row, unitKey));
        return false;
    }
    existing.raw_entries.push(row.raw_entry);
    appendProvenance(existing.provenance, row);
    return true;
}

function buildQa(report, artifact, parsed) {
    const checks = [
        { name: 'source_rows_accounted_for', passed: report.source_line_count === parsed.rows.length + parsed.invalidRows.length },
        { name: 'raw_entries_preserved', passed: artifact.lexical_units.every(unit => unit.raw_entries.length > 0) },
        { name: 'relations_have_no_definitions', passed: artifact.lexical_units.every(unit => unit.relations.every(relation => !relation.definition)) },
        { name: 'non_lemma_types_are_preserved', passed: artifact.lexical_units.every(unit => unit.entry_type !== 'lemma' || !unit.surface_form.includes(' ')) }
    ];
    return { status: checks.every(check => check.passed) ? 'passed' : 'failed', checks };
}

function countRows(rows, property) {
    return rows.reduce((counts, row) => {
        counts[row[property]] = (counts[row[property]] || 0) + 1;
        return counts;
    }, {});
}

function createImportState() {
    return { unitsByKey: new Map(), duplicateMergeCount: 0, relationCount: 0, relationRowCount: 0, reviewRequiredRows: 0 };
}

function processRow(state, row) {
    if (row.verification_status === 'needs_review') state.reviewRequiredRows++;
    const unitKey = `${row.language}|${row.entry_type}|${normalizeSurface(row.surface_form)}`;
    const unit = state.unitsByKey.get(unitKey) || createUnit(row, unitKey);
    if (state.unitsByKey.has(unitKey)) addUnitRow(unit, row);
    if (row.source_direction === 'ru→ru') {
        state.relationRowCount++;
        if (addRelationRow(unit, row, unitKey)) state.duplicateMergeCount++;
        else state.relationCount++;
    } else if (addSenseRow(unit, row, unitKey)) state.duplicateMergeCount++;
    state.unitsByKey.set(unitKey, unit);
}

function createArtifact(options, parsed, lexicalUnits) {
    return {
        schema_version: SCHEMA_VERSION,
        artifact_type: 'vocabulary',
        import_batch_id: options.importBatchId,
        imported_at: options.importedAt,
        source: { file_name: options.sourceFileName, sha256: options.sourceHash, line_count: parsed.sourceLineCount },
        lexical_units: lexicalUnits
    };
}

function createReport(options, parsed, lexicalUnits, state) {
    return {
        schema_version: SCHEMA_VERSION,
        import_batch_id: options.importBatchId,
        source_file_name: options.sourceFileName,
        source_hash: options.sourceHash,
        imported_at: options.importedAt,
        source_line_count: parsed.sourceLineCount,
        parsed_record_count: parsed.rows.length,
        invalid_record_count: parsed.invalidRows.length,
        created_lexical_unit_count: lexicalUnits.length,
        created_sense_count: lexicalUnits.reduce((count, unit) => count + unit.senses.length, 0),
        relation_count: state.relationCount,
        relation_row_count: state.relationRowCount,
        duplicate_merge_count: state.duplicateMergeCount,
        review_required_row_count: state.reviewRequiredRows,
        review_required_lexical_unit_count: lexicalUnits.filter(unit => unit.verification_status === 'needs_review').length,
        invalid_rows: parsed.invalidRows,
        entry_type_counts: countRows(parsed.rows, 'entry_type'),
        source_direction_counts: countRows(parsed.rows, 'source_direction'),
        qa: null
    };
}

export function buildVocabularyArtifact(options) {
    const parsed = parseSource(options.sourceText, options);
    const state = createImportState();
    parsed.rows.forEach(row => processRow(state, row));
    const lexicalUnits = [...state.unitsByKey.values()];
    lexicalUnits.forEach(unit => { unit.exercise_eligible = unit.senses.some(sense => sense.exercise_eligible); });
    const artifact = createArtifact(options, parsed, lexicalUnits);
    assertVocabularyArtifact(artifact);
    const report = createReport(options, parsed, lexicalUnits, state);
    report.qa = buildQa(report, artifact, parsed);
    return { artifact, report };
}
