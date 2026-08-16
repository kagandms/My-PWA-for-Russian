import os
import re

def main():
    input_file = '../kelimeler_tam.txt'
    output_file = '../kelimeler_tam_strict.txt'
    
    lines = []
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # Sadece 1560. satırdan (index 1560) sonrasını alıyoruz
    remaining_lines = lines[1560:]
    
    processed_count = 0
    extracted_words = 0
    
    with open(output_file, 'a', encoding='utf-8') as out_f:
        for line in remaining_lines:
            line = line.strip()
            if not line:
                continue
                
            if ':' not in line:
                # ':' yoksa '=' olabilir, ona göre ayıralım
                if '=' in line:
                    parts = line.split('=', 1)
                else:
                    continue
            else:
                parts = line.split(':', 1)
                
            ru_part = parts[0].strip()
            tr_part = parts[1].strip()
            
            # ru_part içindeki parantezleri (notları) temizle
            ru_part = re.sub(r'\(.*?\)', '', ru_part).strip()
            
            # Eğik çizgi (/) veya virgül (,) varsa kelimeleri böl
            # Sadece Rusça taraftaki kelimeleri bölüyoruz
            if '/' in ru_part or ',' in ru_part:
                ru_words = re.split(r'[/,]', ru_part)
                for w in ru_words:
                    clean_w = w.strip()
                    if clean_w:
                        out_f.write(f"{clean_w} : {tr_part}\n")
                        extracted_words += 1
            else:
                out_f.write(f"{ru_part} : {tr_part}\n")
                extracted_words += 1
                
            processed_count += 1

    print(f"İşlenen satır: {processed_count}")
    print(f"Çıkarılan kelime: {extracted_words}")
    
    # Progress dosyasını sonuna kadar güncelle
    with open('normalize_progress.txt', 'w') as f:
        f.write(str(len(lines)))

if __name__ == '__main__':
    main()
