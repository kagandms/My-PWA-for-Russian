import json

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

words = get_words()
try:
    with open('../sentences_strict.json', 'r', encoding='utf-8') as f:
        new_db = json.load(f)
except:
    new_db = {}

missing = [w for w in words if w['id'] not in new_db]
print(f"Total missing: {len(missing)}")

# Split into chunks of 35 words
chunks = [missing[i:i + 35] for i in range(0, len(missing), 35)]
print(f"Total chunks: {len(chunks)}")

for i, chunk in enumerate(chunks):
    with open(f'chunk_{i}.json', 'w', encoding='utf-8') as f:
        json.dump(chunk, f, ensure_ascii=False)
