(function exposeErrorTaxonomy(root) {
    const ERROR_TYPES = Object.freeze([
        'verb.aspect',
        'verb.motion',
        'case.genitive',
        'case.dative',
        'case.accusative',
        'case.instrumental',
        'case.prepositional',
        'preposition',
        'government',
        'lexical-choice',
        'collocation',
        'word-order',
        'agreement',
        'spelling',
        'conjunction',
        'relative-clause',
        'recall.mismatch',
        'speaking.transcript_mismatch',
        'speaking.transcript_target_not_observed'
    ]);
    const DETECTION_METHODS = Object.freeze(['deterministic', 'reviewed', 'inferred']);
    const VERIFICATION_STATUSES = Object.freeze(['verified', 'candidate', 'unverified', 'needs_review']);
    const LIFECYCLE_STATUSES = Object.freeze(['active', 'resolved', 'dismissed']);
    const GRAMMAR_TOPICS = Object.freeze({
        'case.genitive': 'cases.genitive',
        'case.dative': 'cases.dative',
        'case.accusative': 'cases.accusative',
        'case.instrumental': 'cases.instrumental',
        'case.prepositional': 'cases.prepositional',
        'verb.aspect': 'verb.aspect',
        'verb.motion': 'verb.motion',
        preposition: 'government.preposition',
        government: 'government',
        spelling: 'spelling',
        'recall.mismatch': null,
        'speaking.transcript_mismatch': null,
        'speaking.transcript_target_not_observed': null
    });

    function assertSupported(value, values, label) {
        if (!values.includes(value)) throw new Error(`Unsupported ${label}: ${value}`);
        return value;
    }

    function assertErrorType(value) {
        return assertSupported(value, ERROR_TYPES, 'error type');
    }

    function assertDetectionMethod(value) {
        return assertSupported(value, DETECTION_METHODS, 'detection method');
    }

    function assertVerificationStatus(value) {
        return assertSupported(value, VERIFICATION_STATUSES, 'verification status');
    }

    function assertLifecycleStatus(value) {
        return assertSupported(value, LIFECYCLE_STATUSES, 'lifecycle status');
    }

    function getGrammarTopic(errorType) {
        assertErrorType(errorType);
        return GRAMMAR_TOPICS[errorType] ?? null;
    }

    root.ErrorTaxonomy = Object.freeze({
        VERSION: 1,
        ERROR_TYPES,
        DETECTION_METHODS,
        VERIFICATION_STATUSES,
        LIFECYCLE_STATUSES,
        GRAMMAR_TOPICS,
        assertErrorType,
        assertDetectionMethod,
        assertVerificationStatus,
        assertLifecycleStatus,
        getGrammarTopic
    });
})(typeof window !== 'undefined' ? window : globalThis);
