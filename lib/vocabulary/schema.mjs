export const SCHEMA_VERSION = 1;

export const ENTRY_TYPES = Object.freeze([
    'lemma',
    'phrase',
    'expression',
    'sentence',
    'proverb',
    'prefix_affix',
    'grammar_pattern'
]);

export const VERIFICATION_STATUSES = Object.freeze([
    'raw',
    'parsed',
    'normalized',
    'reviewed',
    'unverified',
    'needs_review',
    'active',
    'rejected'
]);

export const RELATION_TYPES = Object.freeze([
    'synonym',
    'near_synonym',
    'antonym',
    'related',
    'word_family'
]);

export function assertVocabularyArtifact(artifact) {
    if (!artifact || artifact.schema_version !== SCHEMA_VERSION) throw new Error('Unsupported vocabulary schema version.');
    if (!Array.isArray(artifact.lexical_units)) throw new Error('Vocabulary artifact must contain lexical_units.');
    for (const unit of artifact.lexical_units) {
        if (!unit.id || !unit.entry_type || !unit.surface_form || !Array.isArray(unit.senses)) {
            throw new Error(`Invalid lexical unit: ${unit?.id || 'unknown'}`);
        }
        if (!ENTRY_TYPES.includes(unit.entry_type)) throw new Error(`Unsupported entry type: ${unit.entry_type}`);
    }
    return true;
}
