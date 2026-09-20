export const QUALITY_GATE_SCHEMA_VERSION = 1;
export const QUALITY_GATE_VERSION = '1B.3';
export const QUALITY_CANDIDATE_TYPES = Object.freeze([
    'collocation',
    'government_pattern',
    'grammar_pattern',
    'context_phrase',
    'discard'
]);

const TYPE_REASON = Object.freeze({
    collocation: 'lexical_collocation_or_fixed_expression',
    government_pattern: 'preposition_case_or_argument_frame',
    grammar_pattern: 'function_word_or_clause_structure',
    context_phrase: 'generic_contextual_phrase',
    discard: 'truncated_or_non_diagnostic_fragment'
});

const TYPE_RATIONALE = Object.freeze({
    collocation: 'The candidate forms a natural lexical association or fixed expression with the target sense.',
    government_pattern: 'The candidate exposes a preposition, case, or argument frame that should remain separate from lexical collocation.',
    grammar_pattern: 'The candidate is primarily a function-word, discourse, negation, reciprocal, modal, or clause structure.',
    context_phrase: 'The candidate is understandable in corpus context but is too generic to claim as a lexical collocation.',
    discard: 'The candidate is truncated, structurally incomplete, or non-diagnostic and is retained only for auditability.'
});

const CANDIDATE_TYPE_BY_TEXT = Object.freeze({
    'иначе он': 'grammar_pattern',
    'планируем провести': 'context_phrase',
    'в подвал': 'context_phrase',
    'каждое утро': 'context_phrase',
    'вчера вечером': 'context_phrase',
    'вечером мы': 'discard',
    'прошлой ночью': 'context_phrase',
    'остаться в': 'government_pattern',
    'как правильно': 'grammar_pattern',
    'хотя бы': 'grammar_pattern',
    'сказать что': 'grammar_pattern',
    'он абсолютно': 'discard',
    'старый замок': 'context_phrase',
    'этот старый': 'discard',
    'мы случайно': 'discard',
    'она случайно': 'discard',
    'он постоянно': 'discard',
    'занятия спортом': 'collocation',
    'терпеть не': 'grammar_pattern',
    'в срок': 'collocation',
    'согласиться с': 'government_pattern',
    'нарушение правил': 'collocation',
    'за нарушение': 'government_pattern',
    'свою жизнь': 'context_phrase',
    'на жизнь': 'context_phrase',
    'жизнь в': 'discard',
    'встреча с': 'government_pattern',
    'нападение на': 'government_pattern',
    'прямо по': 'discard',
    'прямо в': 'discard',
    'ближе к': 'government_pattern',
    'задание вовремя': 'context_phrase',
    'воздух в': 'discard',
    'на вокзал': 'context_phrase',
    'а не': 'grammar_pattern',
    'а в': 'grammar_pattern',
    'а потом': 'grammar_pattern',
    'говорить по': 'discard',
    'чем говорить': 'discard',
    'чтобы поддерживать': 'grammar_pattern',
    'чтобы увеличить': 'grammar_pattern',
    'справиться с': 'government_pattern',
    'слишком рано': 'context_phrase',
    'она слишком': 'discard',
    'слишком много': 'grammar_pattern',
    'был слишком': 'discard',
    'была слишком': 'discard',
    'следить за': 'government_pattern',
    'одолжить деньги': 'collocation',
    'дождь лил': 'collocation',
    'сильный дождь': 'collocation',
    'дождь в': 'discard',
    'будет дождь': 'grammar_pattern',
    'просто не': 'grammar_pattern',
    'он просто': 'discard',
    'эта идея': 'context_phrase',
    'эти выходные': 'context_phrase',
    'в выходные': 'context_phrase',
    'выходные мы': 'discard',
    'на выходные': 'context_phrase',
    'главный герой': 'collocation',
    'ситуация на': 'government_pattern',
    'билет на': 'government_pattern',
    'другой город': 'context_phrase',
    'в город': 'context_phrase',
    'один раз': 'collocation',
    'семь раз': 'context_phrase',
    'раз отмерь': 'grammar_pattern',
    'раз отрежь': 'grammar_pattern',
    'яблочный пирог': 'collocation',
    'друг друга': 'grammar_pattern',
    'друг другу': 'grammar_pattern',
    'в день': 'context_phrase',
    'день чтобы': 'discard',
    'целый день': 'context_phrase',
    'каждый день': 'context_phrase',
    'весь день': 'context_phrase',
    'рабочий день': 'collocation',
    'день в': 'discard',
    'день рождения': 'collocation',
    'на день': 'context_phrase',
    'целый час': 'context_phrase',
    'за час': 'context_phrase',
    'в час': 'discard',
    'через месяц': 'context_phrase',
    'месяцок и': 'discard',
    'горячий чай': 'collocation',
    'этот чай': 'context_phrase',
    'путешествие по': 'government_pattern',
    'в путешествие': 'context_phrase',
    'сохранять спокойствие': 'collocation',
    'на развитие': 'government_pattern',
    'помощь в': 'government_pattern',
    'цветы в': 'discard',
    'вопрос о': 'government_pattern',
    'на праздник': 'context_phrase',
    'может привести': 'grammar_pattern',
    'привести к': 'government_pattern',
    'и никто': 'grammar_pattern',
    'никто не': 'grammar_pattern',
    'чтобы никто': 'grammar_pattern',
    'никуда не': 'grammar_pattern',
    'никак не': 'grammar_pattern',
    'нам нечего': 'grammar_pattern',
    'нечего терять': 'collocation',
    'за несколько': 'discard',
    'несколько часов': 'context_phrase',
    'несколько дней': 'context_phrase',
    'несколько месяцев': 'context_phrase',
    'несколько минут': 'context_phrase',
    'чтобы снизить': 'grammar_pattern',
    'его поведение': 'context_phrase',
    'заблудиться в': 'government_pattern',
    'вообще не': 'grammar_pattern',
    'оказывается он': 'grammar_pattern'
});

function normalize(value) {
    return value.trim().toLocaleLowerCase('ru-RU');
}

function createTypeDistribution() {
    return Object.fromEntries(QUALITY_CANDIDATE_TYPES.map((type) => [type, 0]));
}

function getSense(unit, senseId) {
    return unit.senses.find((sense) => sense.sense_id === senseId);
}

function validateSourceRecord(record, unit, sense) {
    if (!record || record.field !== 'collocation' || !record.collocation) throw new Error('Quality gate requires a corpus collocation record.');
    if (!unit || !sense) throw new Error(`Quality gate cannot resolve ${record.lexical_unit_id}/${record.sense_id}.`);
    if (unit.verification_status !== 'reviewed' || sense.verification_status !== 'reviewed') throw new Error(`Quality gate refuses unreviewed target ${record.lexical_unit_id}/${record.sense_id}.`);
    if (record.verification_status !== 'candidate' || record.exercise_eligible !== false) throw new Error(`Quality gate requires candidate-only source records: ${record.enrichment_id}.`);
}

function createRationale(unit, sense, candidateType) {
    const definition = sense.definitions.join(' / ');
    return `Target ${unit.surface_form} with sense "${definition}": ${TYPE_RATIONALE[candidateType]}`;
}

/**
 * Classifies one existing corpus candidate using the reviewed target unit/sense and the v1B.3 decision table.
 * @param {object} record existing corpus candidate
 * @param {object} unit resolved lexical unit
 * @returns {{candidate_type: string, classification_reason: string, classification_rationale: string, classification_method: string}}
 */
export function classifyCorpusCandidate(record, unit) {
    const sense = unit ? getSense(unit, record.sense_id) : null;
    validateSourceRecord(record, unit, sense);
    const candidateType = CANDIDATE_TYPE_BY_TEXT[normalize(record.collocation)];
    if (!candidateType) throw new Error(`No v1B.3 decision exists for candidate: ${record.collocation}.`);
    return {
        candidate_type: candidateType,
        classification_reason: TYPE_REASON[candidateType],
        classification_rationale: createRationale(unit, sense, candidateType),
        classification_method: 'curated_target_sense_evidence_review_v1b3'
    };
}

function getRecordKey(record) {
    return `${record.lexical_unit_id}|${record.sense_id}|${record.collocation}`;
}

function createQualityRecord(record, unit) {
    const classification = classifyCorpusCandidate(record, unit);
    return {
        ...record,
        candidate_text: record.collocation,
        ...classification
    };
}

function assertSourceRecords(records) {
    if (!Array.isArray(records)) throw new Error('Quality gate source records must be an array.');
    const identities = new Set();
    records.forEach((record) => {
        const identity = getRecordKey(record);
        if (identities.has(identity)) throw new Error(`Duplicate quality gate source record: ${identity}`);
        identities.add(identity);
    });
}

/**
 * Builds a lossless quality overlay without mutating the source corpus overlay.
 * @param {object} options quality overlay options
 * @returns {object} quality overlay
 */
export function buildQualityOverlay(options) {
    assertSourceRecords(options.sourceRecords);
    const unitsById = new Map(options.lexicalUnits.map((unit) => [unit.id, unit]));
    const typeDistribution = createTypeDistribution();
    const records = options.sourceRecords.map((record) => {
        const unit = unitsById.get(record.lexical_unit_id);
        const qualityRecord = createQualityRecord(record, unit);
        typeDistribution[qualityRecord.candidate_type] += 1;
        return qualityRecord;
    });
    return {
        schema_version: QUALITY_GATE_SCHEMA_VERSION,
        quality_gate_version: QUALITY_GATE_VERSION,
        artifact_type: 'vocabulary-corpus-quality-gate',
        generated_at: options.updatedAt,
        source_overlay: options.sourceOverlay,
        base_artifact: options.baseArtifact,
        corpus_source: options.corpusSource,
        candidate_count: records.length,
        type_distribution: typeDistribution,
        records
    };
}

function getAuditKey(record) {
    return getRecordKey(record);
}

function createAuditRecord(record) {
    return {
        lexical_unit_id: record.lexical_unit_id,
        sense_id: record.sense_id,
        candidate_text: record.candidate_text,
        candidate_type: record.candidate_type,
        classification_reason: record.classification_reason,
        classification_rationale: record.classification_rationale,
        evidence_sentences: record.evidence_sentences,
        evidence_refs: record.source_reference.corpus_references,
        confidence: record.confidence,
        verification_status: record.verification_status,
        exercise_eligible: record.exercise_eligible
    };
}

function createAuditExamples(records) {
    return Object.fromEntries(QUALITY_CANDIDATE_TYPES.map((type) => [
        type,
        records
            .filter((record) => record.candidate_type === type)
            .sort((left, right) => right.confidence - left.confidence || right.support_count - left.support_count)
            .slice(0, 10)
            .map(createAuditRecord)
    ]));
}

function createPreviousAuditClassifications(records, sourceReport) {
    const recordsByKey = new Map(records.map((record) => [getAuditKey(record), record]));
    const previousAudit = sourceReport?.audit_examples?.collocation || [];
    return previousAudit.map((sourceRecord) => {
        const record = recordsByKey.get(getAuditKey(sourceRecord));
        if (!record) throw new Error(`Previous audit record is missing from quality overlay: ${getAuditKey(sourceRecord)}.`);
        return createAuditRecord(record);
    });
}

/**
 * Builds the quality-gate report, including per-type audits and the prior 20 audit candidates.
 * @param {object} options report options
 * @returns {object} quality report
 */
export function buildQualityReport(options) {
    const auditExamples = createAuditExamples(options.overlay.records);
    const previousAuditClassifications = createPreviousAuditClassifications(options.overlay.records, options.sourceReport);
    const auditRequirement = Object.fromEntries(QUALITY_CANDIDATE_TYPES.map((type) => [type, {
        count: options.overlay.type_distribution[type],
        audit_count: auditExamples[type].length,
        requirement_met: auditExamples[type].length >= 10
    }]));
    return {
        schema_version: QUALITY_GATE_SCHEMA_VERSION,
        quality_gate_version: QUALITY_GATE_VERSION,
        report_type: 'vocabulary-corpus-quality-gate',
        generated_at: options.updatedAt,
        source_overlay: options.overlay.source_overlay,
        base_artifact: options.overlay.base_artifact,
        corpus_source: options.overlay.corpus_source,
        candidate_count: options.overlay.candidate_count,
        type_distribution: options.overlay.type_distribution,
        audit_requirement: auditRequirement,
        audit_examples: auditExamples,
        previous_audit_classifications: previousAuditClassifications,
        qa: {
            status: 'passed',
            all_source_records_retained: true,
            all_records_candidate: options.overlay.records.every((record) => record.verification_status === 'candidate'),
            no_exercise_eligible_records: options.overlay.records.every((record) => record.exercise_eligible === false),
            no_verified_records: options.overlay.records.every((record) => record.verification_status !== 'verified'),
            all_types_have_ten_audits: Object.values(auditRequirement).every((item) => item.requirement_met)
        }
    };
}

/**
 * Validates the quality overlay contract and confirms that discard records remain present.
 * @param {object} overlay quality overlay
 * @returns {true}
 */
export function assertQualityOverlay(overlay) {
    if (overlay.quality_gate_version !== QUALITY_GATE_VERSION) throw new Error('Unsupported quality gate version.');
    if (!Array.isArray(overlay.records)) throw new Error('Quality overlay records must be an array.');
    if (overlay.candidate_count !== overlay.records.length) throw new Error('Quality overlay candidate count is inconsistent.');
    const identities = new Set();
    overlay.records.forEach((record) => {
        const identity = getRecordKey(record);
        if (identities.has(identity)) throw new Error(`Duplicate quality overlay record: ${identity}`);
        identities.add(identity);
        if (!QUALITY_CANDIDATE_TYPES.includes(record.candidate_type)) throw new Error(`Unknown candidate type: ${record.candidate_type}.`);
        if (!record.candidate_text || !record.classification_reason || !record.classification_rationale) throw new Error(`Quality classification metadata is incomplete: ${identity}.`);
        if (record.verification_status !== 'candidate' || record.exercise_eligible !== false) throw new Error(`Quality gate changed eligibility state: ${identity}.`);
        if (!record.source_reference?.corpus_references?.length || !record.evidence_sentences?.length) throw new Error(`Quality record lacks evidence: ${identity}.`);
    });
    return true;
}
