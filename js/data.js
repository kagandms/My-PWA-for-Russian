/**
 * Kelime Verileri - kelimeler_tam_strict.txt dosyasından yüklenir
 */

let WORDS = [];
Object.defineProperty(window, 'WORDS', {
    configurable: true,
    get() {
        return WORDS;
    }
});

/**
 * Returns the curated source-line category.
 */
function getWordCategory(word, sourceLineNumber) {
    return window.wordCategoryManager?.getCategory(word, sourceLineNumber) || 'Kategorize Edilmemiş';
}

/**
 * Adds locally stored user words after the curated source is parsed.
 */
function appendUserWords() {
    if (!window.userWordsManager) return;

    WORDS.push(...window.userWordsManager.buildWords());
}

/**
 * Removes words that the user sent to the trash from every study mode.
 */
function filterDeletedWords() {
    if (!window.trashManager) return;

    WORDS = WORDS.filter(word => !window.trashManager.isDeleted(word));
}

function recordRuntimeFallback(reason, error) {
    const diagnostic = window.vocabularyRepository?.getDiagnostics?.() || {};
    const message = error?.message || diagnostic.error || reason;
    window.vocabularyRuntimeDiagnostics = {
        ...diagnostic,
        mode: 'legacy',
        fallback_reason: reason,
        fallback_error: message
    };
    console.error('Vocabulary v1 fallback to legacy source:', reason, error || diagnostic.error || 'unknown error');
}

async function loadSentenceDatabase() {
    const response = await fetch('sentences_strict.json').catch(() => null);
    if (!response || !response.ok) return {};
    return response.json();
}

function parseLegacyWord(line, sourceLineNumber, sentencesDb) {
    const trimmedLine = line.trim();
    if (!trimmedLine) return null;
    const separatorIndex = trimmedLine.indexOf(':') >= 0 ? trimmedLine.indexOf(':') : trimmedLine.indexOf('=');
    if (separatorIndex < 1) return null;
    const russian = trimmedLine.substring(0, separatorIndex).trim();
    const turkish = trimmedLine.substring(separatorIndex + 1).trim();
    if (!russian || !turkish) return null;
    const wordSentences = sentencesDb[String(sourceLineNumber)] || [];
    const word = {
        id: sourceLineNumber,
        russian,
        turkish,
        sourceLineNumber,
        category: getWordCategory({ russian, turkish }, sourceLineNumber),
        example: wordSentences.length > 0 ? { russian: wordSentences[0].ru, turkish: wordSentences[0].tr } : { russian: '', turkish: '' },
        sentences: wordSentences
    };
    word.key = window.storageManager?.buildWordStorageKey(word) || String(sourceLineNumber);
    return word;
}

async function loadLegacyWords(sentencesDb) {
    const wordsResponse = await fetch('kelimeler_tam_strict.txt');
    if (!wordsResponse.ok) throw new Error('Legacy vocabulary source could not be loaded.');
    const text = await wordsResponse.text();
    WORDS = text.split('\n')
        .map((line, index) => parseLegacyWord(line, index + 1, sentencesDb))
        .filter(Boolean);
}

function finalizeWords() {
    appendUserWords();
    filterDeletedWords();
}

async function loadWords() {
    let sentencesDb = {};
    try {
        sentencesDb = await loadSentenceDatabase();
    } catch (error) {
        console.warn('Sentence database unavailable; continuing without examples.', error);
    }

    const repository = window.vocabularyRepository;
    if (repository) {
        let repositoryLoaded = false;
        let repositoryFailureRecorded = false;
        try {
            repositoryLoaded = await repository.load();
        } catch (error) {
            recordRuntimeFallback('v1_load_exception', error);
            repositoryFailureRecorded = true;
        }
        if (repositoryLoaded) {
            try {
                WORDS = repository.buildLegacyWords({
                    sentencesDb,
                    categoryResolver: getWordCategory,
                    storageKeyBuilder: word => window.storageManager?.buildWordStorageKey(word) || String(word.id)
                });
                finalizeWords();
                return true;
            } catch (error) {
                recordRuntimeFallback('legacy_adapter_failed', error);
            }
        } else if (!repositoryFailureRecorded) {
            const reason = repository.getDiagnostics()?.fallback_reason || 'v1_validation_or_load_failed';
            recordRuntimeFallback(reason);
        }
    } else {
        recordRuntimeFallback('repository_unavailable');
    }

    try {
        await loadLegacyWords(sentencesDb);
        finalizeWords();
        return true;
    } catch (error) {
        console.error('Legacy vocabulary fallback failed:', error);
        return false;
    }
}
