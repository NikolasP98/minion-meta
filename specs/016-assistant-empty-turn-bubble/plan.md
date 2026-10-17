# Implementation Plan: Floating assistant — no empty bubble while the reply is pending

**Spec**: `spec.md` | **Date**: 2026-10-16 | **Repo**: minion_hub, branch `fix/assistant-empty-bubble` off `feat/sandbox-pages-poc`, worktree `~/.cache/claude-tmp/hub-bubble`; live re-test on `~/.cache/claude-tmp/hub-sb` (`dev:local` :5199, cherry-pick)

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS |
| II AS-IS/TO-BE/DELTA with evidence | PASS — file:line + Playwright MutationObserver samples |
| III Slice-scoped | PASS — one commit, two source files + one test |
| IV Required build steps | prettier (svelte plugin), `vitest run src/lib/assistant/ui-blocks.test.ts src/lib/chat`, `bun run check` (6 GB); no styles touched ⇒ lint:design/tokens not required; no routes/i18n |
| V Security gates | not tagged: render-only |

## Design decisions
- **D1 Fix the condition, not the renderer.** The bubble already delegates "what is visible" to `MarkdownMessage` (`parseUiBlocks`). Reusing `stripUiBlocks` for the `{#if}` keeps ONE definition of visible text; the bubble still receives the raw `stripTtsTags(stream)` so `ui.choice` buttons render inside it once prose exists, exactly as before.
- **D2 Keep "Thinking…" up while in flight.** `sending` drops on the first delta by design (`gateway.svelte.ts:1291`); `stream !== null` is the in-flight signal from send to commit/abort/error. Rejected: re-flipping `sending`, or a new state field — more surface for the same pixel.
- **D3 Hide the half-typed opener inside `parseUiBlocks`.** It is the same "block is not for the reader" rule, one regex + a prefix check, and it fixes both surfaces that call `parseUiBlocks`. Rejected: a widened `OPEN_TAIL_RE` (matched the closing ``` of complete fences — caught by the existing test).

## Files
```
src/lib/components/layout/FloatingAssistant.svelte  (streamText derived; two conditions; one import)
src/lib/assistant/ui-blocks.ts                      (OPEN_FENCE_WORD_RE + OPENER prefix check)
src/lib/assistant/ui-blocks.test.ts                 (two assertions in the streaming case)
```
