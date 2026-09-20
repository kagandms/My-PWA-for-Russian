(function exposeTypedRecallCore(root) {
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

    function uniqueAnswers(answers) {
        return [...new Set((answers || []).map(answer => String(answer).trim()).filter(Boolean))];
    }

    function getNormalizedAnswers(answers) {
        return uniqueAnswers(answers).map(answer => ({ answer, normalized: normalizeAnswer(answer) }));
    }

    function calculateEditDistance(left, right) {
        const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
        for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
            const current = [leftIndex];
            for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
                const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
                current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, substitution);
            }
            previous.splice(0, previous.length, ...current);
        }
        return previous[right.length];
    }

    function createResult(question, userAnswer, result, details = {}) {
        return {
            result,
            isCorrect: result === 'correct',
            target_sense_id: question.sense_id,
            user_answer: String(userAnswer ?? ''),
            expected_answers: uniqueAnswers(question.accepted_answers),
            sense_prompt: question.prompt || '',
            ...details
        };
    }

    function evaluateAnswer({ question, userAnswer }) {
        const targetAnswers = getNormalizedAnswers(question.accepted_answers);
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
        const targetMatch = targetAnswers.find(item => item.normalized === normalizedUserAnswer);
        if (targetMatch) {
            return createResult(question, userAnswer, 'correct', {
                matched_answer: targetMatch.answer,
                matched_sense_id: question.sense_id
            });
        }

        const otherSense = (question.other_senses || []).find(sense => (
            getNormalizedAnswers(sense.accepted_answers).some(item => item.normalized === normalizedUserAnswer)
        ));
        if (otherSense) {
            return createResult(question, userAnswer, 'valid_other_sense', {
                matched_sense_id: otherSense.sense_id
            });
        }

        const typoMatch = targetAnswers.find(item => (
            normalizedUserAnswer.length > 0
            && calculateEditDistance(item.normalized, normalizedUserAnswer) === 1
        ));
        if (typoMatch) {
            return createResult(question, userAnswer, 'almost_correct', {
                matched_answer: typoMatch.answer,
                typo: true,
                reason: 'typo'
            });
        }

        return createResult(question, userAnswer, 'incorrect');
    }

    root.TypedRecallCore = Object.freeze({ normalizeAnswer, evaluateAnswer });
})(typeof window !== 'undefined' ? window : globalThis);
