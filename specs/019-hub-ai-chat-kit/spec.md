# Feature Specification: Hub AI chat kit (SmoothUI-derived)

**Feature Branch**: `docs/spec-019-hub-ai-chat-kit` | **Repos & PR bases**: minion_hub → `master` (hub `feat/ai-components`) · minion-meta → `dev` (this spec)

**Created**: 2026-10-17 | **Status**: Draft | **Tags**: ui (render + one existing RPC; no data, no routes, no schema) | **Human gates**: owner merge (non-trivial UI)

**Input**: Owner, 2026-10-17: "improve our ai components. Look into this library's 'ai' components, then reverse engineer and implement in minion hub" — SmoothUI `ai-prompt-input`, `ai-conversation`, `ai-message`, `ai-sources`, `ai-reasoning`, `ai-tool-call`, `ai-approval` (smoothui.dev; source `github.com/educlopez/smoothui` `packages/smoothui/components/ai-*`, MIT, © 2024 Eduardo Calvo — read in full 2026-10-17).

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `origin/master` @ `21c00d15`).
- Every hub chat surface renders assistant turns through ONE renderer, `src/lib/chat/ChatBlocks.svelte` (consumers: `/home` via `my-agent/ChatTurn`, `layout/FloatingAssistant`, `chat/ChatMessage` → `chat/ChatPanel`, `crm/CrmInsightsChat`, `sessions/SessionViewer`, `builder/BuilderHub`).
- **Reasoning** is a plain `<details>` whose label flips between "Thinking…" and "Reasoning" (`ChatBlocks.svelte:282-289`); it never reports duration, never opens while thinking, never closes after.
- **Tool calls** are a `<details>` row: wrench icon, name, arg preview, and a status icon swapped between `Loader`/`Check`/`TriangleAlert` (`ChatBlocks.svelte:203-240`); consecutive calls fold into an "N tool uses" row (`:296-320`). Status has no "queued" state and the icon pops between three glyphs.
- **Sources**: none. A `web_search`/`web_fetch` result is only visible by expanding the tool row and reading raw JSON.
- **Approval**: `ui.choice` buttons (`components/assistant/AssistChoice.svelte`) render as a row of secondary buttons; after a pick the alternatives stay visible but disabled.
- **Conversation scroll**: three hand-rolled copies of "stick to bottom if near it" (`chat/ChatPanel.svelte:17-33` 40 px, `routes/(app)/home/+page.svelte:783-803` 48 px, `layout/FloatingAssistant.svelte:353-376` 40 px). None offers a way back after the reader scrolls up, and none follows growth that does not change the watched counters (an expanding tool row, a late image).
- **Composer**: `ChatPanel` uses a fixed-size mono textarea + "Send" text button (`ChatPanel.svelte:107-127`); `FloatingAssistant` a textarea + `Send` icon button (`FloatingAssistant.svelte:1094-1121`). Neither can stop a running reply, though the gateway exposes `chat.abort {sessionKey, runId?}` (`minion/src/gateway/server-methods/chat/handlers.ts:129`) and the hub already handles the resulting `aborted` chat event (`services/gateway.svelte.ts:1350`). No hub code sends `chat.abort` (`git grep chat.abort` → 0 hits in `src/`).
- **Message actions**: `my-agent/MessageActions.svelte` is an always-visible icon row on `/home`; copy confirms with a static check.

**TO-BE.** A kit in `src/lib/components/ai/` reproducing the seven SmoothUI behaviours with hub tokens and Svelte transitions (no new dependency):
1. **AiPromptInput** — grows with content up to 8 lines then scrolls; Enter sends, Shift+Enter breaks the line; the send control becomes Stop while a reply is running and Stop aborts the run; a character counter appears from 80 % of an optional limit and turns danger past it; optional attachment chips; extra toolbar controls slot.
2. **AiConversation** — follows the newest content only while the reader is within 48 px of the bottom; when they scroll up it stops following and shows a "Jump to latest" pill; it also follows size changes of its content (not just new messages).
3. **AiMessage** — a message row whose action row is always mounted (no layout shift) and revealed on hover AND keyboard focus inside the message, sliding out from the bubble's own edge; copy confirms with a brief pop.
4. **AiReasoning** — the summary shimmers only while the model is thinking, opens itself while thinking, then reads "Thought for N s" and collapses 600 ms after thinking ends, unless the user toggled it by hand (then it stays as they left it).
5. **AiToolCall** — one status ring that changes behaviour across the lifecycle: queued breathes, running spins as a gap, done draws a check, failed draws a cross, all in the same ring; arguments and result stay collapsed until asked.
6. **AiSources** — the links an answer drew on (URLs in that turn's `web_search`/`web_fetch` inputs and results, de-duplicated) shown under the answer as up to 3 overlapping site marks + "+n"; hover fans the stack; opening lists title + host per source, opening in a new tab.
7. **AiApproval** — a question with options; choosing makes the chosen option fill the card and the alternatives collapse away; a destructive option is styled as such; already-resolved state renders resolved.

Invariants: every animation has a reduced-motion path with no movement; semantic design tokens only (`lint:design && lint:tokens` debt may only decrease); every new user-visible string goes through Paraglide (`en` + `es`); existing behaviours kept — compact mode in the floating assistant (icon + status only on tool rows), permission chips on tool rows, "N tool uses" grouping, `chat_artifact` cards, `ui.choice` send path, mention/chip composer on `/home`.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 kit | new `src/lib/components/ai/*` (7 components + shared state type + pure source extractor) | unit test for the source extractor (search JSON, fetch input, duplicates, non-http dropped); mounted tests for prompt input (Enter sends, Shift+Enter doesn't, Stop while running), reasoning (auto-collapse vs user toggle), approval (alternatives gone after pick) |
| S2 renderer | `ChatBlocks.svelte`: reasoning → AiReasoning, tool row → AiToolCall (group row reuses the ring), AiSources under the answer | existing `blocks.test.ts` green; mounted render shows the ring states; local `dev:local` screenshot of a turn with reasoning + tools + sources |
| S3 surfaces | `ChatPanel`, `FloatingAssistant`, `/home` thread → AiConversation; `ChatPanel` + `FloatingAssistant` composer → AiPromptInput with Stop → new `abortChat()` sending `chat.abort {sessionKey}`; `AssistChoice` → AiApproval; `MessageActions` reveal on hover/focus-within | `bun run check`, `bun run test` (scoped), `lint:design && lint:tokens`; browser check on `dev:local`: scroll up during a reply shows the pill, Stop ends the run |

## User Scenarios & Testing

### User Story 1 — Follow a working assistant without losing your place (P1)
A user asks the assistant something that triggers reasoning and several tools. They watch it think (shimmering "Thinking"), see each tool ring go queued → running → done, then read the answer, which settles with the reasoning collapsed to "Thought for 4.2 s".
**Independent test**: one turn with reasoning + 2 tools on `dev:local`. **Acceptance**: (1) while thinking, the reasoning is open and shimmering; (2) 600 ms after it ends it collapses and shows a duration; (3) a failed tool shows a cross in a danger-coloured ring.

### User Story 2 — Read back during a long reply (P1)
While a reply streams, the user scrolls up to re-read. The view stays where they put it and a "Jump to latest" pill appears; clicking it returns to the bottom and resumes following.
**Acceptance**: no scroll jump while scrolled up; pill visible only while away from the bottom; keyboard reachable.

### User Story 3 — Stop a reply (P2)
The user sends a prompt, realises it is wrong, and presses the same button (now Stop). The run ends and the composer is ready again.
**Acceptance**: the control is labelled "Stop generating" while a reply runs; pressing it sends one abort for that conversation; the thread shows the partial reply as the gateway reports it.

### User Story 4 — Check where an answer came from (P2)
After a web search, the answer shows a small stack of site marks + "Sources". Opening it lists each page; clicking opens it in a new tab.

### User Story 5 — Decide when the assistant asks (P3)
The assistant offers "Show me how / Do it for me". The user picks one; the chosen option fills the card and the other disappears, and the pick is sent as their next message (unchanged send path).

### Edge Cases
- Reduced motion: no shimmer, no spin, no fan, instant collapse; state still told by text/colour/glyph.
- Reasoning toggled by the user mid-thought: never auto-collapses afterwards.
- Tool with no input and no result: row is not expandable.
- Source URLs that are not http(s), malformed, or duplicated: dropped / merged by URL.
- Stop pressed when the run already finished: the abort is harmless (`aborted:false`).
- Surfaces without a send path (SessionViewer, history views): approvals render disabled, as today.
- Over-limit draft: counter turns danger; sending is not blocked unless the surface sets a hard limit.

## Requirements

- **FR-001** AiPromptInput MUST send on Enter and insert a newline on Shift+Enter, and MUST NOT send empty/whitespace drafts.
- **FR-002** While the surface reports a running reply, the submit control MUST read "Stop generating" and MUST call the surface's stop handler instead of sending.
- **FR-003** The hub MUST provide `abortChat(agentId, sessionKey?)` that sends `chat.abort` with the conversation's session key; ChatPanel and FloatingAssistant MUST wire Stop to it.
- **FR-004** AiConversation MUST follow new content only within 48 px of the bottom, MUST show a keyboard-reachable "Jump to latest" control otherwise, and MUST follow content size changes.
- **FR-005** Message actions MUST stay mounted and become visible on hover and on focus-within.
- **FR-006** AiReasoning MUST shimmer only while thinking, MUST report the measured duration after, and MUST auto-collapse 600 ms after the end unless the user toggled it.
- **FR-007** AiToolCall MUST render one ring for all four statuses (queued, running, done, failed) with an accessible status text, and keep args/result collapsed by default.
- **FR-008** AiSources MUST list unique http(s) URLs from that turn's `web_search`/`web_fetch` inputs and results, MUST render nothing when there are none, and links MUST open with `rel="noopener noreferrer"`.
- **FR-009** AiApproval MUST accept one decision only, collapse alternatives after it, and render a provided resolved state without asking again.
- **FR-010** All motion MUST honour `prefers-reduced-motion`; all colours/spacing/radii MUST be semantic tokens; all new strings MUST be Paraglide messages in `en` and `es`.
- **FR-011** No regression: compact tool rows, permission chips, "N tool uses" grouping, `chat_artifact`, `/home` ChatInput (mentions, chips, capture mode) unchanged.

### Key Entities
- **AI state** — `idle | thinking | streaming | done | error`, the one value a surface hands to the composer and turn so they move together.
- **Source** — `{ url, title, host }` derived per turn; never stored.

## Success Criteria
- **SC-001** In a turn with reasoning and tools, the user can tell thinking / running / done / failed apart without expanding anything (verified by screenshot at each state).
- **SC-002** Scrolling up during a streaming reply never moves the view (0 jumps over a 20-second stream, measured by scroll position sampling).
- **SC-003** A running reply can be stopped in one click/keypress from ChatPanel and the floating assistant.
- **SC-004** Design-lint and token-lint debt does not increase; type check and scoped tests pass.

## Assumptions
- Site marks use a neutral globe glyph, not fetched favicons: fetching `/favicon.ico` from every cited host would leak the viewer's IP to third parties and is blocked by CSP on some deployments. Follows SmoothUI's own "honest unknown host" fallback.
- No vote (thumbs) actions: the hub has no feedback store; adding UI without a sink would be dead UI.
- `/home` keeps its own composer (`my-agent/ChatInput.svelte`, terminal style, mentions, drag chips, capture mode); it gains AiConversation and the message-action reveal only. Moving it onto AiPromptInput is a follow-up (ledger).
- `motion/react` is not ported; Svelte built-in transitions + CSS keyframes reproduce the springs closely enough. Durations come from hub motion tokens where they exist.

## Out of scope / open ends (ledger)
- `/home` composer onto AiPromptInput (+ Stop) — follow-up proposal.
- File attachments in ChatPanel/FloatingAssistant: the kit supports chips, but no hub surface uploads chat files yet.
