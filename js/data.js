/**
 * Kelime Verileri - kelimeler_tam.txt dosyasından yüklenir
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

async function loadWords() {
    try {
        // İki dosyayı aynı anda (paralel) asenkron çek
        const [wordsResponse, sentencesResponse] = await Promise.all([
            fetch('kelimeler_tam.txt', { cache: 'reload' }),
            fetch('sentences.json', { cache: 'reload' }).catch(() => null) // sentences.json yoksa çökmeyi önle
        ]);

        if (!wordsResponse.ok) {
            throw new Error('Dosya yüklenemedi');
        }

        const text = await wordsResponse.text();
        const lines = text.split('\n');

        let sentencesDb = {};
        if (sentencesResponse && sentencesResponse.ok) {
            sentencesDb = await sentencesResponse.json();
        }

        WORDS = []; // Reset words
        let idCounter = 1;

        lines.forEach((line, lineIndex) => {
            const sourceLineNumber = lineIndex + 1;
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // "Rusça : Türkçe" formatını işle
            const separatorIndex = trimmedLine.indexOf(':');

            if (separatorIndex !== -1) {
                const russian = trimmedLine.substring(0, separatorIndex).trim();
                const turkish = trimmedLine.substring(separatorIndex + 1).trim();

                if (russian && turkish) {
                    // Dinamik Cümleleri Ata
                    const currentId = idCounter++;
                    let wordSentences = [];
                    if (sentencesDb[String(currentId)]) {
                        wordSentences = sentencesDb[String(currentId)];
                    }

                    // Standart kelime olarak da ekle
                    const word = {
                        id: currentId,
                        russian: russian,
                        turkish: turkish,
                        sourceLineNumber: sourceLineNumber,
                        category: getWordCategory({ russian, turkish }, sourceLineNumber),
                        example: wordSentences.length > 0 ? { russian: wordSentences[0].ru, turkish: wordSentences[0].tr } : { russian: "", turkish: "" },
                        sentences: wordSentences
                    };

                    word.key = window.storageManager?.buildWordStorageKey(word) || String(currentId);
                    WORDS.push(word);
                }
            } else {
                // Zamanlar vb. (= ile ayrılanlar)
                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex !== -1) {
                    const russian = trimmedLine.substring(0, equalIndex).trim();
                    const turkish = trimmedLine.substring(equalIndex + 1).trim();

                    if (russian && turkish) {
                        const currentId = idCounter++;
                        let wordSentences = [];
                        if (sentencesDb[String(currentId)]) {
                            wordSentences = sentencesDb[String(currentId)];
                        }

                        const word = {
                            id: currentId,
                            russian: russian,
                            turkish: turkish,
                            sourceLineNumber: sourceLineNumber,
                            category: getWordCategory({ russian, turkish }, sourceLineNumber),
                            example: wordSentences.length > 0 ? { russian: wordSentences[0].ru, turkish: wordSentences[0].tr } : { russian: "", turkish: "" },
                            sentences: wordSentences
                        };

                        word.key = window.storageManager?.buildWordStorageKey(word) || String(currentId);
                        WORDS.push(word);
                    }
                }
            }
        });

        appendUserWords();
        filterDeletedWords();
        return true;

    } catch (error) {
        console.error('Kelimeler ve Cümleler yüklenirken hata:', error);
        return false;
    }
}
