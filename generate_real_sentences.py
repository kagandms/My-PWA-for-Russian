import json
import os
import time
import urllib.request
import urllib.error

# .env.local dosyasından API anahtarını oku
def load_env():
    env_path = '.env.local'
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
    with open('kelimeler_tam.txt', 'r', encoding='utf-8') as f:
        for line_idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            
            ru, tr = "", ""
            if ':' in line:
                parts = line.split(':')
                ru = parts[0].strip()
                tr = parts[1].strip()
            elif '=' in line:
                parts = line.split('=')
                ru = parts[0].strip()
                tr = parts[1].strip()
            else:
                continue
                
            word_id = str(line_idx + 1)
            words.append({'id': word_id, 'ru': ru, 'tr': tr})
    return words

def load_existing_sentences():
    if os.path.exists('sentences.json'):
        try:
            with open('sentences.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except:
            pass
    return {}

def save_sentences(sentences_db):
    with open('sentences.json', 'w', encoding='utf-8') as f:
        json.dump(sentences_db, f, ensure_ascii=False, indent=2)

def generate_batch_via_ai(batch_words):
    if not OPENROUTER_API_KEY:
        print("HATA: OPENROUTER_API_KEY bulunamadı!")
        return None

    # OpenRouter API call
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""You are a professional Russian language teacher. Generate exactly 1 Russian example sentence and its Turkish translation for each word provided in the JSON array below.
Constraints:
1. Level: B1 to B1+. Do NOT use overly simple sentences (A1-A2).
2. Length: Medium (6 to 12 words).
3. Context Clues: The sentence MUST provide strong semantic context so that a learner could guess the meaning of the target word from the context even if they don't know it. (e.g., for 'подумать', do NOT use 'Я подумаю', instead use 'Прежде чем принять это важное решение, мне нужно всё тщательно подумать.').
4. Naturalness: Phrasing must be highly authentic and natural, as spoken by native Russians.

Input JSON:
{json.dumps(batch_words, ensure_ascii=False)}

Output requirements:
Return ONLY a valid, raw JSON object where keys are the word IDs and values are arrays containing exactly ONE object with "ru" (Russian sentence) and "tr" (Turkish translation) keys. 
Example format:
{{
  "1": [{{ "ru": "Прежде чем...", "tr": "Önce..." }}],
  "2": [{{ "ru": "...", "tr": "..." }}]
}}
Do NOT output any markdown blocks (like ```json), just the raw JSON string starting with {{ and ending with }}.
"""

    data = {
        "model": "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are a highly capable AI that outputs raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers)
    
    max_retries = 10
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content'].strip()
                
                # Temizleme
                if content.startswith('```json'):
                    content = content[7:]
                if content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                    
                content = content.strip()
                return json.loads(content)
        except Exception as e:
            print(f"API Hatası (Deneme {attempt+1}/{max_retries}): {e}")
            time.sleep(5 * (attempt + 1))
            
    return None

def main():
    words = get_words()
    sentences_db = load_existing_sentences()
    
    # Tüm DB'yi sıfırlıyoruz çünkü eskisi sentetikti (B1-B1+ değil)
    new_db = {}
    
    batch_size = 15
    words_to_process = words
    
    # Kaldığı yerden devam edebilmesi için mevcut verileri oku
    # ve geçerli, uzun olanları sakla
    if sentences_db:
        for wid, sents in sentences_db.items():
            if isinstance(sents, list) and len(sents) > 0 and isinstance(sents[0], dict):
                ru_ex = sents[0].get('ru', '')
                # Eğer daha önce AI tarafından uzun ve geçerli bir şey üretildiyse (sentetik kalıplar değilse)
                if len(ru_ex.split()) >= 5 and not "Я хочу" in ru_ex and not "Это мой новый" in ru_ex:
                    new_db[wid] = sents
    
    final_words_to_process = []
    for w in words_to_process:
        if w['id'] not in new_db:
            final_words_to_process.append(w)

    print(f"Toplam kelime: {len(words)}")
    print(f"Üretilecek kelime sayısı: {len(final_words_to_process)}")

    if not OPENROUTER_API_KEY:
        print("OPENROUTER_API_KEY eksik! Betik durduruldu.")
        return

    processed_count = 0
    for i in range(0, len(final_words_to_process), batch_size):
        batch = final_words_to_process[i:i+batch_size]
        print(f"Batch işleniyor... ({i+1} - {min(i+batch_size, len(final_words_to_process))})")
        
        start_time = time.time()
        result_json = generate_batch_via_ai(batch)
        
        if result_json:
            for wid, sents in result_json.items():
                new_db[str(wid)] = sents
                
            save_sentences(new_db)
            processed_count += len(batch)
            print(f"Başarılı. (Geçen süre: {time.time() - start_time:.1f}s)")
            
            time.sleep(1)
        else:
            print("Batch başarısız oldu. Betik durduruluyor...")
            break
            
    print(f"Tamamlandı! Yeni eklenen/güncellenen kelime sayısı: {processed_count}")

if __name__ == "__main__":
    main()
