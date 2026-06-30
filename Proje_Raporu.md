# Ru-Tr Kelime Öğrenme Uygulaması — Kapsamlı Proje Raporu

**Proje Adı:** Rusça-Türkçe Kelime (Ru-Tr Sözlük)  
**Tür:** PWA (Progressive Web App) — Kelime Öğrenme & Quiz Uygulaması  
**Platform:** Vercel üzerinde sunulan, tarayıcı tabanlı (mobil uyumlu) web uygulaması  
**Dil:** Ön uçta Türkçe / Rusça karma; arka uçta Node.js serverless functions  

---

## 1. Proje Özeti

Bu proje, Rusça-Türkçe kelime öğrenmek isteyen kullanıcılar için geliştirilmiş, zengin özellikli bir PWA'dır. Kullanıcılar flashcard, quiz, yazma (typing), kategoriler, önek (prefix) testleri ve TORFL sınav hazırlığı gibi modlar aracılığıyla kelime çalışabilir. Uygulama; offline çalışabilir, yapay zeka entegrasyonu (DeepSeek/OpenRouter) ile kelime açıklamaları ve örnek cümleler sunar, günlük hedef ve "streak" (günlük seri) takibi ile kullanıcıyı motive eder, SRS (Spaced Repetition System) algoritması ile tekrarları optimize eder ve push bildirimleri ile kullanıcıyı hatırlatır.

---

## 2. Teknik Mimari ve Teknolojiler

### Ön Uç (Frontend)
- **Vanilla JavaScript (ES6+):** Framework kullanılmamış; tamamen saf JS ile modüler sınıf yapıları (`App`, `QuizMode`, `FlashcardMode`, `SRSManager`, vb.) kullanılmış.
- **HTML5:** Single-page application (SPA) yapısı; tüm modlar `<section>` olarak `index.html` içinde tanımlı, görünürlük `hidden` sınıfı ile kontrol ediliyor.
- **CSS3:** Özel tasarım sistemi; Duolingo esintili gamification renk paleti, CSS değişkenleri ile açık/koyu tema desteği, 3D buton efektleri ve responsive tasarım.
- **Chart.js:** Öğrenme analitiği için polar area grafik.
- **PWA:** Manifest, Service Worker (`sw.js`), offline cache stratejisi (Cache-First + Network-First), install prompt yönetimi.
- **Cloudflare Turnstile:** AI API endpoint'lerinde bot koruması ve rate limiting.

### Arka Uç (Backend)
- **Vercel Serverless Functions:** Node.js (ES Modules) fonksiyonları.
  - `/api/ai` → OpenRouter (DeepSeek) üzerinden yapay zeka istekleri.
  - `/api/ai-config` → Turnstile site key yapılandırması.
  - `/api/push/*` → Web Push bildirimleri için cron job handler'ları.
- **Redis (Upstash):** Push aboneliklerinin ve bildirim zamanlamalarının saklanması.
- **Web Push:** VAPID anahtarları ile iOS PWA bildirim desteği.

### Veri & Yardımcı Araçlar (Python)
- **Python 3.13+:** Veri işleme ve içerik üretimi script'leri.
  - `generate_real_sentences.py` → OpenRouter AI ile B1-B1+ seviyesinde gerçekçi örnek cümleler üretir.
  - `generate_sentences.py` → Basit kural motoru ile sentetik (kalıp) cümleler üretir.
  - `translate_ielts.py` → Google Translator ile İngilizce kelime listelerini Rusça/Türkçe'ye çevirir.
  - `extract_pdf.py` → PDF'lerden İngilizce kelime ve seviyelerini çıkarır.
  - `detect_duplicates.py` → Yeni kelimeleri mevcut veritabanıyla karşılaştırıp çakışmaları tespit eder.

---

## 3. Dosya Yapısı ve İçerik Analizi

```
Ru-Tr-main/
├── index.html                  # Ana SPA giriş noktası (588 satır, tüm modlar ve modallar)
├── sw.js                         # Service Worker (cache v42, offline desteği, push notification)
├── manifest.json                 # PWA manifest
├── vercel.json                   # Vercel cron job tanımları (5 günlük push zamanı)
├── package.json                  # Node.js bağımlılıkları (web-push, @upstash/redis)
├── css/style.css                 # 2777 satır; Duolingo-temalı, koyu/açık mod destekli
├── js/
│   ├── app.js                    # ~1342 satır; ana App sınıfı, navigasyon, modal, CRUD
│   ├── data.js                   # ~134 satır; kelime yükleme (kelimeler_tam.txt), sentences.json
│   ├── storage.js                # Yerel depolama ve migrasyon yönetimi
│   ├── user-words.js             # Kullanıcı tarafından eklenen kelimeleri yönetir
│   ├── trash.js                  # Çöp kutusu (soft delete) yönetimi
│   ├── word-categories.js        # Kelime kategorilerini satır numarasına göre atar
│   ├── srs.js                    # ~115 satır; SM-2 algoritması ile SRS yönetimi
│   ├── mastered-manager.js       # "Öğrenilmiş" kelime güven skoru yönetimi
│   ├── study-selector.js         # Akıllı kelime seçimi (review + coverage)
│   ├── tracker.js                # ~285 satır; streak, heatmap, aktivite takibi
│   ├── stats.js                  # ~133 satır; kategori bazlı analitik ve AI tavsiye
│   ├── goals.js                  # ~122 satır; günlük hedef (10/20/30/50) ve streak
│   ├── favorites.js              # Favori kelime yönetimi
│   ├── notifications.js          # Push bildirim abonelik ve yönetimi
│   ├── ai.js                     # ~300 satır; Turnstile + AI Manager (cache, rate limit)
│   ├── flashcard.js              # Flashcard modu (iki yönlü: ru→tr, tr→ru)
│   ├── quiz.js                   # Quiz modu (4 seçenekli)
│   ├── full-choice-quiz.js       # "Progressive" quiz; bilinen kelimeleri turdan çıkarır
│   ├── typing.js                 # Yazma modu; kullanıcı yazarak cevap verir
│   ├── categories.js             # Kategori (unit) bazlı çalışma ve liste
│   ├── prefixes-mode.js          # Rusça önek (prefix) test modu
│   ├── daily.js                  # Günün kelimeleri (5 kelime)
│   ├── torfl.js                  # TORFL sınav modu (JSON/TXT upload destekli)
│   └── chart.min.js              # Chart.js kütüphanesi (yerel)
├── api/
│   ├── ai.js                     # ~192 satır; OpenRouter AI proxy, rate limit, CORS, Turnstile
│   ├── ai-config.js              # ~30 satır; Turnstile site key config endpoint
│   └── push/                     # Cron handler'lar (5 adet: saat 10,13,16,19,22)
├── lib/push/                     # Push bildirim kütüphanesi (send, store, messages, cron-handler)
├── scripts/
│   └── generate-vapid-keys.mjs   # VAPID anahtar üretim script'i
├── kelimeler_tam.txt             # ~1708 satır; ana kelime veritabanı (format: Rusça : Türkçe)
├── sentences.json                # ~230KB; kelime ID'lerine göre örnek cümleler (RU + TR)
├── new_words.txt                 # Yeni eklenecek kelimeler
├── yeni_kelimeler.txt            # ~55 satır; kullanıcı notlarıyla yeni kelimeler
├── kontrol_edilecek_kelimeler.txt # ~30 satır; kontrol listesi
├── .env.example / .env.local     # API anahtarları ve çevre değişkenleri
├── dummy.js, test.js, test.cjs, test-quiz.js, url_test.js  # Çeşitli test ve deneme dosyaları
└── docs/push-notifications.md    # Push notification kurulum dokümanı
```

---

## 4. Özellikler ve Modlar (Detaylı)

### 4.1. Flashcard Modu (`js/flashcard.js`)
- İki yönlü çalışma: Rusça → Türkçe ve Türkçe → Rusça.
- Kart çevirme (CSS flip animasyonu).
- "Biliyorum / Bilmiyorum" butonları ile kendi kendine değerlendirme.
- AI entegrasyonu: "Açıkla" ve "Örnek Al" butonları ile DeepSeek açıklamaları.
- Favori ekleme / çıkarma.
- Güven seviyesi (confidence) göstergesi.

### 4.2. Quiz Modu (`js/quiz.js`)
- 4 seçenekli çoktan seçmeli sorular.
- Doğru cevaplar +10 puan; yanlışlarda AI açıklaması (varsa) snackbar'da gösterilir.
- Soru sayısı seçimi: 5, 10, 20.
- **Pul (Scope) sistemi:** "Sadece öğrenilmemişler" veya "Tüm kelimeler".
- Kapsama (Coverage) takibi: Tüm kelimeler havuzunda seanslar arasında kaldığın yer korunur.

### 4.3. Full Choice Quiz (`js/full-choice-quiz.js`)
- "Progressive" sistem: Doğru bilinen kelime turdan çıkarılır.
- Tur tamamlanana kadar devam eder; sonra yeni tur başlatılabilir.
- Öğrenme psikolojisine uygun "bilinenleri eleyerek ilerleme" mekaniği.

### 4.4. Typing (Yazma) Modu (`js/typing.js`)
- Kullanıcı kelimenin çevirisini klavye ile yazar.
- İpucu (hint) butonu: Harf harf yardım.
- AI çeviri kontrolü desteği (arayüzde buton mevcut).

### 4.5. Kategoriler (Categories) — `js/categories.js`
- Kelimeler kategorilere (unit'lere) ayrılmış.
- Kategori seçimi ve içindeki kelimeleri listeleme.
- Seçilen kategoride flashcard çalışma imkanı.

### 4.6. Prefixes (Önek) Modu — `js/prefixes-mode.js`
- Rusça önekler (про-, под-, от-, об-, за-, пере-) öğrenme ve test modu.

### 4.7. Günlük Kelimeler (Daily) — `js/daily.js`
- Her gün 5 kelime önerir (3 öğrenilmemiş + 2 review).
- Tarih bazlı; aynı gün tekrar açılırsa aynı kelimeler gösterilir.
- Bu kelimelerle mini quiz yapılabilir.

### 4.8. TORFL Modu — `js/torfl.js`
- Kullanıcı kendi JSON veya TXT dosyasını yükleyebilir.
- Çoktan seçmeli soru formatı.
- Basit quiz skorlama sistemi.

### 4.9. Analitik & İstatistikler (`js/stats.js` + `js/tracker.js` + `js/goals.js`)
- **Polar Area Chart:** Kategori bazlı başarı oranları.
- **AI Tavsiye:** En zayıf kategori tespit edilip kullanıcıya öneride bulunulur.
- **Heatmap:** Son 7 günün aktivite grafiği (GitHub benzeri).
- **Streak Takibi:** Günlük seri, en uzun seri, haftalık aktiflik.
- **Günlük Hedef:** 10/20/30/50 kelime seçimi; ilerleme çubuğu ve streak.

### 4.10. Favoriler & Çöp Kutusu
- Kelimeye yıldız (★) ekleyip favori listesinde görüntüleme.
- Kelimeyi kaldırma (çöp kutusu); geri alma veya kalıcı silme.

### 4.11. Kullanıcı Kelime Ekleme
- Modal üzerinden "Rusça : Türkçe" formatında yeni kelime ekleme.
- Eklenen kelimeler `localStorage` üzerinde saklanır; ana kelime havuzuna dahil olur.

### 4.12. Veri Yedekleme & Geri Yükleme
- Tüm kullanıcı verileri (stats, SRS, favoriler, çöp kutusu, kelimeler) JSON olarak dışa aktarılabilir.
- JSON dosyası üzerinden geri yükleme; uygulama otomatik yenilenir.

---

## 5. Veri Yönetimi ve Depolama

### 5.1. Kelime Veritabanı (`kelimeler_tam.txt`)
- **Format:** `Rusça ifade : Türkçe karşılık` veya `Rusça = Türkçe` (bazı özel durumlar için).
- **Boyut:** ~1708 satır, ~77KB.
- **İçerik:** Kelimeler, deyimler, kalıplar, fiil önekleri ve gramer notları.
- **Örnek:** `Мир тесен : Dünya dar (deyim)`
- **Kategorizasyon:** `word-categories.js` dosyasında satır numarası aralıklarına göre kategoriler (örn: "Unit 2: İş Dünyası") tanımlanmış.

### 5.2. Örnek Cümleler (`sentences.json`)
- **Yapı:** `{ "word_id": [ { "ru": "...", "tr": "..." } ] }`
- **Üretim:** Önce `generate_sentences.py` ile basit kalıp cümleler; ardından `generate_real_sentences.py` ile AI tarafından B1-B1+ seviyesinde gerçekçi cümleler üretilir.
- **Boyut:** ~230KB.

### 5.3. Yerel Depolama (`localStorage`)
Uygulama aşağıdaki anahtarları kullanır:
- `stats` → `totalCorrect`, `totalWrong`, `masteredWords`, `wordProgress`
- `ru_tr_srs_data` → SM-2 SRS kayıtları (`reps`, `interval`, `ease`, `dueDate`)
- `goals` → Günlük hedef, ilerleme, streak
- `ru_tr_tracker_data` → Aktivite takibi, streak, heatmap verisi
- `ru_tr_user_words` → Kullanıcı tarafından eklenen kelimeler
- `ru_tr_deleted_words` → Çöp kutusu
- `favorites` → Favori kelime ID'leri
- `rutr_ai_cache` → AI açıklamalarının önbelleği (max 500 kayıt)
- `dailyWordsDate` / `dailyWordsIds` → Günlük kelime seçimi
- `study_*` → StudySelector coverage ve review cursor verileri
- `theme` → Açık / koyu tema tercihi

### 5.4. Service Worker Cache (`sw.js`)
- `CACHE_NAME = 'rutr-v42'` — versioned cache.
- `Network-First` stratejisi: `index.html`, `kelimeler_tam.txt`, `sentences.json`, `manifest.json` için önce ağ, sonra cache.
- `Cache-First` stratejisi: Statik JS/CSS/font/asset dosyaları için önce cache, sonra ağ.
- `/api/` yolları cache'e alınmaz.
- Kullanıcı "Güncelle" butonu ile cache'i yenileyebilir.

---

## 6. AI Entegrasyonu

### 6.1. Amaç
Kullanıcıya kelime açıklamaları, örnek cümleler, gramer kontrolü ve çeviri değerlendirmesi sunmak.

### 6.2. Altyapı
- **Model:** `deepseek/deepseek-chat` (OpenRouter üzerinden).
- **API:** Vercel serverless function (`/api/ai.js`) aracılığıyla istekler proxy edilir.
- **Güvenlik:**
  - Cloudflare Turnstile (invisible widget) ile bot doğrulama.
  - IP bazlı rate limit: Dakikada max 30 istek (`Map` ile in-memory).
  - CORS: Sadece `https://moyslovar.vercel.app` ve `localhost:3000`.
  - Input sanitization: 500 karakter limit, satır sonu karakterleri temizlenir.

### 6.3. Prompt Türleri
- `checkGrammar` → Rusça cümle gramer kontrolü (Türkçe cevap).
- `generateExample` → Kelime için örnek cümle (RU + TR).
- `explainWord` → Kelime açıklaması (kullanım alanları, eş/zıt anlamlar).
- `checkTranslation` → Kullanıcı çevirisinin değerlendirilmesi.

### 6.4. Ön Uç Cache
- `localStorage` içinde `rutr_ai_cache` anahtarı ile sonuçlar önbelleğe alınır.
- Max 500 kayıt; sınır aşıldığında en eski 100 kayıt silinir.
- `QuotaExceededError` durumunda cache tamamen temizlenir.

---

## 7. Push Bildirimleri ve Altyapı

### 7.1. Teknolojiler
- **Web Push Protocol:** `web-push` npm paketi.
- **Abonelik Depolama:** Upstash Redis (`@upstash/redis`).
- **Zamanlama:** Vercel Cron Jobs (`vercel.json` içinde 5 ayrı cron tanımı).

### 7.2. Bildirim Zamanlaması (Türkiye Saati)
- 10:00, 13:00, 16:00, 19:00, 22:00
- UTC cron: `0 7,10,13,16,19 * * *`

### 7.3. Mesaj Mantığı
- Günlük hedef tamamlanmamışsa: `streak_reminder` (seri hatırlatması).
- Hedef tamamlanmışsa: `word_recall`, `favorite_review`, `daily_goal_nudge` dönüşümlü olarak.

### 7.4. Gerekli Çevre Değişkenleri
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `OPENROUTER_API_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`

---

## 8. Kod Kalitesi ve Güvenlik

### 8.1. Güvenlik
- **XSS Koruması:** `app.sanitizeHTML()` metodu ile tüm kullanıcı girdileri ve AI yanıtları `textContent` bazlı temizleniyor.
- **HTML Injection:** `innerHTML` kullanımı sadece sanitize edilmiş verilerle yapılıyor.
- **CSRF/CORS:** API endpoint'lerinde CORS başlıkları ve origin whitelist uygulanmış.
- **Rate Limiting:** AI endpoint'inde IP bazlı 30 req/min sınırı.
- **Turnstile:** AI endpoint'ine erişim için bot doğrulaması zorunlu.
- **Service Worker:** `/api/` yolları cache'e dahil edilmemiş; API istekleri dışarı sızmıyor.

### 8.2. Kod Kalitesi (Güçlü Yönler)
- **Modüler yapı:** Her özellik ayrı dosya ve sınıf olarak tanımlı (`QuizMode`, `FlashcardMode`, `SRSManager`, vb.).
- **Single Responsibility:** `app.js` navigasyon ve koordinasyon; mod dosyaları kendi iş akışlarını yönetir.
- **Event Listener Temizliği:** Buton klonlama (`cloneNode`) yöntemi ile eski listener birikimi önlenmiş.
- **Defensive Programming:** `localStorage` parse hataları `try-catch` ile yutuluyor; varsayılan değerler tanımlı.
- **Migration Desteği:** `storage.js` içinde veri migrasyonları için normalize fonksiyonları mevcut.
- **A11y (Erişilebilirlik):** Butonlarda `aria-label`, `aria-pressed`, `aria-live` ve `role="status"` kullanımı.
- **Responsive:** `max-width: 550px` ile mobil-öncelikli tasarım; `dvh` birimleri ile mobil tarayıcı uyumu.

---

## 9. Geliştirme & İyileştirme Önerileri

### 9.1. Teknik Altyapı
1. **Framework/Build Tool:** Vanilla JS ile büyüyen bir projeyi yönetmek zorlaşabilir. Vite + Preact/Svelte veya en azından TypeScript ile tipleme getirilmesi önerilir.
2. **State Management:** `localStorage` üzerinde dağınık state yönetimi yerine tek bir `StorageManager` veya `IndexedDB` kullanımı daha sağlıklı olur (özellikle 1700+ kelime ve cümle verisi büyüdükçe).
3. **Service Worker:** `ASSETS` listesi manuel güncelleniyor; build time'da otomatik generate edilebilir (Workbox gibi).
4. **CSS:** 2777 satırlık tek CSS dosyası; CSS Modules veya Tailwind benzeri bir utility-first yaklaşımı bakımı kolaylaştırır.
5. **Testing:** `test.js`, `test.cjs` gibi dosyalar var ama formelleşmemiş. Jest/Vitest ile unit testler ve Playwright ile E2E testler yazılmalı.

### 9.2. Veri & İçerik
1. **Kelime Veritabanı:** `kelimeler_tam.txt` düz metin dosyası; JSON veya SQLite formatına geçiş arama ve filtreleme performansını artırır.
2. **Cümle Kalitesi:** `generate_real_sentences.py` harika bir adım; fakat cümlelerin kalite kontrolü (insan review) eklenebilir.
3. **IELTS Entegrasyonu:** `translate_ielts.py` ve `extract_pdf.py` mevcut ama `js/ielts_data.js` ve `js/ielts_progress.json` projeye dahil değil gibi görünüyor (dosya var mı kontrol edilmeli). Eğer aktif kullanılmıyorsa, IELTS modu arayüze entegre edilebilir.
4. **Multilingual Support:** Uygulama arayüzü Türkçe/Rusça karışık; kullanıcı tercihine göre tam Türkçe veya tam Rusça seçeneği sunulabilir.

### 9.3. Özellik & UX
1. **Sesli Telaffuz:** Rusça kelimeler için TTS (Text-to-Speech) entegrasyonu (Web Speech API veya harici servis) büyük bir katma değer olur.
2. **Kelime Seviyeleri:** Kelimelerin CEFR seviyeleri (A1, A2, B1, B2, C1) etiketlenmemiş; filtreleme ve ilerleme takibi için seviye bilgisi eklenebilir.
3. **Sosyal Özellikler:** Skor tablosu (leaderboard) veya arkadaşlarla rekabet eklenebilir.
4. **Bildirim Zenginliği:** Push bildirimlere eylem butonları (örn: "Şimdi Çalış") eklenebilir.
5. **Arayüz Temizliği:** `index.html` 588 satır ve oldukça yoğun; modal ve ekranlar ayrı template dosyalarına bölünebilir.
6. **Hard Words (SRS) Modu:** `hardwordsMode` HTML'de tanımlı ama JS'de aktif olarak yönetilmiyor gibi görünüyor; tamamlanmalı veya kaldırılmalı.
7. **Mastered Archive:** `masteredArchiveMode` HTML'de tanımlı ama eksik görünüyor; tamamlanmalı.

### 9.4. Güvenlik & Performans
1. **API Key Leakage:** `.env.local` dosyası `.gitignore`'da değil mi kontrol edilmeli; geçmişte commit edilmişse key'ler rotate edilmeli.
2. **AI Cache Encryption:** `localStorage` içindeki AI cache kullanıcı tarafından okunabilir; hassas veri yok ama cache yapısı manipüle edilebilir.
3. **Rate Limit Memory:** `RATE_LIMIT` Map'i serverless fonksiyonun cold start'larında sıfırlanır; gerçek rate limiting için Redis veya Vercel Edge Config kullanılmalı.
4. **Input Validation:** `torfl.js` içinde `JSON.parse` ve `String()` dönüşümleri yapılıyor; daha katı şema validasyonu (Zod/Joi) eklenebilir.

---

## 10. Sonuç

**Ru-Tr Sözlük**, tek kişilik veya küçük bir ekip tarafından geliştirilmiş, oldukça özverili ve detaylı bir PWA projesidir. Kelime öğrenme uygulamalarındaki (Duolingo, Quizlet vb.) modern özelliklerin çoğunu (SRS, gamification, AI desteği, offline çalışma, push bildirimler) başarıyla uygulamıştır. Kod yapısı modüler ve genişletilebilir; güvenlik önlemleri (XSS, rate limit, CORS) düşünülmüş.

En büyük güçlü yönleri:
- **Zengin özellik seti:** 10+ çalışma modu, AI entegrasyonu, analitik.
- **Offline-first PWA:** Cache stratejisi ve Service Worker yönetimi olgun.
- **Kullanıcı motivasyonu:** Streak, hedef, heatmap, gamification UI.
- **Veri yönetimi:** Import/export, çöp kutusu, kullanıcı kelimeleri.

Geliştirilmesi gereken alanlar ise:
- **Büyüyen codebase'in yönetimi:** TypeScript, build tool, ve test altyapısı.
- **Bazı eksik / yarım modların tamamlanması:** Hard Words, Mastered Archive.
- **Daha sağlam bir backend state:** `localStorage` yerine `IndexedDB` veya sunucu taraflı veritabanı.
- **TTS (sesli telaffuz)** entegrasyonu ile kullanıcı deneyiminin zirveye taşınması.

Genel olarak, **MVP aşamasını çoktan aşmış, üretime hazır ve kullanıcı dostu** bir kelime öğrenme platformudur.

---

*Rapor Tarihi: 2026-07-01*  
*Hazırlayan: AI Agent (Kimi)*
