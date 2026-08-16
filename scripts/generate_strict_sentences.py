import json
import os
import time
import urllib.request
import urllib.error
import re

def load_env():
    env_path = '../.env.local'
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, val = line.strip().split('=', 1)
                    if key == 'OPENROUTER_API_KEY':
                        return val.strip()
    return None

OPENROUTER_API_KEY = load_env()

def get_words():
    words = []
    with open('../kelimeler_tam_strict.txt', 'r', encoding='utf-8') as f:
        for line_idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            
            if ':' in line:
                parts = line.split(':', 1)
                ru = parts[0].strip()
                tr = parts[1].strip()
                word_id = str(line_idx + 1)
                words.append({'id': word_id, 'ru': ru, 'tr': tr})
    return words

def load_existing_sentences():
    if os.path.exists('../sentences_strict.json'):
        try:
            with open('../sentences_strict.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_sentences(sentences_db):
    with open('../sentences_strict.json', 'w', encoding='utf-8') as f:
        json.dump(sentences_db, f, ensure_ascii=False, separators=(',', ':'))

def is_valid_sentence_group(target_ru, sents):
    if not isinstance(sents, list) or len(sents) < 3:
        return False, "Not enough sentences"
        
    # Check for duplicate sentences
    ru_texts = [s.get('ru', '').strip() for s in sents]
    if len(set(ru_texts)) < 3:
        return False, "Duplicate sentences detected"
        
    # Check if root/prefix is in the sentences
    target_lower = target_ru.lower()
    is_prefix = target_lower.endswith('-')
    
    if is_prefix:
        prefix = target_lower[:-1]
        for ru_text in ru_texts:
            # Check if any word starts with the prefix
            words = re.findall(r'\b\w+', ru_text.lower())
            if not any(w.startswith(prefix) for w in words):
                return False, f"Prefix '{prefix}' not found in: {ru_text}"
    else:
        # Generate a flexible stem
        stem_len = min(5, len(target_lower)) if len(target_lower) > 3 else len(target_lower)
        stem = target_lower[:stem_len]
        for ru_text in ru_texts:
            if stem not in ru_text.lower():
                return False, f"Stem '{stem}' of '{target_ru}' not found in: {ru_text}"
                
    return True, ""

def generate_batch_via_ai(batch_words):
    if not OPENROUTER_API_KEY:
        print("HATA: OPENROUTER_API_KEY bulunamadı!")
        return None

    # Custom prompt logic for prefixes
    has_prefixes = any(w['ru'].endswith('-') for w in batch_words)
    prefix_instructions = ""
    if has_prefixes:
        prefix_instructions = """
IMPORTANT - PREFIXES: Some target words end with a hyphen (e.g. 'Про-'). This means it is a PREFIX. 
For prefixes, you MUST generate sentences that use a real, common Russian word that STARTS with this prefix (e.g., 'пройти', 'просмотреть'). DO NOT use the prefix as a standalone word (do not say "Про-вчера").
"""

    prompt = f"""You are a professional Russian language teacher. Generate EXACTLY 3 distinct Russian example sentences and their Turkish translations for EACH word/phrase provided in the JSON array below.
Constraints:
1. Level: B1 to B1+. Do NOT use overly simple sentences (A1-A2).
2. Length: Medium (6 to 12 words per sentence).
3. Context Clues: Each sentence MUST provide strong semantic context.
4. Naturalness: Phrasing must be highly authentic.
5. Variety: The 3 sentences for each word MUST be completely different.
{prefix_instructions}
Input JSON:
{json.dumps(batch_words, ensure_ascii=False)}

Output requirements:
Return ONLY a valid, raw JSON object where keys are the word IDs and values are arrays containing EXACTLY 3 objects with "ru" and "tr" keys. 
Example format:
{{
  "1": [
    {{ "ru": "Прежде чем...", "tr": "Önce..." }},
    {{ "ru": "Вторая фраза...", "tr": "İkinci cümle..." }},
    {{ "ru": "Третий пример...", "tr": "Üçüncü örnek..." }}
  ]
}}
Do NOT output markdown blocks, just the raw JSON starting with {{ and ending with }}.
"""

    data = {
        "model": "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are a highly capable AI that outputs raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers)
    
    max_retries = 10
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content'].strip()
                if content.startswith('```json'): content = content[7:]
                if content.startswith('```'): content = content[3:]
                if content.endswith('```'): content = content[:-3]
                content = content.strip()
                return json.loads(content)
        except Exception as e:
            print(f"API Hatası (Deneme {attempt+1}/{max_retries}): {e}")
            time.sleep(5 * (attempt + 1))
    return None

def main():
    words = get_words()
    new_db = load_existing_sentences()
    
    words_map = {w['id']: w['ru'] for w in words}
    
    final_words_to_process = []
    for w in words:
        if w['id'] not in new_db:
            final_words_to_process.append(w)
            
    print(f"Toplam kelime: {len(words)}")
    print(f"Üretilecek eksik kelime sayısı: {len(final_words_to_process)}")

    if not OPENROUTER_API_KEY:
        print("OPENROUTER_API_KEY eksik! Betik durduruldu.")
        return

    batch_size = 15
    processed_count = 0
    
    for i in range(0, len(final_words_to_process), batch_size):
        batch = final_words_to_process[i:i+batch_size]
        print(f"Batch işleniyor... ({i+1} - {min(i+batch_size, len(final_words_to_process))})")
        
        start_time = time.time()
        result_json = generate_batch_via_ai(batch)
        
        if result_json:
            accepted_count = 0
            for wid_str, sents in result_json.items():
                if wid_str not in words_map:
                    continue
                
                ru_word = words_map[wid_str]
                is_valid, err_msg = is_valid_sentence_group(ru_word, sents)
                
                if is_valid:
                    new_db[wid_str] = sents
                    accepted_count += 1
                else:
                    print(f"  [REDDEDİLDİ] ID {wid_str} ({ru_word}): {err_msg}")
                    
            save_sentences(new_db)
            processed_count += accepted_count
            print(f"Başarılı. (Kabul edilen: {accepted_count}/{len(batch)}, Geçen süre: {time.time() - start_time:.1f}s)")
            time.sleep(3)
        else:
            print("Batch başarısız oldu. Betik durduruluyor...")
            break
            
    print(f"Tamamlandı! Yeni kabul edilen kelime sayısı: {processed_count}")

if __name__ == "__main__":
    main()
