import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_CORRECTIONS = Object.freeze([
    { id: 'A01', pattern: /^Изжога\s*:/u, replacement: 'Изжога : mide ekşimesi; mide yanması' },
    { id: 'A02', pattern: /^Проспать\s*:/u, replacement: 'Проспать : fazla uyumak; uyuyup bir şeyi kaçırmak' },
    { id: 'A03', pattern: /^Защищаться\s*:/u, replacement: 'Защищаться : kendini savunmak; korunmak' },
    { id: 'A04', pattern: /^Нездоровиться\s*:/u, replacement: 'Нездоровиться : kendini iyi hissetmemek; rahatsız hissetmek' },
    { id: 'A05', pattern: /^Неотложная помощь\s*:/u, replacement: 'Неотложная помощь : acil yardım; acil tıbbi yardım' },
    { id: 'A06', pattern: /^Пломбировать\s*:/u, replacements: ['Пломбировать : mühürlemek; plomba vurmak', 'Пломбировать : (diş) dolgu yapmak'], replacement: 'Пломбировать : mühürlemek; plomba vurmak; (diş) dolgu yapmak' },
    { id: 'A07', pattern: /^Пятью\s*:/u, replacement: 'Пятью : beşle; beş ile' },
    { id: 'A08', pattern: /^Шестью\s*:/u, replacement: 'Шестью : altıyla; altı ile' },
    { id: 'A09', pattern: /^Семью\s*:/u, replacement: 'Семью : yediyle; yedi ile' },
    { id: 'A10', pattern: /^Восемью\s*:/u, replacement: 'Восемью : sekizle; sekiz ile' },
    { id: 'A11', pattern: /^Подрасти\s*:/u, replacement: 'Подрасти : biraz büyümek; boy atmak; büyüyüp gelişmek' },
    { id: 'A12', pattern: /^Сочувствовать\s*:/u, replacement: 'Сочувствовать : acısını paylaşmak; duygudaşlık göstermek; haline üzülmek' },
    { id: 'A13', pattern: /^Прожить два года\s*:/u, replacement: 'Прожить два года : iki yıl yaşamak; iki yıl geçirmek' },
    { id: 'A14', pattern: /^Современник\s*:/u, replacement: 'Современник : çağdaş; aynı dönemde yaşamış/yaşayan kişi' },
    { id: 'A15', pattern: /^Всплакнуть\s*:/u, replacement: 'Всплакнуть : biraz ağlamak; hafifçe ağlamak; birkaç gözyaşı dökmek' }
]);

function calculateSha256(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function countNonEmptyLines(text) {
    return text.split(/\r?\n/u).filter(line => line.trim()).length;
}

function applyCorrections(text) {
    const lines = text.split(/\r?\n/u);
    const matchedIds = new Set();
    const occurrenceCounts = new Map();
    const reviewedLines = lines.map(line => {
        const correction = SOURCE_CORRECTIONS.find(item => item.pattern.test(line));
        if (!correction) return line;
        matchedIds.add(correction.id);
        const occurrence = occurrenceCounts.get(correction.id) || 0;
        occurrenceCounts.set(correction.id, occurrence + 1);
        return correction.replacements?.[occurrence] || correction.replacement;
    });
    if (matchedIds.size !== SOURCE_CORRECTIONS.length) {
        const missingIds = SOURCE_CORRECTIONS.map(item => item.id).filter(id => !matchedIds.has(id));
        throw new Error(`Ek A correction target missing: ${missingIds.join(', ')}`);
    }
    return { text: reviewedLines.join('\n'), matchedIds: SOURCE_CORRECTIONS.map(item => item.id).filter(id => matchedIds.has(id)) };
}

function ensureDistinctOutput(resolvedPath, outputPaths) {
    const source = path.resolve(resolvedPath);
    for (const outputPath of outputPaths) {
        if (source === path.resolve(outputPath)) throw new Error('Source output path must be versioned and distinct from input.');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
}

export function freezeSource(options) {
    const importedAt = options.importedAt || new Date().toISOString();
    const requestedExists = fs.existsSync(options.requestedPath);
    const resolvedPath = requestedExists ? options.requestedPath : options.fallbackPath;
    ensureDistinctOutput(resolvedPath, [options.reviewedPath, options.snapshotPath, options.manifestPath]);
    const sourceText = fs.readFileSync(resolvedPath, 'utf8');
    const reviewed = applyCorrections(sourceText);
    fs.writeFileSync(options.snapshotPath, sourceText, 'utf8');
    fs.writeFileSync(options.reviewedPath, reviewed.text, 'utf8');
    const manifest = {
        schemaVersion: 1,
        sourceStatus: 'reviewed',
        importedAt,
        requestedSource: { fileName: path.basename(options.requestedPath), path: options.requestedPath, exists: requestedExists },
        resolvedSource: { fileName: path.basename(resolvedPath), path: resolvedPath, sha256: calculateSha256(sourceText) },
        reviewedSource: { fileName: path.basename(options.reviewedPath), path: options.reviewedPath, sha256: calculateSha256(reviewed.text) },
        sourceLineCount: countNonEmptyLines(sourceText),
        reviewedLineCount: countNonEmptyLines(reviewed.text),
        appliedCorrectionIds: reviewed.matchedIds,
        originalSnapshot: { path: options.snapshotPath, sha256: calculateSha256(sourceText) }
    };
    fs.writeFileSync(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { manifest, reviewedText: reviewed.text };
}
