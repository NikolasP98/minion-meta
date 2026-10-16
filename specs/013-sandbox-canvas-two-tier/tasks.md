# Tasks: Sandbox canvas awareness, editable layout, two-tier builder

- [X] T001 Spec/plan (this dir).
- [ ] T002 S1: `EditableGrid.onchange`; `host.arrange`; `ElementFrame` height from the cell; `+page.svelte` renders through `EditableGrid` with debounced `arrange`.
- [ ] T003 S2: `page-context.ts`; `canvas.ts` + tests; page sets/clears the canvas map; `assistant-context.ts` appends it (+ test).
- [ ] T004 S3: core hint tier-2 rules; `sandbox.arrange`; richer `list_elements`; tests (six tools, arrange).
- [ ] T005 Gates: prettier, svelte-check, lint:design/tokens, vitest (sandbox, features, dashboard).
- [ ] T006 Proof on `dev:local`: drag/resize persists; agent updates an existing visual instead of duplicating; `arrange` reorders. Screenshots.
- [ ] T007 Ledger: TODO(handoff) for regex `describeElement` + proposal entry (sandbox follow-ups).
