---
id: 2026-10-16-hub-sandbox-builder-context-engineering
title: Sandbox builder — programmatic context engineering (defaults, lint-as-feedback, JEV style cards, pi context pruning)
status: draft
created: 2026-10-16
updated: 2026-10-16
repos: [minion_hub, minion, minion-meta]
tags: [logic, agent]
value: 8
effort: M
parent: 2026-10-16-hub-sandbox-pages-followups
---

# Sandbox builder — programmatic context engineering

**Owner ask (2026-10-16, verbatim):** "the labels for all charts look ugly like this. Give the builder agent better context engineering. Remember to use JEV for custom decision points and properly using the pi agent's hooks system. We need smarter, programmatic context. Don't over-engineer it."

**One-line thesis.** Stop teaching the model good charts in prose; make the good chart the default in the runtime, turn the save tool into the feedback loop, let JEV pick the one small card a build turn needs, and let the gateway's existing `context` hook forget element code the board already holds.

## AS-IS (evidence, hub `feat/sandbox-pages-poc` @ `6c9fae17`, gateway `origin/DEV`)

1. **Ugly labels are a defaults problem.** The frame loads stock ECharts with no theme: `bridge.ts:98-109` only resolves the library; `minion.theme` is a bag of CSS variables the model is told to "colour the series from" (`turn-router.ts` sandbox inject). Every chart is hand-styled per element, so every chart looks different and the parts the model does not touch (value labels, axis lines, tooltips) fall back to ECharts' defaults, which are designed for a white page. The owner's screenshot is the stock label style (outlined text) on the hub's dark surface.
2. **Guessing is not caught.** The heatmap element tried three invented dataset ids, swallowed every error (`catch (e) {}`) and drew zeros; `sandbox.upsert_element` saves whatever it gets and answers `{id}` (`tools.ts:391-408`). The protocol said "call sandbox.datasets first" in prose; the model skipped it. Queries without `limit` get the server default of 100 rows (`query-compiler.ts:69`) while the manifest promises "up to 1000".
3. **Element code pollutes the transcript forever.** Each build puts 2–6 KB of HTML/JS into the assistant's own message (the ```` ```minion-ui ```` block) and silent follow-up turns are persisted in the gateway transcript (`dispatch.ts:12` TODO). The gateway's context-pruning extension already hooks pi's `context` event (`src/agents/pi-extensions/context-pruning/extension.ts:6`) but prunes only `toolResult` messages (`pruner.ts:137`), never fenced blocks in assistant text. A session with ten builds carries ~40 KB of stale element code into every turn.
4. **One big prose manifest, no decision about the visual.** JEV (`assistant-router.service.ts`) decides mode + six manifests; the `sandbox` manifest is ~1.6 KB of rules for every kind of visual. The classifier state is `ui_locale` + `page` (`:57-62`); it cannot tell a KPI from a 3D surface, nor an update from a new element.

What the research says (2026-10-16): Anthropic's context-engineering guidance asks for the "right altitude" (neither hard-coded logic nor vague prose), tool results that are "token efficient" and "encourage efficient agent behavior", "a few strong examples" over rule lists, just-in-time retrieval, and notes that "clearing old tool results is a light, safe form of compaction" ([Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). The pi extension API we already run exposes exactly the two hooks this needs: `context` (handler returns a filtered/modified `messages` array before the LLM call) and `tool_result` (can replace result content) ([pi-mono extensions](https://mintlify.wiki/pt-act/pi-mono/concepts/extensions)). Secondary 2026 write-ups converge on "pointers, not payloads" and treating tool output as the main context drain ([DEV](https://dev.to/astronaut27/agent-context-in-2026-the-whole-map-on-one-page-1dmo), [amux](https://amux.io/guides/context-engineering/)).

## TO-BE — four small mechanisms, in value order

**S1 Defaults in the runtime (zero prompt tokens, fixes the screenshot).** The bridge registers a hub ECharts theme built from the live tokens once per frame (`echarts.registerTheme('hub', …)`: text colour and sizes from the type scale, axis/split lines from border tokens, tooltip surface, `label.textBorderWidth: 0`, categorical palette from the chart tokens) and exposes `minion.chart(el, option)` = `init(el, 'hub')` + `setOption` + the resize the bridge already does, plus `minion.fmt.money/num/date` bound to the org's locale and currency. `minion.query` defaults `limit` to 1000. The manifest shrinks to "use minion.chart; use minion.fmt": the model stops styling and the parts it forgets are right by construction. Proof: the same waterfall element re-saved with `minion.chart` renders with themed labels (screenshot); SC-004 and the manifest size stay green.

**S2 Lint as feedback (the save tool is the loop).** `sandbox.upsert_element` runs a pure `lintElement(code, catalog)` before writing: unknown dataset id → reject with the list of valid ids; `fetch(`/`import ` → reject; empty `catch {}` → warn; hex colours, `textBorder*`, `fontFamily` literals → warn "use minion.chart/minion.theme"; missing `minion.ready` → warn. The tool answers `{id, warnings}` or `{error, problems}`; the existing follow-up chain (`runner.ts:needsFollowUp` on `error`) makes the model fix it in the same turn without a new rule. Proof: unit tests per rule; the heatmap's original code is rejected with "unknown dataset sched_bookings; valid: scheduling.bookings, …".

**S3 JEV picks one style card.** On a sandbox record_action turn the same classifier call answers four extra nouls — chart / table / KPI / 3D-or-map — and "is this a change to an element already on the board?" (state gains a one-line canvas digest: count + titles + ids). Only the winning card is injected, each ≤ 350 chars and built around ONE canonical snippet (examples beat rules): e.g. `chart`: `minion.ready(async()=>{const {rows}=await minion.query({dataset:'…'}); minion.chart(document.getElementById('c'),{xAxis:{type:'category',data:…},series:[{type:'bar',data:…,label:{show:true,formatter:v=>minion.fmt.money(v.value)}}]})})`; `update`: "call sandbox.upsert_element with id <id>". The generic manifest keeps only the runtime contract. Proof: router tests for the new nouls; envelope on a chart turn ≤ today's size.

**S4 pi `context` hook forgets stale element code.** Extend the existing context-pruning extension: in assistant messages older than the last two turns, replace the body of ```` ```minion-ui ```` blocks whose tool is `sandbox.upsert_element` with `{"tool":"sandbox.upsert_element","input":{"id":"<id>","title":"<title>"},"elided":"<n> KB — the board map in context is current"}`. The element code lives in the DB and the canvas map in the envelope is the truth; the transcript needs the pointer, not the payload. Same pattern as the existing tool-result pruning, same settings surface. Proof: pruner unit test; a 10-build session's context shrinks by the elided bytes (log the figure).

**Not doing (and why):** a second "reviewer" agent (S2 gives the same correction for one tool call), a style DSL (ECharts option + theme is the DSL), a grader loop on screenshots (expensive; S1 removes the failure class), more prose rules (the failure was rules being skipped).

## DELTA / slices
| Slice | Repo | Size | Proof |
|---|---|---|---|
| S1 runtime defaults | hub (`bridge.ts`, `srcdoc.ts`, `tools.ts`, manifest) | S | screenshot before/after on the same element; bridge unit test for theme build; manifest ≤ 1.2 KB again |
| S2 lint-as-feedback | hub (`src/lib/sandbox/lint.ts` + `tools.ts`) | S | rule tests; follow-up turn fixes a rejected save (Playwright) |
| S3 JEV style cards | hub (`turn-router.ts`, `assistant-router.service.ts`, `assistant-context.ts`) | M | router tests; SC-004; one card per turn |
| S4 pi context pruning of element code | gateway (`pi-extensions/context-pruning`) | S | pruner test; context size log |

Order: S1 → S2 (both fix the owner's two incidents) → S4 (cheap, cumulative savings) → S3 (needs S1's helpers in the examples). Each slice is its own Spec Kit feature (`specs/019…022`) and PR; S1+S2 inside hub #542, S4 a gateway PR to DEV.

## Metrics
- Builds whose first save passes lint without warnings (target > 80% after S1+S2).
- Turns to a correct chart for a plain request (target ≤ 2, today 3–6 with loops).
- Envelope prose on a sandbox chat turn (SC-004 test, unchanged) and context bytes per turn after S4 (log).

## Open questions for the owner
- Org currency/locale source for `minion.fmt`: the org settings record (preferred) vs. the dataset's `currency` column.
- Should S2 reject on warnings for the agent but only warn for a human editing in the library panel? (Proposal: same rules, human sees them inline.)
