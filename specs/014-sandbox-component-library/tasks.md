# Tasks: Sandbox component library

- [X] T001 Spec/plan.
- [X] T002 S1: migration `published`; service columns/visibility/creator guard; PATCH schema `published`.
- [X] T003 S2: `library.ts` + 4 tests; `LibraryPanel.svelte`; `EditableGrid` `bind:editing`; page drop zone + insert-before; `ElementFrame` save action; 11 i18n keys EN/ES + compile.
- [X] T004 Gates: svelte-check, lint:design/tokens, prettier, vitest, seed contract.
- [X] T005 Proof (PASSED 2026-10-16, two users) on `dev:local` (Playwright): save → panel → drag onto a cell (inserted before) → add (appended) → share → user B sees it, cannot unshare → unshare → gone for B. Screenshots `~/.cache/claude-tmp/hub-sb-proof/014-*.png`.
- [X] T006 Ledger: proposal entry (agent-facing library tool, previews, versioning).
