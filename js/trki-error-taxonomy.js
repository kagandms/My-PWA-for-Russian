(function exposeTrkiErrorTaxonomy(root) {
    const ERROR_TYPES = Object.freeze([
        'trki.grammar.case.genitive',
        'trki.grammar.aspect',
        'trki.lexicon.choice',
        'trki.reading.inference',
        'trki.word_formation'
    ]);

    function assertErrorType(value) {
        if (!ERROR_TYPES.includes(value)) throw new Error(`Unsupported TRKI error type: ${value}`);
        return value;
    }

    root.TrkiErrorTaxonomy = Object.freeze({
        VERSION: 1,
        ERROR_TYPES,
        assertErrorType,
        getGrammarTopic: () => null
    });
})(typeof window !== 'undefined' ? window : globalThis);
