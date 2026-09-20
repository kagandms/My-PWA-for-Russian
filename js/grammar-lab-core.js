(function exposeGrammarLabCore(root) {
    const EDGE_PUNCTUATION = /^[.,!?;:…]+|[.,!?;:…]+$/gu;

    function normalizeAnswer(value) {
        return String(value ?? '')
            .normalize('NFC')
            .toLocaleLowerCase('ru-RU')
            .trim()
            .replace(/[«»„“”"']/gu, '')
            .replace(EDGE_PUNCTUATION, '')
            .replace(/\s+/gu, ' ')
            .replace(/ё/gu, 'е');
    }

    function evaluateAnswer({ exercise, userAnswer }) {
        const expectedAnswers = [...new Set((exercise.accepted_answers || []).map(String).map(answer => answer.trim()).filter(Boolean))];
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
        const matchedAnswer = expectedAnswers.find(answer => normalizeAnswer(answer) === normalizedUserAnswer);
        return {
            result: matchedAnswer ? 'correct' : 'incorrect',
            isCorrect: Boolean(matchedAnswer),
            matched_answer: matchedAnswer || null,
            user_answer: String(userAnswer ?? ''),
            expected_answers: expectedAnswers
        };
    }

    root.GrammarLabCore = Object.freeze({ normalizeAnswer, evaluateAnswer });
})(typeof window !== 'undefined' ? window : globalThis);
