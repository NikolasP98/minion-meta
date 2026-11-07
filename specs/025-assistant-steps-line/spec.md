# Feature Specification: Assistant step line ("C2 · icon stack")

**Repos & PR bases**: minion_hub → `master` (`feat/assistant-steps-line`) · minion-meta → `dev`
**Created**: 2026-10-17 | **Status**: Approved (owner: "implement C2") | **Tags**: ui | **Human gates**: hub master review-merge

**Input**: Owner screenshot of the floating assistant: reasoning and tool rows render as bare chevrons/rings with no text — "These tool calls and reasoning need a subtly-styled title or content." Demo artifact https://claude.ai/artifact/HF2UMEzdvN26TBtLp7qqfx (five C variants × nine edge cases); owner picked **C2**.

## AS-IS (hub `origin/master`)
`ChatBlocks.svelte` renders each reasoning trace (`AiReasoning`) and each tool group (`AiToolCall`) as its own row. With `compact` (floating assistant) both components drop their label and draw only ring + chevron, so a turn shows a column of unlabeled chevrons above the answer.

## TO-BE
- All reasoning + tool steps of a turn fold into ONE line (`AiSteps`): chevron, a stack of the latest 5 step icons (+N for older), and a summary — "3 steps · 2 tool uses · 1 failed"; while the turn runs (no answer text yet) the label names the step in progress with a shimmer.
- Label ellipsizes inside the panel; full text in the tooltip/accessible name. Every tool failed → summary in the danger colour.
- Opening the line shows the existing per-step rows, always labelled (no compact), inside a small surface card.
- `chat_artifact` cards stay outside the fold.

## DELTA
| # | Change | Proof |
|---|---|---|
| D1 | `src/lib/components/ai/AiSteps.svelte` + `AIStep` type + export | `ai-kit.mounted.test.ts` (summary/expand; running label; +N cap) |
| D2 | `ChatBlocks.svelte` folds steps into `AiSteps`; inner rows unlabeled-compact removed | `src/lib/chat` tests, svelte-check |
| D3 | i18n `ai_steps`, `ai_stepsFailed` (en + es) | i18n compile |

## Out of scope (demo-only today)
Approval / stopped states, "show N more" inside long lists, readable per-tool labels (tool ids shown as-is), per-turn thinking seconds in the summary.
