# Implementation Plan: Restore Agent Gateway Assignment

**Branch**: `001-restore-agent-gateway-assignment` *(spec directory; the implementing branches are per-slice, see Slices below)* | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-restore-agent-gateway-assignment/spec.md`

## Summary

Restore the gateway→hub assistant tool bridge by supplying the authorization datum the existing fail-closed resolver already demands, and by nothing else. Two changes: provisioning resolves the gateway it is about to create the agent on and stores that gateway on the agent (one resolution, used twice — spec FR-002a/INV-5); and an owner-run, dry-run-default tool assigns the 10 existing active rows. The resolver is not touched. No schema change, no new endpoint, no new dependency, no flag.

The one-line version of the defect and the fix: `const gatewayId = params.serverId ? await resolveGatewayId(params.serverId) : null;` is reached with `params.serverId === ''` from one caller, and the caller already holds an organization-scoped context.

## Technical Context

**Language/Version**: TypeScript (strict), Node 22+ / Bun runtime for scripts. SvelteKit 2 server-side only — no component work.

**Primary Dependencies**: Drizzle ORM over Postgres (Supabase) via `getCoreDb()`; existing `gateway.pg.service` channel-aware picks; existing `gateway-rpc` websocket helper. **No new dependency.**

**Storage**: Supabase Postgres. Tables read: `gateway`, `organization_members`, `profiles`. Table written: `personal_agents` — one nullable column (`gateway_id`) plus `updated_at`. **No migration** (`personal_agents.gateway_id` already exists, `uuid` → `gateway.id`, `ON DELETE SET NULL`).

**Testing**: `bun run vitest run <paths>` with the mock-db harness used by `personal-agent.service.test.ts` and `personal-agent-provisioner.ensure.test.ts`, plus the 22 pinned cases in `assistant-principal` tests. Scoped runs only — the full `bun run test` is forbidden here (integration tests can reach production; see Risks).

**Target Platform**: hub on Vercel (production) + the owner's shell for the assignment tool.

**Project Type**: web service (SvelteKit server) + one operational script.

**Performance Goals**: one extra indexed lookup inside a path that already opens a websocket to the gateway — immaterial. The assignment tool handles 11 rows; scale is not a consideration and must not be designed for.

**Constraints**: the resolver's behavior may not change (spec FR-014). The provisioning path may not become blocking (A4 — it is fire-and-forget behind `.catch()` in the `(app)` layout). Production writes are owner-run only.

**Scale/Scope**: 11 production rows, 1 affected service file, 1 affected provisioner file, 1 new script, ~4 test files. Two small PRs.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — result at the bottom of this section.*

| Principle | Verdict | Evidence / what satisfies it |
|---|---|---|
| **I. Spec before code** | **PASS** | This spec exists before any code, and no code was written in this session. Full cycle (specify → clarify → plan → tasks), nothing compressed, nothing bypassed. |
| **II. AS-IS → TO-BE → DELTA with evidence** | **PASS** | spec.md carries AS-IS (A1–A16, every row with a `file:line`, query, or transcript anchor), TO-BE with five invariants, and a DELTA table pairing each transition with the test that proves it. Numbers are the audit's measured ones and their source is named. Two AS-IS rows (A15, A16) were established by reading the code during this planning run, not inherited from the audit. |
| **III. Slice-scoped delivery** | **PASS** | Two slices, two PRs, both against hub `prBase: master` (repo-policy `minion_hub`: `packageManager: bun`, branches development/default/release all `master`), each from its own worktree, hub gates run in the foreground before opening. Nothing commits to `master` directly. |
| **IV. Required build steps are spec requirements** | **PASS (mostly not applicable, deliberately)** | No UI, so no design-token contract and no `lint:design`/`lint:tokens`. No new page, route, API endpoint or nav link, so **no route-contract manifest change and no RBAC wiring** — the authorization gate for this surface already exists and the feature's whole point is to leave it alone (FR-014). No user-facing string, so no Paraglide/`i18n:compile`. Recorded explicitly rather than silently skipped, as the principle requires. |
| **V. Security and data work keeps human gates** | **PASS, with the gates OPEN** | Tagged security **and** data. Consequences, all accepted: (a) the owner must approve this spec before code — **not yet given**; (b) the owner merges both PRs; (c) the assignment tool is dry-run by default, reversible with the undo in the failure path, runnable twice, and asserts INV-1/INV-2 rather than a statement count (spec FR-007…FR-012); (d) the owner runs it, not an agent. |

**Open-items ledger**: two items are known in advance and will be entered in `proposals/2026-10-15-agent-harness-restoration.md` (the matching open proposal) at the time the PRs are opened, plus `TODO(handoff)` at each site — (1) no assignment lifecycle: a cleared assignment is repaired only by re-running the tool (spec Q7); (2) the multi-organization rule is deferred to Q1, so a multi-organization user's assistant is reachable from one gateway only.

**Artifact layout**: this feature lives in `specs/001-restore-agent-gateway-assignment/`. The constitution requires a top-level board stub for anything that must appear on the board, because `scripts/spec-index.mjs` reads only top-level `specs/*.md` — **task T016 creates `specs/2026-10-15-restore-agent-gateway-assignment-spec.md`** with `TEMPLATE.md` frontmatter pointing here. Without it this feature is invisible to the board.

**Gate result, pre-Phase 0: PASS. Re-check after Phase 1 design: PASS — the design added no surface, no dependency and no schema change, so no principle moved. The only blocker is procedural and outside the design: Principle V's owner approval of the spec, and Q1.**

## Project Structure

### Documentation (this feature)

```text
specs/001-restore-agent-gateway-assignment/
├── spec.md              # Phase -1 (/speckit-specify + /speckit-clarify)
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── assignment-tool.md   # Phase 1 — the only external interface this feature adds
├── checklists/
│   └── requirements.md  # spec quality checklist
├── tasks.md             # Phase 2 (/speckit-tasks)
├── analysis.md          # /speckit-analyze report
└── sdd-notes.md         # friction log for the SDD audit (not a Spec Kit artifact)
```

### Source Code (minion_hub, branch base `master`)

```text
minion_hub/
├── src/
│   ├── lib/server/
│   │   └── gateway-rpc.ts                       # MODIFY: let the caller learn which gateway row was used
│   ├── server/services/
│   │   ├── personal-agent.service.ts            # MODIFY: provisionPersonalAgent — take an org, store the resolved gateway, refuse ''
│   │   ├── personal-agent.service.test.ts       # MODIFY: assignment cases
│   │   ├── personal-agent-provisioner.ts        # MODIFY: pass the org; don't mark ready without an assignment
│   │   ├── personal-agent-provisioner.ensure.test.ts  # MODIFY: not-ready-without-assignment case
│   │   └── gateway.pg.service.ts                # MODIFY (small): expose the org gateway pick as a row, not just credentials
│   ├── server/auth/
│   │   └── assistant-principal*.test.ts         # MODIFY: positive case for an assigned agent (negatives already pinned)
│   └── routes/(app)/+layout.server.ts           # MODIFY (1 line): pass the org it already has
└── scripts/
    ├── backfill-personal-agent-gateway.ts       # NEW: owner-run assignment tool
    └── backfill-personal-agent-gateway.test.ts  # NEW: planner/invariant unit test
```

**Structure Decision**: the existing hub layout, untouched. Services stay in `src/server/services/`, the operational script joins the 40-odd siblings in `scripts/` and follows `faces-catalog-cleanup.ts`'s shape (`--apply`, dry-run default, one transaction, second run is a no-op — spec A13). No new directory, no new layer, no new abstraction: the pick logic lives in `gateway.pg.service.ts` where the two existing picks already are, and both the provisioner and the script call it.

## Slices (Principle III)

| Slice | Repo / base | Content | Gate |
|---|---|---|---|
| **S0a** | `minion_hub` → `master` | Provisioning resolves and stores the assignment (FR-001…006a) + tests. No production data touched. | `bun run check`, scoped `bun run vitest run src/server/services src/server/auth`, foreground. Owner merges (security tag). |
| **S0b** | `minion_hub` → `master` | The assignment tool + its unit test + the board stub (FR-007…013a). Merged **before** it is run; running it is a separate, owner-performed act with its output pasted into the PR body (FR-018). | Same gates. Owner merges **and** owner runs. |

S0a before S0b: if the order were reversed, every row assigned by the tool would still be joined by new unassigned rows, and the proof in SC-003 could not be produced. They are independently shippable (spec marks US1/US2 independently testable), but this order means the production write happens once.

## Phase 0 — Research

See [research.md](./research.md). Four decisions, each "reuse what exists": where the gateway pick lives, how the creation target and the assignment are made to be the same value, how the script is shaped, and how reversibility is achieved without a snapshot table. One NEEDS CLARIFICATION remains and is deliberately unresolved (Q1 — owner, security boundary); research.md states why resolving it by research would be wrong.

## Phase 1 — Design

See [data-model.md](./data-model.md) (no schema change — the state machine and the invariants over existing columns), [contracts/assignment-tool.md](./contracts/assignment-tool.md) (the tool's argument and report contract — the only new interface), and [quickstart.md](./quickstart.md) (how to validate, in order, including the production steps that are the owner's alone).

## Complexity Tracking

No Constitution Check violations, so this table is empty by design. Recorded here because the template invites justifying complexity, and the honest entry for this feature is that there is none to justify: the whole change is one resolved value threaded through an existing call, plus a script that follows a house pattern.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |

## Risks

1. **Shipping the obvious implementation and still being refused.** If the assignment is computed as "the organization's production gateway" while the agent is created through the system gateway (A15), the 403 persists and looks identical. Mitigated by INV-5, D2a, and task T006's test using an organization whose gateway is *not* the default.
2. **The full hub test suite reaches production.** `bun run test` with a populated `.env` has caused a hub-wide outage before. Every run in tasks.md is path-scoped; the tool's own test uses the mock-db harness and never opens a connection.
3. **Running the tool against the wrong database.** Mitigated by FR-007's "name the database before writing" and quickstart's dry-run-first order.
4. **The behavior change in FR-005a.** A user whose organization has no gateway at all now sees "no personal agent provisioned" instead of a ready-looking agent that silently fails. This is deliberate and is the Q8 assumption the owner must confirm; it is the only user-visible regression risk in the feature.
5. **Q1 unanswered.** Implementation of S0a/S0b is not blocked (option A is what the code would do anyway), but if the owner picks B the spec must be revised and re-approved first.
