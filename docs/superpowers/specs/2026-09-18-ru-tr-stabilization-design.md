# Ru-Tr Stabilization Design

## Goal

Remove the unused Production Mode and repair the confirmed data, security, PWA, navigation, and test failures without expanding the product scope.

## Decisions

- The application will use `kelimeler_tam_strict.txt` and `sentences_strict.json` as its canonical runtime dataset.
- The insecure cloud-sync feature will be removed from the browser and its `/api/sync` endpoint. Local JSON backup/import remains available.
- Production Mode is removed completely: its menu entry, markup, script, navigation branch, and service-worker entry are deleted.
- Category study starts a Flashcard session with the selected category's word list.
- Service Worker cache refresh writes the same request keys used by runtime cache reads, and all cache assets must exist.
- Existing test scripts are made deterministic under JSDOM and a single `npm test` command is added.

## Acceptance Criteria

1. No runtime reference to Production Mode or the removed cloud-sync route remains.
2. Runtime data loads the strict files and preserves source-line category mapping.
3. No shared sync secret is shipped to the browser or used as an API fallback.
4. Service Worker installation and refresh contain only existing assets and refresh runtime cache entries.
5. Category study invokes Flashcard with the category's words.
6. Regression tests pass through `npm test`; JavaScript syntax checks and `npm audit --omit=dev` pass.
7. The worktree contains no unrelated user changes.
