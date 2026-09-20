# Aşama 5 — Speaking Tasarım Spesifikasyonu

## Kapsam ve değişmezler

Bu aşama mevcut Phase 0–4 runtime’ına additive Speaking desteği ekler:

- Read Aloud
- Prompted Speech
- Free Speech
- browser capability detection ve bağımsız speech/audio adapter’ları
- speaking event store
- rebuildable speaking read-model
- yalnız transcript-level Error Notebook bridge’i
- explicit opt-in adaptive speaking provider

Recognition, Recall ve Production event store’ları, mevcut mastery/read-model semantiği, ru_tr_adaptive_sessions_v1, raw vocabulary, raw sentence corpus ve canonical lexical artifact destructive migration geçirmez. Speaking event’leri ru_tr_speaking_events_v1 içinde, speaking read-model’i ru_tr_speaking_mastery_v1 içinde tutulur. LearningProgressStore içine speaking skill eklenmez.

## Transcript gözlem semantiği

deterministic + verified yalnızca şu iddiayı ifade eder:

“Deterministic observation verified against the final STT transcript.”

Bu, kullanıcının yanlış telaffuz ettiğini, yanlış vurgu yaptığını, grammar hatası yaptığını veya STT’nin ground truth olduğunu ifade etmez.

Transcript-level Error Notebook kaydı şu alanları taşır:

~~~json
{
  "evidence_scope": "stt_final_transcript",
  "assertion_scope": "transcript_alignment",
  "detection_method": "deterministic",
  "verification_status": "verified",
  "adaptive_eligible": false,
  "exercise_eligible": false
}
~~~

Neutral observation isimleri:

- speaking.transcript_mismatch
- speaking.transcript_target_not_observed

Yalnız final STT transcript’i Error Notebook gözlemi üretebilir. Partial, empty veya unavailable transcript Error Notebook truth oluşturmaz.

## Capability sözleşmesi

Capability detection false precision üretmez:

~~~json
{
  "speech_recognition_api": "supported",
  "media_recorder_api": "supported",
  "microphone_capture": "untested",
  "local_processing_control": "unsupported",
  "ru_local_availability": "unknown",
  "stt_runtime": "not_attempted",
  "processing_mode": "browser_managed_unspecified"
}
~~~

Allowed values:

- speech_recognition_api: supported | unsupported
- media_recorder_api: supported | unsupported
- microphone_capture: untested | granted | denied | error
- local_processing_control: supported | unsupported
- ru_local_availability: available | downloadable | downloading | unavailable | unknown
- stt_runtime: not_attempted | started | final_result | partial_only | no_result | error
- processing_mode: local_required | browser_managed_unspecified

Ordinary SpeechRecognition availability veya başarı local/remote/cloud iddiası üretmez. local_required yalnız desteklenen local-processing API’si açıkça istenmişse kullanılabilir.

SpeechRecognition ve MediaRecorder üç bağımsız runtime yolu sunar:

1. transcript-only
2. recording-only
3. combined best-effort

Combined yol zorunlu değildir. Bir adapter başarısız olursa diğer adapter çalışmaya devam eder; crash, fake transcript ve stream leak oluşmaz.

## Exercise modelleri

### Read Aloud

Read Aloud raw sentences_strict.json kaynağını değiştirmeden versioned catalog/overlay üzerinden tanımlanır:

~~~json
{
  "exercise_id": "speaking-read-aloud:...",
  "exercise_type": "read_aloud",
  "targets": [
    {
      "lexical_unit_id": "lu:...",
      "sense_id": "sense:...",
      "target_surface": "..."
    }
  ],
  "expected_text": "...",
  "source": {
    "file": "sentences_strict.json",
    "source_line_number": 143,
    "source_hash": "..."
  },
  "verification_status": "verified",
  "exercise_eligible": true
}
~~~

Yalnız verification_status verified ve exercise_eligible true içerik deterministic transcript comparison, Error Notebook veya adaptive truth için kullanılabilir. Candidate, unreviewed veya source-preserved içerik practice/preview-only kalır.

Karşılaştırma yalnız NFC, case, whitespace, controlled punctuation, ё/е ve deterministic token alignment kullanır. Stemming, inflection inference, pronunciation inference ve semantic correction yasaktır.

### Prompted Speech

2–4 hedef paired identity ile tutulur:

~~~json
{
  "exercise_type": "prompted_speech",
  "targets": [
    {
      "lexical_unit_id": "lu:1",
      "sense_id": "sense:1",
      "target_surface": "обсуждать"
    }
  ]
}
~~~

Target detection yalnız exact normalized target surface veya ayrıca verified/curated accepted form kullanabilir. Stemming, morphology inference, semantic correction ve otomatik inflection guessing yoktur. transcript_target_not_observed Recall, Production, grammar veya pronunciation failure değildir.

### Free Speech

Free Speech 30–60 saniyelik topic-based observation-only görevdir. Persist edilen veri duration, topic, transcript, recording metadata ve varsa target observations ile sınırlıdır. Grammar, quality, pronunciation, stress, accent veya fluency score üretilmez.

## Speaking event schema

Append öncesi tam schema validation zorunludur:

~~~json
{
  "schema_version": 1,
  "namespace": "ru_tr_speaking_events_v1",
  "event_id": "speaking-event:...",
  "attempt_id": "speaking-attempt:...",
  "timestamp_started": "...",
  "timestamp_finished": "...",
  "skill": "speaking",
  "exercise_type": "read_aloud",
  "exercise_id": "...",
  "targets": [],
  "expected_text": "...",
  "topic": null,
  "transcript": "...",
  "transcript_source": "speech_recognition",
  "transcript_state": "final_result",
  "observations": [],
  "recording_metadata": {
    "captured": true,
    "stored": false,
    "uploaded": false,
    "retention": "session_only",
    "mime_type": "audio/mp4",
    "duration_ms": 4200
  },
  "evaluation_availability": {
    "transcript": "available",
    "pronunciation": "not_evaluated",
    "stress": "not_evaluated",
    "fluency": "not_evaluated",
    "overall": "insufficient_evidence"
  }
}
~~~

Invalid veya partial event append edilemez. attempt_id idempotency anahtarıdır. Cancel, permission denial ve unsupported sonucu learning event yazmaz. Page reload sırasında yarım event persist edilmez.

## Audio ve privacy

Raw MediaRecorder Blob yalnız session-memory tutulur. localStorage, IndexedDB ve backend upload kullanılmaz. Blob referansları ve object URL normal stop, error, cancel, route change ve pagehide sonrasında serbest bırakılır; metadata persist edilebilir.

Uygulama raw audio’yu persist/upload etmez. Browser/OS-managed SpeechRecognition processing’in cihaz dışına çıkmadığı iddia edilmez; processing mode yalnız runtime’ın kanıtladığı seviyede raporlanır.

## Speaking read-model

ru_tr_speaking_mastery_v1 yalnız event store’dan rebuild edilir. Canonical identity paired targets üzerinden lexical_unit_id + sense_id + speaking olarak yeniden kurulur. Free Speech explicit lexical target taşımıyorsa lexical speaking mastery oluşturmaz.

Read-model yalnız observation counts, transcript availability, target observations, last practiced ve evidence status taşır. speaking_accuracy, mastery_success, pronunciation_percent, stress_percent, fluency_percent ve overall speaking score üretilmez.

Acoustic provider olmadığı sürece pronunciation, stress ve fluency not_evaluated, overall insufficient_evidence olur.

## Adaptive integration

Phase 4 planner yeniden tasarlanmaz. Speaking adayları includeSpeaking explicit opt-in’i ile additive provider’dan gelir. Planner permission request etmez.

Speaking candidate priority fake accuracy/success/mastery skorlarına dayanmaz. Permission denial, unsupported browser ve STT network failure learner weakness değildir. Transcript mismatch pronunciation veya grammar weakness’e dönüştürülmez.

Verified transcript observation adaptive_eligible false olduğunda Phase 4 priority ve grammar/pronunciation inference üzerinde hiçbir etki oluşturmaz.

## UI lifecycle

~~~text
idle -> requesting_permission -> ready -> recording -> processing -> result
~~~

Failure states: permission_denied, unsupported, error.

recording dışındaki state’lerde aktif stream bulunamaz. Start duplicate-safe, stop idempotent ve her çıkış yolu cleanup garantili olmalıdır.

## Service Worker ve kapsam sınırı

Speaking static asset ve versioned exercise metadata eklendiğinde cache rutr-v63’ten rutr-v64’e kontrollü olarak bump edilir. Raw audio, microphone stream, SpeechRecognition response veya speech-service response cache’lenmez.

TRKI, TRKI Speaking/Listening, Writing evaluation, advanced AI tutor, automatic linguistic scoring, flashcard redesign ve Aşama 6 bu spesifikasyonun dışındadır.

