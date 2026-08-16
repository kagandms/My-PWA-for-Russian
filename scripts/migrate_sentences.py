import json
import os
import re

def get_old_mapping():
    old_word_to_id = {}
    with open('../kelimeler_tam.txt', 'r', encoding='utf-8') as f:
        for line_idx, line in enumerate(f):
            line = line.strip()
            if not line: continue
            
            if ':' in line:
                ru_part = line.split(':', 1)[0].strip()
            elif '=' in line:
                ru_part = line.split('=', 1)[0].strip()
            else:
                continue
            
            old_id = str(line_idx + 1)
            
            # temizle ve ayır (local_normalize.py mantığı)
            ru_part = re.sub(r'\(.*?\)', '', ru_part).strip()
            if '/' in ru_part or ',' in ru_part:
                ru_words = re.split(r'[/,]', ru_part)
                for w in ru_words:
                    w = w.strip()
                    if w and w not in old_word_to_id:
                        old_word_to_id[w] = old_id
            else:
                if ru_part not in old_word_to_id:
                    old_word_to_id[ru_part] = old_id
                    
    return old_word_to_id

def load_old_sentences():
    if os.path.exists('../sentences.json'):
        with open('../sentences.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def main():
    old_word_to_id = get_old_mapping()
    old_sentences = load_old_sentences()
    
    # Kırık olan ve taşınmasını istemediğimiz eski ID'ler
    # 25-30 (önekler), 107-121 (saatler vs.)
    broken_old_ids = set([str(i) for i in range(25, 31)] + [str(i) for i in range(107, 122)])
    
    new_db = {}
    migrated_count = 0
    missing_count = 0
    
    with open('../kelimeler_tam_strict.txt', 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    for i, line in enumerate(lines):
        new_id = str(i + 1)
        if ':' not in line:
            continue
            
        ru_word = line.split(':', 1)[0].strip()
        
        old_id = old_word_to_id.get(ru_word)
        
        if old_id and old_id not in broken_old_ids and old_id in old_sentences:
            sents = old_sentences[old_id]
            if len(sents) >= 3:
                # Cümleleri al
                new_db[new_id] = sents[:3]
                migrated_count += 1
            else:
                missing_count += 1
        else:
            # Eski id yok, kırık veya cümleler yok
            missing_count += 1
            
    print(f"Toplam strict kelime: {len(lines)}")
    print(f"Taşınan kelime: {migrated_count}")
    print(f"Eksik / yeniden üretilecek kelime: {missing_count}")
    
    with open('../sentences_strict.json', 'w', encoding='utf-8') as f:
        json.dump(new_db, f, ensure_ascii=False, separators=(',', ':'))
        
if __name__ == '__main__':
    main()
