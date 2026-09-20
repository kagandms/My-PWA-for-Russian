(function exposeProductionCore(root) {
    const CONTROLLED_PUNCTUATION = /[«»„“”"'.,!?;:…()[\]{}]/gu;

    function normalizeText(value) {
        return String(value ?? '')
            .normalize('NFC')
            .toLocaleLowerCase('ru-RU')
            .replace(/ё/gu, 'е')
            .replace(CONTROLLED_PUNCTUATION, ' ')
            .replace(/\s+/gu, ' ')
            .trim();
    }

    function tokenize(value) {
        const normalized = normalizeText(value);
        return normalized ? normalized.split(' ') : [];
    }

    function containsTokenSequence(tokens, targetTokens) {
        if (targetTokens.length === 0 || targetTokens.length > tokens.length) return false;
        for (let start = 0; start <= tokens.length - targetTokens.length; start += 1) {
            const candidate = tokens.slice(start, start + targetTokens.length);
            if (candidate.every((token, index) => token === targetTokens[index])) return true;
        }
        return false;
    }

    function evaluateTargetPresence({ targetForm, userAnswer }) {
        const normalizedTarget = normalizeText(targetForm);
        const normalizedAnswer = normalizeText(userAnswer);
        const baseResult = {
            target_form: String(targetForm ?? ''),
            user_answer: String(userAnswer ?? ''),
            normalized_target: normalizedTarget,
            normalized_answer: normalizedAnswer
        };

        if (!normalizedTarget) return { ...baseResult, result: 'needs_review' };
        if (!normalizedAnswer) return { ...baseResult, result: 'empty_answer' };
        const result = containsTokenSequence(tokenize(normalizedAnswer), tokenize(normalizedTarget))
            ? 'completed'
            : 'target_not_detected';
        return { ...baseResult, result };
    }

    root.ProductionCore = Object.freeze({ normalizeText, evaluateTargetPresence });
})(typeof window !== 'undefined' ? window : globalThis);
