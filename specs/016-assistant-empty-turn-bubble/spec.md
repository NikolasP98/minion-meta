# Feature Specification: Floating assistant — no empty bubble while the reply is pending

**Feature Branch**: `docs/spec-016-assistant-empty-turn-bubble` | **Repos & PR bases**: minion_hub → `feat/sandbox-pages-poc` (hub `fix/assistant-empty-bubble`; lands inside the sandbox POC branch, hub #542) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic (render-only; no data, no routes, no new i18n) | **Human gates**: none beyond the POC PR's own

**Input**: Owner, 2026-10-16 (screenshot): right after sending a message in the floating assistant, a small EMPTY dark rounded bubble (~24 px wide) appears at the left under the user's bubble, before any reply text.

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `feat/sandbox-pages-poc` @ `970ca251`).
- The floating assistant renders a streaming bubble whenever the raw stream text is non-empty: `{#if stream !== null && stream !== ''}` → `<div class="… rounded-lg px-3 py-2 … bg-bg3 … border-dashed …"><MarkdownMessage value={stripTtsTags(stream)} /></div>` (`FloatingAssistant.svelte:1008-1015`); otherwise `{:else if sending}` shows the "Thinking…" row (`:1016-1032`). `sending` is set to `false` on the FIRST `chat.event` of the run, handing the indicator off to the bubble (`gateway.svelte.ts:1289-1291`); `chat.stream` is the raw delta text (`:1299-1303`), `''` from send until the final commit nulls it (`chat-rpc.ts:287`, `chat.svelte.ts:267`).
- `MarkdownMessage` strips every ```` ```minion-ui ```` fence from what it renders, including an unterminated fence at the tail while streaming (`MarkdownMessage.svelte:36-41`, `ui-blocks.ts:33-35,37-48`). The UI-call briefing itself warns the model that "a reply that is only a block shows as empty" (`briefing.ts:43`).
- So a reply that OPENS with a fence (`ui.choice`, `hub.navigate`, `hub.pages`, `ui.guide` — the sandbox/page-aware assistant uses these constantly) streams as an empty pill until the fence closes and prose arrives. Reproduced on `dev:local` with Playwright + a `MutationObserver` on the message list (`~/.cache/claude-tmp/hub-sb-proof/016-empty-bubble.png`): at t+3.2 s after send the last child is the dashed bubble with `<pre><code class="language-min"></code></pre>` (stream = half-typed opener "```min", which the tail regex does not match yet — it needs the full word), then at t+3.5 s the same bubble with NO content (stream = "```minion-ui\n{"tool":"ui.choice"…", tail hidden), then at t+4.2 s the real text. Prose-first replies ("hola", "take me to the CRM page") never show it.
- `foldToolTurns` (`blocks.ts:151-191`) is NOT involved: the empty element is the stream bubble, not a folded assistant message (verified by outerHTML — no `.turn`/`.answer` inside).

**TO-BE.**
- The streaming bubble appears only when the reader would actually see text: `streamText = stripUiBlocks(stripTtsTags(stream))` non-empty. While a run is in flight with nothing visible yet (`sending`, or `stream !== null` after the first delta), the existing "Thinking…" row stays up — no gap, no pill.
- A fence opener still being typed at the very end of the stream (any prefix of ```` ```minion-ui ````, e.g. "```min") is hidden exactly like the unterminated fence is; other code fences are untouched.
- Removing: nothing. The bubble's markup, the smoother, `chat.stream` (voice mirror), `ChatPanel`'s own stream rendering, and the committed-message path are unchanged.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 bubble condition | `FloatingAssistant.svelte`: `streamText` derived; bubble `{#if streamText}`; indicator `{:else if sending \|\| stream !== null}` | Playwright on `dev:local`, same forced fence-first prompt: MutationObserver sees "Thinking…" → committed reply, zero empty states (`016-fixed.png`); prose-first "hola" unchanged |
| S2 half-typed opener | `ui-blocks.ts`: `OPEN_FENCE_WORD_RE` + prefix check in `parseUiBlocks` | `ui-blocks.test.ts`: `stripUiBlocks('```min') === ''` (failed before: returned "```min"), `stripUiBlocks('```minion-ui\n{"tool":"ui.choice"…') === ''`; existing "does not touch other code fences" still green |

## User Scenarios & Testing

1. **Owner asks something the assistant answers with a choice/navigation block first** → user bubble, "Thinking…", then the reply (buttons/prose). No empty pill at any sample.
2. **Plain prose reply ("hola")** → user bubble, "Thinking…", streamed text, committed text — identical to before.
3. **Reply is ONLY a block with no prose** (model ignores the briefing) → "Thinking…" until commit; the committed bubble then shows the action line / choice buttons as today (`MarkdownMessage` `actions`/`choice`).

## Requirements
- FR-001 The stream bubble MUST NOT render with no visible content.
- FR-002 Between the first delta and the first visible text, the "Thinking…" row MUST remain (no blank gap).
- FR-003 `parseUiBlocks` MUST hide a trailing partial ```` ```minion-ui ```` opener and MUST NOT alter any other fence (closing ``` included).
- FR-004 No change to `ChatPanel`, the smoother, `chat.stream`, or committed-message rendering.

## Out of scope / open ends (ledger)
- **Out of scope:** the committed-message empty bubble when a reply is ONLY a block whose tool has no action label (e.g. a sandbox.* call emitted as a fence); the briefing already forbids block-only replies and `MarkdownMessage` labels the known tools. `ChatPanel.svelte:70-90` renders `chat.stream` through `ChatMessage` with the same raw-text condition — same class of gap, different surface, not touched here.
- Pre-existing, unchanged: after the 120 s guard timeout (`chat-rpc.ts:293-298`) nothing nulls `chat.stream`, so a dead run now leaves "Thinking…" up where it previously left either nothing (`stream === ''`) or the partial dashed bubble — until the next send or New chat resets it. Ledger entry: meta `proposals/2026-10-12-hub-assistant-jev-context-router.md` open end 9.
