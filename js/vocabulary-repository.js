/**
 * Versioned vocabulary access boundary. Legacy consumers receive data only
 * through buildLegacyWords; the canonical JSON objects stay inside this layer.
 */

(function exposeVocabularyRepository(root) {
    const DEFAULT_PATHS = Object.freeze({
        base: 'data/vocabulary/lexical-units.v1.json',
        reviewed: 'data/vocabulary/enrichment.v1b.json',
        corpus: 'data/vocabulary/enrichment-corpus.v1b.json',
        quality: 'data/vocabulary/enrichment-corpus-quality.v1b3.json',
        identity: 'data/vocabulary/legacy-identity-map.v1.json'
    });
    const QUALITY_FIELDS = new Set([
        'candidate_text',
        'candidate_type',
        'classification_reason',
        'classification_rationale',
        'classification_method'
    ]);
    const PROTECTED_BASE_FIELDS = new Set([
        'definitions',
        'meaning_notes',
        'register',
        'domain',
        'examples',
        'collocations',
        'relations',
        'raw_entry',
        'raw_entries',
        'entry_type',
        'surface_form',
        'lemma'
    ]);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeLookupValue(value) {
        return String(value || '').trim().toLocaleLowerCase('ru-RU');
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) throw new Error(`${name} must be an array.`);
    }

    function validateUniqueId(map, id, label) {
        if (!id || map.has(id)) throw new Error(`Duplicate or missing ${label}: ${id || 'unknown'}`);
        if (typeof map.set === 'function') {
            map.set(id, true);
            return;
        }
        map.add(id);
    }

    function validateRelation(relation, lexicalUnitIds, senseIds) {
        if (relation.target_lexical_unit_id && !lexicalUnitIds.has(relation.target_lexical_unit_id)) {
            throw new Error(`Dangling relation lexical unit: ${relation.target_lexical_unit_id}`);
        }
        if (relation.target_sense_id && !senseIds.has(relation.target_sense_id)) {
            throw new Error(`Dangling relation sense: ${relation.target_sense_id}`);
        }
    }

    function validateBaseArtifact(artifact) {
        if (!artifact || artifact.schema_version !== 1) throw new Error('Unsupported vocabulary schema version.');
        requireArray(artifact.lexical_units, 'lexical_units');
        const lexicalUnitIds = new Map();
        const senseIds = new Map();
        for (const unit of artifact.lexical_units) {
            validateUniqueId(lexicalUnitIds, unit.id, 'lexical unit ID');
            if (!unit.entry_type || !unit.surface_form) throw new Error(`Invalid lexical unit: ${unit.id}`);
            requireArray(unit.senses, `senses for ${unit.id}`);
            for (const sense of unit.senses) validateUniqueId(senseIds, sense.sense_id, 'sense ID');
        }
        for (const unit of artifact.lexical_units) {
            for (const relation of unit.relations || []) validateRelation(relation, lexicalUnitIds, senseIds);
            for (const sense of unit.senses) {
                for (const relation of sense.relations || []) validateRelation(relation, lexicalUnitIds, senseIds);
            }
        }
        return { lexicalUnitIds, senseIds };
    }

    function validateOverlay(overlay, label, lexicalUnitIds, senseIds, baseArtifact) {
        if (!overlay || overlay.schema_version !== 1) throw new Error(`Unsupported ${label} schema version.`);
        const expectedSourceHash = overlay.base_artifact?.source_sha256;
        if (expectedSourceHash && expectedSourceHash !== baseArtifact.source?.sha256) {
            throw new Error(`${label} belongs to a different base source.`);
        }
        const expectedBatchId = overlay.base_artifact?.import_batch_id;
        if (expectedBatchId && expectedBatchId !== baseArtifact.import_batch_id) {
            throw new Error(`${label} belongs to a different import batch.`);
        }
        requireArray(overlay.records, `${label}.records`);
        const recordIds = new Set();
        for (const record of overlay.records) {
            validateUniqueId(recordIds, record.enrichment_id, `${label} enrichment ID`);
            if (!lexicalUnitIds.has(record.lexical_unit_id)) throw new Error(`${label} references unknown lexical unit.`);
            if (record.sense_id && !senseIds.has(record.sense_id)) throw new Error(`${label} references unknown sense.`);
        }
        return recordIds;
    }

    function validateIdentityMap(identity, lexicalUnitIds, senseIds, baseArtifact) {
        if (!identity || identity.schema_version !== 1 || identity.mapping_version !== '1C') {
            throw new Error('Unsupported identity-map schema version.');
        }
        if (identity.source?.sha256 !== baseArtifact.source?.sha256) {
            throw new Error('Identity map belongs to a different base source.');
        }
        if (identity.base_artifact?.lexical_unit_count !== lexicalUnitIds.size) {
            throw new Error('Identity map lexical unit count does not match the base artifact.');
        }
        requireArray(identity.entries, 'identity.entries');
        const legacyIds = new Set();
        const legacyIndexes = new Set();
        for (const entry of identity.entries) {
            validateUniqueId(legacyIds, String(entry.legacy_id), 'legacy identity');
            validateUniqueId(legacyIndexes, String(entry.legacy_index), 'legacy index');
            if (!['matched', 'ambiguous', 'unmapped'].includes(entry.status)) {
                throw new Error(`Unsupported identity status: ${entry.status}`);
            }
            if (entry.status === 'matched' && !lexicalUnitIds.has(entry.lexical_unit_id)) {
                throw new Error('Identity map references unknown lexical unit.');
            }
            for (const senseId of entry.sense_ids || []) {
                if (!senseIds.has(senseId)) throw new Error('Identity map references unknown sense.');
            }
        }
    }

    async function fetchJson(filePath, fetchImpl) {
        const response = await fetchImpl(filePath);
        if (!response?.ok) throw new Error(`Vocabulary artifact request failed: ${filePath} (${response?.status || 'unknown'})`);
        return response.json();
    }

    function mergeQualityRecord(record, qualityRecord, conflicts) {
        for (const key of Object.keys(qualityRecord)) {
            if (QUALITY_FIELDS.has(key)) continue;
            if (key !== 'enrichment_id' && JSON.stringify(record[key]) !== JSON.stringify(qualityRecord[key])) {
                conflicts.push({ enrichment_id: record.enrichment_id, field: key, base: record[key], overlay: qualityRecord[key] });
            }
        }
        for (const key of QUALITY_FIELDS) {
            if (qualityRecord[key] !== undefined) record[key] = qualityRecord[key];
        }
        record.quality_overlay = 'enrichment-corpus-quality.v1b3';
    }

    function composeEnrichment(reviewed, corpus, quality) {
        const records = new Map();
        const conflicts = [];
        for (const overlay of [reviewed, corpus]) {
            for (const record of overlay.records) {
                if (records.has(record.enrichment_id)) {
                    conflicts.push({ enrichment_id: record.enrichment_id, field: 'record', reason: 'duplicate_overlay_record' });
                    continue;
                }
                const safeRecord = cloneValue(record);
                for (const field of PROTECTED_BASE_FIELDS) {
                    if (!(field in safeRecord)) continue;
                    conflicts.push({ enrichment_id: record.enrichment_id, field, reason: 'base_field_overwrite_blocked' });
                    delete safeRecord[field];
                }
                records.set(record.enrichment_id, { ...safeRecord, source_overlay: overlay.artifact_type });
            }
        }
        for (const qualityRecord of quality.records) {
            const record = records.get(qualityRecord.enrichment_id);
            if (!record) {
                records.set(qualityRecord.enrichment_id, { ...cloneValue(qualityRecord), source_overlay: quality.artifact_type });
                continue;
            }
            mergeQualityRecord(record, qualityRecord, conflicts);
        }
        return { records: [...records.values()], conflicts };
    }

    function isTypedRecallEligible(unit, sense) {
        return Boolean(
            unit?.exercise_eligible === true
            && unit.verification_status !== 'needs_review'
            && sense?.exercise_eligible === true
            && sense.verification_status !== 'needs_review'
            && sense.source_direction === 'ru→tr'
            && Array.isArray(sense.definitions)
            && sense.definitions.length > 0
        );
    }

    function buildCanonicalAnswers(unit) {
        const answer = unit.lemma || unit.surface_form;
        return answer ? [answer] : [];
    }

    function buildTypedRecallQuestion(unit, sense, otherSenses) {
        return {
            lexical_unit_id: unit.id,
            sense_id: sense.sense_id,
            prompt: sense.definitions.join('; '),
            accepted_answers: buildCanonicalAnswers(unit),
            other_senses: otherSenses.map(otherSense => ({
                sense_id: otherSense.sense_id,
                accepted_answers: buildCanonicalAnswers(unit)
            })),
            entry_type: unit.entry_type
        };
    }

    function buildProductionExercise(unit, sense) {
        const targetForm = unit.lemma || unit.surface_form;
        return {
            exercise_id: `exercise:${unit.id}:${sense.sense_id}:target_word_sentence`,
            lexical_unit_id: unit.id,
            sense_id: sense.sense_id,
            skill: 'production',
            exercise_type: 'target_word_sentence',
            prompt: sense.definitions.join('; '),
            target_form: targetForm,
            entry_type: unit.entry_type,
            exercise_eligible: true
        };
    }

    function createDiagnostics() {
        return { mode: 'uninitialized', fallback_reason: null, error: null, conflicts: [] };
    }

    class VocabularyRepository {
        constructor(options = {}) {
            const config = root.VOCABULARY_RUNTIME_CONFIG || {};
            this.paths = { ...DEFAULT_PATHS, ...(options.paths || {}) };
            this.enabled = options.enabled ?? config.USE_VOCABULARY_V1 !== false;
            this.fetchImpl = options.fetchImpl || (typeof root.fetch === 'function' ? root.fetch.bind(root) : null);
            this.logger = options.logger || root.console || console;
            this.diagnostics = createDiagnostics();
            this.loaded = false;
            this.base = null;
            this.identity = null;
            this.unitsById = new Map();
            this.sensesById = new Map();
            this.unitsBySurface = new Map();
            this.unitsByLemma = new Map();
            this.enrichment = { records: [], conflicts: [] };
        }

        isEnabled() {
            return this.enabled;
        }

        getDiagnostics() {
            return cloneValue(this.diagnostics);
        }

        async load() {
            if (!this.enabled) {
                this.diagnostics = { ...createDiagnostics(), mode: 'legacy', fallback_reason: 'feature_disabled' };
                return false;
            }
            if (this.loaded) return true;
            try {
                const fetchImpl = this.fetchImpl || (typeof fetch === 'function' ? fetch : null);
                if (!fetchImpl) throw new Error('Fetch API is unavailable.');
                const payloads = await this.fetchArtifacts(fetchImpl);
                this.installPayloads(payloads);
                this.diagnostics = { mode: 'v1', fallback_reason: null, error: null, conflicts: this.enrichment.conflicts };
                this.loaded = true;
                return true;
            } catch (error) {
                this.diagnostics = { ...createDiagnostics(), mode: 'error', error: error.message };
                this.logger.error('Vocabulary v1 runtime fallback:', error);
                return false;
            }
        }

        async fetchArtifacts(fetchImpl) {
            const keys = Object.keys(this.paths);
            const values = await Promise.all(keys.map(key => fetchJson(this.paths[key], fetchImpl)));
            return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
        }

        installPayloads(payloads) {
            const indexes = validateBaseArtifact(payloads.base);
            validateOverlay(payloads.reviewed, 'reviewed enrichment', indexes.lexicalUnitIds, indexes.senseIds, payloads.base);
            validateOverlay(payloads.corpus, 'corpus enrichment', indexes.lexicalUnitIds, indexes.senseIds, payloads.base);
            validateOverlay(payloads.quality, 'quality overlay', indexes.lexicalUnitIds, indexes.senseIds, payloads.base);
            validateIdentityMap(payloads.identity, indexes.lexicalUnitIds, indexes.senseIds, payloads.base);
            this.base = cloneValue(payloads.base);
            this.identity = cloneValue(payloads.identity);
            this.enrichment = composeEnrichment(payloads.reviewed, payloads.corpus, payloads.quality);
            this.indexBase(this.base);
        }

        indexBase(artifact) {
            this.unitsById.clear();
            this.sensesById.clear();
            this.unitsBySurface.clear();
            this.unitsByLemma.clear();
            for (const unit of artifact.lexical_units) {
                this.unitsById.set(unit.id, unit);
                this.addLookup(this.unitsBySurface, unit.surface_form, unit);
                if (unit.lemma) this.addLookup(this.unitsByLemma, unit.lemma, unit);
                for (const sense of unit.senses) this.sensesById.set(sense.sense_id, sense);
            }
        }

        addLookup(index, value, unit) {
            const key = normalizeLookupValue(value);
            const units = index.get(key) || [];
            units.push(unit);
            index.set(key, units);
        }

        getLexicalUnit(id) {
            return cloneValue(this.unitsById.get(id) || null);
        }

        getSense(id) {
            return cloneValue(this.sensesById.get(id) || null);
        }

        getSensesForLexicalUnit(id) {
            return [...(this.unitsById.get(id)?.senses || [])].map(cloneValue);
        }

        findBySurfaceForm(text) {
            return (this.unitsBySurface.get(normalizeLookupValue(text)) || []).map(cloneValue);
        }

        findByLemma(lemma) {
            return (this.unitsByLemma.get(normalizeLookupValue(lemma)) || []).map(cloneValue);
        }

        getRelations(id) {
            const unit = this.unitsById.get(id);
            if (unit) return cloneValue([...unit.relations, ...unit.senses.flatMap(sense => sense.relations || [])]);
            return cloneValue(this.sensesById.get(id)?.relations || []);
        }

        getEnrichment(lexicalUnitId, senseId) {
            const records = this.enrichment.records.filter(record => (
                record.lexical_unit_id === lexicalUnitId
                && (!senseId || !record.sense_id || record.sense_id === senseId)
            ));
            return { records: cloneValue(records), conflicts: cloneValue(this.enrichment.conflicts) };
        }

        getExerciseEligibleData(lexicalUnitId, senseId) {
            const lexicalUnit = this.unitsById.get(lexicalUnitId);
            const sense = senseId ? this.sensesById.get(senseId) : null;
            const senseBelongsToUnit = !senseId || lexicalUnit?.senses.some(item => item.sense_id === senseId);
            const baseEligible = lexicalUnit?.exercise_eligible === true
                && lexicalUnit.verification_status !== 'needs_review'
                && senseBelongsToUnit
                && (!sense || (sense.exercise_eligible === true && sense.verification_status !== 'needs_review'));
            const eligible = baseEligible ? this.getEnrichment(lexicalUnitId, senseId).records.filter(record => (
                record.verification_status === 'verified' && record.exercise_eligible === true
            )) : [];
            return {
                lexicalUnit: this.getLexicalUnit(lexicalUnitId),
                sense: senseId ? this.getSense(senseId) : null,
                enrichment: eligible
            };
        }

        getTypedRecallQuestions() {
            const questions = [];
            for (const unit of this.unitsById.values()) {
                const eligibleSenses = unit.senses.filter(sense => isTypedRecallEligible(unit, sense));
                for (const sense of eligibleSenses) {
                    questions.push(buildTypedRecallQuestion(
                        unit,
                        sense,
                        eligibleSenses.filter(otherSense => otherSense.sense_id !== sense.sense_id)
                    ));
                }
            }
            return cloneValue(questions);
        }

        getProductionExercises() {
            const exercises = [];
            for (const unit of this.unitsById.values()) {
                const eligibleSenses = unit.senses.filter(sense => isTypedRecallEligible(unit, sense));
                for (const sense of eligibleSenses) exercises.push(buildProductionExercise(unit, sense));
            }
            return cloneValue(exercises);
        }

        buildLegacyWords(options) {
            if (!this.identity) throw new Error('Identity map is not loaded.');
            return [...this.identity.entries]
                .sort((left, right) => left.legacy_index - right.legacy_index)
                .map(entry => this.buildLegacyWord(entry, options));
        }

        buildLegacyWord(entry, options) {
            const sentences = options.sentencesDb?.[String(entry.legacy_id)] || [];
            const word = {
                id: entry.legacy_id,
                russian: entry.russian,
                turkish: entry.turkish,
                sourceLineNumber: entry.source_line_number,
                category: options.categoryResolver({ russian: entry.russian, turkish: entry.turkish }, entry.source_line_number),
                example: sentences.length > 0 ? { russian: sentences[0].ru, turkish: sentences[0].tr } : { russian: '', turkish: '' },
                sentences,
                lexicalUnitId: entry.lexical_unit_id,
                senseIds: [...(entry.sense_ids || [])],
                entryType: entry.entry_type,
                identityStatus: entry.status
            };
            word.key = options.storageKeyBuilder ? options.storageKeyBuilder(word) : String(word.id);
            return word;
        }
    }

    root.VocabularyRepository = VocabularyRepository;
    root.createVocabularyRepository = options => new VocabularyRepository(options);
    root.vocabularyRepository = new VocabularyRepository();
})(typeof window !== 'undefined' ? window : globalThis);
