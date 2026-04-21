---
phase: 07-ws-consolidation
plan: 01
subsystem: api
tags: [websocket, gateway, shared-packages, audit, typescript]

# Dependency graph
requires:
  - phase: 04-fold-minion-shared
    provides: "@minion-stack/shared protocol layer (sendRequest, handleResponseFrame, frame types)"

provides:
  - "specs/ws-duplication-audit.md — grep-sourced, decision-bearing WS client duplication audit (315 LOC)"
  - "WS-01 requirement closed: concrete LOC counts, import-site inventory, and target GatewayClient API surface"
  - "8 locked decisions (D-01..D-08) for hub/site/paperclip consolidation"
  - "Requirement trace WS-01..WS-05 → plans 07-01..07-04"
  - "4 open assumptions (A1, A2, A3, A7) documented for downstream plan executors"

affects: [07-02-publish, 07-03-migrate, 07-04-verify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documentation-first: grep-sourced audit before any code change"
    - "Disposition table per export: decide migrate/keep-local before touching code"
    - "Open assumptions explicitly recorded with risk descriptions so downstream executors can validate"

key-files:
  created:
    - "specs/ws-duplication-audit.md"
  modified: []

key-decisions:
  - "D-01: Package target is @minion-stack/shared (not @minion/shared — roadmap stale reference)"
  - "D-02: Publish 0.2.0 first to close Phase 4 gap, then 0.3.0 for Phase 7 additions (changelog linearity)"
  - "D-03: Yjs binary frames STAY hub-local — only minion_hub's workshop needs them"
  - "D-04: onLog callback STAYS in paperclip adapter — not a shared concern"
  - "D-05: Hub's utils/text.ts KEPT local — superset handling tool_use/tool_result/image blocks"
  - "D-06: Site verification via manual smoke runbook — no vitest infrastructure in minion_site"
  - "D-07: minion/ gateway server OUT OF SCOPE for Phase 7 — client-side consumers only"
  - "D-08: Scope correction — all phase docs use @minion-stack/shared not @minion/shared"

patterns-established:
  - "Disposition table pattern: for each exported symbol, decide migrate/keep-local BEFORE writing migration code"
  - "Import-site inventory pattern: grep all consumers before deleting anything, produce exact file list"

requirements-completed:
  - WS-01

# Metrics
duration: 25min
completed: 2026-04-21
---

# Phase 07 Plan 01: WS Client Duplication Audit Summary

**315-LOC grep-sourced audit at `specs/ws-duplication-audit.md` inventorying 3 WS implementations (hub 920 LOC, site 373 LOC, paperclip 355 LOC) with exact import sites, per-export disposition tables, and target GatewayClient API surface for plan 07-02**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-21T20:30:00Z
- **Completed:** 2026-04-21T20:55:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `specs/ws-duplication-audit.md` at 315 lines (plan minimum was 120)
- Verified all plan acceptance criteria: file paths, target API names, WS-01..WS-05 coverage, 8 decisions
- Ran `wc -l` on all 13 source files for measured LOC counts (not estimated)
- Ran `diff` on hub vs shared types/utils to confirm byte-for-byte duplicates and divergences
- Ran grep import-site inventory on all three consumers and recorded exact file lists

## Task Commits

1. **Task 1: Grep-sourced duplication inventory** — `878bdbf` (feat)

**Plan metadata:** committed with SUMMARY.md in final docs commit

## Files Created/Modified

- `specs/ws-duplication-audit.md` — Full WS client duplication audit (315 LOC); single source of truth for plans 07-02, 07-03, 07-04

## Decisions Made

All 8 decisions recorded in the audit doc itself (D-01..D-08). No new decisions emerged during execution — plan predicted the state of the codebase accurately.

Key finding confirmed: `minion_hub` has **no** `@minion-stack/shared` dependency in `package.json`, only `@minion-stack/auth` and `@minion-stack/db`. This matches the RESEARCH.md prediction. Hub imports 11 files that will need rewiring in plan 07-03.

## Deviations from Plan

None — plan executed exactly as written.

The RESEARCH.md predictions were accurate:
- Hub LOC: 920 (confirmed)
- Site LOC: 373 (confirmed)
- Paperclip LOC: 355 (confirmed, plan said 356 — 1-line diff from trailing newline)
- Hub has 0 `@minion-stack/shared` imports (confirmed)
- Site has 3 `@minion-stack/shared` import sites (confirmed)
- Hub duplicate types: `types/gateway.ts` = identical frame types, site's extras are `ChatMessage`, `AgentChatState`, `AgentActivityState` (22 extra lines in shared)
- Hub duplicate utils: `uuid.ts` and `session-key.ts` byte-for-byte identical (diff returns no output)

## Issues Encountered

None.

## Next Phase Readiness

Plan 07-02 can execute immediately. The audit document at `specs/ws-duplication-audit.md` provides:
- Exact API surface for `GatewayClient` class to scaffold
- Exact `package.json` exports map addition (`./node` entry)
- Publish order: `0.2.0` first, then `0.3.0`
- Per-export disposition for paperclip's `gateway-client.ts`

Assumptions requiring validation during 07-02/07-03/07-04 execution:
- A1: browser bundler compat with `ws` optional peerDep (verify with `bun run build` in hub)
- A2: hub's `text.ts` superset actually in use (check live Claude tool-use response flow)
- A3: paperclip test suite survives `GatewayWsClient` → shared shim
- A7: 0.2.0 publish-first approach is safe (confirmed decision D-02)

---
*Phase: 07-ws-consolidation*
*Completed: 2026-04-21*
