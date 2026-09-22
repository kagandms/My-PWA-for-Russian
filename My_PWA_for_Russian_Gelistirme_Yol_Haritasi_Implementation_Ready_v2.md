# My PWA for Russian — Implementation-Ready Geliştirme Yol Haritası v2

Bu belge, uygulamanın mevcut yapısını daha öğretici, üretim odaklı ve TRKI B2 hazırlığına uygun hâle getirmek için yapılması gereken değişiklikleri öncelik sırasına göre listeler.

> **Bu sürümün statüsü:** Bu belge, kelime kaynağının 2339 satır üzerinden phase-by-phase ikinci kalite kontrolünden sonra güncellenmiştir. Uygulamaya geçmeden önce Ek A'daki son düzeltmeler `kelimeler_tam_strict(3).txt` üzerine uygulanmalı ve ortaya çıkan dosya `vocab_reviewed_v1` olarak dondurulmalıdır.

> **Uygulama ilkesi:** Agent hiçbir veri dönüşümünde orijinal kaynağı sessizce ezmemeli. Import, normalizasyon, enrichment ve migration adımları geri alınabilir ve denetlenebilir olmalıdır.

> Temel yaklaşım: Uygulama yalnızca “kelimeyi görünce tanıyor muyum?” sorusunu ölçmemeli. Kullanıcının kelimeyi hatırlaması, doğru bağlamda üretmesi, yazması, söylemesi ve sınav görevlerinde kullanabilmesi de takip edilmelidir.

---

## 1. Kelime veri kaynağını standartlaştır

Mevcut veri kaynağında farklı yönlerde ve farklı türlerde kayıtlar bulunuyor:

- Türkçe → Rusça
- Rusça → Türkçe
- Rusça → Rusça
- Rusça → Rusça kayıtların önemli kısmı eş anlamlı, yakın anlamlı, zıt anlamlı veya ilişkili kelime ilişkileri
- tek kelimeler
- çok kelimeli ifadeler
- tam cümleler
- atasözleri
- önek / ek notları
- dilbilgisel kalıplar

Bu nedenle veri modeli yalnızca `word` veya `lemma` varsayımına dayanmamalı.

Ana veri birimi `lexical_unit` olmalı ve her kayıtta en az şu alanlar bulunmalı:

- `id`
- `entry_type`
- `surface_form`
- varsa `lemma`
- `language`
- `raw_entry`
- `source`
- `verification_status`

Desteklenecek temel `entry_type` değerleri:

- `lemma`
- `phrase`
- `expression`
- `sentence`
- `proverb`
- `prefix_affix`
- `grammar_pattern`

Bir `lemma` kaydında birden fazla anlam varsa bunlar tek metin alanında rastgele birleştirilmemeli; ayrı `sense` kayıtlarıyla temsil edilebilmeli.

Önerilen `sense` alanları:

- `sense_id`
- Türkçe anlam / anlamlar
- anlam notu
- register / kullanım tonu
- kullanım alanı
- örnek cümle
- collocation'lar
- synonym / near-synonym / antonym ilişkileri
- gerekiyorsa fiil yönetimi / padej / preposition

Her Rusça kayıt zorla lemma hâline getirilmemeli. Çok kelimeli kalıplar, atasözleri, cümleler ve önek notları kendi türleriyle korunmalı.

Her alanda bütün bilgilerin dolu olması zorunlu olmamalı.


## 2. Rusça → Rusça kayıtları doğru şekilde ayrıştır

Rusça → Rusça kayıtlar otomatik olarak “Rusça tanım” kabul edilmemeli.

Bunlar ayrı ilişki türleri olarak saklanmalı:

- synonym
- near-synonym
- antonym
- related
- aynı kelime ailesinden kelime

Özellikle “eş anlamlı” ile “yakın anlamlı” ayrımı korunmalı. Çünkü Rusçada iki kelime benzer anlama sahip olsa bile her bağlamda birbirinin yerine geçmeyebilir.

Örneğin:

- красивый → прекрасный = synonym / near-synonym
- высокий → низкий = antonym

Bu ilişkiler daha sonra ayrı egzersizlerde kullanılabilmeli.

---

## 3. “Kelime” ile “egzersiz” kavramını ayır

Veritabanında bir kelime yalnızca bir kez bulunmalı.

Örneğin:

`привыкнуть`

tek bir kelime kaydıdır.

Fakat bu kayıttan farklı egzersizler üretilebilmelidir:

- Rusça → Türkçe
- Türkçe → Rusça
- eş anlamlıyı bul
- zıt anlamlıyı bul
- boşluk doldur
- doğru collocation'ı seç
- doğru aspect'i seç
- kelimeyi kullanarak cümle kur
- kelimeyi sesli kullan
- verilen bağlama uygun şekilde kelimeyi üret

Defterdeki veriler “hazır kartlar” değil, egzersiz üretmek için kullanılan dil verisi olmalı.

Puanlı / doğruluk iddiası taşıyan egzersizler yalnızca güvenilir veriden üretilebilmeli. Bunun için kayıt veya alan seviyesinde `exercise_eligible` / `verification_status` kontrolü olmalı.

`unverified` veya yalnızca AI tarafından tahmin edilmiş bir collocation, government veya anlam bilgisi kullanıcıya kesin cevap anahtarı gibi sunulmamalı.

---

## 4. Her kelime kaydını mümkün olduğunca zenginleştir

Aşağıdaki bilgiler desteklenmeli:

- Rusça lemma
- Türkçe anlam / anlamlar
- eş anlamlılar
- zıt anlamlılar
- kelime türü
- CEFR seviyesi
- örnek cümle
- tema / kategori
- etiketler
- kelime ailesi
- collocation'lar
- vurgu
- fiillerde aspect çifti
- fiillerde управление
- gerekli preposition
- gerekli padej

Eksik bilgiler sonradan eklenebilmeli.

Önemli: enrichment alanları mümkün olduğunca doğru `sense_id`'ye bağlanmalı. Aynı lemma'nın farklı anlamlarına ait collocation, synonym veya örnek cümleler birbirine karıştırılmamalı.

Otomatik eklenen her enrichment alanı mümkünse şu metadata'yı taşımalı:

- `source`
- `confidence`
- `verification_status`
- `updated_at`

AI veya otomatik sözlük eşleştirmesiyle bulunan bir bilgi doğrudan insan tarafından doğrulanmış veri gibi kabul edilmemeli.

## 5. Orijinal defter verisini mutlaka koru

Veri standardizasyonu sırasında hiçbir orijinal kayıt kaybolmamalı.

Her kelime / ifade kaydında mümkünse şu alanlar korunmalı:

- original / raw entry
- normalize edilmiş ana kayıt
- algılanan kaynak dili yönü
- ilişki türü
- dönüşüm tarihi
- otomatik sınıflandırma yapıldıysa confidence / güven değeri

Agent bir girdiyi yanlış yorumlarsa orijinal kayda dönüp düzeltme yapılabilmeli.

Otomatik sınıflandırma güveni düşükse sistem girdiyi zorla sınıflandırmak yerine kullanıcı doğrulamasına bırakmalı.

Kayıt yaşam döngüsü açık olmalı:

`raw → parsed → normalized → reviewed → active`

Gerekirse ayrıca:

- `unverified`
- `needs_review`
- `rejected`

durumları kullanılmalı.

Confidence yalnızca tüm kayıt seviyesinde değil, mümkünse alan seviyesinde tutulmalı. Örneğin Türkçe karşılık `verified` iken otomatik bulunan aspect çifti `candidate` olabilir.

---

## 6. Lemma normalizasyonu ve mükerrer kayıt temizliği yap

Defterde çekimli biçimler, farklı yazımlar veya aynı kelimenin birden fazla kaydı bulunabilir.

Sistem mümkün olduğunca:

- çekimli biçimi lemma altında toplamalı
- ё / е farkını kontrollü şekilde normalize etmeli
- vurgu işaretli ve işaretsiz biçimleri eşleştirebilmeli
- büyük / küçük harf farklarını normalize etmeli
- aynı kelimenin mükerrer kayıtlarını birleştirebilmeli
- anlamları yanlışlıkla ezmemeli

Örnek:

`людьми` bağımsız yeni bir kelime gibi değil, gerektiğinde `люди` ile ilişkilendirilmeli.

Fakat çok kelimeli kalıplar tek kelimeye zorla parçalanmamalı.

Örneğin:

- обращать внимание
- иметь в виду

gibi yapılar ayrı `expression / phrase` türü olarak desteklenmeli.


## 7. Import, QA, migration ve rollback altyapısı oluştur

Kelime kaynağı doğrudan veritabanına kör şekilde yazılmamalı.

Her import işlemi en az şu bilgileri üretmeli:

- `schema_version`
- `import_batch_id`
- kaynak dosya adı
- `source_hash`
- import tarihi
- toplam giriş satırı
- başarıyla parse edilen kayıt sayısı
- atlanan / geçersiz kayıt sayısı
- oluşturulan lexical unit sayısı
- oluşturulan sense sayısı
- birleştirilen duplicate sayısı
- review gerektiren kayıt sayısı

İlk gerçek importtan önce `dry-run` modu bulunmalı.

Import sonrasında otomatik QA kontrolleri yapılmalı:

- beklenmeyen kayıt kaybı var mı
- iki farklı sense yanlışlıkla birleşmiş mi
- phrase / proverb / sentence kayıtları lemma'ya zorlanmış mı
- source yönü kaybolmuş mu
- RU→RU relation kayıtları yanlışlıkla definition yapılmış mı
- boş veya anlamsız answer alanları oluşmuş mu
- duplicate merge sırasında anlamlar ezilmiş mi

Her migration geri alınabilir olmalı. Agent schema değiştirirken mevcut kullanıcı ilerlemesini veya orijinal lexical veriyi sessizce silememeli.

Prod verisi üzerinde doğrudan büyük dönüşüm yapmak yerine:

`backup → dry-run → validation report → migration → post-migration checks`

akışı kullanılmalı.

---

---

## 8. Fiiller için özel yapı oluştur

Fiiller normal kelimelerden daha fazla bilgi taşımalı.

Örneğin sadece:

`зависеть = bağlı olmak`

yerine:

`зависеть от + Р.п.`

şeklinde saklanmalı.

Aspect çiftleri de birbirine bağlanmalı:

- делать ↔ сделать
- привыкать ↔ привыкнуть
- решать ↔ решить

НСВ ve СВ tamamen bağımsız kelimeler gibi değerlendirilmemeli.

---

## 9. Kelime ailelerini birbirine bağla

Aynı kökten gelen kelimeler ilişkilendirilmeli.

Örnek:

- решать
- решить
- решение

veya:

- развиваться
- развитие
- развитый

Bu yapı özellikle B1 → B2 geçişinde aktif kelime haznesini büyütmek için kullanılmalı.

---

## 10. Collocation sistemini ekle

Kelimeler mümkün olduğunca tek başlarına öğretilmemeli.

Örneğin sadece:

`обсуждать = tartışmak`

yerine:

- обсуждать проблему
- обсуждать вопрос
- обсуждать что-то с кем-то

gibi doğal kullanım kalıpları tutulmalı.

Egzersizler de bu kalıplardan üretilebilmeli.

---

# ÜRETİM ODAKLI ÖĞRENME

## 11. Tanıma ve üretimi birbirinden ayır

Bir kelimeyi görünce anlamını bilmek ile kelimeyi sıfırdan üretmek aynı beceri değildir.

Uygulama en azından şu becerileri ayrı değerlendirmeli:

- Recognition — görünce tanıma
- Recall — ipucu verildiğinde hatırlama
- Production — aktif olarak kullanabilme

Uygulamanın temel gelişim yönü “tanıma”dan “üretme”ye doğru olmalı.

---

## 12. Typed Recall sistemi ekle

Kullanıcı sadece seçeneklerden cevap seçmemeli.

Cevabı kendisi yazabilmeli.

Özellikle:

- Türkçe → Rusça
- boşluğu Rusça kelimeyle doldurma
- verilen anlama göre kelime yazma

gibi egzersizler bulunmalı.


## 13. Typed Recall için kabul edilen cevap sistemini ayrı tasarla

Türkçe → Rusça veya boşluk doldurma görevlerinde tek string eşitliği kullanılmamalı.

Her görev gerektiğinde:

- `accepted_answers[]`
- hedef `sense_id`
- kabul edilen çekimli biçimler
- lemma / inflection ilişkisi
- `ё / е` toleransı
- büyük / küçük harf toleransı
- noktalama toleransı
- kontrollü typo toleransı

destekleyebilmeli.

Bir Türkçe anlamın birden fazla doğru Rusça karşılığı olabileceği veya aynı Rusça kelimenin farklı sense'leri bulunabileceği hesaba katılmalı.

Sistem doğru ama beklenmeyen bir cevaba otomatik olarak “yanlış” demeden önce alternatif kabul kurallarını kontrol etmeli.

AI'nin önerdiği yeni bir eşdeğer otomatik olarak kalıcı `accepted_answer` yapılmamalı; önce `candidate_answer` olarak saklanabilmeli.

---

## 14. Yeni bir “Üretim Modu” oluştur

Bu uygulamanın temel yeni modlarından biri olmalı.

Egzersiz türleri:

- Türkçe → Rusça çeviri
- boşluk doldurma
- verilen kelimelerle cümle kurma
- hedef kelimeyi kullanarak kendi cümleni yazma
- cümleyi yeniden ifade etme
- eş anlamlı kelime kullanarak cümleyi dönüştürme
- zıt anlamlı kelimeyle karşıt cümle üretme

Amaç kullanıcının kelimeyi aktif olarak kullanabilmesini sağlamak olmalı.

---

## 15. Üretim hatalarını türlerine göre sınıflandır

Sistem yalnızca “yanlış” dememeli.

Hata türleri ayrılmalı.

Örneğin:

- verb.aspect
- case.genitive
- case.dative
- case.instrumental
- preposition
- government
- lexical-choice
- collocation
- word-order
- agreement
- spelling
- conjunction
- relative-clause

Bu hata türleri daha sonra tekrar sisteminde kullanılmalı.

---

# HATA DEFTERİ VE ADAPTİF ÖĞRENME

## 16. Merkezi Hata Defteri oluştur

Bütün modlardaki hatalar aynı sistemde toplanmalı:

- kelime egzersizleri
- üretim
- grammar
- writing
- speaking
- TRKI

Kullanıcı yalnızca yanlış yaptığı soruları değil, tekrar eden hata türlerini görebilmeli.

Örnek:

- Вид глагола: 12 hata
- Родительный падеж: 7 hata
- Управление: 5 hata
- который: 4 hata
- Collocation: 6 hata

---

## 17. Hata Defterini tekrar sistemine bağla

Hatalar yalnızca istatistik olarak kalmamalı.

Sistem sonraki günlerde aynı konuyu farklı örneklerle tekrar karşısına çıkarmalı.

Örneğin kullanıcı sürekli aspect hatası yapıyorsa günlük çalışmada daha fazla aspect üretim sorusu gelmeli.

---

# GRAMMAR LAB

## 18. Ayrı bir Grammar Lab oluştur

Grammar çalışması klasik çoktan seçmeli quiz ile sınırlı kalmamalı.

Ana konular:

- Падежи
- Вид глагола
- Глаголы движения
- Управление
- который
- Bağlaçlar
- Koşul yapıları
- Zaman ifadeleri
- Word order
- Participles / gerunds
- Complex sentences

---

## 19. Grammar çalışmalarını üç aşamalı yap

Her konu mümkün olduğunca şu sırayla çalıştırılmalı:

1. kısa karşılaştırma / açıklama
2. kontrollü egzersiz
3. serbest üretim görevi

Amaç kuralı tanımaktan ziyade doğru kullanabilmek olmalı.

---

## 20. Contrast Training ekle

Sık karıştırılan yapılar doğrudan karşılaştırmalı öğretilmeli.

Örnekler:

- в университет / в университете
- два часа / за два часа
- потому что / поэтому
- если / если бы
- НСВ / СВ
- идти / ходить
- прийти / приходить

Bu egzersizler kullanıcının hatalarına göre otomatik seçilebilmeli.

---

# BAĞLAM İÇİNDE ÖĞRENME

## 21. Kelimeleri daha fazla bağlam içinde göster

Tek kelimelik çalışmaların yanında doğal Rusça cümleler kullanılmalı.

Özellikle B1 ve B2 kelimeleri:

- doğal cümlelerde
- collocation içinde
- birden fazla clause içeren yapılarda

gösterilmeli.

---

## 22. Kullanıcının kendi kelime havuzundan cümle üret

Sistem rastgele genel kelimeler yerine mümkün olduğunca kullanıcının:

- yeni öğrendiği
- unutmaya başladığı
- üretimde zorlandığı
- sık hata yaptığı
- TRKI için önemli

kelimeleri kullanarak cümleler oluşturmalı.

---

# SESLİ OKUMA VE KONUŞMA

## 23. “Sesli Okuma” modu ekle

Sistem kullanıcının kendi kelime kaynağından bir veya birkaç hedef kelime seçmeli.

Bu kelimeleri içeren doğal, orta veya uzun uzunlukta Rusça bir cümle oluşturmalı.

Kullanıcı:

- mikrofon butonuna basmalı
- ekrandaki cümleyi sesli okumalı
- sistem konuşmayı hedef metinle karşılaştırmalı

---

## 24. Sesli okumayı çok boyutlu değerlendir

Sistem yalnızca “doğru / yanlış” vermemeli.

Önemli teknik ayrım:

- speech-to-text doğruluğu
- gerçek telaffuz / vurgu / akıcılık değerlendirmesi

aynı şey değildir.

Sistem yalnızca konuşmayı doğru metne çevirebiliyorsa bundan yapay bir “telaffuz puanı” üretmemeli.

Gerçek ses analizi desteklenmiyorsa kullanıcıya yalnızca güvenilir ölçümler gösterilmeli.

Ayrı değerlendirmeler bulunmalı:

- metni doğru söyleme
- kelime atlama
- fazladan kelime ekleme
- yanlış kelime söyleme
- telaffuz
- vurgu
- akıcılık
- gereksiz duraksama

Problemli kelimeler ayrıca gösterilmeli.

---

## 25. Konuşmayı üç aşamaya çıkar

### Aşama 1 — Read Aloud

Ekrandaki cümleyi oku.

Amaç:

- telaffuz
- vurgu
- akıcılık

### Aşama 2 — Prompted Speech

Kullanıcıya 2–4 hedef kelime ver.

Bu kelimeleri kullanarak kendi cümlesini sesli olarak kurmasını iste.

Amaç:

- aktif kelime kullanımı
- grammar üretimi
- spontane cümle kurma

### Aşama 3 — Free Speech

Kullanıcı belirli bir konu hakkında 30–60 saniye konuşsun.

Örnek:

“Uzaktan eğitimin avantajları ve dezavantajları hakkında konuş.”

Amaç:

- B2 konuşma üretimi
- bağlaç kullanımı
- fikir geliştirme
- akıcılık

---

## 26. Speaking hatalarını Hata Defterine bağla

Tekrarlanan konuşma problemleri saklanmalı.

Örneğin:

- sürekli yanlış telaffuz edilen kelimeler
- vurgu hataları
- konuşurken tekrar eden padej hataları
- aspect hataları
- yanlış kelime seçimi
- eksik bağlaç kullanımı

Bunlar sonraki çalışmalarda tekrar kullanılmalı.

---

# GÜNLÜK ADAPTİF ÇALIŞMA

## 27. “Günlük Kelimeler” mantığını “Bugünkü Çalışmam” sistemine genişlet

Kullanıcı sadece birkaç günlük kelime görmek yerine gerçek bir çalışma oturumu başlatabilmeli.

Örneğin:

“Bugün 20 dakika çalış.”

Sistem bu süreyi otomatik olarak dağıtmalı.

---

## 28. Günlük çalışmayı adaptif yap

Bir günlük çalışma şu bileşenlerden oluşabilir:

- eski kelimelerin tekrarı
- yeni kelimeler
- Hata Defteri tekrarları
- grammar
- production
- sesli okuma
- kısa konuşma
- kısa TRKI görevi

Her gün aynı oran kullanılmamalı.

İçerik kullanıcının zayıflıklarına göre değişmeli.

---

## 29. Egzersiz çeşitliliğini artır

Kullanılabilecek soru türleri:

- çoktan seçmeli
- yazılı cevap
- boşluk doldurma
- eş anlamlı bulma
- zıt anlamlı bulma
- doğru collocation
- doğru aspect
- doğru padej
- doğru preposition
- cümle oluşturma
- çeviri
- yeniden ifade etme
- konuşarak cevaplama

---

# İSTATİSTİK VE GELİŞİM TAKİBİ

## 30. İstatistikleri beceri bazlı hâle getir

Sadece “kaç kelime biliyorum?” metriği yeterli değil.

Ayrı bölümler bulunmalı:

- Vocabulary Recognition
- Vocabulary Recall
- Vocabulary Production
- Grammar
- Reading
- Writing
- Speaking
- Pronunciation
- TRKI

---

## 31. Kelime bazında aktif kullanım seviyesini takip et

Örneğin:

`избежать`

- Recognition: 95
- Recall: 75
- Production: 30

Sistem kelimenin artık pasif tanıma egzersizinden çok aktif üretim egzersizinde kullanılmasına karar verebilmeli.

Uzun vadede mastery yalnızca lemma seviyesinde tutulmamalı. Temel anahtar mümkün olduğunca:

`lexical_unit + sense + skill`

olmalı.

Böylece kullanıcı aynı kelimenin bir anlamını üretimde güçlü, başka bir anlamını ise yalnızca tanıma seviyesinde biliyor olabilir.

---

## 32. Konu bazında zayıflık analizi oluştur

Örnek:

- Cases: %82
- Aspect: %58
- Motion verbs: %64
- Relative clauses: %45
- Collocations: %69

Bu veriler günlük çalışma planını otomatik etkilemeli.

---

# TRKI B1 / B2 SİSTEMİ

## 33. Ana menüye “ТРКИ B2 Çalış” bölümü ekle

Bu alan normal kelime ve grammar çalışmalarından ayrı bir sınav hazırlık alanı olmalı.

İçeride:

- ТРКИ-I / B1 — temel eksiklerini güçlendirme
- ТРКИ-II / B2 — ana hedef

şeklinde iki seviye bulunabilir.

---

## 34. TRKI bölümünü gerçek sınav becerilerine göre yapılandır

Uzun vadede sistem şu beş bölümü destekleyebilmeli:

- Лексика. Грамматика
- Чтение
- Письмо
- Аудирование
- Говорение

İlk geliştirme aşamasında:

- Grammar / Lexicon
- Reading
- Writing

yeterlidir.

Listening ve Speaking daha sonra eklenebilir.

---

## 35. TRKI için otomatik resmî kaynak keşfi yap

İnternete erişimi olan agent, TRKI materyallerini tek tek kullanıcıdan beklemek yerine önce resmî ve kurumsal kaynakları taramalı.

Öncelik sırası:

- resmî TRKI / TORFL kurumları
- üniversitelerin resmî test merkezleri
- resmî yayımlanmış tipik testler
- kurumsal hazırlık materyalleri

Rastgele blog, forum veya üçüncü taraf “TRKI practice” siteleri resmî kaynak gibi etiketlenmemeli.

Agent her bulduğu materyal için bir kaynak kataloğu oluşturmalı:

- kurum
- seviye
- belge adı
- kaynak URL
- indirme tarihi
- yayın / sürüm tarihi
- `source_hash`
- `snapshot_date`
- `license_status`
- bölüm
- görev numarası
- sayfa
- süre
- içerik türü
- resmî / kurumsal / üçüncü taraf sınıfı

---

## 36. Resmî B1 ve B2 örnek sınavlarını çalışma materyali olarak kullan

Resmî olarak yayımlanmış örnek sınavlar sisteme aktarılabilmeli.

Her sınav paketinde mümkün olduğunca:

- seviye
- kaynak
- kaynak bağlantısı
- bölüm
- görev numarası
- varsa sayfa
- süre
- ilgili beceri
- grammar tag'leri

tutulmalı.

Not: Bir kaynağın internette ücretsiz erişilebilir olması, içeriğin public GitHub reposunda yeniden dağıtılabileceği anlamına gelmeyebilir. Yeniden kullanım koşulları ayrıca kontrol edilmelidir.

## 37. Resmî içerik ile AI tarafından üretilmiş TRKI tarzı içeriği kesin olarak ayır

Arayüzde içerik kaynağı açıkça görünmeli.

Örnek etiketler:

- RESMÎ ÖRNEK
- KURUMSAL KAYNAK
- B2 TARZI PRATİK
- AI ÜRETİMİ

AI tarafından oluşturulmuş hiçbir soru veya görev resmî TRKI sorusu gibi gösterilmemeli.

Bu ayrım soru bankası büyüdükçe mutlaka korunmalı.

---

## 38. İndirilen TRKI PDF ve materyallerini doğrulamadan kullanma

Agent bir PDF veya resmî materyali indirdiğinde içeriği kör şekilde sisteme aktarmamalı.

Kontrol edilmesi gerekenler:

- soru sayıları
- soru numaraları
- cevap anahtarı
- soru–cevap eşleşmeleri
- reading metinleri ile ilgili sorular
- bölüm başlıkları
- görev numaraları
- süre bilgileri
- sayfa referansları

Otomatik çıkarılan veri önce `unverified` durumda tutulmalı.

Kontrol edilen ve doğru olduğu teyit edilen paketler `verified` durumuna geçirilmeli.

PDF'den veri aktarımındaki satır kaymaları veya yanlış cevap eşleşmeleri tüm sınav paketini bozabileceği için bu kontrol zorunlu kabul edilmeli.

---

## 39. TRKI materyallerinde telif ve yeniden dağıtım kurallarına dikkat et

Bir PDF'nin internette ücretsiz erişilebilir olması, içeriğin public GitHub reposunda yeniden dağıtılabileceği anlamına gelmez.

Agent:

- kullanım koşullarını kontrol etmeli
- belgenin tamamını repoya gömmeden önce yeniden dağıtım iznini doğrulamalı
- izin açık değilse kaynağın URL'sini saklamalı
- gerekirse kullanıcı tarafında local import yaklaşımını tercih etmeli
- yalnızca izin verilen materyali repoya dahil etmeli

Kişisel kullanım için indirilen içerik ile public repoda yeniden yayımlanan içerik aynı şey olarak değerlendirilmemeli.

---

---

## 40. TRKI “Çalışma Modu” ve “Sınav Modu”nu ayır

### Çalışma Modu

- anında geri bildirim
- doğru cevap
- açıklama
- hata türü
- ilgili grammar konusu
- Hata Defterine kayıt

### Sınav Modu

- timer
- gerçek sınav akışı
- sorular sırasında açıklama yok
- sonuçlar sınav sonunda
- bölüm bazında analiz
- hata analizi

---

# TRKI DIAGNOSTIC

## 41. B1 / B2 Diagnostic Test ekle

TRKI merkezine ilk kez girildiğinde veya kullanıcı istediğinde kısa bir tanı testi yapılabilmeli.

Amaç kullanıcıyı tek bir “B1 / B2” etiketiyle sınıflandırmak değil, beceri profili oluşturmaktır.

Örnek bileşenler:

- vocabulary / lexicon
- grammar
- reading
- kısa writing görevi

Sonuçlar örneğin şöyle gösterilebilir:

- Aspect — zayıf
- Cases — iyi
- Vocabulary — B1 güçlü
- Reading — B2'ye yakın
- Writing — geliştirilmesi gerekiyor

Bu başlangıç profili daha sonra:

- Bugünkü Çalışmam
- Grammar Lab
- Production Mode
- TRKI çalışma önerileri

için başlangıç ağırlıklarını belirlemeli.

---

# TRKI READING

## 42. Reading için özel arayüz oluştur

Reading normal quiz gibi görünmemeli.

Kullanıcı aynı anda:

- metni
- soruları

görebilmeli.

Uzun metin desteği bulunmalı.

---

## 43. Reading sorularını beceri türüne göre etiketle

Örneğin:

- ana fikir
- detay bulma
- çıkarım
- yazarın amacı
- yazarın tutumu
- bağlamdan kelime anlamı
- metin organizasyonu

Sınav sonunda yalnızca toplam puan değil, okuma zayıflıkları da gösterilmeli.

---

# TRKI GRAMMAR / LEXICON

## 44. Her soruya grammar / lexicon etiketi ekle

Örnek:

- case.genitive
- case.instrumental
- verb.aspect
- verb.motion
- government
- relative.kotoryi
- conjunction
- lexical.collocation
- word-formation

Sınav sonunda konu bazında performans gösterilmeli.

---

# TRKI WRITING

## 45. Writing çalışma alanı oluştur

Writing bölümünde:

- görev metni
- geniş yazma alanı
- timer
- kelime sayacı
- çalışma modu
- sınav modu

bulunmalı.

---

## 46. Writing değerlendirmesini çok boyutlu yap

Sadece grammar kontrolü yapılmamalı.

Ayrı başlıklar:

- görevi yerine getirme
- içerik
- iletişim amacı
- organizasyon
- cohesion
- vocabulary
- grammar
- dil normları

AI sonucu resmî TRKI puanı gibi gösterilmemeli.

“Çalışma amaçlı tahmini değerlendirme” olduğu açıkça belirtilmeli.

---

## 47. Writing için “Düzelt ve Tekrar Yaz” sistemi ekle

Akış:

1. kullanıcı metni yazar
2. sistem hataları analiz eder
3. kullanıcı geri bildirimi görür
4. aynı görevi yeniden yazar
5. ilk ve ikinci metin karşılaştırılır
6. tekrar eden hatalar gösterilir

Bu sistem özellikle aktif B2 yazma gelişimi için kullanılmalı.

---

## 48. Writing hatalarını Hata Defterine bağla

Writing sırasında yapılan hatalar daha sonra tekrar kullanılmalı.

Örneğin:

- который
- aspect
- conjunction
- word order
- case
- lexical choice
- collocation

konularındaki tekrar eden problemler sonraki günlük çalışmalara aktarılmalı.

---

# TRKI LISTENING VE SPEAKING — SONRAKİ AŞAMA

## 49. Listening altyapısını şimdiden hesaba kat

İlk sürümde yapılması zorunlu değil.

İleride:

- ses oynatma
- tekrar dinleme sınırı
- listening soruları
- sonuç analizi
- hata kategorileri

eklenebilmeli.

---

## 50. TRKI Speaking'i mevcut konuşma sistemiyle birleştir

Normal konuşma modu ileride TRKI Speaking hazırlığında da kullanılabilmeli.

Desteklenebilecek görevler:

- soru-cevap
- durum / rol oyunu
- görüş belirtme
- kısa monolog
- serbest konuşma

---

# TÜM SİSTEMLERİ BİRBİRİNE BAĞLA

## 51. TRKI sonuçlarını normal öğrenme sistemine bağla

TRKI ayrı ve kapalı bir alan olmamalı.

Örneğin kullanıcı TRKI testinde:

- aspect
- который
- collocation

konularında çok hata yaptıysa:

- Hata Defteri güncellenmeli
- günlük çalışma buna göre değişmeli
- production modunda bu konular kullanılmalı

---

## 52. AI geri bildirimini öğretici hâle getir

AI yalnızca:

“Doğru / yanlış”

dememeli.

Şunları açıklayabilmeli:

- neden yanlış
- hangi kural devrede
- kullanıcının cevabı ile doğru cevap arasındaki fark
- daha doğal ifade
- benzer bir örnek

Özellikle production ve writing modunda geri bildirim öğretici olmalı.

---

## 53. AI tarafından üretilen içerikleri kullanıcının verisine göre seç

Cümleler ve görevler mümkün olduğunca kullanıcının:

- yeni kelimelerinden
- zorlandığı kelimelerden
- Hata Defterindeki konulardan
- production seviyesi düşük kelimelerden
- B2 hedefi için önemli yapılardan

üretilmeli.

---

## 54. Zorluk seviyesini adaptif yap

Başlangıçta:

- kısa cümle
- basit yapı
- kontrollü görev

Daha sonra:

- orta / uzun cümle
- birden fazla clause
- bağlaçlar
- daha doğal kelime kullanımı
- B2 seviyesinde üretim

şeklinde ilerlemeli.

---

## 55. Uygulamanın ana başarı ölçütünü “aktif kullanım” yap

Bir kelimeyi birçok kez doğru tanımak, o kelimeyi aktif olarak kullanabilmek anlamına gelmez.

Uzun vadede sistemin ana sorusu:

“Bu kelimeyi biliyor muyum?”

yerine:

“Bu kelimeyi doğru bağlamda kendi başıma kullanabiliyor muyum?”

olmalı.

---

# HEDEF ÖĞRENME DÖNGÜSÜ

## 56. Öğrenme döngüsünü şu yapıya dönüştür

1. Yeni kelimeyi gör
2. Türkçe anlamını öğren
3. Eş / zıt anlam ilişkilerini gör
4. Collocation'larını gör
5. Bağlam içinde gör
6. Hatırla
7. Yazılı olarak üret
8. Kendi cümlende kullan
9. Sesli oku
10. Konuşmada kullan
11. Hata yap
12. Hata Defterine kaydedilsin
13. Farklı bağlamda tekrar karşılaş
14. TRKI görevinde kullan
15. Aktif kelime dağarcığına geç

---

# UYGULAMANIN UZUN VADELİ YAPISI

## 57. Uygulamayı kişisel Rusça öğrenme sistemine dönüştür

Nihai yapı şu bileşenlerin birleşiminden oluşmalı:

- Vocabulary Trainer
- Production Trainer
- Grammar Lab
- Speaking Trainer
- Pronunciation Trainer
- Reading Trainer
- Writing Trainer
- TRKI B1/B2 Preparation
- Adaptive Review
- Personal Error Notebook
- Skill Analytics

Amaç yalnızca kelime ezberlemek değil, Rusçayı aktif olarak kullanabilmek olmalı.

---

# ÖNCELİK SIRASI — IMPLEMENTATION ORDER

## Aşama 0 — Kaynağı dondur

1. Ek A'daki son kelime düzeltmelerini `kelimeler_tam_strict(3).txt` üzerine uygula.
2. Sonucu `vocab_reviewed_v1.txt` veya eşdeğer versioned isimle sakla.
3. Kaynak hash'ini kaydet.
4. Orijinal dosyayı değiştirilmemiş hâliyle ayrıca koru.
5. Bu aşamada UI veya flashcard redesign yapma.

## Aşama 1A — Veri çekirdeği

6. `lexical_unit` veri modelini oluştur.
7. `entry_type` desteğini ekle.
8. `sense` katmanını oluştur.
9. Rusça→Rusça relation tiplerini ayır.
10. `raw_entry`, provenance ve verification metadata'sını koru.
11. Importer + dry-run + QA raporu oluştur.
12. Lemma normalizasyonu ve kontrollü duplicate merge yap.
13. Migration / rollback altyapısını ekle.

**Exit kriteri:** 2339 satırlık kaynak kayıpsız biçimde import edilebilmeli; her dönüşüm raporlanabilmeli ve geri alınabilmeli.

## Aşama 1B — Kontrollü linguistic enrichment

14. Fiillerde aspect çiftlerini bağla.
15. Управление / preposition / padej bilgilerini ekle.
16. Collocation sistemini ekle.
17. Kelime ailelerini bağla.
18. Vurgu bilgisini destekle.
19. CEFR / tema / tag alanlarını destekle.
20. Enrichment alanlarında source + confidence + verification tut.

**Kural:** Otomatik enrichment, doğrulanmadan puanlı egzersizin kesin cevap anahtarı olamaz.

## Aşama 2 — Öğrenme çekirdeği

21. Recognition / Recall / Production ayrımını uygula.
22. Typed Recall ekle.
23. `accepted_answers[]` ve kontrollü cevap değerlendirmesini ekle.
24. Production Mode'u oluştur.
25. Kelime/ifade egzersizlerini lexical data'dan üret.

## Aşama 3 — Hata ve Grammar

26. Üretim hata taxonomy'sini oluştur.
27. Merkezi Hata Defterini oluştur.
28. Grammar Lab'i ekle.
29. Contrast Training'i ekle.
30. Hata Defterini adaptif tekrar sistemine bağla.

## Aşama 4 — Günlük adaptif motor

31. “Bugünkü Çalışmam” oturumunu oluştur.
32. Vocabulary + Production + Grammar + Error Notebook tekrarlarını tek oturumda orkestre et.
33. Skill bazlı istatistikleri ekle.
34. `lexical_unit + sense + skill` seviyesinde mastery takibini destekle.
35. Zayıflıklara göre günlük içerik ağırlıklarını değiştir.

**Not:** Bu aşama Speaking'den önce gelmeli. Çünkü bütün sonraki modların hangi içeriği ne zaman göstereceğini belirleyen omurga budur.

## Aşama 5 — Speaking

36. Read Aloud.
37. Güvenilir STT karşılaştırması.
38. Gerçek ses analizi destekleniyorsa telaffuz / vurgu / akıcılık ölçümleri.
39. Prompted Speech.
40. Free Speech.
41. Speaking hatalarını Hata Defterine bağla.

**Kural:** STT doğruluğundan sahte “telaffuz puanı” türetme.

## Aşama 6 — TRKI

42. TRKI B1/B2 merkezi.
43. Diagnostic Test.
44. Resmî kaynak keşfi + source catalog.
45. Grammar / Lexicon.
46. Reading.
47. Writing.
48. Çalışma Modu / Sınav Modu.
49. TRKI sonuçlarını Hata Defteri ve Bugünkü Çalışmam sistemine bağla.

## Aşama 7 — Daha sonra

50. TRKI Listening.
51. TRKI Speaking.
52. Daha gelişmiş adaptif zorluk sistemi.
53. Gerekirse flashcard modunu yeniden değerlendirme.

---

# ŞİMDİLİK ERTELENEN KONU: FLASHCARD

Mevcut flashcard sisteminde değişiklik yapılması şu an kesin değildir.

Bu nedenle:

- flashcard sistemini kaldırma
- flashcard sistemini büyük ölçüde değiştirme
- yeni rating sistemi ekleme
- flashcard akışını yeniden tasarlama

şimdilik ana geliştirme planının dışında tutulmalıdır.

Kelime veri modeli, production sistemi, speaking, Hata Defteri ve TRKI sistemi oturduktan sonra flashcard modunun gerçekten değiştirilmesi gerekip gerekmediği yeniden değerlendirilebilir.

Önemli: Flashcard değişikliklerinin ertelenmesi, spaced repetition / adaptif tekrar mantığının ertelendiği anlamına gelmez.

Production, Grammar, Speaking ve Hata Defteri görevlerinin ne zaman tekrar karşısına çıkacağını belirleyen adaptif tekrar sistemi yine geliştirilmelidir.

Örneğin:

- bugün aspect hatası
- birkaç gün sonra farklı bir production sorusu
- daha sonra yeni bir bağlam
- sonrasında TRKI görevi

şeklinde beceri bazlı tekrar yapılabilmelidir.

---

# EN KRİTİK PRENSİP

Yeni özellikler birbirinden bağımsız mini oyunlar olarak yapılmamalı.

Hepsi aynı öğrenme sistemine bağlı olmalı:

**Kelime Verisi → Egzersiz → Üretim → Hata → Hata Defteri → Adaptif Tekrar → Speaking / Writing → TRKI → Yeni Zayıflık Analizi**

Uygulamanın asıl gücü bu döngüden gelmeli.

---

# EK A — `kelimeler_tam_strict(3).txt` SON STRICT DÜZELTMELER

Bu liste, 2339 satırlık kaynağın 8 fazda yapılan ikinci kalite kontrolünün nihai sonucudur.

Aşağıdaki düzeltmeler `vocab_reviewed_v1` oluşturulmadan önce uygulanmalıdır:

1. `Изжога : Reflü`
   → `Изжога : mide ekşimesi; mide yanması`

2. `Проспать : Uyuyakalmak; geç kalkmak`
   → `Проспать : fazla uyumak; uyuyup geç kalmak; uyuyup bir şeyi kaçırmak`

3. `Защищаться : Savunmak`
   → `Защищаться : kendini savunmak; korunmak`

4. `Нездоровиться : Hastalanmak`
   → `Нездоровиться : kendini iyi hissetmemek; rahatsız hissetmek`

5. `Неотложная помощь : Acil servis`
   → `Неотложная помощь : acil yardım; acil tıbbi yardım`

6. `Пломбировать : damgalamak`
   → bu duplicate karşılığı kaldır; `Пломбировать : mühürlemek; plomba vurmak; (diş) dolgu yapmak`

7. `Пятью : Beş kişiyle; beşli olarak`
   → `Пятью : beşle; beş ile`

8. `Шестью : Altı kişiyle; altılı olarak`
   → `Шестью : altıyla; altı ile`

9. `Семью : Yedi kişiyle; yedili olarak`
   → `Семью : yediyle; yedi ile`

10. `Восемью : Sekiz kişiyle; sekizli olarak`
    → `Восемью : sekizle; sekiz ile`

11. `Подрасти : Büyüyüp kıyafetlere sığmamak, eski alışkanlıkları/tavırları geride bırakacak kadar büyümek`
    → `Подрасти : biraz büyümek; boy atmak; büyüyüp gelişmek`

12. `Сочувствовать : Acısını paylaşmak; duygudaşlık göstermek; başsağlığı dilemek`
    → `Сочувствовать : acısını paylaşmak; duygudaşlık göstermek; haline üzülmek`

13. `Прожить два года : iki yılı bir yerde doldurmak (süreyi doldurmak)`
    → `Прожить два года : iki yıl yaşamak; iki yıl geçirmek`

14. `Современник : çağdaş, akran`
    → `Современник : çağdaş; aynı dönemde yaşamış/yaşayan kişi`

15. `Всплакнуть : gözü dolmak`
    → `Всплакнуть : biraz ağlamak; hafifçe ağlamak; birkaç gözyaşı dökmek`

Düzeltme sonrasında:

- satır sayısını ve parse sayısını tekrar kontrol et
- source hash üret
- dosyayı versioned biçimde sakla
- import sırasında bu dosyayı `reviewed` kaynak olarak işaretle
- orijinal `kelimeler_tam_strict(3).txt` dosyasını ayrıca koru

---

# EK B — AGENT İÇİN ÇALIŞMA KURALLARI

Agent bu roadmap'i uygularken:

1. Öncelik sırasını atlamamalı.
2. Aşama 0 ve Aşama 1A tamamlanmadan geniş çaplı feature geliştirmesine başlamamalı.
3. Mevcut çalışan özellikleri gereksiz yere yeniden yazmamalı.
4. Her büyük migration öncesi backup ve dry-run üretmeli.
5. Veri kaybı veya belirsiz merge varsa otomatik karar vermek yerine raporlamalı.
6. `unverified` linguistic enrichment'i kesin doğru cevap anahtarı gibi kullanmamalı.
7. Orijinal raw kayıtları korumalı.
8. Flashcard redesign'ına bu roadmap kapsamında başlamamalı.
9. Her aşamanın sonunda:
   - yapılan değişiklikler
   - değişen dosyalar
   - migration sonucu
   - test sonucu
   - bilinen riskler
   - sonraki aşama
   özetlenmeli.
10. Bir aşama tamamlanmadan sonraki aşamaya büyük çaplı geçiş yapılmamalı.

Roadmap'in en kritik mimari zinciri:

**Reviewed Source → Lexical Unit / Sense → Verified Enrichment → Exercise → Production → Error → Error Notebook → Adaptive Review → Speaking / Writing → TRKI → New Weakness Analysis**
