const RUSSIAN_LETTERS = /[А-Яа-яЁё]/u;
const LATIN_LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşü]/u;
const PROVERB_PATTERNS = [
    /^Великие умы думают одинаково$/u,
    /^Один в поле не воин$/u,
    /^Копейка рубль бережёт$/u,
    /^Кто не работает$/u,
    /^тот не ест$/u
];
const EXPRESSION_PATTERNS = [
    /^Это не моё$/u,
    /^Можно себе позволить$/u,
    /^Терпеть не могу$/u,
    /^Рано или поздно$/u,
    /^В противном случае$/u,
    /^В первую очередь$/u,
    /^По моему мнению$/u,
    /^На мой взгляд$/u,
    /^С моей точки зрения$/u
];

export function normalizeSurface(value) {
    return String(value || '')
        .normalize('NFC')
        .replace(/[\u0300\u0301]/gu, '')
        .trim()
        .replace(/\s+/gu, ' ')
        .toLocaleLowerCase('ru');
}

export function normalizeDedupKey(value) {
    return normalizeSurface(value).replaceAll('ё', 'е');
}

export function detectSourceDirection(surfaceForm, targetText) {
    const sourceLanguage = RUSSIAN_LETTERS.test(surfaceForm) ? 'ru' : 'unknown';
    const targetLanguage = RUSSIAN_LETTERS.test(targetText) && !LATIN_LETTERS.test(targetText) ? 'ru' : 'tr';
    return `${sourceLanguage}→${targetLanguage}`;
}

export function classifyEntryType(surfaceForm) {
    if (surfaceForm.startsWith('...')) return { entryType: 'grammar_pattern', confidence: 'high' };
    if (surfaceForm.endsWith('-')) return { entryType: 'prefix_affix', confidence: 'high' };
    if (PROVERB_PATTERNS.some(pattern => pattern.test(surfaceForm))) return { entryType: 'proverb', confidence: 'high' };
    if (/[!?]$/u.test(surfaceForm) || /^(Я|Он|Она|Мне|Это|А ты|Чё)\b/u.test(surfaceForm)) {
        return { entryType: 'sentence', confidence: 'medium' };
    }
    if (EXPRESSION_PATTERNS.some(pattern => pattern.test(surfaceForm))) return { entryType: 'expression', confidence: 'medium' };
    if (/\s/u.test(surfaceForm)) return { entryType: 'phrase', confidence: 'medium' };
    return { entryType: 'lemma', confidence: 'high' };
}
