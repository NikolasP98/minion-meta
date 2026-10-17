# Implementation Plan: Assistant tool-call hygiene

**Spec**: `spec.md` | **Date**: 2026-10-16

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS (this spec; code landed the same hour, owner iterating live) |
| II AS-IS/TO-BE/DELTA with evidence | PASS (file:line anchors, curl proof, session transcript) |
| III Slice-scoped | PASS — S1 gateway PR (base `DEV`), S2 inside hub #542 (`feat/sandbox-pages-poc`) |
| IV Required build steps | gateway: oxlint + oxfmt + `vitest run src/agents/tools/hub`; hub: prettier, svelte-check, lint:design/tokens, `vitest run src/lib/chat` |
| V Security gates | not tagged — honours an existing hub contract; no new data path |

## Design
- **D1** Reuse the flusher's convention: one `hubHeaders(rest)` helper in `hub-common.ts`; `HubRest` carries the optional `serverId`. No new config: `hubMetrics.serverId` already exists and is validated.
- **D2** Fold at the render boundary, not in chat state: `foldToolTurns` is pure, lives next to `normalizeBlocks`, and `ChatBlocks` keeps doing the intra-message grouping it already does. `toolResultsById` keeps reading the original list.

## Files
```
minion/src/gateway/hub-rest-registry.ts · gateway/server.impl.ts · agents/tools/hub/hub-common.ts · hub-tools.test.ts
minion_hub/src/lib/chat/blocks.ts · blocks.test.ts · components/layout/FloatingAssistant.svelte
```
