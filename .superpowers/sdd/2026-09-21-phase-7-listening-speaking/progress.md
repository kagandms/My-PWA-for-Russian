# SDD ledger — plan: docs/superpowers/plans/2026-09-21-phase-7-listening-speaking.md

Setup: isolated worktree `/Users/kagansmtdms/.codex/worktrees/phase7-trki-listening-speaking/Ru-Tr-main`, branch `codex/phase7-trki-listening-speaking`, sealed base `de2cff9530845aef0e5dc94382df7db7c5572558`.

Baseline: `npm test` → 220/220 pass.

Pre-flight shared interfaces:
- Task 1 → Task 2: package/task/question contracts and synthetic artifact feed repository validation and replay policy; confirmed by plan interfaces.
- Task 2 → Task 3: task audio metadata and replay state are consumed by restricted audio binding; keep binary out of the state machine; confirmed by plan interfaces.
- Task 2 → Task 4: objective identity/evaluation snapshot shape feeds append-only session/attempt stores; confirmed by plan interfaces.
- Task 4 → Task 5: session timer/audio binding and immutable attempt outcomes feed coordinator timeout and UI; confirmed by plan interfaces.
- Task 5 → Task 7: coordinator route/assets determine final index, backup, and cache assertions; confirmed by plan interfaces.
- Task 6 → Task 7: TRKI Speaking route and optional context determine final index/runtime assertions; confirmed by plan interfaces.

Ruling: Listening uses separate version-1 session and attempt namespaces instead of mutating Phase 6 TRKI stores — this preserves the sealed Phase 6 contracts while still reusing the existing timer semantics where safe — cost if wrong: duplicated local metadata namespaces require a future additive migration.

Task 1: complete (commits de2cff9..543464c, tests: node --test tests/trki-listening-core.test.js → ℹ duration_ms 69.829917)
Task 2: complete (commits 543464c..f7caece, tests: node --test tests/trki-listening-repository.test.js tests/trki-listening-playback.test.js → ℹ duration_ms 67.816666)
Task 3: complete (commits f7caece..427cae9, tests: node --test tests/trki-listening-audio.test.js → ℹ duration_ms 70.085041)
Task 4: complete (commits 427cae9..db9cecb, tests: node --test tests/trki-listening-session.test.js tests/trki-listening-attempt.test.js → ℹ duration_ms 122.724583)
Task 5: complete (commits db9cecb..573d913, tests: node --test tests/trki-listening-coordinator.test.js → ℹ duration_ms 80.897)
Task 6: complete (commits 573d913..4d780d4, tests: node --test tests/trki-speaking-coordinator.test.js tests/speaking-store.test.js tests/speaking-mode.test.js tests/speaking-runtime.test.js → ℹ duration_ms 97.693)
Task 7: complete (commits 4d780d4..64882ad, tests: node --test tests/trki-listening-runtime.test.js tests/trki-storage.test.js tests/speaking-service-worker.test.js tests/stabilization.test.js → ℹ duration_ms 95.78375)
Task 8: complete (commits f8c0dd2..8b03b94, tests: npm test → 264/264 pass; ℹ duration_ms 1983.425084)
