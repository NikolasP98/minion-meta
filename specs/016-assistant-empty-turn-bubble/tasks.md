# Tasks: Floating assistant — no empty bubble while the reply is pending

- [X] T001 Spec/plan (this dir).
- [X] T002 Reproduce on `dev:local` with own headless Playwright + MutationObserver; identify the element (stream bubble, `FloatingAssistant.svelte:1008-1015`) and the message state (`chat.stream` = fence-first text). Screenshot `~/.cache/claude-tmp/hub-sb-proof/016-empty-bubble.png`.
- [X] T003 S1: `streamText` derived; bubble `{#if streamText}`; indicator `{:else if sending || stream !== null}`.
- [X] T004 S2: `parseUiBlocks` hides a trailing partial opener; `ui-blocks.test.ts` assertions (fail before / pass after).
- [X] T005 Gates: prettier 0 · vitest (ui-blocks + src/lib/chat) 0 · `bun run check` (see PR body for the exit code).
- [X] T006 Live re-test: cherry-pick onto `hub-sb`, same forced fence-first prompt + "hola": zero empty states; `016-fixed.png`.
- [X] T007 Ledger: guard-timeout edge (pre-existing) → meta `proposals/2026-10-12-hub-assistant-jev-context-router.md` open end 9.
