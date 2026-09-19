# Ru-Tr Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Production Mode and stabilize the confirmed runtime, security, PWA, navigation, and test failures.

**Architecture:** Keep the current plain JavaScript architecture. Use the strict dictionary as the single runtime source, remove the unauthenticated cloud-sync surface, and make Service Worker cache keys consistent. Keep local persistence and backup/import intact.

**Tech Stack:** Browser JavaScript, Vercel serverless handlers, Service Worker, Node.js built-in test runner, JSDOM.

**Spec:** `docs/superpowers/specs/2026-09-18-ru-tr-stabilization-design.md`

## Global Constraints

- Do not expose credentials or environment secrets in client code.
- Do not change unrelated dictionary content or UI copy.
- Preserve localStorage keys and local backup/import behavior.
- No push to a remote branch.
- Every task requires a RED/GREEN verification or a direct static invariant check where no runtime test exists.

---

### Task 1: Remove Production Mode

**Files:** Modify `index.html`, `js/app.js`, `sw.js`; delete `js/production.js`.

- [x] Record baseline failures.
- [x] Write/update a regression assertion that Production Mode has no menu, script, or navigation reference.
- [x] Remove Production Mode markup, menu card, script, and navigation branch.
- [x] Remove its Service Worker asset.
- [x] Run the static assertion and syntax checks.

### Task 2: Switch to Strict Runtime Data

**Files:** Modify `js/data.js`, `sw.js`.

- [x] Add a data-source assertion that runtime fetch names are strict files.
- [x] Change runtime fetches and network-first paths to strict files.
- [x] Verify strict source and sentence counts load consistently.
- [x] Correct the malformed `Пение` sentence record and revalidate every sentence pair.

### Task 3: Remove Insecure Cloud Sync

**Files:** Modify `js/storage.js`, `index.html`, `js/app.js`; delete `api/sync.js`.

- [x] Add an assertion that no client sync secret or sync API call remains.
- [x] Remove cloud-sync controls and auto-sync interceptor while preserving local backup/import.
- [x] Remove the unauthenticated shared-secret endpoint.
- [x] Run security/static checks.

### Task 4: Repair PWA Cache Refresh

**Files:** Modify `sw.js`.

- [x] Add an asset existence check and cache-key invariant test.
- [x] Remove missing assets, duplicate entries, and query-key mismatch.
- [x] Bump the cache version and verify all assets exist.

### Task 5: Repair Category Study Flow

**Files:** Modify `js/categories.js`.

- [x] Add a focused regression assertion for the selected category action.
- [x] Start Flashcard with `customWordList` instead of showing the placeholder alert.
- [x] Verify category action statically and with the test harness.

### Task 6: Remove Duplicate Script and Repair Tests

**Files:** Modify `index.html`, `test.cjs`, `test.js`, `test-quiz.js`, `package.json`; optionally add `tests/`.

- [x] Remove the duplicate `prefixes-mode.js` tag.
- [x] Replace the JSDOM smoke tests with a deterministic Node test suite.
- [x] Replace the broken quiz smoke script with a Node test runner suite.
- [x] Add `npm test` and run all tests.

### Task 7: Conservative Legacy Cleanup and Final Verification

**Files:** Only remove files proven to be unused; update `docs/push-notifications.md` if needed.

- [x] Re-scan references before deleting temporary files.
- [x] Do not delete strict data or reusable generation scripts without a confirmed replacement.
- [x] Remove proven throwaway files (`dummy.js`, `url_test.js`) and stale removed-mode UI/CSS.
- [x] Update the project and push-notification documentation to match the runtime.
- [x] Run full verification: tests, syntax checks, audit, asset/reference scan, strict-data integrity, and `git diff --check`.
- [x] Mark every checklist item with command evidence.
