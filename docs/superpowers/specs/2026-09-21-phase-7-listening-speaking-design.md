# Phase 7 Listening and TRKI Speaking Design

## Scope

Phase 7 adds a local-first, personal-only TRKI Listening practice path and a
thin TRKI Speaking context on top of the sealed Phase 0–6 runtime. The work is
additive. Existing TRKI stores, the existing `ru_tr_speaking_events_v1`
schema, the adaptive planner, flashcards, and raw learning data keep their
current semantics.

The implementation uses clearly labelled synthetic fixtures only. Official or
institutional resources may remain represented in the Phase 6 source catalog,
but no restricted official/institutional binary, transcript, PDF-derived
content, or answer material is bundled.

## Listening identity and provenance

Every Listening question is bound to:

```text
package_id + package_version + task_id + audio_id + question_id
```

The package artifact stores package, task, audio, question, answer-key,
alignment, replay-policy, and optional-transcript hash references. A package
version is immutable after scored semantics change. The source fields remain
the Phase 6 fields: `source_type`, `source_class`, `official_trki_provenance`,
`content_policy`, `license`, `redistribution_status`, and
`full_content_bundled`. A local storage/acquisition mode is separate from
those provenance fields; restricted local audio never becomes `local_user`
unless it is genuinely user-originated.

Objective Listening eligibility requires all of the following to be true:

- the package/task/question identity is structurally valid;
- source identity resolves to the Phase 6 source catalog;
- source provenance is independently acceptable for the declared content;
- task numbering, question answer key, audio identity, alignment, and replay
  policy are present and hash-bound;
- `verification_status` is `verified` and `exercise_eligible` is `true`;
- the content policy permits the declared bundled or local-restricted mode.

Candidate, unverified, needs-review, metadata-only, and source-preserved
content remains practice-only and cannot create objective truth.

## Immutable evaluation evidence

`ru_tr_trki_listening_attempts_v1` is append-only. A final objective attempt
stores the submitted answer, result, score, evaluator version, complete
package/task/audio/question identity, the answer-key and alignment snapshots
used at evaluation time, their hash references, verification and eligibility
states, replay policy snapshot, and source reference. Hashes identify the
artifact but do not stand in for the historical answer-key snapshot. An old
attempt is never re-evaluated from a newer package.

Technical unavailability is an explicit non-scorable result. It is not a
wrong answer, is not sent to Error Notebook, mastery, or adaptive selection,
and makes an exam result non-comparable when it affects the scored item set.
The result must say so rather than silently changing the denominator.

## Restricted/local audio

Restricted audio has `storage_mode: "local_restricted"`. Only deterministic
metadata is persisted: SHA-256, MIME type, byte size, reliable duration when
known, source/content metadata, and availability state. The binary stays in
session memory, is not written to Git, Service Worker cache, normal backup, or
local storage, and is released on cleanup. Reload keeps the session, timer,
replay counters, and identity metadata, then marks unavailable audio as
`awaiting_audio_reselection`. A selected file is accepted only after its
computed SHA-256 matches the stored identity.

Synthetic fixtures may use the normal static artifact/cache flow and do not
need restricted recovery.

## Playback contract

Playback is a state machine with user-triggered logical starts. Exam playback
has no autoplay, pause, or seek; `max_plays` comes from the package. The first
accepted `playing` event for a logical start consumes one play. Buffering,
resume, duplicate `playing` events, duplicate clicks, and duplicate terminal
events are idempotent. A failed `play()` before actual start consumes nothing;
an interruption after actual start may leave the consumed play recorded.
Route, timeout, and session cleanup release the audio adapter.

## TRKI Speaking

`TrkiSpeakingCoordinator` reuses the existing `SpeakingMode`, speech adapters,
`ru_tr_speaking_events_v1`, and speaking read-model. It injects only optional
`trki_context` containing the TRKI level, package/task identity, and source
reference. The existing store continues to validate old events unchanged.
TRKI Speaking remains practice-only: no pronunciation, stress, accent,
fluency, grammar, official Speaking score, mastery success, automatic Error
Notebook truth, or adaptive truth is produced. Final transcript observations
retain `adaptive_eligible: false`; partial, empty, and unavailable transcripts
remain non-linguistic evidence.

## Adaptive and flashcard boundary

The Phase 4 planner remains `adaptive-planner-v1`; the architectural decision
is `no planner policy change warranted from current verified evidence`.
Speaking transcript observations are never difficulty evidence. A future
Listening provider would be opt-in and consume only snapshot-bound verified
objective Listening evidence. Flashcard selection and review semantics are
unchanged.

## Acceptance boundary

Automated tests cover identity, provenance gates, immutable evaluation,
restricted recovery, technical timeout, playback idempotency, Speaking reuse,
backup/cache exclusion, and full regression. Chrome/macOS acceptance verifies
explicit Listening playback, replay persistence, reload recovery, technical
timeout messaging, TRKI Speaking context, and normal Speaking regression.
