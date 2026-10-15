# Implementation Plan: Typed Agent Reads, Retire crm_query

**Branch**: `002-typed-agent-reads-retire-crm-query` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-typed-agent-reads-retire-crm-query/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Retire the agent's permanently-broken `crm_query` tool (gateway `src/agents/tools/knowledge/
crm-query-tool.ts` → hub `POST /api/gateway/query`, a hard 503 since 2026-09-09) from both the
gateway's tool registry and the hub's per-turn context envelope, and replace the class of
question it existed for (ad-hoc grouping/date-range/ranking over org data) with one or more
versioned, server-owned **typed dataset** endpoints under the hub's existing `/api/gateway/
query/*` family. Each typed dataset is a fixed, parameterized query template — never
caller-authored SQL or a caller-mutable session/connection variable — that resolves tenant,
module-enabled state, RBAC capability, per-record owner scope, and sensitive-field masking from
the trusted assistant principal server-side before touching the database, caps rows/bytes at the
query level, and is qualified by a persona negative-control suite (full access / under-
capability / module-disabled org / cross-org). The retirement and the first typed dataset ship in
the same change so the agent's answerable-question surface never regresses below today's (nominal)
surface. This is Slice S4 (and the S0d retirement half) of `proposals/2026-10-15-agent-harness-
restoration.md`.

## Technical Context

**Language/Version**: TypeScript (hub: SvelteKit 2 on Bun; gateway: Node 22+ via pnpm/tsdown) —
matches both repos' existing stacks, no new language.

**Primary Dependencies**: Hub: existing `$server/services/rbac.service` (`requireAssistantCapability`,
`Capabilities.ownerScoped`, `Capabilities.fieldLevel`), `$lib/permissions` (`SENSITIVE_FIELD_LEVEL`),
`$server/db/pg-client` (`getCoreDb`), SvelteKit `RequestHandler`/`json`/`error` — all already in
use by the 13 existing `query/*` endpoints. Explicitly NOT `resolveOwnerScope`/`ownerFilter`/
`shouldMaskSensitive` (the `locals`-based human-path helpers) — those key off `locals.user`, which
is unset for gateway/server-token callers (research.md).
Gateway: existing `AnyAgentTool`/`wrapToolWithTracking`/`jsonResult` tool-authoring helpers,
`getHubRest()` bridge, `typebox` for parameter schemas, `TOOL_ORDER`/tool-registry wiring in
`minion-tools.ts`. No new third-party dependency in either repo.

**Storage**: PostgreSQL via the hub's existing `CoreCtx.db` (Drizzle-backed `getCoreDb()`),
RLS-enforced per org — same connection path every other `query/*` endpoint uses. No new storage.

**Testing**: Hub: Vitest (`*.test.ts`, incl. the existing RBAC/owner-scope/masking unit tests this
feature extends) + the project's `.sql.integration.test.ts` pattern for any new DB-side LIMIT
behavior that needs a real Postgres (never the full `bun run test` against `.env` — see
`gw-no-full-test-suite` memory). Gateway: Vitest under `src/agents/tool-search` /
`src/agents/tools/hub` for registry/envelope assertions, matching the existing `TOOL_REGISTRY ⊆
TOOL_ORDER` test pattern from slice S0c.

**Target Platform**: Existing production surfaces only — hub on Vercel (adapter-vercel), gateway
on Netcup/Fly/self-hosted containers. No new deployment target.

**Project Type**: Web service + CLI-adjacent agent toolchain (existing `minion_hub` SvelteKit app +
`minion` gateway monorepo) — two-repo change, no new project.

**Performance Goals**: A typed dataset query completes within the existing per-turn tool-call
budget used by the other 13 `query/*` endpoints (no stated SLO beyond "doesn't make the agent
feel slower than today's fixed-mode queries"); no new performance target introduced.

**Constraints**: Each dataset's row limit and response-byte limit are enforced at the query level
(not post-fetch truncation) per FR-006; no caller-supplied SQL fragment, statement prefix, or
session-local GUC may participate in tenant/owner isolation per FR-010; the retired `POST /api/
gateway/query` endpoint stays a stable 503 and is not reused per FR-011.

**Scale/Scope**: One new typed-dataset mechanism (shape: one or more `mode=`-style endpoints under
`query/*`, consistent with the existing `query/pos`/`query/stock` pattern) plus at least one
published dataset on day one (FR-003); retirement touches exactly the two sites named in the
feature description (`minion-tools.ts` `TOOL_ORDER` + the gateway tool file, and `assistant-
context.ts`'s envelope prose) per User Story 2. Current production call volume to the tool being
retired is 3 calls / 30 days (audit L3) — this is a low-traffic, high-clarity fix, not a
scale problem.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| **I. Spec before code** | This plan follows a committed `spec.md` with Clarifications recorded; no code has been written. | PASS |
| **II. AS-IS → TO-BE → DELTA, with evidence** | spec.md's scenarios and this plan's Summary cite file:line evidence (`crm-query-tool.ts`, `assistant-query.service.ts`, `rbac.service.ts`, audit findings L3/L4/C-D1/C-D2/E-S4/E-S6) for every AS-IS claim; TO-BE and the DELTA (tasks.md, next phase) are stated as testable transitions, not prose. | PASS |
| **III. Slice-scoped delivery** | This feature is already scoped as one slice (S4) of the larger `2026-10-15-agent-harness-restoration` proposal, separate from S0a–S0d (bridge restoration), S1 (JEV gate), S2/S2a (RBAC hardening), S3 (generic dispatcher), S5 (MCP), S6 (JIT). It still spans two repos (hub + gateway) because retiring an advertisement (gateway) and shipping its replacement (hub) must land together per FR-012 — each repo's half ships as its own PR against its own registered PR base (hub → `master`, minion gateway → `DEV`), from an isolated worktree. | PASS, with the two-PR split documented below under Project Structure |
| **IV. Required build steps are spec requirements** | The new typed-dataset route(s) are new API endpoints, so RBAC wiring (module/action gate, owner scope, field masking) is in-scope and already spec'd as FR-004/FR-005 — this plan treats it as mandatory, not optional. No new nav link, no new user-facing string (this is an agent-only surface, not a UI page), so Paraglide/i18n and route-contract-manifest obligations do not apply. No hub UI is touched, so the design-token/`lint:design`/`lint:tokens` gate does not apply. | PASS |
| **V. Security and data work keeps human gates** | Feature is explicitly security-tagged (frontmatter `tags: [security, logic, data]` on the parent proposal; this spec is security-tagged per its own Input). Per Constitution V this requires owner approval of the spec before code AND owner merge. This plan does not authorize code; it is itself subject to that approval gate before `/speckit-tasks`→implementation proceeds for real (this run is an audit dry-run per the orchestrator's brief, not an authorized implementation). No production data mutation is introduced by this feature (read-only datasets), so the dry-run/reversible/run-twice data-script rule does not apply — there is no data script. | PASS, gate flagged: **owner must approve this spec before any code is written, and must merge both PRs** |

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/002-typed-agent-reads-retire-crm-query/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature spans two independent repos/checkouts under the Minion meta-repo (see root
`AGENTS.md` Project Map); neither of the template's generic options fits as-is, so the real
paths are listed directly.

```text
# minion_hub/ (bun, SvelteKit 2, PR base: master) — new typed-dataset endpoint(s)
src/routes/api/gateway/query/
├── pos/+server.ts              # existing — unchanged (FR-013)
├── stock/+server.ts            # existing — unchanged (FR-013)
├── finance/ … tickets/ …       # existing 11 others — unchanged (FR-013)
├── tool-permissions/+server.ts # existing — unchanged (FR-013)
└── <new-dataset-id>/+server.ts # NEW — one or more typed dataset endpoints (FR-003/004/005/006/007/008/009)
src/server/services/
├── rbac.service.ts             # existing Capabilities.ownerScoped/.fieldLevel — consumed, not modified unless a gap blocks FR-005
└── <dataset-query>.service.ts  # NEW — query-building for the new dataset(s), parameterized templates only (FR-010)
src/lib/state/features/assistant-context.ts   # EDIT — remove crm_query envelope prose (FR-002), name the replacement
src/routes/api/gateway/query/+server.ts       # unchanged — stays the ASSISTANT_SQL_DISABLED 503 (FR-011)
src/server/services/assistant-query.service.ts # unchanged — stays retired (FR-011)

tests/ (co-located *.test.ts next to each file above, hub convention)

# minion/ (pnpm, gateway monorepo, PR base: DEV) — retirement + registry
src/agents/tools/knowledge/crm-query-tool.ts        # REMOVE (or leave unexported/unregistered — decided in research.md)
src/agents/tools/knowledge/crm-query-tool.meta.ts   # REMOVE alongside it
src/agents/minion-tools.ts                          # EDIT — remove "crm_query" from TOOL_ORDER + its case in the options switch (FR-001)
src/agents/tools/<new-dataset-tool>.ts              # NEW — one gateway tool per typed dataset (or one generic tool with a dataset-id param — decided in research.md)
src/agents/tools/<new-dataset-tool>.meta.ts         # NEW
test/ci/ (vitest, the ONLY full-suite-safe test path per gw-no-full-test-suite memory)
├── src/agents/tool-search/…                        # EXTEND — TOOL_REGISTRY ⊆ TOOL_ORDER assertion from S0c, now also asserting crm_query ∉ registry
└── src/agents/tools/hub/…                           # NEW — new dataset tool contract test
```

**Structure Decision**: Two-repo slice. The hub half (new typed-dataset endpoint(s) +
envelope-prose edit) is one PR against `minion_hub`'s `master`; the gateway half (tool removal +
`TOOL_ORDER` edit + new gateway tool(s)) is one PR against `minion`'s `DEV`. They are
interdependent (FR-012: must ship together in effect) but are still two separate PRs because the
two repos have independent CI/release pipelines — ordering and a feature-flag or short-lived
dual-advertise window (if the two PRs can't merge atomically) is a `research.md` decision, not a
structural one. No new repo, no new top-level directory in either checkout.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Table omitted.
