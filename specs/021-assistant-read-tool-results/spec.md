# Feature Specification: Assistant read-only page tools return their results (production hotfix)

**Feature Branch**: `docs/spec-021-assistant-read-tool-results` | **Repos & PR bases**: minion_hub → `master` (`fix/assistant-read-tool-results`) · minion-meta → `dev` (this spec)

**Created**: 2026-10-17 | **Status**: Draft | **Tags**: logic, hotfix (render/agent-loop only; no data, no routes) | **Human gates**: none (non-security; hub master needs the owner's review-merge)

**Input**: Owner, 2026-10-17, production screenshots: on /sandbox "build some charts here" → the assistant says "Let me first see what datasets and existing elements are available." and stops; "create it" → same again, and its reasoning blames its own fences ("they were in a bash block"). Separately on /stock/entries/new a `module_action` call with `endpoint: "ui.choice"` fails validation before the model recovers with a proper `ui.choice` fence.

## AS-IS → TO-BE → DELTA

**AS-IS** (hub master `21c00d15`).
- After a live reply, `dispatch.ts` runs its `minion-ui` calls and sends a silent follow-up turn only when `needsFollowUp` is true (`runner.ts`): errors, missing/rejected fields, a fuzzy-match note, an unmounted form, or a tool in the hardcoded `READ_TOOLS = new Set(['hub.pages'])`.
- The sandbox's read tools (`sandbox.datasets`, `sandbox.preview`, `sandbox.list_elements`) declare `annotations.readOnlyHint: true` (`sandbox/tools.ts`) but the runner never reads it. Their results are dropped, the follow-up never fires, the turn ends after the model's "let me first explore" sentence. The spec 013 manifest tells the model to work datasets → preview → upsert, so every sandbox build stalls at step one.
- Follow-up results are cut at 1,500 chars; the dataset catalog is ~6,300 chars (8 datasets with columns), so even `hub.pages`-style reads would arrive truncated — the cause of the earlier invented-dataset-id heatmap.
- The briefing tells the model "Results come back to you only when something failed or a form needs values."

**TO-BE.**
- A tool that declares `readOnlyHint: true` always sends its result back (one silent follow-up, still capped by `MAX_CHAIN = 3`); `READ_TOOLS` is gone (`hub.pages` declares the hint already).
- Read results get 8,000 chars in the follow-up; everything else keeps 1,500.
- The briefing says read-only results come back and the model should wait for them instead of guessing.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 | `model-context.ts` `isReadOnly(name)`; `runner.ts` outcome `readOnly`, `needsFollowUp` honours it, read budget 8,000 | `runner.test.ts`: a registered `readOnlyHint` tool → follow-up with a 6,300-char result intact; a non-read tool → no follow-up and the 1,500 cut still applies |
| S2 | `briefing.ts` sentence | assistant + sandbox suites (154 tests) incl. the SC-004 envelope budget; svelte-check, design/token lint, Prettier |

## Out of scope / open ends (ledger)
- `module_action` with a UI-tool endpoint: the briefing already forbids calling UI tools as function calls and the model self-corrected in the same turn; a gateway-side guard (return "write a minion-ui fence" for `ui.*`/`hub.*`/`sandbox.*`/`fill_*` endpoints) needs a gateway release → follow-up proposal, not this hotfix.
- Prod gateway still lacks gw #332 (`x-minion-server-id`) until DEV→main promotion; unrelated to these page tools, which run in the browser.
