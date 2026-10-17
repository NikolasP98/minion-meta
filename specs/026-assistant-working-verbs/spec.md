# Feature Specification: "Working for N s" + contextual step verbs (Notion-style), 3D spinner everywhere

**Repos & PR bases**: minion_hub → `master` (`feat/assistant-working-verbs`) · minion-meta → `dev`
**Created**: 2026-10-17 | **Status**: Approved (owner) | **Tags**: ui, i18n | **Human gates**: hub master review-merge

**Input** (owner, screenshots of /home + Notion AI): "make sure the new 3d spinner is everywhere there's an ai chat surface, like here in /home, that still has the old dots. Also, instead of a static 'Thinking' text, lets implement a contextual VERB … notion seems to nail it. reverse-engineer this feature and implement".

## AS-IS (hub `origin/master` after #564)
- `/home` live turn: pink 3-dot "Thinking…" row under the step line (duplicates it); English-only "Thinking…"/"Using x…".
- Dots/pulse indicators also in `CrmInsightsChat`, `chat/ChatPanel` (typing bounce), `workshop/ChatPanel`; only `FloatingAssistant` uses `ThinkingShader`.
- `AiSteps` header: tool id or "Thinking"; rows show mono tool ids; English-only `ACTIVITY_VERBS`.

## Notion pattern (reverse-engineered from the screenshots)
Header "Working for 3s ⌄" → "Worked for 15s"; steps hang off a left rail; each step = icon + past-tense verb + object ("Read publications", "Queried database"); the active step is a present-tense verb with a shimmer ("Focusing").

## TO-BE
- `AiSteps` header: `ThinkingShader` + "Working for N s" (live, 1 s tick) while running; "Worked for N s · …" after; duration shared between the live and committed render via a turn key; falls back to "N steps" when unknown (history). Rows auto-open while running; rail instead of a card.
- Step rows: `toolVerb(name, done)` — present while running ("Searching"), past once done ("Searched"); arg preview (or tool id) as the object. Thinking step: "Reviewing results" after a tool call, else "Thinking".
- Verbs i18n (en/es), substring table extended for hub tools (query/crm, find/search, get/list/read, create/write, update/edit, booking, sandbox/chat_artifact, notify).
- `ThinkingShader` replaces every dots/pulse indicator: /home (both rows; the in-turn row hides once the step line exists), CRM insights, chat panel, workshop panel.

## DELTA
| # | Change | Proof |
|---|---|---|
| D1 | `blocks.ts` `toolVerb` + i18n `activityVerb` | `blocks.test.ts` |
| D2 | `AiSteps` timer/spinner/rail/auto-open; `AiReasoning.activeLabel` | `ai-kit.mounted.test.ts` (working/worked, committed render) |
| D3 | `ChatBlocks` verbs + turn key | svelte-check, chat tests |
| D4 | spinner swaps (4 surfaces) | svelte-check, lint:design/tokens |

## Out of scope
Rotating "personality" verbs; per-object deep links in step rows (Notion's page chips); approval/stopped states.
