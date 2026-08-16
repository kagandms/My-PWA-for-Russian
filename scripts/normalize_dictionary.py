import json
import os
import time
import urllib.request
import urllib.error
import re

# .env.local dosyasından API anahtarını oku
def load_env():
    env_path = '../.env.local'
    if not os.path.exists(env_path):
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

def get_raw_lines(filepath):
    lines = []
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    lines.append(line)
    return lines

def process_batch_via_ai(batch_lines):
    if not OPENROUTER_API_KEY:
        print("HATA: OPENROUTER_API_KEY bulunamadı!")
        return None

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    input_text = "\n".join(batch_lines)
    
    prompt = f"""You are a professional Russian-Turkish dictionary editor. I will provide you with a list of lines from a dirty dictionary file.
Your task is to normalize these lines into strict 1-to-1 "Russian Word : Turkish Translation" pairs.

RULES:
1. If a line contains multiple Russian synonyms or words separated by commas, slashes, or dashes (e.g. "Работа, Труд", "Смелый : Храбрый, Бесстрашный", "Учить - Выучить : Ezberlemek"), YOU MUST SPLIT them into separate entries.
2. For EACH split Russian word, provide its accurate Turkish translation.
3. Remove extra notes inside brackets like "(деепричастие)", "(м.р.)", etc. Keep only the pure Russian word/phrase.
4. If a Russian expression is a phrase/idiom, translate the whole phrase into Turkish.
5. You must output ONLY valid, raw JSON array of objects. NO Markdown formatting, NO explanations.

Input lines:
{input_text}

Output Format:
[
  {{"ru": "Russian word 1", "tr": "Turkish translation"}},
  {{"ru": "Russian word 2", "tr": "Turkish translation"}},
  ...
]
"""

    data = {
        "model": "openrouter/free", # deepseek-chat or free models mapped by openrouter
        "messages": [
            {"role": "system", "content": "You are a JSON generating machine. Only output raw JSON array. Do not use markdown blocks."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }
    
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers)
    
    max_retries = 5
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
    input_file = '../kelimeler_tam.txt' if os.path.exists('../kelimeler_tam.txt') else 'kelimeler_tam.txt'
    output_file = '../kelimeler_tam_strict.txt' if os.path.exists('../kelimeler_tam.txt') else 'kelimeler_tam_strict.txt'
    progress_file = 'normalize_progress.txt'
    
    lines = get_raw_lines(input_file)
    if not lines:
        print(f"{input_file} bulunamadı veya boş.")
        return
        
    start_index = 0
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            val = f.read().strip()
            if val.isdigit():
                start_index = int(val)
                
    batch_size = 40
    print(f"Toplam satır: {len(lines)}")
    print(f"Başlangıç indeksi: {start_index}")
    
    for i in range(start_index, len(lines), batch_size):
        batch = lines[i:i+batch_size]
        print(f"İşleniyor: Satır {i} - {i + len(batch)} / {len(lines)}...")
        
        start_time = time.time()
        result_array = process_batch_via_ai(batch)
        
        if result_array and isinstance(result_array, list):
            with open(output_file, 'a', encoding='utf-8') as out_f:
                for item in result_array:
                    ru = str(item.get('ru', '')).strip()
                    tr = str(item.get('tr', '')).strip()
                    if ru and tr:
                        out_f.write(f"{ru} : {tr}\n")
            
            # Progress kaydet
            with open(progress_file, 'w') as f:
                f.write(str(i + batch_size))
                
            print(f"Başarılı. ({len(result_array)} kelime çıkarıldı, Süre: {time.time() - start_time:.1f}s)")
            time.sleep(3) # Rate limit koruması
        else:
            print("Batch başarısız! Lütfen daha sonra tekrar deneyin.")
            break
            
    print("İşlem tamamlandı.")

if __name__ == "__main__":
    main()
