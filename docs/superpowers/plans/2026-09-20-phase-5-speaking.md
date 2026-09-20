# Phase 5 Speaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a privacy-safe, observation-only Speaking subsystem with Read Aloud, Prompted Speech, Free Speech, independent browser adapters, rebuildable speaking history, neutral Error Notebook observations, and explicit opt-in adaptive integration.

**Architecture:** Keep the current script-tag/global architecture. Add a separate speaking event source and speaking read-model; never add speaking to the existing Recognition/Recall/Production progress store. Keep SpeechRecognition and MediaRecorder independent, with transcript-only, recording-only, and combined best-effort paths. Extend Phase 4 only through optional speaking candidates and an explicit adaptive flag.

**Tech Stack:** Vanilla browser JavaScript, localStorage versioned stores, Node built-in test runner, existing HTML/CSS/Service Worker, no new runtime dependency.

**Spec:** docs/superpowers/specs/2026-09-20-phase-5-speaking-design.md

## Global Constraints

- Final STT transcript is the only transcript state that may create deterministic speaking Error Notebook observations.
- verified speaking observations assert transcript alignment or target presence in the final STT transcript, never pronunciation, stress, grammar, fluency, accent, or STT ground truth.
- Every speaking observation has adaptive_eligible=false and exercise_eligible=false; adaptive code must enforce adaptive_eligible independently.
- SpeechRecognition and MediaRecorder are independent capabilities; combined execution is best-effort and not required for acceptance.
- Capability states must not infer local, remote, or cloud processing from ordinary SpeechRecognition availability or success.
- Raw audio is session-memory only: no localStorage, no IndexedDB, no backend upload, and cleanup on every exit path.
- Speaking target identity is a paired targets array containing lexical_unit_id, sense_id, and target_surface.
- Prompted target detection uses exact normalized target surfaces or explicitly curated verified forms only; no stemming or inflection inference.
- ru_tr_speaking_events_v1 is append-only and validates the complete schema before append; attempt_id is idempotent.
- ru_tr_speaking_mastery_v1 is rebuildable and never emits speaking accuracy, mastery success, pronunciation, stress, fluency, accent, or overall scores.
- Read Aloud scored content requires verification_status=verified and exercise_eligible=true.
- Free Speech remains observation-only.
- Adaptive speaking is explicit opt-in; the planner never requests microphone permission.
- The existing Phase 0–4 data artifacts, source events, adaptive sessions, and 121-test regression contract remain intact.
- Service Worker cache changes from rutr-v63 to rutr-v64 only after all new static assets and versioned metadata are present.

## Review Focus

- Final versus partial STT: partial transcript may remain attempt metadata but must never create a verified Error Notebook observation; test in Task 5.
- Independent adapter failure: transcript-only and recording-only must remain usable when the other capability fails; test in Task 2 and Task 7.
- Paired target identity: reconstruction must never associate one lexical_unit_id with another sense_id; test in Task 3 and Task 6.
- Adaptive leakage: active verified transcript observations with adaptive_eligible=false must not affect Phase 4 priority or become grammar/pronunciation weakness; test in Task 5 and Task 8.
- Audio lifecycle: stop, error, cancel, route change, pagehide, and duplicate submit must release tracks and persist no Blob; test in Task 2 and Task 7.

### Task 1: Pure speaking contracts and transcript alignment

**Files:**
- Create: js/speaking-core.js
- Test: tests/speaking-core.test.js

**Interfaces:**
- Consumes: Read Aloud expected_text, Prompted Speech targets, and final/partial transcript strings.
- Produces: global SpeakingCore with normalizeTranscript(value), tokenizeTranscript(value), alignTranscript(expectedText, transcript, options), detectTargets(transcript, targets), and transition(state, event).

- [ ] **Step 1: Write failing tests**

Add tests for NFC/case/whitespace/punctuation/ё-е normalization; exact token alignment; missing, extra, and substituted tokens; no stemming; no inflection inference; exact target detection; paired targets with two senses; final versus partial transcript status; and the state transitions idle, requesting_permission, ready, recording, processing, result, permission_denied, unsupported, and error.

- [ ] **Step 2: Run the focused test**

Run: node --test tests/speaking-core.test.js
Expected: FAIL because js/speaking-core.js does not exist.

- [ ] **Step 3: Implement the pure core**

Keep all functions DOM-free. The alignment result must contain observation records, token counts, and a transcript-level status. It must never contain pronunciation, stress, grammar, fluency, or accuracy fields. detectTargets must compare each target_surface independently while preserving each lexical_unit_id/sense_id pair.

- [ ] **Step 4: Run the focused test**

Run: node --test tests/speaking-core.test.js
Expected: PASS.

- [ ] **Step 5: Commit only the new speaking core**

Run: git add js/speaking-core.js tests/speaking-core.test.js && git commit -m "feat: add speaking transcript contracts"

### Task 2: Capability detection and independent browser adapters

**Files:**
- Create: js/speaking-capabilities.js
- Create: js/speech-recognition-adapter.js
- Create: js/audio-recorder-adapter.js
- Test: tests/speaking-capabilities.test.js
- Test: tests/speaking-adapters.test.js

**Interfaces:**
- Consumes: window, navigator, fake browser constructors, and explicit start/stop commands.
- Produces: CapabilityDetector.detect(), SpeechRecognitionAdapter, and AudioRecorderAdapter.

- [ ] **Step 1: Write failing capability tests**

Test exact capability dimensions, including unsupported APIs, secure-context absence, untested microphone state, unsupported local-processing controls, unknown Russian local availability, and processing_mode=browser_managed_unspecified. Prove that ordinary SpeechRecognition support never produces local or remote claims.

- [ ] **Step 2: Write failing adapter lifecycle tests**

Test transcript-only without MediaRecorder, recording-only without SpeechRecognition, combined best-effort, SpeechRecognition failure while recording survives, MediaRecorder failure while transcript survives, duplicate start protection, idempotent stop, and track cleanup.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-capabilities.test.js tests/speaking-adapters.test.js
Expected: FAIL because adapters do not exist.

- [ ] **Step 4: Implement capability detection**

Detect SpeechRecognition and webkitSpeechRecognition separately from MediaRecorder and navigator.mediaDevices.getUserMedia. Do not call permission APIs during detection. Set lang to ru-RU only when constructing a recognition session. Use MediaRecorder.isTypeSupported when available and try browser-safe MIME candidates in order.

- [ ] **Step 5: Implement independent adapters**

SpeechRecognitionAdapter owns only recognition callbacks and runtime status. AudioRecorderAdapter owns only getUserMedia, MediaRecorder, Blob chunks, MIME, duration, and track stop. The orchestrator may run either adapter alone or both. No adapter writes learning events.

- [ ] **Step 6: Run focused tests**

Run: node --test tests/speaking-capabilities.test.js tests/speaking-adapters.test.js
Expected: PASS.

- [ ] **Step 7: Commit adapter work**

Run: git add js/speaking-capabilities.js js/speech-recognition-adapter.js js/audio-recorder-adapter.js tests/speaking-capabilities.test.js tests/speaking-adapters.test.js && git commit -m "feat: add independent speaking browser adapters"

### Task 3: Speaking event schema and safe append-only store

**Files:**
- Create: js/speaking-store.js
- Test: tests/speaking-store.test.js

**Interfaces:**
- Consumes: validated speaking event objects and a storage/id/time dependency.
- Produces: SpeakingEventStore with getSnapshot(), recordEvent(event), hasAttempt(attemptId), and clearHistory().

- [ ] **Step 1: Write failing schema tests**

Test required schema_version, namespace, event_id, attempt_id, timestamps, skill, exercise_type, targets, transcript state, recording metadata, evaluation availability, and observation scope. Test paired targets, Read Aloud expected text, Prompted targets, and Free Speech without lexical targets.

- [ ] **Step 2: Write failing safety tests**

Test that invalid or partial events are rejected before storage writes; raw Blob-like fields are rejected; duplicate attempt_id returns the original event; cancel/permission-denied/unsupported are not accepted as learning events; malformed persisted JSON leaves the namespace intact and empty; and post-write data remains schema-valid.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-store.test.js
Expected: FAIL because SpeakingEventStore does not exist.

- [ ] **Step 4: Implement pre-write validation and idempotency**

Use namespace ru_tr_speaking_events_v1 and schema_version 1. Validate every required field and every target pair before append. Store only serializable metadata. Reject audio_blob, Blob, MediaStream, object URL, and incomplete evaluation structures. Clone returned values.

- [ ] **Step 5: Run focused tests**

Run: node --test tests/speaking-store.test.js
Expected: PASS.

- [ ] **Step 6: Commit the store**

Run: git add js/speaking-store.js tests/speaking-store.test.js && git commit -m "feat: add validated speaking event store"

### Task 4: Verified Read Aloud and Free Speech exercise artifacts

**Files:**
- Create: js/speaking-exercise-repository.js
- Create: data/speaking/read-aloud-exercises.v1.json
- Create: data/speaking/free-speech-topics.v1.json
- Test: tests/speaking-exercise-repository.test.js

**Interfaces:**
- Consumes: VocabularyRepository, legacy identity mapping, sentences_strict source references, and versioned speaking artifacts.
- Produces: SpeakingExerciseRepository.getReadAloudExercises(), getPromptedExercises(), and getFreeSpeechTopics().

- [ ] **Step 1: Write failing repository tests**

Test that Read Aloud catalog entries require verified plus exercise_eligible; candidate and source-preserved entries are returned only as practice metadata and never as scored exercises; every target is a paired lexical_unit_id/sense_id; Prompted exercises contain 2–4 canonical targets; and Free Speech topics produce no lexical mastery identity by default.

- [ ] **Step 2: Run focused tests**

Run: node --test tests/speaking-exercise-repository.test.js
Expected: FAIL because the repository and artifacts do not exist.

- [ ] **Step 3: Add versioned metadata without touching raw sources**

Create a schema-versioned catalog that references sentences_strict.json by source line and source hash. Include only explicitly reviewed verified entries in the scored collection. Keep any source-preserved preview entries in a separate non-scored collection. Create source-controlled topic prompts for 30–60 second Free Speech tasks.

- [ ] **Step 4: Implement repository gating**

Load the speaking artifacts and canonical repository. Return scored Read Aloud exercises only when both verification_status=verified and exercise_eligible=true. Never copy candidate enrichment into targets or accepted forms. Preserve target pairs exactly.

- [ ] **Step 5: Run focused tests**

Run: node --test tests/speaking-exercise-repository.test.js
Expected: PASS.

- [ ] **Step 6: Commit exercise metadata**

Run: git add js/speaking-exercise-repository.js data/speaking/read-aloud-exercises.v1.json data/speaking/free-speech-topics.v1.json tests/speaking-exercise-repository.test.js && git commit -m "feat: add verified speaking exercise catalog"

### Task 5: Transcript-only Error Notebook bridge and adaptive safety

**Files:**
- Modify: js/error-taxonomy.js
- Modify: data/grammar/error-taxonomy.v1.json
- Modify: js/error-notebook.js
- Create: js/speaking-error-bridge.js
- Modify: js/adaptive-planner.js
- Test: tests/speaking-error-bridge.test.js
- Test: tests/adaptive-planner.test.js

**Interfaces:**
- Consumes: final/partial speaking observations and ErrorNotebookStore.
- Produces: SpeakingErrorBridge.createFromObservation(observation), neutral Error Notebook records, and adaptive filtering that requires adaptive_eligible !== false.

- [ ] **Step 1: Write failing bridge tests**

Test final Read Aloud mismatch creates speaking.transcript_mismatch with evidence_scope=stt_final_transcript, assertion_scope=transcript_alignment, verified/deterministic metadata, adaptive_eligible=false, and exercise_eligible=false. Test final Prompted absence creates speaking.transcript_target_not_observed. Test partial, empty, unavailable, and provider-confidence-only observations create no Error Notebook record. Test no pronunciation/stress/grammar fields are created.

- [ ] **Step 2: Write the adaptive leakage regression**

Insert an active verified speaking observation with adaptive_eligible=false and a matching lexical identity. Build an adaptive plan before and after the observation. Assert priority and selection_reason are unchanged, and no grammar/pronunciation weakness is produced.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-error-bridge.test.js tests/adaptive-planner.test.js
Expected: FAIL because speaking taxonomy/bridge and adaptive guard are absent.

- [ ] **Step 4: Implement neutral taxonomy and bridge**

Add only speaking.transcript_mismatch and speaking.transcript_target_not_observed as neutral supported types with no grammar-topic mapping. Require adaptive_eligible=false for speaking observations. Bridge only final transcript alignment results into Error Notebook.

- [ ] **Step 5: Implement the independent adaptive gate**

Keep Error Notebook display and lifecycle behavior unchanged, but make adaptive candidate filtering require active, verified, and adaptive_eligible !== false. Do not map speaking observations to grammar topics or linguistic weaknesses.

- [ ] **Step 6: Run focused tests**

Run: node --test tests/speaking-error-bridge.test.js tests/adaptive-planner.test.js
Expected: PASS.

- [ ] **Step 7: Commit the safety boundary**

Run: git add js/error-taxonomy.js data/grammar/error-taxonomy.v1.json js/error-notebook.js js/speaking-error-bridge.js js/adaptive-planner.js tests/speaking-error-bridge.test.js tests/adaptive-planner.test.js && git commit -m "feat: isolate speaking transcript observations"

### Task 6: Rebuildable speaking read-model and analytics

**Files:**
- Create: js/speaking-mastery.js
- Modify: js/adaptive-analytics.js
- Test: tests/speaking-mastery.test.js
- Test: tests/adaptive-analytics.test.js

**Interfaces:**
- Consumes: SpeakingEventStore snapshots.
- Produces: SpeakingMasteryReadModel.rebuild(events), getSnapshot(), getMastery(identity), and SkillAnalytics speaking metrics.

- [ ] **Step 1: Write failing read-model tests**

Test paired target fan-out for Read Aloud and Prompted Speech; no lexical record for un-targeted Free Speech; rebuild after deleting the cache; transcript/target observation counts; last practiced; and default not_evaluated pronunciation/stress/fluency with insufficient_evidence overall.

- [ ] **Step 2: Write failing anti-score tests**

Assert no speaking_accuracy, mastery_success, pronunciation_percent, stress_percent, fluency_percent, accent_percent, or overall numeric score exists, even with exact transcript and provider confidence.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-mastery.test.js tests/adaptive-analytics.test.js
Expected: FAIL because the speaking read-model and speaking metrics do not exist.

- [ ] **Step 4: Implement the rebuildable model**

Use ru_tr_speaking_mastery_v1. Rebuild only from validated speaking events. Preserve paired lexical_unit_id/sense_id identity. Keep Free Speech topic/session observations outside lexical mastery when targets are absent.

- [ ] **Step 5: Add non-scoring analytics**

Expose speaking observation counts, transcript availability, evidence status, and last practiced. Keep existing Recognition, Recall, Production, and Grammar metrics unchanged.

- [ ] **Step 6: Run focused tests**

Run: node --test tests/speaking-mastery.test.js tests/adaptive-analytics.test.js
Expected: PASS.

- [ ] **Step 7: Commit the read-model**

Run: git add js/speaking-mastery.js js/adaptive-analytics.js tests/speaking-mastery.test.js tests/adaptive-analytics.test.js && git commit -m "feat: add rebuildable speaking observations"

### Task 7: Speaking mode UI and lifecycle orchestration

**Files:**
- Create: js/speaking-mode.js
- Modify: index.html
- Modify: js/app.js
- Modify: css/style.css
- Modify: js/storage.js
- Test: tests/speaking-mode.test.js
- Test: tests/speaking-runtime.test.js

**Interfaces:**
- Consumes: SpeakingCore, CapabilityDetector, independent adapters, SpeakingEventStore, SpeakingExerciseRepository, and SpeakingErrorBridge.
- Produces: window.speakingMode with init(), start(), stop(), cancel(), dispose(), and render().

- [ ] **Step 1: Write failing mode tests**

Test Read Aloud, Prompted Speech, and Free Speech rendering; explicit microphone action; state transitions; final-only bridge call; event append only after complete validation; no event on permission denial or cancel; duplicate submit protection; recording-only and transcript-only result states; and event metadata with stored=false/uploaded=false/retention=session_only.

- [ ] **Step 2: Write failing cleanup tests**

Test normal stop, adapter error, cancel, app route change, pagehide, and dispose all stop tracks and release Blob/object URL references. Test that a failed combined path leaves the surviving adapter usable.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-mode.test.js tests/speaking-runtime.test.js
Expected: FAIL because the mode and route do not exist.

- [ ] **Step 4: Implement minimal UI**

Add a Speaking mode card and one mode screen with exercise type, prompt/targets, recording state, transcript state, privacy notice, start/stop/cancel controls, result observations, and explicit not_evaluated labels for pronunciation/stress/fluency. Do not request permission during init.

- [ ] **Step 5: Implement orchestration**

Start adapters independently after explicit user action. Use final transcript only for bridge and deterministic observations. Persist no event for cancel, permission denial, or unsupported. Store valid metadata and transcript only after the complete event passes validation.

- [ ] **Step 6: Integrate route cleanup**

Add speaking to App routing and invoke speakingMode.dispose() before leaving or replacing the mode. Ensure app route changes cannot leave an active stream.

- [ ] **Step 7: Add user-data backup coverage**

Include ru_tr_speaking_events_v1 in the existing explicit user-data export/import key list without migrating or rewriting existing Phase 0–4 keys. Do not include raw audio.

- [ ] **Step 8: Run focused tests**

Run: node --test tests/speaking-mode.test.js tests/speaking-runtime.test.js
Expected: PASS.

- [ ] **Step 9: Commit the UI/runtime**

Run: git add js/speaking-mode.js index.html js/app.js css/style.css js/storage.js tests/speaking-mode.test.js tests/speaking-runtime.test.js && git commit -m "feat: add speaking practice mode"

### Task 8: Explicit opt-in adaptive speaking provider

**Files:**
- Create: js/speaking-adaptive-provider.js
- Modify: js/adaptive-engine.js
- Modify: js/adaptive-planner.js
- Modify: js/adaptive-mode.js
- Test: tests/speaking-adaptive.test.js
- Test: tests/adaptive-runtime.test.js

**Interfaces:**
- Consumes: verified speaking exercises, speaking capabilities, speaking read-model, and includeSpeaking boolean.
- Produces: additive speaking candidates and adaptive UI handling without microphone permission from the planner.

- [ ] **Step 1: Write failing provider tests**

Test includeSpeaking=false produces the exact existing candidate set; includeSpeaking=true adds only verified eligible Read Aloud/Prompted candidates; Free Speech is opt-in practice-only and not weakness-scored; unsupported capability does not corrupt the plan; and speaking observations with adaptive_eligible=false never affect priority.

- [ ] **Step 2: Write failing runtime tests**

Test adaptive speaking item rendering, explicit start control, successful speaking event before session completion, permission denial as a capability/session state, and no writes to ru_tr_skill_progress_v1.

- [ ] **Step 3: Run focused tests**

Run: node --test tests/speaking-adaptive.test.js tests/adaptive-runtime.test.js
Expected: FAIL because the provider and adaptive speaking branch do not exist.

- [ ] **Step 4: Implement additive provider**

Add optional additionalCandidates input to the existing planner. Keep existing candidates, versions, tie-breakers, and non-speaking selection unchanged when includeSpeaking is false. Do not inspect STT confidence or speaking accuracy because those fields do not exist.

- [ ] **Step 5: Implement adaptive UI branch**

Render speaking items through speakingMode or an embedded speaking controller. Complete orchestration only after an event or explicit user skip outcome. Never call getUserMedia from planner or session creation.

- [ ] **Step 6: Run focused tests**

Run: node --test tests/speaking-adaptive.test.js tests/adaptive-runtime.test.js
Expected: PASS.

- [ ] **Step 7: Commit adaptive integration**

Run: git add js/speaking-adaptive-provider.js js/adaptive-engine.js js/adaptive-planner.js js/adaptive-mode.js tests/speaking-adaptive.test.js tests/adaptive-runtime.test.js && git commit -m "feat: add opt-in adaptive speaking"

### Task 9: Service Worker, asset integrity, and regression suite

**Files:**
- Modify: index.html
- Modify: sw.js
- Test: tests/speaking-service-worker.test.js
- Modify: tests/vocabulary-runtime-cache.test.js
- Modify: tests/stabilization.test.js

- [ ] **Step 1: Write failing cache tests**

Assert cache name rutr-v64, all new Speaking scripts and static metadata exist, no duplicate assets exist, and raw audio, SpeechRecognition responses, and API routes are not cached.

- [ ] **Step 2: Run focused tests**

Run: node --test tests/speaking-service-worker.test.js tests/vocabulary-runtime-cache.test.js tests/stabilization.test.js
Expected: FAIL because cache remains rutr-v63 and Speaking assets are absent.

- [ ] **Step 3: Add script order and static cache entries**

Load core/capability/adapter/store/repository/mastery/bridge before speaking-mode; add Speaking mode after its dependencies. Add versioned Speaking artifacts and scripts to ASSETS. Keep network-first rules limited to static app/artifact requests.

- [ ] **Step 4: Bump the controlled cache**

Change only the controlled current cache from rutr-v63 to rutr-v64 and preserve the existing cache behavior. Do not add runtime response caching for speech APIs.

- [ ] **Step 5: Run focused tests**

Run: node --test tests/speaking-service-worker.test.js tests/vocabulary-runtime-cache.test.js tests/stabilization.test.js
Expected: PASS.

- [ ] **Step 6: Commit cache integration**

Run: git add index.html sw.js tests/speaking-service-worker.test.js tests/vocabulary-runtime-cache.test.js tests/stabilization.test.js && git commit -m "chore: cache speaking assets in v64"

### Task 10: Full verification and browser acceptance

**Files:**
- Test: all existing and new tests
- Verify: raw/base artifacts, git diff, Service Worker cache, Chrome HTTPS, Safari/macOS, Safari iOS/iPadOS when available

- [ ] **Step 1: Run full regression**

Run: npm test
Expected: all existing 121 tests plus all Phase 5 tests pass with 0 failures.

- [ ] **Step 2: Verify source artifact integrity**

Run: git diff --check
Run: node --test tests/stabilization.test.js tests/vocabulary-core.test.js tests/vocabulary-repository.test.js tests/vocabulary-runtime-cache.test.js
Expected: no mutating vocabulary script is run; the existing artifact integrity tests pass and SHA/source files remain unchanged relative to the Phase 0–4 baseline.

- [ ] **Step 3: Verify static asset integrity**

Run: node --test tests/speaking-service-worker.test.js tests/vocabulary-runtime-cache.test.js
Expected: rutr-v64, every ASSETS path exists, no duplicate asset, and no raw audio/response cache behavior.

- [ ] **Step 4: Browser acceptance**

Run the static app over HTTPS or localhost and manually verify:
1. Chrome HTTPS transcript-only.
2. Chrome HTTPS recording-only fallback with SpeechRecognition unavailable.
3. Safari/macOS permission grant and denial.
4. Safari/iOS/iPadOS when available.
5. Offline recording with transcript unavailable.
6. Route change and pagehide track cleanup.
7. Combined adapter failure where the surviving adapter still completes without a duplicate event.

Record browser/manual results separately from Node test results.

- [ ] **Step 5: Verify protected files**

Run: git diff --name-only
Expected: only the planned Speaking files, additive taxonomy/backup changes, controlled Service Worker v64 changes, and explicitly staged test updates appear in the Speaking commit series. Raw vocabulary, sentence corpus, base lexical artifact, existing progress event namespaces, and adaptive session history must not be rewritten.

- [ ] **Step 6: Final report**

Report files changed, schema decisions, runtime capability behavior, tests added, full regression result, browser/manual acceptance result, raw/base artifact integrity, and final cache version. Explicitly state that Aşama 6 was not started.

