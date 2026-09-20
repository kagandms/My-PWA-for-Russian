(function exposeSpeakingCore(root) {
    const CONTROLLED_PUNCTUATION = /[\p{P}\p{S}]/gu;
    const FINAL_TRANSCRIPT_STATE = 'final_result';
    const VALID_TRANSCRIPT_STATES = new Set([
        'final_result',
        'partial_only',
        'no_result',
        'error',
        'unavailable'
    ]);

    function normalizeTranscript(value) {
        return String(value ?? '')
            .normalize('NFC')
            .toLocaleLowerCase('ru-RU')
            .replace(/ё/gu, 'е')
            .replace(CONTROLLED_PUNCTUATION, ' ')
            .replace(/\s+/gu, ' ')
            .trim();
    }

    function tokenizeTranscript(value) {
        const normalized = normalizeTranscript(value);
        return normalized ? normalized.split(' ') : [];
    }

    function createAlignmentMatrix(expectedTokens, transcriptTokens) {
        const matrix = Array.from(
            { length: expectedTokens.length + 1 },
            () => Array(transcriptTokens.length + 1).fill(0)
        );

        for (let expectedIndex = 0; expectedIndex <= expectedTokens.length; expectedIndex += 1) {
            matrix[expectedIndex][0] = expectedIndex;
        }
        for (let transcriptIndex = 0; transcriptIndex <= transcriptTokens.length; transcriptIndex += 1) {
            matrix[0][transcriptIndex] = transcriptIndex;
        }
        for (let expectedIndex = 1; expectedIndex <= expectedTokens.length; expectedIndex += 1) {
            for (let transcriptIndex = 1; transcriptIndex <= transcriptTokens.length; transcriptIndex += 1) {
                const substitutionCost = expectedTokens[expectedIndex - 1] === transcriptTokens[transcriptIndex - 1]
                    ? 0
                    : 1;
                matrix[expectedIndex][transcriptIndex] = Math.min(
                    matrix[expectedIndex - 1][transcriptIndex] + 1,
                    matrix[expectedIndex][transcriptIndex - 1] + 1,
                    matrix[expectedIndex - 1][transcriptIndex - 1] + substitutionCost
                );
            }
        }
        return matrix;
    }

    function selectBacktrackOperation(matrix, expectedIndex, transcriptIndex, expectedTokens, transcriptTokens) {
        if (expectedIndex > 0 && transcriptIndex > 0) {
            const expectedToken = expectedTokens[expectedIndex - 1];
            const transcriptToken = transcriptTokens[transcriptIndex - 1];
            const diagonalCost = matrix[expectedIndex - 1][transcriptIndex - 1]
                + (expectedToken === transcriptToken ? 0 : 1);
            if (matrix[expectedIndex][transcriptIndex] === diagonalCost) {
                return {
                    type: expectedToken === transcriptToken ? 'match' : 'substitution',
                    expected_token: expectedToken,
                    transcript_token: transcriptToken,
                    next_expected_index: expectedIndex - 1,
                    next_transcript_index: transcriptIndex - 1
                };
            }
        }
        if (expectedIndex > 0 && matrix[expectedIndex][transcriptIndex] === matrix[expectedIndex - 1][transcriptIndex] + 1) {
            return {
                type: 'missing',
                expected_token: expectedTokens[expectedIndex - 1],
                next_expected_index: expectedIndex - 1,
                next_transcript_index: transcriptIndex
            };
        }
        return {
            type: 'extra',
            transcript_token: transcriptTokens[transcriptIndex - 1],
            next_expected_index: expectedIndex,
            next_transcript_index: transcriptIndex - 1
        };
    }

    function buildOperations(matrix, expectedTokens, transcriptTokens) {
        const operations = [];
        let expectedIndex = expectedTokens.length;
        let transcriptIndex = transcriptTokens.length;

        while (expectedIndex > 0 || transcriptIndex > 0) {
            const operation = selectBacktrackOperation(
                matrix,
                expectedIndex,
                transcriptIndex,
                expectedTokens,
                transcriptTokens
            );
            operations.unshift(operation);
            expectedIndex = operation.next_expected_index;
            transcriptIndex = operation.next_transcript_index;
        }
        return operations;
    }

    function resolveTranscriptState(options) {
        const transcriptState = options?.transcriptState ?? FINAL_TRANSCRIPT_STATE;
        if (!VALID_TRANSCRIPT_STATES.has(transcriptState)) {
            throw new Error('unsupported transcript state: ' + transcriptState);
        }
        return transcriptState;
    }

    function summarizeOperations(operations) {
        return {
            missing_tokens: operations
                .filter((operation) => operation.type === 'missing')
                .map((operation) => operation.expected_token),
            extra_tokens: operations
                .filter((operation) => operation.type === 'extra')
                .map((operation) => operation.transcript_token),
            substitutions: operations
                .filter((operation) => operation.type === 'substitution')
                .map((operation) => ({
                    expected_token: operation.expected_token,
                    transcript_token: operation.transcript_token
                }))
        };
    }

    function alignTranscript(expectedText, transcript, options = {}) {
        const expectedTokens = tokenizeTranscript(expectedText);
        const transcriptTokens = tokenizeTranscript(transcript);
        const transcriptState = resolveTranscriptState(options);
        const operations = buildOperations(
            createAlignmentMatrix(expectedTokens, transcriptTokens),
            expectedTokens,
            transcriptTokens
        );
        const summary = summarizeOperations(operations);
        const hasTranscript = transcriptTokens.length > 0;
        const isExact = operations.every((operation) => operation.type === 'match');
        const alignmentStatus = transcriptState === 'partial_only'
            ? 'partial'
            : !hasTranscript
                ? 'no_transcript'
                : isExact
                    ? 'exact'
                    : 'mismatch';

        return {
            expected_text: String(expectedText ?? ''),
            transcript: String(transcript ?? ''),
            normalized_expected: normalizeTranscript(expectedText),
            normalized_transcript: normalizeTranscript(transcript),
            expected_tokens: expectedTokens,
            transcript_tokens: transcriptTokens,
            transcript_state: transcriptState,
            observation_eligible: transcriptState === FINAL_TRANSCRIPT_STATE && hasTranscript,
            alignment_status: alignmentStatus,
            operations: operations.map((operation) => {
                const { next_expected_index, next_transcript_index, ...publicOperation } = operation;
                return publicOperation;
            }),
            ...summary
        };
    }

    function normalizeAcceptedForms(target) {
        const acceptedForms = Array.isArray(target.accepted_forms) ? target.accepted_forms : [];
        return [target.target_surface, ...acceptedForms]
            .filter((surface) => typeof surface === 'string' && surface.trim())
            .map(normalizeTranscript);
    }

    function containsTokenSequence(transcriptTokens, targetTokens) {
        if (targetTokens.length === 0 || targetTokens.length > transcriptTokens.length) return false;
        return transcriptTokens.some((_, start) => targetTokens.every(
            (token, index) => transcriptTokens[start + index] === token
        ));
    }

    function detectTargets(transcript, targets) {
        const transcriptTokens = tokenizeTranscript(transcript);
        const detected = (Array.isArray(targets) ? targets : []).map((target) => {
            const candidateForms = normalizeAcceptedForms(target);
            const observed = candidateForms.some((surface) => containsTokenSequence(
                transcriptTokens,
                surface ? surface.split(' ') : []
            ));
            return {
                lexical_unit_id: target.lexical_unit_id,
                sense_id: target.sense_id,
                target_surface: target.target_surface,
                observed,
                detection_method: 'exact_normalized_surface'
            };
        });
        return {
            normalized_transcript: normalizeTranscript(transcript),
            detected
        };
    }

    function transition(state, event) {
        const transitions = {
            idle: { REQUEST_PERMISSION: 'requesting_permission', UNSUPPORTED: 'unsupported' },
            requesting_permission: {
                PERMISSION_GRANTED: 'ready',
                PERMISSION_DENIED: 'permission_denied',
                UNSUPPORTED: 'unsupported',
                ERROR: 'error'
            },
            ready: {
                START: 'recording',
                PERMISSION_DENIED: 'permission_denied',
                UNSUPPORTED: 'unsupported',
                ERROR: 'error'
            },
            recording: {
                STOP: 'processing',
                CANCEL: 'idle',
                ERROR: 'error'
            },
            processing: {
                FINAL_RESULT: 'result',
                NO_RESULT: 'result',
                ERROR: 'error',
                CANCEL: 'idle'
            },
            result: { RESET: 'idle' },
            permission_denied: { RESET: 'idle' },
            unsupported: { RESET: 'idle' },
            error: { RESET: 'idle' }
        };
        const nextState = transitions[state]?.[event];
        if (!nextState) {
            throw new Error('invalid speaking transition: ' + state + ' + ' + event);
        }
        return nextState;
    }

    root.SpeakingCore = Object.freeze({
        normalizeTranscript,
        tokenizeTranscript,
        alignTranscript,
        detectTargets,
        transition
    });
})(typeof window !== 'undefined' ? window : globalThis);

