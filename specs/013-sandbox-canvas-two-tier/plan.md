# Implementation Plan: Sandbox canvas awareness, editable layout, two-tier builder

**Spec**: `spec.md` | **Date**: 2026-10-16 | **Repo**: minion_hub, branch `feat/sandbox-pages-poc` (hub #542), worktree `~/.cache/claude-tmp/hub-sb`

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS |
| II AS-IS/TO-BE/DELTA with evidence | PASS |
| III Slice-scoped | PASS — S1 layout, S2 awareness, S3 tier-2 protocol; one commit each on the POC branch |
| IV Required build steps | prettier, svelte-check (6 GB), lint:design/tokens, `vitest run src/lib/sandbox src/lib/state/features src/lib/components/dashboard`; no new routes/i18n keys (reuses `dash_layout_*`) |
| V Security gates | not tagged: same admin capability, same PATCH route, same fields |

## Design decisions
- **D1 Reuse `EditableGrid`, add one prop.** `onchange?: (layout) => void` switches it to controlled mode: skips localStorage/org-default, hides Reset/Save-default, reports every persist. Dashboard callers pass nothing ⇒ unchanged. Smaller than a second grid.
- **D2 Element rows are the layout.** `host.arrange(updates)` PATCHes only rows whose `position`/`w`/`h` differ, then reloads. The page debounces (300 ms) so a drag across several cells is one write batch. `saved` is cleared whenever `items` change, so agent-made size changes show without a reload.
- **D3 Page context = text, not structure.** `setPageContext(text)` is a module variable read by `buildAssistantContext` at send time; the sandbox writes `canvasSummary(elements)` in an `$effect`. Generic: any page can describe itself (CRM detail, POS) later.
- **D4 Tier 2 is prose + one tool, not a second agent.** The curation rules sit in the always-on core hint beside the canvas map (they need the map); the mechanics stay in the gated manifest. `sandbox.arrange` is the layout verb. The sub-session split is the follow-up.
- **D5 `describeElement` by regex.** `dataset: '<id>'` and `type: '<echarts type>'` in the element JS; cheap, testable, good enough for the POC (ledger notes the `meta` field upgrade).

## Files
```
src/lib/assistant/page-context.ts (+test in assistant-context.test.ts)
src/lib/sandbox/canvas.ts · canvas.test.ts
src/lib/sandbox/tools.ts (list_elements richer, sandbox.arrange) · tools.test.ts
src/lib/sandbox/host.svelte.ts (arrange)
src/lib/components/dashboard/EditableGrid.svelte (onchange)
src/lib/components/sandbox/ElementFrame.svelte (no own span/height)
src/routes/(app)/sandbox/+page.svelte (EditableGrid, page context)
src/lib/state/features/assistant-context.ts (tier-2 hint + page context)
```
