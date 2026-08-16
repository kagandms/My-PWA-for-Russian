import json
import os
import re

def is_valid_sentence_group(target_ru, sents):
    if not isinstance(sents, list) or len(sents) < 3:
        return False, "Not enough sentences"
        
    for s in sents:
        if 'ru' not in s or 'tr' not in s:
            return False, "Missing 'ru' or 'tr' field in sentence"
        if not s['ru'].strip() or not s['tr'].strip():
            return False, "Empty 'ru' or 'tr' field"
            
    ru_texts = [s.get('ru', '').strip() for s in sents]
    if len(set(ru_texts)) < 3:
        return False, "Duplicate sentences detected"
        
    target_lower = target_ru.lower()
    is_prefix = target_lower.endswith('-')
    
    if is_prefix:
        prefix = target_lower[:-1]
        for ru_text in ru_texts:
            words = re.findall(r'\b\w+', ru_text.lower())
            if not any(w.startswith(prefix) for w in words):
                return False, f"Prefix '{prefix}' not found in: {ru_text}"
    else:
        stem_len = 4 if len(target_lower) > 4 else len(target_lower)
        stem = target_lower[:stem_len]
        for ru_text in ru_texts:
            if stem not in ru_text.lower():
                return False, f"Stem '{stem}' of '{target_ru}' not found in: {ru_text}"
                
    return True, ""

def main():
    try:
        with open('../sentences_strict.json', 'r', encoding='utf-8') as f:
            db = json.load(f)
    except:
        db = {}

    words_map = {}
    with open('../kelimeler_tam_strict.txt', 'r', encoding='utf-8') as f:
        for line_idx, line in enumerate(f):
            line = line.strip()
            if not line: continue
            if ':' in line:
                ru = line.split(':', 1)[0].strip()
                words_map[str(line_idx + 1)] = ru

    accepted = 0
    rejected = 0

    for i in range(10):
        fname = f'result_{i}.json'
        if not os.path.exists(fname):
            continue
            
        with open(fname, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
                
        for wid, sents in data.items():
            wid_str = str(wid)
            if wid_str not in words_map:
                continue
                
            ru_word = words_map[wid_str]
            valid, msg = is_valid_sentence_group(ru_word, sents)
            if valid:
                db[wid_str] = sents
                accepted += 1
            else:
                print(f"Rejected ID {wid_str} ({ru_word}): {msg}")
                rejected += 1
                
    with open('../sentences_strict.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, separators=(',', ':'))
        
    print(f"Merged successfully. Accepted: {accepted}, Rejected: {rejected}")
    print(f"Total words in DB: {len(db)}")

if __name__ == '__main__':
    main()
