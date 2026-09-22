# Phase 7 Listening and TRKI Speaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add version-bound, provenance-gated TRKI Listening with immutable historical evaluation, safe restricted-audio recovery, deterministic replay, and a thin practice-only TRKI Speaking context while preserving the sealed Phase 0–6 runtime.

**Architecture:** Keep the vanilla script-tag/global architecture and add separate Listening core, repository, session, attempt, audio, playback, and coordinator modules. Do not modify the Phase 6 TRKI session/attempt/profile contracts; the new Listening namespaces own package/task state and historical attempts. Reuse `SpeakingMode` and its existing adapters/store for TRKI Speaking by adding only an optional context field and coordinator.

**Tech Stack:** Vanilla browser JavaScript, localStorage versioned stores, Web Crypto SHA-256, HTML/CSS, Service Worker, Node built-in test runner, no new runtime dependency.

**Spec:** docs/superpowers/specs/2026-09-21-phase-7-listening-speaking-design.md

## Global Constraints

- The authoritative implementation baseline is `de2cff9530845aef0e5dc94382df7db7c5572558`.
- Work only in the isolated `codex/phase7-trki-listening-speaking` worktree; never modify or clean the dirty `main` checkout.
- Phase 0–6 behavior and tests are final; shared changes must be additive and dependency-justified.
- Keep the app personal-only and local-first; add no auth, accounts, roles, backend multi-user state, cloud sync, telemetry, or organization concepts.
- Preserve the Phase 6 provenance fields and semantics; local acquisition/storage is not provenance authority.
- Objective Listening requires independently valid source, question, answer-key, audio, alignment, numbering, replay-policy, verification, and exercise-eligibility evidence.
- Persist historical evaluation evidence, not hashes alone; old attempts never consult current package semantics.
- Restricted/local audio binaries never enter Git, Service Worker cache, normal backup/export, or persistent storage.
- Exam playback is user-triggered, no-autoplay, pause-disabled, seek-disabled, package-policy bounded, persisted, and idempotent.
- Technical-unavailable outcomes are explicit non-scorable results and never linguistic wrong-answer truth.
- TRKI Speaking reuses the existing Speaking engine and stays practice-only with no pronunciation, stress, accent, fluency, grammar, official score, mastery success, Error Notebook, or adaptive truth.
- Synthetic fixtures are clearly non-official; no restricted official/institutional content is bundled.
- `adaptive-planner-v1` and flashcard semantics remain unchanged; record `no planner policy change warranted from current verified evidence`.
- Do not bump the Service Worker until all new static runtime assets and synthetic artifacts exist; restricted audio/transcripts are never cached.

## Review Focus

- A changed answer key with the same old hash must not reinterpret a stored attempt; Task 4 pins the answer-key snapshot and evaluator result.
- A reselected restricted file with equal metadata but a different SHA-256 must remain rejected; Task 3 tests the actual digest gate.
- Multiple browser `playing` callbacks during buffering must consume one logical play; Task 2 tests event idempotency.
- A timeout while required audio is unavailable must be `technical_unavailable` and make the exam non-comparable; Task 5 tests score and Error Notebook isolation.
- TRKI Speaking must add context without creating a second recorder/store or changing ordinary Speaking events; Task 6 tests engine reuse and legacy validation.

## File map

- `js/trki-listening-core.js`: pure identity, package/task/question validation, eligibility gates, answer evaluation, and historical snapshot builders.
- `js/trki-listening-repository.js`: loads `data/trki/listening-packages.v1.json` plus the existing source catalog and exposes only gated tasks.
- `js/trki-listening-audio.js`: SHA-256 identity, restricted file reselection, availability metadata, and in-memory binary lifecycle.
- `js/trki-listening-playback.js`: pure replay state machine and browser adapter contract.
- `js/trki-listening-session-store.js`: additive persisted Listening session state and timeout/technical-unavailable markers.
- `js/trki-listening-attempt-store.js`: append-only historical Listening evaluation namespace.
- `js/trki-listening-session-coordinator.js`: Study/Exam Listening flow, UI lifecycle, playback, timeout, and technical result handling.
- `js/trki-speaking-coordinator.js`: thin adapter from TRKI task metadata to existing `SpeakingMode`.
- `data/trki/listening-packages.v1.json`: synthetic, non-official package/task/question fixtures with versioned identity and hash references.
- `tests/trki-listening-core.test.js`, `tests/trki-listening-repository.test.js`, `tests/trki-listening-audio.test.js`, `tests/trki-listening-playback.test.js`, `tests/trki-listening-session.test.js`, `tests/trki-listening-attempt.test.js`, `tests/trki-listening-runtime.test.js`, `tests/trki-speaking-coordinator.test.js`: focused RED→GREEN coverage.
- `index.html`, `js/app.js`, `js/speaking-mode.js`, `js/storage.js`, `sw.js`, and `tests/stabilization.test.js`: narrow runtime, backup, cache, and route wiring.

### Task 1: Listening contracts and synthetic package artifact

**Files:**
- Create: `js/trki-listening-core.js`
- Create: `data/trki/listening-packages.v1.json`
- Create: `tests/trki-listening-core.test.js`

**Interfaces:**
- Consumes: package/task/question objects and submitted option indexes.
- Produces: `TrkiListeningCore.createIdentity(parts)`, `validatePackage(packageRecord)`, `validateQuestion(question, task, packageRecord)`, `isObjectiveEligible(question, context)`, `evaluateAnswer(question, submittedAnswer)`, and `createEvaluationSnapshot(question, result)`.

- [x] **Step 1: Write the failing tests**

  Add tests that assert the exact five-part identity, reject missing package versions and duplicated question identities, require all hash/reference fields, reject an official source with unverified extracted question evidence, keep `local_restricted` separate from `local_user`, and evaluate a synthetic option question as correct/incorrect without inventing grammar diagnoses.

  The expected public shape is:

  ```js
  const identity = ListeningCore.createIdentity({
      package_id: 'trki-listening-synthetic-b1', package_version: '1.0.0',
      task_id: 'task-1', audio_id: 'audio-1', question_id: 'question-1'
  });
  assert.equal(identity.key, 'trki-listening-synthetic-b1@1.0.0/task-1/audio-1/question-1');
  ```

- [x] **Step 2: Run the focused test and observe the correct RED**

  Run `node --test tests/trki-listening-core.test.js`.

  Expected: FAIL because `js/trki-listening-core.js` and the artifact do not exist.

- [x] **Step 3: Implement the pure contract and artifact**

  Create one B1 synthetic package with one two-play audio task and two
  multiple-choice questions. Mark it `source_type: synthetic`,
  `source_class: synthetic_fixture`, `official_trki_provenance: false`,
  `content_policy: synthetic-not-official`, `license: test-only`,
  `redistribution_status: allowed_for_repository_fixture`, and
  `full_content_bundled: true`. Store deterministic hash strings for package,
  task, audio, question, answer key, alignment, replay policy, and transcript.
  Keep all identity and eligibility functions DOM-free and return cloned data.

- [x] **Step 4: Run the focused test and observe GREEN**

  Run `node --test tests/trki-listening-core.test.js`.

  Expected: all Listening contract tests PASS, including objective gating and neutral incorrect results.

- [x] **Step 5: Commit**

  Run `git add js/trki-listening-core.js data/trki/listening-packages.v1.json tests/trki-listening-core.test.js && git commit -m "feat: add versioned trki listening contracts"`.

### Task 2: Repository and deterministic playback state machine

**Files:**
- Create: `js/trki-listening-repository.js`
- Create: `js/trki-listening-playback.js`
- Create: `tests/trki-listening-repository.test.js`
- Create: `tests/trki-listening-playback.test.js`

**Interfaces:**
- Consumes: source catalog, Listening artifact, and package-specific `replay_policy`.
- Produces: `TrkiListeningRepository.load()`, `getObjectiveTasks()`, `getPracticeTasks()`, `getTaskByIdentity(identity)`, and `ListeningPlayback.create(policy)` with `requestPlay()`, `handlePlaying()`, `handleBuffering()`, `handleEnded()`, `handleFailure()`, `cleanup()`, and `getSnapshot()`.

- [x] **Step 1: Write failing repository and playback tests**

  Test that source identity and Phase 6 provenance fields are preserved, that
  verified synthetic questions are returned, that candidate/unverified or
  mismatched alignment/question evidence is practice-only, and that the
  repository never rewrites an institutional source into `local_user`.

  Test this playback sequence:

  ```js
  const playback = ListeningPlayback.create({ max_plays: 2, pause_allowed: false, seek_allowed: false });
  assert.equal(playback.requestPlay().status, 'play_requested');
  assert.equal(playback.handlePlaying().plays_consumed, 1);
  assert.equal(playback.handleBuffering().plays_consumed, 1);
  assert.equal(playback.handlePlaying().plays_consumed, 1);
  assert.equal(playback.handleEnded().status, 'ready');
  ```

  Also test duplicate clicks, pre-play failure with zero consumption, max-play
  rejection, and cleanup. No transition may enable pause/seek in Exam policy.

- [x] **Step 2: Run focused tests and observe RED**

  Run `node --test tests/trki-listening-repository.test.js tests/trki-listening-playback.test.js`.

  Expected: FAIL because the repository and state machine do not exist.

- [x] **Step 3: Implement repository gating and playback transitions**

  The repository must load with the caller-provided fetch function, resolve
  source references against `data/trki/source-catalog.v1.json`, validate every
  package/task/question identity, and expose scoreable tasks only after all
  mechanical gates pass. The playback state stores `logical_play_id`,
  `plays_consumed`, `max_plays`, `actual_start_seen`, and terminal status.
  Only the first `playing` event for a pending logical play increments the
  counter; buffering/resume and duplicate terminal events are idempotent.

- [x] **Step 4: Run focused tests and observe GREEN**

  Run the same focused command. Expected: all repository and playback tests PASS.

- [x] **Step 5: Commit**

  Run `git add js/trki-listening-repository.js js/trki-listening-playback.js tests/trki-listening-repository.test.js tests/trki-listening-playback.test.js && git commit -m "feat: gate trki listening content and replay"`.

### Task 3: Restricted audio identity and safe reselection

**Files:**
- Create: `js/trki-listening-audio.js`
- Create: `tests/trki-listening-audio.test.js`

**Interfaces:**
- Consumes: a File-like object with `arrayBuffer()`, MIME type, size, and optional duration metadata.
- Produces: `TrkiListeningAudio.hashFile(file, cryptoApi)`, `createMetadata(file, digest)`, `markAwaitingReselection(session, audioId)`, and `acceptReselectedFile(session, audioId, file, cryptoApi)`.

- [x] **Step 1: Write failing recovery tests**

  Test SHA-256 generation, persistence of MIME/size/duration without binary,
  reload transition to `awaiting_audio_reselection`, acceptance of the exact
  matching file, rejection of a same-size/different-content file, preservation
  of replay counters and timer fields, and absence of Blob/File/ArrayBuffer
  values in the serializable session snapshot.

- [x] **Step 2: Run the focused test and observe RED**

  Run `node --test tests/trki-listening-audio.test.js`.

  Expected: FAIL because the audio identity module does not exist.

- [x] **Step 3: Implement digest and in-memory binding**

  Use `cryptoApi.subtle.digest('SHA-256', await file.arrayBuffer())` and
  lowercase hexadecimal output. Persist only the metadata object and a
  `storage_mode` of `local_restricted`; retain the actual File/Blob only in a
  coordinator-owned memory map. Reject a digest mismatch before creating an
  object URL or binding the file. Expose an explicit `release()` path.

- [x] **Step 4: Run the focused test and observe GREEN**

  Run `node --test tests/trki-listening-audio.test.js`. Expected: all recovery tests PASS.

- [x] **Step 5: Commit**

  Run `git add js/trki-listening-audio.js tests/trki-listening-audio.test.js && git commit -m "feat: add restricted listening audio recovery"`.

### Task 4: Immutable Listening session and attempt stores

**Files:**
- Create: `js/trki-listening-session-store.js`
- Create: `js/trki-listening-attempt-store.js`
- Create: `tests/trki-listening-session.test.js`
- Create: `tests/trki-listening-attempt.test.js`

**Interfaces:**
- Consumes: package-bound planned items, timer timestamps, playback metadata, and evaluation snapshots.
- Produces: `TrkiListeningSessionStore` using `ru_tr_trki_listening_sessions_v1` and `TrkiListeningAttemptStore` using `ru_tr_trki_listening_attempts_v1`.

- [x] **Step 1: Write failing store tests**

  Test session creation with package/version/task/audio/question identity,
  Study pause/resume, Exam no-pause, timestamp-derived timeout, immutable
  `audio_bindings`, replay persistence, reload recovery, and append-only item
  completion. Test attempt records that include `evaluation.answer_key_snapshot`
  and `evaluation.alignment_snapshot`, plus package/task/audio/question hashes,
  replay policy, verification/eligibility state, source reference, evaluator
  version, and submitted answer. Assert an old attempt remains unchanged after
  a simulated package answer-key revision. Test `technical_unavailable` is
  accepted as non-scorable but a normal `incorrect` attempt is not synthesized
  from it.

- [x] **Step 2: Run focused tests and observe RED**

  Run `node --test tests/trki-listening-session.test.js tests/trki-listening-attempt.test.js`.

  Expected: FAIL because the new namespaces and stores do not exist.

- [x] **Step 3: Implement additive versioned stores**

  Use independent schema version 1 snapshots with malformed-data fallback that
  leaves the raw namespace untouched. The attempt validator must require a
  complete historical evaluation snapshot for objective outcomes, keep
  `technical_unavailable` score null and all learning eligibility flags false,
  and reject raw audio/transcript binaries. Duplicate `attempt_id` returns the
  original immutable record. The session store must persist timer state and
  audio metadata without importing or mutating `TrkiSessionStore`.

- [x] **Step 4: Run focused tests and observe GREEN**

  Run the same focused command. Expected: all session and attempt tests PASS.

- [x] **Step 5: Commit**

  Run `git add js/trki-listening-session-store.js js/trki-listening-attempt-store.js tests/trki-listening-session.test.js tests/trki-listening-attempt.test.js && git commit -m "feat: persist immutable listening sessions and attempts"`.

### Task 5: Listening coordinator, technical timeout, and UI flow

**Files:**
- Create: `js/trki-listening-session-coordinator.js`
- Create: `tests/trki-listening-coordinator.test.js`
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: repository, Listening session/attempt stores, playback factory, audio identity module, and DOM controls.
- Produces: `TrkiListeningSessionCoordinator` with `init()`, `start(mode)`, `submit()`, `next()`, `selectRestrictedAudio(file)`, `dispose()`, `getViewState()`, and global `trkiListeningController`.

- [x] **Step 1: Write failing coordinator tests**

  Test synthetic Study start, explicit play before audio starts, one logical
  play across duplicate browser events, persisted replay count, objective
  submission, Exam timeout, and a required unavailable restricted audio item.
  Assert the timeout attempt has `result: technical_unavailable`,
  `scoring_status: non_scorable`, `score: null`, all mastery/Error Notebook/
  adaptive flags false, and the session summary includes
  `comparable: false` rather than altering the denominator. Test route dispose
  releases adapters and does not autoplay after reload.

- [x] **Step 2: Run the focused test and observe RED**

  Run `node --test tests/trki-listening-coordinator.test.js`.

  Expected: FAIL because the coordinator and Listening UI do not exist.

- [x] **Step 3: Implement the narrow coordinator and UI**

  Add a separate `trkiListening` mode card/screen rather than changing the
  Phase 6 `TrkiMode` controller. The screen exposes level/mode, progress,
  timer, controlled Play, answer options, submit/next, file reselection, and a
  non-comparable technical result message. Start and playback are explicit;
  render/reload never calls `play()`. `dispose()` stops timers and releases
  object URLs/audio adapters. Exam timeout records the current unavailable
  item through the new attempt store and closes the session.

  Add only the corresponding `App.startMode` route and cleanup branch. Keep
  existing `trki` routing unchanged. Use a synthetic Web Audio adapter or a
  test-injected adapter for the bundled fixture; restricted file playback is
  bound only after SHA-256 verification.

- [x] **Step 4: Run the focused test and observe GREEN**

  Run `node --test tests/trki-listening-coordinator.test.js`. Expected: all coordinator tests PASS.

- [x] **Step 5: Commit**

  Run `git add js/trki-listening-session-coordinator.js tests/trki-listening-coordinator.test.js index.html js/app.js css/style.css && git commit -m "feat: add trki listening session coordinator"`.

### Task 6: TRKI Speaking context on the existing Speaking engine

**Files:**
- Create: `js/trki-speaking-coordinator.js`
- Create: `tests/trki-speaking-coordinator.test.js`
- Modify: `js/speaking-mode.js`
- Modify: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: a TRKI Speaking task plus the existing `SpeakingMode` instance.
- Produces: `TrkiSpeakingCoordinator.prepare(task)`, `getContext()`, and `activate()`; optional event field `trki_context`.

- [x] **Step 1: Write failing reuse and safety tests**

  Test `prepare()` creates a context containing level, package/version/task
  identity, source reference, and `practice_only: true`; `activate()` calls
  the existing SpeakingMode `configureAdaptiveExercise()` rather than
  constructing a recorder, speech adapter, event store, or mastery store.
  Test a committed event keeps `ru_tr_speaking_events_v1`, transcript-only
  evaluation, `adaptive_eligible: false`, and no score fields. Load a legacy
  normal Speaking event through the unchanged validator and assert it remains
  valid. Test partial/empty transcript still has no Error Notebook/adaptive
  truth.

- [x] **Step 2: Run the focused test and observe RED**

  Run `node --test tests/trki-speaking-coordinator.test.js`.

  Expected: FAIL because the coordinator and context wiring do not exist.

- [x] **Step 3: Implement the thin coordinator and optional event field**

  Pass the prepared task to the existing `SpeakingMode` and add only an
  optional `trki_context` copy in its event builder. Do not add a second
  adapter, event namespace, evaluation engine, or mastery system. Add a
  `trkiSpeaking` entry point that aliases the existing Speaking screen and
  calls `activate()` before the existing `speakingController.init()` path.

- [x] **Step 4: Run focused and existing Speaking tests**

  Run `node --test tests/trki-speaking-coordinator.test.js tests/speaking-store.test.js tests/speaking-mode.test.js tests/speaking-runtime.test.js`.

  Expected: all new and existing Speaking tests PASS, with old event shapes unchanged.

- [x] **Step 5: Commit**

  Run `git add js/trki-speaking-coordinator.js tests/trki-speaking-coordinator.test.js js/speaking-mode.js index.html js/app.js && git commit -m "feat: add trki speaking practice context"`.

### Task 7: Backup/cache safety and runtime regression coverage

**Files:**
- Modify: `js/storage.js`
- Modify: `sw.js`
- Create: `tests/trki-listening-runtime.test.js`
- Modify: `tests/trki-storage.test.js`
- Modify: `tests/speaking-service-worker.test.js`
- Modify: `tests/stabilization.test.js`

**Interfaces:**
- Consumes: new script/data asset paths and persistent namespace names.
- Produces: cache revision `rutr-v71`, static synthetic artifact coverage, and explicit exclusion of restricted audio/content namespaces.

- [x] **Step 1: Write failing runtime safety assertions**

  Assert index dependency order for all new modules, the `trkiListening` and
  `trkiSpeaking` routes, `rutr-v71`, the synthetic artifact in the static
  asset list, and absence of restricted audio paths, File/Blob persistence,
  and Listening namespaces from backup. Assert no new flashcard or adaptive
  planner rewrite is present and the exact architecture conclusion is recorded
  in the Phase 7 design/spec documentation.

- [x] **Step 2: Run focused runtime tests and observe RED**

  Run `node --test tests/trki-listening-runtime.test.js tests/trki-storage.test.js tests/speaking-service-worker.test.js tests/stabilization.test.js`.

  Expected: FAIL because the new runtime assets and cache revision are absent.

- [x] **Step 3: Implement final wiring only after assets exist**

  Add new static JS and synthetic JSON paths to `index.html` and `sw.js`,
  bump `rutr-v67` to `rutr-v71`, keep metadata requests network-first only
  where the existing pattern requires it, and never add restricted/local
  binary paths. Keep `StorageManager.userDataKeys` unchanged for restricted
  content; the new Listening session/attempt namespaces are intentionally not
  normal backup/export data until an explicit safe metadata export contract
  exists.

- [x] **Step 4: Run focused runtime tests and observe GREEN**

  Run the same focused runtime command. Expected: all cache, backup, wiring, and stabilization tests PASS.

- [x] **Step 5: Commit**

  Run `git add js/storage.js sw.js index.html tests/trki-listening-runtime.test.js tests/trki-storage.test.js tests/speaking-service-worker.test.js tests/stabilization.test.js && git commit -m "chore: wire phase 7 runtime safety"`.

### Task 8: Full verification, review, and final evidence

**Files:**
- Modify: `docs/superpowers/plans/2026-09-21-phase-7-listening-speaking.md` with checked steps and ledger references.
- Create: `.superpowers/sdd/2026-09-21-phase-7-listening-speaking/progress.md` through the executing-plans workspace script.

- [x] **Step 1: Run the complete automated suite**

  Run `npm test` from the isolated worktree. Expected: every existing Phase 0–6 test plus every Phase 7 test passes; record exact test/pass/fail counts.

- [x] **Step 2: Run static safety checks**

  Run `git diff --check`, verify `git status --short --branch`, inspect `git diff --stat de2cff9530845aef0e5dc94382df7db7c5572558..HEAD`, and scan for restricted binary/raw audio terms in backup and Service Worker paths. Expected: clean diff check, only intended Phase 7 files, no restricted binary or raw audio persistence/cache path.

- [x] **Step 3: Perform Chrome/macOS manual acceptance**

  Start the local PWA in Chrome, enter TRKI Listening Study, explicitly play
  the synthetic fixture, replay until the package max is reached, submit a
  correct and incorrect answer, reload, and confirm replay state and timer.
  Enter Exam, verify pause/seek/autoplay restrictions, simulate or use an
  unavailable restricted item, and confirm the explicit technical/non-
  comparable message. Enter normal Speaking and TRKI Speaking, verify both
  use the same controls and that TRKI context does not create a score.

- [x] **Step 4: Run final fresh verification**

  Re-run `npm test` and `git diff --check` after manual acceptance. Expected: the same exact all-green suite and clean diff check.

- [x] **Step 5: Commit final evidence**

  Run `git add docs/superpowers/specs/2026-09-21-phase-7-listening-speaking-design.md docs/superpowers/plans/2026-09-21-phase-7-listening-speaking.md .superpowers/sdd/2026-09-21-phase-7-listening-speaking/progress.md && git commit -m "docs: record phase 7 verification evidence"`.

### Final evidence recorded

- Automated suite: `npm test` → 264 tests, 264 passed, 0 failed.
- Static checks: `git diff --check` clean; final Service Worker revision is `rutr-v71`.
- Chrome/macOS acceptance: clean-origin Study replay/reload/completion, Exam restrictions, simulated restricted-audio technical timeout, normal Speaking, and TRKI Speaking reuse completed.
- Review: self-review completed against the Phase 7 contract; no subagent tool was available in this task.
- Deferred by design: the repository contains only clearly labelled synthetic B1 fixtures; official/institutional Listening content remains metadata/provenance-gated and requires a later reviewed artifact. No planner policy change warranted from current verified evidence.

## Completion report contract

The final report must include the isolated branch/worktree, sealed baseline,
final commit, changed files, new schemas and migrations, Listening and
Speaking architecture, objective/practice/technical scoring semantics,
provenance and restricted-audio behavior, adaptive and flashcard decisions,
exact test counts, regression result, source/provenance evidence, Service
Worker revision, `git diff --check`, manual acceptance status, and every
ledgered ruling or deferred minor. No push or merge is part of this plan.
