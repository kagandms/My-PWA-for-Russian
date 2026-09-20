import crypto from 'node:crypto';
import { assertVocabularyArtifact } from './schema.mjs';
import { normalizeSurface } from './normalize.mjs';

export const CORPUS_ENRICHMENT_SCHEMA_VERSION = 1;
export const CORPUS_ENRICHMENT_VERSION = '1B.2';
export const CORPUS_ENRICHMENT_FIELDS = Object.freeze([
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
const MIN_SUPPORT_COUNT = 3;
const MIN_AUDIT_EXAMPLES = 20;

function makeId(value) {
    return `corpus-enrich:${crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 20)}`;
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

function normalizeToken(value) {
    return value.toLocaleLowerCase('ru-RU');
}

function tokenizeRussian(text) {
    return (text.match(/[А-Яа-яЁё]+/gu) || []).map(normalizeToken);
}

function validateCorpusRows(corpusRows) {
    if (!Array.isArray(corpusRows)) throw new Error('Corpus rows must be an array.');
    corpusRows.forEach((row) => {
        if (!row.sentence_id || !row.corpus_key || !Number.isInteger(row.source_index) || !row.ru) throw new Error('Corpus rows require sentence_id, corpus_key, source_index, and ru.');
    });
}

function createTokenIndex(corpusRows) {
    const index = new Map();
    corpusRows.forEach((row) => {
        const tokens = tokenizeRussian(row.ru);
        tokens.forEach((token, tokenIndex) => {
            const occurrences = index.get(token) || [];
            occurrences.push({ row, tokens, tokenIndex });
            index.set(token, occurrences);
        });
    });
    return index;
}

function hasReview(unit) {
    return unit.verification_status === REVIEW_STATUS || unit.senses.some((sense) => sense.verification_status === REVIEW_STATUS);
}

function isVerbForm(surfaceForm) {
    return /(?:ть|ти|чь)$/u.test(normalizeSurface(surfaceForm));
}

function matchesFieldDomain(field, unit) {
    if (unit.entry_type !== 'lemma') return false;
    if (['aspect_pair', 'government', 'preposition', 'case'].includes(field)) return isVerbForm(unit.surface_form);
    return !/\s/u.test(unit.surface_form);
}

function getDomainUnits(field, lexicalUnits) {
    return lexicalUnits.filter((unit) => matchesFieldDomain(field, unit));
}

function getEligibleUnits(field, lexicalUnits) {
    return getDomainUnits(field, lexicalUnits).filter((unit) => !hasReview(unit));
}

function createEmptyReasonDistribution() {
    return { source_required: 0, needs_review: 0, sense_ambiguity: 0, no_exact_corpus_evidence: 0, insufficient_corpus_support: 0 };
}

function collectContexts(unit, tokenIndex) {
    const target = normalizeToken(unit.surface_form);
    const contexts = new Map();
    (tokenIndex.get(target) || []).forEach((occurrence) => {
        [[occurrence.tokenIndex - 1, occurrence.tokenIndex + 1], [occurrence.tokenIndex, occurrence.tokenIndex + 2]].forEach(([start, end]) => {
            if (start < 0 || end > occurrence.tokens.length) return;
            const collocation = occurrence.tokens.slice(start, end).join(' ');
            const evidence = contexts.get(collocation) || new Map();
            const evidenceKey = `${occurrence.row.ru}\u0000${occurrence.row.tr || ''}`;
            const references = evidence.get(evidenceKey) || [];
            references.push(occurrence.row);
            evidence.set(evidenceKey, references);
            contexts.set(collocation, evidence);
        });
    });
    return [...contexts.entries()].map(([collocation, evidence]) => ({
        collocation,
        evidence,
        supportCount: evidence.size,
        corpusGroupCount: new Set([...evidence.values()].flatMap((rows) => rows.map((row) => row.corpus_key))).size
    }));
}

function meetsSupportThreshold(context) {
    return context.supportCount >= MIN_SUPPORT_COUNT && (context.corpusGroupCount >= 2 || context.supportCount >= 5);
}

function calculateConfidence(context) {
    if (context.supportCount >= 8) return 0.9;
    if (context.supportCount >= 5) return 0.82;
    return 0.72;
}

function getSingleSense(unit) {
    if (unit.senses.length !== 1) return null;
    return unit.senses[0].verification_status === 'reviewed' ? unit.senses[0] : null;
}

function createEvidence(context) {
    const orderedEvidence = [...context.evidence.values()].sort((left, right) => left[0].sentence_id.localeCompare(right[0].sentence_id));
    return orderedEvidence.map((references) => {
        const row = references[0];
        return {
            sentence_id: row.sentence_id,
            corpus_key: row.corpus_key,
            source_index: row.source_index,
            ru: row.ru,
            tr: row.tr || null,
            corpus_references: references.map((reference) => reference.sentence_id).sort()
        };
    });
}

function createCorpusRecord(unit, sense, context, options) {
    const identity = `${unit.id}|${sense.sense_id}|${context.collocation}`;
    const corpusReferences = [...context.evidence.values()].flatMap((references) => references.map((reference) => reference.sentence_id)).sort();
    return {
        enrichment_id: makeId(identity),
        lexical_unit_id: unit.id,
        sense_id: sense.sense_id,
        field: 'collocation',
        value: context.collocation,
        collocation: context.collocation,
        evidence_sentences: createEvidence(context),
        source: options.corpusSource,
        source_reference: { file_name: options.corpusSource, sha256: options.corpusHash, source_lines: [], corpus_references: corpusReferences },
        support_count: context.supportCount,
        corpus_group_count: context.corpusGroupCount,
        confidence: calculateConfidence(context),
        confidence_method: 'distinct_sentence_text_support_with_corpus_group_spread',
        verification_status: AUTO_STATUS,
        updated_at: options.updatedAt,
        exercise_eligible: false
    };
}

function recordKey(record) {
    const collocation = record.collocation || record.value;
    return `${record.lexical_unit_id}|${record.sense_id || ''}|${collocation}`;
}

function collectExistingKeys(existingRecords) {
    return new Set(existingRecords.filter((record) => record.field === 'collocation').map(recordKey));
}

function createBlockedExample(unit, reason) {
    return { lexical_unit_id: unit.id, surface_form: unit.surface_form, sense_ids: unit.senses.map((sense) => sense.sense_id), outcome: 'not_enriched', reason };
}

function processCollocations(units, tokenIndex, options, existingKeys) {
    const records = [];
    const audit = [];
    const reasonDistribution = createEmptyReasonDistribution();
    let duplicateCollocationCount = 0;
    let skippedSenseAmbiguityCount = 0;
    let skippedNeedsReviewCount = 0;
    let skippedInsufficientEvidenceCount = 0;
    let skippedNoExactCorpusEvidenceCount = 0;
    units.forEach((unit) => {
        const contexts = collectContexts(unit, tokenIndex);
        if (hasReview(unit)) {
            reasonDistribution.needs_review++;
            skippedNeedsReviewCount++;
            return;
        }
        if (contexts.length === 0) {
            reasonDistribution.no_exact_corpus_evidence++;
            skippedNoExactCorpusEvidenceCount++;
            audit.push(createBlockedExample(unit, 'no_exact_corpus_evidence'));
            return;
        }
        const supportedContexts = contexts.filter(meetsSupportThreshold);
        if (supportedContexts.length === 0) {
            reasonDistribution.insufficient_corpus_support++;
            skippedInsufficientEvidenceCount++;
            audit.push(createBlockedExample(unit, 'insufficient_corpus_support'));
            return;
        }
        const sense = getSingleSense(unit);
        if (!sense) {
            reasonDistribution.sense_ambiguity++;
            skippedSenseAmbiguityCount++;
            audit.push(createBlockedExample(unit, 'sense_ambiguity'));
            return;
        }
        supportedContexts.forEach((context) => {
            const record = createCorpusRecord(unit, sense, context, options);
            if (existingKeys.has(recordKey(record))) {
                duplicateCollocationCount++;
                return;
            }
            existingKeys.add(recordKey(record));
            records.push(record);
        });
    });
    return { records, audit, reasonDistribution, duplicateCollocationCount, skippedSenseAmbiguityCount, skippedNeedsReviewCount, skippedInsufficientEvidenceCount, skippedNoExactCorpusEvidenceCount };
}

function getExistingFieldUnits(existingRecords, field) {
    return new Set(existingRecords.filter((record) => record.field === field).map((record) => record.lexical_unit_id));
}

function calculateCoverage(field, eligibleUnits, allUnits, records, existingRecords) {
    const newUnits = new Set(records.filter((record) => record.field === field).map((record) => record.lexical_unit_id));
    const existingUnits = getExistingFieldUnits(existingRecords, field);
    const enrichedCount = newUnits.size;
    const eligibleCount = eligibleUnits.length;
    const coverage = eligibleCount === 0 ? 0 : Number(((enrichedCount / eligibleCount) * 100).toFixed(1));
    return {
        eligible_count: eligibleCount,
        enriched_count: enrichedCount,
        carried_forward_count: existingUnits.size,
        combined_enriched_count: new Set([...newUnits, ...existingUnits]).size,
        coverage,
        coverage_percent: `${coverage.toFixed(1)}%`,
        blocked_reason: field === 'collocation' ? 'see reason_distribution' : 'source_required',
        needs_review_count: getDomainUnits(field, allUnits).filter((unit) => hasReview(unit)).length
    };
}

function createAuditExamples(fields, artifact, eligibleByField, records, blockedAudit) {
    const auditExamples = {};
    fields.forEach((field) => {
        if (field === 'collocation') {
            const enriched = records.filter((record) => record.field === field).sort((left, right) => right.support_count - left.support_count).slice(0, MIN_AUDIT_EXAMPLES).map((record) => ({ ...record, outcome: 'enriched' }));
            auditExamples[field] = enriched;
            return;
        }
        const existing = eligibleByField[field].slice(0, MIN_AUDIT_EXAMPLES).map((unit) => createBlockedExample(unit, 'source_required'));
        auditExamples[field] = existing;
    });
    return auditExamples;
}

function createCoverageReport(artifact, records, existingRecords, processed, options) {
    const coverage = {};
    const eligibleByField = {};
    CORPUS_ENRICHMENT_FIELDS.forEach((field) => {
        eligibleByField[field] = getEligibleUnits(field, artifact.lexical_units);
        coverage[field] = calculateCoverage(field, eligibleByField[field], artifact.lexical_units, records, existingRecords);
    });
    const auditExamples = createAuditExamples(CORPUS_ENRICHMENT_FIELDS, artifact, eligibleByField, records, processed.audit);
    coverage.collocation.needs_review_count = processed.skippedNeedsReviewCount;
    return {
        schema_version: CORPUS_ENRICHMENT_SCHEMA_VERSION,
        enrichment_version: CORPUS_ENRICHMENT_VERSION,
        report_type: 'vocabulary-corpus-enrichment',
        generated_at: options.updatedAt,
        base_artifact: options.baseArtifact,
        corpus_source: { file_name: options.corpusSource, sha256: options.corpusHash, sentence_count: options.corpusRows.length },
        global_review_counts: {
            lexical_units: artifact.lexical_units.filter((unit) => unit.verification_status === REVIEW_STATUS).length,
            senses: artifact.lexical_units.flatMap((unit) => unit.senses).filter((sense) => sense.verification_status === REVIEW_STATUS).length
        },
        candidate_record_count: records.length,
        combined_candidate_record_count: existingRecords.length + records.length,
        enriched_lexical_unit_count: new Set(records.map((record) => record.lexical_unit_id)).size,
        enriched_sense_count: new Set(records.map((record) => record.sense_id)).size,
        duplicate_collocation_count: processed.duplicateCollocationCount,
        coverage,
        not_enriched_reason_distribution: {
            ...Object.fromEntries(CORPUS_ENRICHMENT_FIELDS.filter((field) => field !== 'collocation').map((field) => [field, { source_required: coverage[field].eligible_count, needs_review: getDomainUnits(field, artifact.lexical_units).filter((unit) => hasReview(unit)).length }])),
            collocation: processed.reasonDistribution
        },
        collocation: {
            candidate_collocation_count: records.length,
            lexical_unit_count: new Set(records.map((record) => record.lexical_unit_id)).size,
            sense_count: new Set(records.map((record) => record.sense_id)).size,
            confidence_distribution: countValues(records.map((record) => confidenceBucket(record.confidence))),
            skipped_sense_ambiguity_count: processed.skippedSenseAmbiguityCount,
            skipped_needs_review_count: processed.skippedNeedsReviewCount,
            skipped_insufficient_evidence_count: processed.skippedInsufficientEvidenceCount,
            skipped_no_exact_corpus_evidence_count: processed.skippedNoExactCorpusEvidenceCount,
            audit_example_count: auditExamples.collocation.length,
            audit_requirement_met: auditExamples.collocation.length >= MIN_AUDIT_EXAMPLES,
            minimum_support_count: MIN_SUPPORT_COUNT,
            support_rule: 'at least 3 distinct sentence texts and either 2 corpus groups or 5 distinct sentence texts'
        },
        audit_examples: auditExamples,
        qa: {
            status: records.every((record) => record.field === 'collocation' && record.sense_id && record.evidence_sentences.length > 0 && record.source && record.source_reference && record.verification_status === AUTO_STATUS && record.exercise_eligible === false) ? 'passed' : 'failed',
            all_records_have_evidence: records.every((record) => record.evidence_sentences.length > 0 && record.source_reference.corpus_references.length >= MIN_SUPPORT_COUNT),
            no_needs_review_emitted: records.every((record) => record.verification_status !== REVIEW_STATUS),
            no_scored_answer_records: records.every((record) => record.exercise_eligible === false)
        }
    };
}

/**
 * Flattens the repository sentence JSON into auditable corpus rows.
 * @param {object} corpus sentence JSON keyed by corpus group
 * @returns {Array<object>} corpus rows
 */
export function flattenSentenceCorpus(corpus) {
    if (!corpus || typeof corpus !== 'object' || Array.isArray(corpus)) throw new Error('Sentence corpus must be an object keyed by corpus group.');
    const rows = Object.entries(corpus).flatMap(([corpusKey, entries]) => entries.map((entry, index) => ({
        sentence_id: `${corpusKey}:${index + 1}`,
        corpus_key: corpusKey,
        source_index: index + 1,
        ru: entry.ru,
        tr: entry.tr || null
    })));
    validateCorpusRows(rows);
    return rows;
}

/**
 * Builds a corpus-only Phase 1B.2 overlay and coverage report.
 * @param {object} options corpus enrichment options
 * @returns {{overlay: object, report: object}}
 */
export function buildCorpusEnrichmentOverlay(options) {
    assertVocabularyArtifact(options.artifact);
    validateCorpusRows(options.corpusRows);
    const updatedAt = options.updatedAt || new Date().toISOString();
    const existingRecords = options.existingRecords || [];
    const processed = processCollocations(getEligibleUnits('collocation', options.artifact.lexical_units).concat(getDomainUnits('collocation', options.artifact.lexical_units).filter((unit) => hasReview(unit))), createTokenIndex(options.corpusRows), { corpusSource: options.corpusSource, corpusHash: options.corpusHash, updatedAt }, collectExistingKeys(existingRecords));
    const baseArtifact = options.baseArtifact || { schema_version: options.artifact.schema_version, import_batch_id: options.artifact.import_batch_id };
    const buildOptions = { updatedAt, corpusSource: options.corpusSource, corpusHash: options.corpusHash, corpusRows: options.corpusRows, baseArtifact };
    const overlay = {
        schema_version: CORPUS_ENRICHMENT_SCHEMA_VERSION,
        enrichment_version: CORPUS_ENRICHMENT_VERSION,
        artifact_type: 'vocabulary-corpus-enrichment',
        generated_at: updatedAt,
        base_artifact: baseArtifact,
        corpus_source: { file_name: options.corpusSource, sha256: options.corpusHash, sentence_count: options.corpusRows.length },
        records: processed.records
    };
    const report = createCoverageReport(options.artifact, processed.records, existingRecords, processed, buildOptions);
    assertCorpusEnrichmentOverlay(overlay);
    return { overlay, report };
}

/**
 * Validates corpus overlay records and their evidence contract.
 * @param {object} overlay corpus overlay
 * @returns {true}
 */
export function assertCorpusEnrichmentOverlay(overlay) {
    if (!overlay || overlay.schema_version !== CORPUS_ENRICHMENT_SCHEMA_VERSION || overlay.enrichment_version !== CORPUS_ENRICHMENT_VERSION) throw new Error('Unsupported corpus enrichment overlay version.');
    if (overlay.artifact_type !== 'vocabulary-corpus-enrichment' || !Array.isArray(overlay.records)) throw new Error('Invalid corpus enrichment overlay.');
    const identities = new Set();
    overlay.records.forEach((record) => {
        if (!record.enrichment_id || !record.lexical_unit_id || !record.sense_id || record.field !== 'collocation' || !record.collocation) throw new Error('Corpus collocation identity is invalid.');
        if (!Array.isArray(record.evidence_sentences) || record.evidence_sentences.length < MIN_SUPPORT_COUNT) throw new Error(`Corpus evidence is incomplete: ${record.enrichment_id}`);
        if (!record.source || !record.source_reference || !Array.isArray(record.source_reference.corpus_references)) throw new Error(`Corpus provenance is incomplete: ${record.enrichment_id}`);
        if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1 || !record.updated_at || record.verification_status !== AUTO_STATUS || record.exercise_eligible !== false) throw new Error(`Corpus enrichment is not safely gated: ${record.enrichment_id}`);
        const identity = recordKey(record);
        if (identities.has(identity)) throw new Error(`Duplicate corpus collocation: ${identity}`);
        identities.add(identity);
    });
    return true;
}
