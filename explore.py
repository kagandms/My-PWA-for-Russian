import json

def get_old_words():
    words = {}
    with open('kelimeler_tam.txt', 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if ':' in line:
                ru = line.split(':')[0].strip()
                words[str(i+1)] = ru
    return words

with open('sentences.json', 'r', encoding='utf-8') as f:
    sents = json.load(f)

old_words = get_old_words()

for i in range(25, 31):
    sid = str(i)
    if sid in old_words:
        print(f"ID {sid}: {old_words[sid]}")
        if sid in sents:
            print("  -", sents[sid][0]['ru'])

print("---")
for i in range(107, 122):
    sid = str(i)
    if sid in old_words:
        print(f"ID {sid}: {old_words[sid]}")
        if sid in sents:
            print("  -", sents[sid][0]['ru'])
