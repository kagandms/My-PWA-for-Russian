import crypto from 'node:crypto';
import { assertVocabularyArtifact } from './schema.mjs';
import { normalizeSurface } from './normalize.mjs';

export const ENRICHMENT_SCHEMA_VERSION = 1;
export const ENRICHMENT_VERSION = '1B';
export const ENRICHMENT_FIELDS = Object.freeze([
    'aspect_pair',
    'government',
    'preposition',
    'case',
    'collocation',
    'word_family',
    'stress',
    'cefr',
    'theme',
    'tag'
]);

const REVIEW_STATUS = 'needs_review';
const AUTO_STATUS = 'candidate';

function makeId(value) {
    return `enrich:${crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 20)}`;
}

function stableValue(value) {
    if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function countValues(values) {
    return values.reduce((counts, value) => {
        counts[value] = (counts[value] || 0) + 1;
        return counts;
    }, {});
}

function confidenceBucket(confidence) {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
}

function validateSeed(seed) {
    if (!seed || seed.schema_version !== ENRICHMENT_SCHEMA_VERSION) throw new Error('Unsupported enrichment seed schema version.');
    if (seed.enrichment_version !== ENRICHMENT_VERSION) throw new Error('Unsupported enrichment version.');
    if (!Array.isArray(seed.entries) || !Array.isArray(seed.ambiguous)) throw new Error('Enrichment seed must contain entries and ambiguous arrays.');
    seed.entries.forEach((entry) => {
        if (!entry.surface_form || !ENRICHMENT_FIELDS.includes(entry.field) || !entry.source) throw new Error('Enrichment seed entries require surface_form, field, and source.');
        if (!Number.isFinite(entry.confidence) || entry.confidence < 0 || entry.confidence > 1) throw new Error(`Invalid enrichment confidence for ${entry.surface_form}.`);
        if (!Object.hasOwn(entry, 'value') && !entry.counterpart_surface_form && !entry.target_surface_form) throw new Error(`Enrichment seed entry has no value: ${entry.surface_form}.`);
    });
}

function findUnits(artifact, entry) {
    return artifact.lexical_units.filter((unit) => {
        const sameSurface = normalizeSurface(unit.surface_form) === normalizeSurface(entry.surface_form);
        return sameSurface && (!entry.entry_type || unit.entry_type === entry.entry_type);
    });
}

function findSense(unit, entry) {
    if (!entry.sense_definition) return { sense: null, issue: null };
    const matches = unit.senses.filter((sense) => sense.definitions.includes(entry.sense_definition));
    if (matches.length === 1) return { sense: matches[0], issue: null };
    return {
        sense: null,
        issue: {
            surface_form: unit.surface_form,
            field: entry.field,
            reason: matches.length === 0 ? 'sense definition did not match exactly' : 'sense selector matched multiple senses',
            verification_status: REVIEW_STATUS
        }
    };
}

function findTargetUnit(artifact, entry) {
    const targetSurface = entry.counterpart_surface_form || entry.target_surface_form;
    if (!targetSurface) return { unit: null, issue: null };
    const matches = artifact.lexical_units.filter((unit) => normalizeSurface(unit.surface_form) === normalizeSurface(targetSurface));
    if (matches.length === 1) return { unit: matches[0], issue: null };
    return {
        unit: null,
        issue: {
            surface_form: entry.surface_form,
            field: entry.field,
            candidate_surface_forms: [targetSurface],
            reason: matches.length === 0 ? 'counterpart or relation target is absent from the base artifact' : 'counterpart or relation target is not unique',
            verification_status: REVIEW_STATUS
        }
    };
}

function cloneValue(value) {
    if (value === undefined) return {};
    return structuredClone(value);
}

function addTargetId(value, entry, targetUnit) {
    if (!targetUnit) return cloneValue(value);
    const targetIdField = entry.counterpart_surface_form ? 'counterpart_lexical_unit_id' : 'target_lexical_unit_id';
    const nextValue = cloneValue(value);
    if (typeof nextValue === 'object' && nextValue !== null && !Array.isArray(nextValue)) {
        nextValue[targetIdField] = targetUnit.id;
        return nextValue;
    }
    return { value: nextValue, [targetIdField]: targetUnit.id };
}

function createRecord(unit, sense, entry, targetUnit, updatedAt) {
    const value = addTargetId(entry.value, entry, targetUnit);
    const identity = [unit.id, sense?.sense_id || '', entry.field, stableValue(value)].join('|');
    return {
        enrichment_id: makeId(identity),
        lexical_unit_id: unit.id,
        sense_id: sense?.sense_id || null,
        field: entry.field,
        value,
        source: entry.source,
        confidence: entry.confidence,
        verification_status: AUTO_STATUS,
        updated_at: updatedAt,
        exercise_eligible: false
    };
}

function selectEntry(entry, artifact) {
    const units = findUnits(artifact, entry);
    if (units.length !== 1) {
        return {
            issue: {
                surface_form: entry.surface_form,
                field: entry.field,
                reason: units.length === 0 ? 'surface form is absent from the base artifact' : 'surface form is not unique in the base artifact',
                verification_status: REVIEW_STATUS
            }
        };
    }
    const unit = units[0];
    if (requiresReview(unit)) return { skip: { surface_form: unit.surface_form, field: entry.field, reason: entry.sense_definition ? 'lexical unit is needs_review' : 'lexical unit or one of its senses is needs_review', verification_status: REVIEW_STATUS } };
    const senseResult = findSense(unit, entry);
    if (senseResult.issue) return { issue: senseResult.issue };
    if (senseResult.sense?.verification_status === REVIEW_STATUS) return { skip: { surface_form: unit.surface_form, field: entry.field, reason: 'target sense is needs_review', verification_status: REVIEW_STATUS } };
    const targetResult = findTargetUnit(artifact, entry);
    if (targetResult.issue) return { issue: targetResult.issue };
    if (targetResult.unit && requiresReview(targetResult.unit)) return { skip: { surface_form: unit.surface_form, field: entry.field, reason: 'relation target is needs_review', verification_status: REVIEW_STATUS } };
    return { unit, sense: senseResult.sense, targetUnit: targetResult.unit };
}

function isSelected(entry, surfaceForms) {
    if (!surfaceForms) return true;
    return surfaceForms.has(normalizeSurface(entry.surface_form));
}

function requiresReview(unit) {
    return unit.verification_status === REVIEW_STATUS || unit.senses.some((sense) => sense.verification_status === REVIEW_STATUS);
}

function createReport(records, skipped, ambiguous, seed, options) {
    const statuses = ['candidate', 'unverified', 'verified', REVIEW_STATUS];
    const reviewStatusDistribution = Object.fromEntries(statuses.map((status) => [status, 0]));
    records.forEach((record) => { reviewStatusDistribution[record.verification_status]++; });
    [...skipped, ...ambiguous].forEach((item) => { reviewStatusDistribution[item.verification_status]++; });
    return {
        schema_version: ENRICHMENT_SCHEMA_VERSION,
        enrichment_version: ENRICHMENT_VERSION,
        mode: options.mode,
        generated_at: options.updatedAt,
        base_artifact: options.baseArtifact,
        seed_source: seed.source,
        selected_seed_entry_count: options.selectedSeedEntryCount,
        candidate_record_count: records.length,
        enriched_lexical_unit_count: new Set(records.map((record) => record.lexical_unit_id)).size,
        enriched_sense_count: new Set(records.filter((record) => record.sense_id).map((record) => record.sense_id)).size,
        by_field: countValues(records.map((record) => record.field)),
        record_verification_status_distribution: countValues(records.map((record) => record.verification_status)),
        review_status_distribution: reviewStatusDistribution,
        confidence_distribution: countValues(records.map((record) => confidenceBucket(record.confidence))),
        skipped_needs_review_count: skipped.length,
        skipped,
        ambiguous_count: ambiguous.length,
        ambiguous,
        unmatched_seed_count: ambiguous.filter((item) => /absent/u.test(item.reason)).length,
        duplicate_record_count: options.duplicateRecordCount,
        exercise_eligible_record_count: records.filter((record) => record.exercise_eligible).length,
        qa: {
            status: records.every((record) => record.verification_status === AUTO_STATUS && record.exercise_eligible === false) ? 'passed' : 'failed',
            all_records_have_metadata: records.every((record) => record.source && Number.isFinite(record.confidence) && record.verification_status && record.updated_at),
            no_needs_review_records_emitted: records.every((record) => record.verification_status !== REVIEW_STATUS),
            no_scored_answer_records: records.every((record) => record.exercise_eligible === false)
        }
    };
}

function processEntries(artifact, seed, options) {
    const records = [];
    const skipped = [];
    const ambiguous = seed.ambiguous.filter((entry) => isSelected(entry, options.surfaceForms)).map((entry) => ({ ...entry, verification_status: REVIEW_STATUS }));
    const recordIds = new Set();
    let duplicateRecordCount = 0;
    const entries = seed.entries.filter((entry) => isSelected(entry, options.surfaceForms));
    entries.forEach((entry) => {
        const selection = selectEntry(entry, artifact);
        if (selection.skip) {
            skipped.push(selection.skip);
            return;
        }
        if (selection.issue) {
            ambiguous.push(selection.issue);
            return;
        }
        const record = createRecord(selection.unit, selection.sense, entry, selection.targetUnit, options.updatedAt);
        if (recordIds.has(record.enrichment_id)) {
            duplicateRecordCount++;
            return;
        }
        recordIds.add(record.enrichment_id);
        records.push(record);
    });
    return { records, skipped, ambiguous, duplicateRecordCount, selectedSeedEntryCount: entries.length };
}

/**
 * Builds a deterministic Phase 1B enrichment overlay without mutating the base artifact.
 * @param {object} options build options
 * @returns {{overlay: object, report: object}}
 */
export function buildEnrichmentOverlay(options) {
    assertVocabularyArtifact(options.artifact);
    validateSeed(options.seed);
    const processOptions = {
        mode: options.mode || 'full',
        updatedAt: options.updatedAt || new Date().toISOString(),
        surfaceForms: options.surfaceForms ? new Set(options.surfaceForms.map(normalizeSurface)) : null,
        baseArtifact: options.baseArtifact || { schema_version: options.artifact.schema_version, import_batch_id: options.artifact.import_batch_id },
        duplicateRecordCount: 0,
        selectedSeedEntryCount: 0
    };
    const processed = processEntries(options.artifact, options.seed, processOptions);
    processOptions.duplicateRecordCount = processed.duplicateRecordCount;
    processOptions.selectedSeedEntryCount = processed.selectedSeedEntryCount;
    const overlay = {
        schema_version: ENRICHMENT_SCHEMA_VERSION,
        enrichment_version: ENRICHMENT_VERSION,
        artifact_type: 'vocabulary-enrichment',
        generated_at: processOptions.updatedAt,
        base_artifact: processOptions.baseArtifact,
        records: processed.records
    };
    assertEnrichmentOverlay(overlay);
    return { overlay, report: createReport(processed.records, processed.skipped, processed.ambiguous, options.seed, processOptions) };
}

/**
 * Validates the versioned enrichment overlay contract.
 * @param {object} overlay overlay to validate
 * @returns {true}
 */
export function assertEnrichmentOverlay(overlay) {
    if (!overlay || overlay.schema_version !== ENRICHMENT_SCHEMA_VERSION || overlay.enrichment_version !== ENRICHMENT_VERSION) throw new Error('Unsupported enrichment overlay version.');
    if (overlay.artifact_type !== 'vocabulary-enrichment' || !Array.isArray(overlay.records)) throw new Error('Invalid enrichment overlay.');
    overlay.records.forEach((record) => {
        if (!record.enrichment_id || !record.lexical_unit_id || !ENRICHMENT_FIELDS.includes(record.field)) throw new Error('Enrichment record identity is invalid.');
        if (!Object.hasOwn(record, 'value') || !record.source || !Number.isFinite(record.confidence)) throw new Error(`Enrichment metadata is incomplete: ${record.enrichment_id}`);
        if (!['candidate', 'unverified', 'verified', REVIEW_STATUS].includes(record.verification_status)) throw new Error(`Invalid enrichment status: ${record.verification_status}`);
        if (!record.updated_at || record.exercise_eligible !== false) throw new Error(`Enrichment record is not safely gated: ${record.enrichment_id}`);
    });
    return true;
}
