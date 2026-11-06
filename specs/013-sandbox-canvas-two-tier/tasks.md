# Tasks: Sandbox canvas awareness, editable layout, two-tier builder

- [X] T001 Spec/plan (this dir).
- [X] T00- [X] T002 S1: `EditableGrid.onchange`; `host.arrange`; `ElementFrame` height from the cell; `+page.svelte` renders through `EditableGrid` with debounced `arrange`.
- [X] T00- [X] T003 S2: `page-context.ts`; `canvas.ts` + tests; page sets/clears the canvas map; `assistant-context.ts` appends it (+ test).
- [X] T00- [X] T004 S3: core hint tier-2 rules; `sandbox.arrange`; richer `list_elements`; tests (six tools, arrange).
- [X] T00- [X] T005 Gates: prettier, svelte-check, lint:design/tokens, vitest (sandbox, features, dashboard).
- [~] T006 Proof on `dev:local` (layout persistence PROVEN by Playwright 2026-10-16, `~/.cache/claude-tmp/hub-sb-proof/013-*.png`; agent dedupe/arrange proof = owner's next turns): drag/resize persists; agent updates an existing visual instead of duplicating; `arrange` reorders. Screenshots.
- [X] T007 Ledger: TODO(handoff) for regex `describeElement` + proposal entry (sandbox follow-ups).
