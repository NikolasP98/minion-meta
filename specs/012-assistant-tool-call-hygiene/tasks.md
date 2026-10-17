# Tasks: Assistant tool-call hygiene

- [X] T001 Diagnose: session transcript (20× `find_related {}`), gateway log ("no snapshot"), curl with/without `x-minion-server-id` (403 → 200).
- [X] T002 S1 gateway: `HubRest.serverId`, `setHubRest` passes it, `hubHeaders()` in `hubGet`/`hubPost`; test. Gates: oxlint, oxfmt, vitest (133 pass).
- [X] T003 S2 hub: `foldToolTurns` + 3 tests; `FloatingAssistant` renders `shown`. Gates: prettier, svelte-check, lint:design, lint:tokens, vitest src/lib/chat.
- [X] T004 Local proof: hot-patch the running `:dev` container (two `dist/hub-common-*.js`), restart, capability fetch 200.
- [ ] T005 Owner proof on `/sandbox`: a multi-tool turn renders as one "N tool uses" row; data tools work (no `find_related` loop).
- [ ] T006 Gateway PR → `DEV`; after the `:dev` image rebuilds, `dev:local --gateway` needs no patch.
