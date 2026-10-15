# Implementation Plan: Generic Agent Action Dispatcher

**Spec directory**: `specs/004-generic-agent-action-dispatcher` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-generic-agent-action-dispatcher/spec.md`

**Branches** (per `repo-policy.yaml`; the Spec Kit single-`###-feature-name` branch field does not fit a multi-repo feature):

| Repo | PR base | Development branch | Package manager |
|---|---|---|---|
| `minion_hub` (`hub`) | `master` | `master` | bun |
| `minion` (`gateway`) | `DEV` | `DEV` | pnpm |
| `minion-meta` (this repo) | `dev` | `dev` | pnpm |

**Status: BLOCKED on an owner gate.** Security-tagged (new generic write path). Constitution V
requires owner approval of the design before code and owner merge. This plan may be reviewed;
`/speckit-implement` may not run. Second blocker: slice S0 (synthesis L1) — the hub bridge
returns 403 for every gateway call today, so the channel half of this feature is unobservable
until S0 lands.

---

## Summary

Replace ~20 hand-written agent write endpoints and a 17-string gateway allowlist with **one**
hub dispatch endpoint plus **one** manifest-driven gateway tool, so any hub write the central
capability map already covers becomes agent-reachable. The mechanism is the lazy one: the
dispatcher does not re-implement a route, it runs the real route in-process through
`event.fetch`, which SvelteKit routes through the whole `hooks.server.ts` pipeline
(`fetch.js:204-236`) — so capability, module-enabled, owner scope, field masking and each
route's own gate all apply with no per-route code. The principal rides an `AsyncLocalStorage`
scope, the pattern the hub already uses for request-scoped org context (`src/server/ai-usage.ts`).
Separately, `FormBinding` gains an optional `submit` so the in-app assistant can finish the 8
forms it can currently only fill, and the form catalog starts filtering on write capability
instead of page-view access.

Measured ceiling, not a slogan: **193 of 364** hub write `(route, method)` pairs are
capability-mapped and therefore dispatchable; **171** are not and are refused. The audit's
top-10 gaps #1–#7 are inside the 193; #10 (team & access admin) is not.

## Technical Context

**Language/Version**: TypeScript strict. Hub: SvelteKit 2.43 / Svelte 5 on Bun, `@sveltejs/kit` 2.70.2, Node 22 runtime on Vercel. Gateway: TypeScript on Node 22, tsdown, pnpm.

**Primary Dependencies**: no new dependency in either repo. Hub reuses `apiWriteCapability`, `resolveAssistantPrincipal`, `requireAssistantCapability`, `hooks.server.ts` guards, `node:async_hooks`. Gateway reuses `hub-common.ts` (`hubPost`, `CONFIRM_FIELD`) and the existing tool-meta/codegen path.

**Storage**: none added. No table, no migration, no Drizzle schema edit (see `data-model.md` §8).

**Testing**: hub `vitest` (scoped runs only — `bunx vitest run src/lib/routes src/routes/api/gateway src/lib/assistant src/server/services/rbac`; a full `bun run test` with `.env` present has reached production); gateway `pnpm vitest run test/ci/` (never `pnpm test` — the full suite crashes the box).

**Target Platform**: hub on Vercel (`nodejs22.x`, hub-wide `maxDuration: 300`); gateway in the Netcup swarm.

**Project Type**: two existing web services plus a browser surface; no new project.

**Performance Goals**: a dispatched write within ~1.5× the equivalent human request (SC-009). `event.fetch` is in-process, so the expected overhead is manifest lookup plus one extra pipeline pass, not a network hop.

**Constraints**: **no per-route `export const config`** in the hub — it makes `adapter-vercel` split functions and 404'd every locale page for ~11 h on 2026-10-11, and a CI guard now fails on it. No new externally reachable entry point. No arbitrary SQL (the `query/` root stays 503). Fail closed on every ambiguity.

**Scale/Scope**: 364 write pairs enumerated, 193 dispatchable ceiling, a first manifest of ~15–25 rows covering the top-10 gaps #1–#7, 8 in-app forms, 3 repos touched (hub, gateway, meta for the spec/ledger).

---

## Constitution Check

*GATE before Phase 0, re-checked after Phase 1. Filled honestly; a violation is a blocker.*

| Principle | Verdict | Evidence / what satisfies it |
|---|---|---|
| **I. Spec before code** | **PASS** | `spec.md`, this plan, then `tasks.md`; no code exists. |
| **II. AS-IS → TO-BE → DELTA with evidence** | **PASS (with one gap, declared)** | `spec.md` §AS-IS has 12 anchored rows, TO-BE 7 invariants, DELTA 6 transitions each with its proof. Numbers are measured by a rerunnable script (research R2) and the 364-vs-368 difference from the audit is stated rather than smoothed. **Gap**: three `[NEEDS CLARIFICATION]` markers remain. Constitution II says "a spec with unverified claims is not ready for `/speckit-plan`" — these are *unanswered owner decisions*, not unverified claims, so planning proceeds; implementation does not. |
| **III. Slice-scoped delivery** | **PASS (as planned)** | Four slices below, each one PR against its repository's registered PR base (`hub → master`, `gateway → DEV`, `meta → dev`), each from its own worktree, repository gates in the foreground before the PR opens. No package managers mixed; no branch shared with another slice. |
| **IV. Required build steps are spec requirements** | **PASS** | No new page, nav link or UI route ⇒ no design-token or `lint:design`/`lint:tokens` obligation except on the 8 touched form pages (slice C), where both run. **New API endpoint ⇒ the hub route-contract manifest must be updated and the 6 counts re-asserted** — and 2 of the 6 live outside `src/lib/routes/`, so a green `vitest src/lib/routes/` is not proof (task C/A gate). RBAC wiring: the new endpoint is under `/api/gateway`, which `apiWriteCapability` deliberately does not map; its gate is `resolveAssistantPrincipal` + the inner request's own guards, and task A-5 pins that. Every user-visible refusal string goes through Paraglide `m.*()` + `i18n:compile`. |
| **V. Security and data work keeps human gates** | **BLOCKING — satisfied only by the owner** | Tagged security (auth/RBAC, new generic write path). Owner approves the design before code **and** merges each PR. Proposal `2026-10-15-agent-harness-restoration.md` already carries this as open question 2. No production data mutation is planned; validation runs against a QA org, so the dry-run/`finally`/run-twice/assert-an-invariant rules do not bind — but if any backfill appears, this check must be re-run. |
| **Open-items ledger** | **PASS (as planned)** | Three known open ends are already named and will be carried in both places required: the 171 unmapped pairs (gap #10 stays open), the 19 legacy bridge endpoints that keep lacking module-enabled/owner/masking (slice S2's job, not this one), and whichever of the three `[NEEDS CLARIFICATION]` items the owner defers. Each gets a `TODO(handoff):` at its site and an entry appended to `proposals/2026-10-15-agent-harness-restoration.md`. |
| **Artifact layout and registration** | **PARTIAL — needs one extra file** | Artifacts are in `specs/004-generic-agent-action-dispatcher/` as required. The meta board reads only top-level `specs/*.md` via `scripts/spec-index.mjs`, so a stub `specs/2026-10-15-agent-action-dispatcher-spec.md` with `TEMPLATE.md` frontmatter pointing here is required before the board shows this feature. **Not written** — this run produces documents under the feature directory only (task D-1). |

**Gate result: PASS for planning, BLOCKED for implementation on Principle V (owner approval) and on slice S0.** No principle is violated by the design; the design is simply not allowed to be built yet.

**Complexity**: nothing in the Complexity Tracking table — the design removes two abstractions
(per-action endpoints, the allowlist) and adds one declarative list. See the empty table below.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-generic-agent-action-dispatcher/
├── spec.md
├── plan.md               # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   ├── dispatch-endpoint.md
│   ├── dispatch-manifest.md
│   └── form-submit.md
├── checklists/requirements.md
├── tasks.md              # /speckit-tasks
├── analysis.md           # /speckit-analyze
└── sdd-notes.md          # friction log for the SDD audit
```

### Source code (per repository, real paths)

```text
minion_hub/                                  # PR → master
├── src/routes/api/gateway/actions/dispatch/
│   ├── +server.ts                           # NEW — the one dispatch endpoint
│   └── server.test.ts                       # NEW — fail-closed + parity tests
├── src/routes/api/gateway/_shared/
│   ├── action-auth.ts                       # unchanged (dispatch uses the principal resolver directly)
│   └── dispatch-principal.ts                # NEW — the AsyncLocalStorage scope (research R1)
├── src/lib/routes/
│   ├── agent-dispatch-manifest.ts           # NEW — manifest + exclusions (next to the route contract)
│   └── agent-dispatch-manifest.test.ts      # NEW — the FR-020 repository gate
├── src/server/auth/resolve-identity.ts      # EDIT — read the dispatch scope first; bypassGate stays false
├── src/routes/api/gateway/query/sdk-catalog/+server.ts   # EDIT — serve the `writes` catalog, capability-filtered
├── src/lib/assistant/forms.ts               # EDIT — optional FormBinding.submit, submit_<id>, capability-gated fill
├── src/lib/assistant/catalog.ts             # EDIT — FormDef.write on 8 rows
├── src/lib/state/features/assistant-context.ts  # EDIT — filter the catalog by canAct, not canViewPath
└── src/routes/(app)/**                      # EDIT ×8 — each form page passes its submit handler

minion/                                      # PR → DEV
├── src/agents/tools/hub/hub-action-tool.ts       # NEW — ~40 lines, shape of module-action-tool minus the allowlist
├── src/agents/tools/hub/hub-action-tool.meta.ts  # NEW — no mcpExport until slice S5
├── src/agents/tools/hub/module-action-tool.ts    # DELETE (after its 17 endpoints are manifest rows)
├── src/agents/tools/_registry.generated.ts       # regenerated
└── test/ci/…                                     # tool-registry ⊆ TOOL_ORDER invariant keeps holding

minion-meta/                                 # PR → dev
├── specs/004-generic-agent-action-dispatcher/     # these documents
├── specs/2026-10-15-agent-action-dispatcher-spec.md   # board stub (task D-1)
└── proposals/2026-10-15-agent-harness-restoration.md  # ledger entries appended
```

**Structure Decision**: no new project, no new package. The manifest lives in
`minion_hub/src/lib/routes/` because that is where this repository already keeps machine-checked
route truth and the gate that freezes it; putting it under `src/routes/api/gateway/` would hide
it from the route-contract convention. The ALS scope lives in `_shared/` next to `action-auth.ts`
because it is bridge plumbing, not general auth.

---

## Slices (Principle III — each one PR)

| Slice | Repo | Content | Gate before PR |
|---|---|---|---|
| **A — manifest + gate, no runtime** | hub | `agent-dispatch-manifest.ts` (rows for top-10 gaps #1–#7 + the 17 `module_action` endpoints + exclusions for everything else), the FR-020 repository gate, the route-contract counts update. Ships inert: nothing reads the manifest yet. | `bun run check`; scoped vitest; route-contract counts (incl. the 2 outside `src/lib/routes/`); `format:check` |
| **B — the dispatch endpoint** | hub | `dispatch/+server.ts`, `dispatch-principal.ts`, the `resolve-identity.ts` branch, the `writes` catalog on `sdk-catalog`, the fail-closed and 4-persona parity tests. | as A, plus the parity matrix green |
| **C — in-app form submit** | hub | `FormBinding.submit`, `submit_<id>`, `FormDef.write` on 8 rows, catalog filter by `canAct`, 8 page edits. Independent of S0 — this is the only slice observable today. | as A, plus `lint:design && lint:tokens` (debt may only decrease) and `i18n:compile` |
| **D — the gateway tool** | gateway | `hub-action-tool.ts` + meta, codegen, delete `module-action-tool.ts`. Merges **after** B is live, or the tool points at an endpoint that does not exist. | `pnpm check`; `pnpm tsgo`; `pnpm vitest run test/ci/` |

Slice order: A → B → D, with C parallel. The meta PR (spec, board stub, ledger) merges first so
the artifacts exist before any code references them.

---

## Phase 0 — research

Complete: [research.md](./research.md). R1 resolves the only technical unknown (how the route is
exercised). R4 records the three owner-gated questions with a recommendation each, and they stay
`[NEEDS CLARIFICATION]` in the spec rather than being quietly decided.

## Phase 1 — design & contracts

Complete: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

**Post-design Constitution re-check**: unchanged from the table above. The design adds no
migration, no table, no new page, no new nav entry, no new dependency and no second external
entry point, so Principles II–IV are no harder to satisfy after Phase 1 than before. Principle V
is still the blocker and Phase 1 did not and cannot clear it.

## Complexity Tracking

*No Constitution violations to justify.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |
