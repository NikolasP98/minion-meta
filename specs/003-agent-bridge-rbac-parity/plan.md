# Implementation Plan: Agent bridge RBAC parity

**Branch**: per-repo, created at implementation time (see Structure Decision) | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-agent-bridge-rbac-parity/spec.md`

## Summary

The agent bridge authorizes on capability alone; the human path also enforces module-enabled, record-level owner scope and field-level masking, and never lets a handler be correct by omission. The plan puts those three checks inside the one guard every bridge endpoint already calls (`requireAssistantCapability`), returns the owner/mask decisions from it so a handler cannot forget to ask, closes the five endpoints that gate on "there is a tenant context", reconciles each `actions/*` capability with `apiWriteCapability` **and pins that with a test over the whole family**, makes the gateway's capability fetch fail closed on 404, and stops handing the gateway↔hub server token to user-authored scripts. No new abstraction, no new service layer, no new route: every mechanism this needs already exists in the repo (`isModuleEnabled`, `capabilities.ownerScoped/fieldLevel`, `apiWriteCapability`, `agentActor`, `statusChangeBlocked`), and four bridge endpoints already demonstrate the pattern by hand.

## Technical Context

**Language/Version**: TypeScript (strict), Node 22+ / Bun runtime (hub), Node 22+ (gateway)

**Primary Dependencies**: `minion_hub` — SvelteKit 2 server routes, Drizzle ORM, `@minion-stack/cache` (Valkey), existing `rbac.service.ts`, `modules.service.ts`, `assistant-principal.ts`. `minion` (gateway) — the agent tool registry, `hub-capabilities.ts`, `custom-tools.ts`, `run-script.ts`.

**Storage**: Postgres (Supabase) via `withOrgCore`; `app_modules` toggles, `member_roles` + per-org capability overrides, `built_tools`. No schema change in this feature. One legacy Turso table is read by an out-of-scope endpoint.

**Testing**: hub — `bunx vitest run <paths>` (see Constitution Check III for why **not** `bun run test`); gateway — `pnpm vitest run test/ci/`. New tests go beside existing ones: `src/routes/api/gateway/actions/actions.server.test.ts` (10 gateway test files already exist), `src/server/services/rbac*`, and the gateway's own `tool-search` tests.

**Target Platform**: hub on Vercel (serverless functions); gateway in Docker on the Netcup swarm.

**Project Type**: two existing server-side codebases in two independent git repositories; documentation-and-tests-heavy change to authorization code paths.

**Performance Goals**: no regression. The guard adds one cached module-state read per bridge call — a read the human path already performs on "virtually every request" (`modules.service.ts:11-13`), cached 5 m / SWR 1 m. Capability resolution is unchanged.

**Constraints**: the bridge's own 60 s caches (`resolve-identity.ts:78`, `hub-capabilities.ts:14`) are not changed, so revocation and module-toggle latency on the agent path stays ≤60 s and must be stated rather than silently fixed. The CRM conversation-vector service carries a "signature is load-bearing, do not change" comment, so masking must be an additive optional parameter. `actions/*` writes must keep working for `module_action`, which reaches the same handlers.

**Scale/Scope**: 48 bridge endpoints (17 `actions/*`, the `query/*` family, analytics, brains, platform); 11 module families exposed; 23 modules in the RBAC engine; 29 functional requirements; 6 slices.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — see end of section.*

| Principle | Verdict | Evidence / caveat |
|---|---|---|
| **I. Spec before code** | **PASS** | `spec.md` exists and precedes any code; this run produces documents only (no branch, no commit, no PR). |
| **II. AS-IS → TO-BE → DELTA with evidence** | **PASS** | 18 AS-IS rows, every anchor re-opened in this session against hub `7d917ed0` and gateway `f2de5e00534`; all four counts (109 / 0 / 48 / 31) re-run, not copied. 12 DELTA transitions each name their proof. Two unknowns stay marked rather than guessed. **One input claim was found false and corrected in place** (A17: `notify-user` does enforce `comms:create` via `requireNotificationAdmission`, contradicting `C-tool-feeding.md` M3, the synthesis and the brief). |
| **III. Slice-scoped delivery** | **PASS with a named conflict** | Six slices, one PR each, from isolated worktrees, against each repository's registered PR base — `minion_hub` → `master`, `minion` → `DEV` (`repo-policy.yaml`), re-read at implementation time rather than trusted from here. **Conflict**: the registry's own gate command is unsafe in both repos — hub `bun run test` has reached production through `*.sql.integration.test.ts` (10-minute hub-wide 500s, 2026-09-03) and gateway `pnpm test` crashes the box. The plan therefore runs the *safe* gates (`bunx vitest run <paths>`; `pnpm vitest run test/ci/`) plus `bun run check`, and this deviation is stated in every PR body. Principle III says "the repository's own gates"; the registry's declared `test` command is not one that may be run. |
| **IV. Required build steps are spec requirements** | **PASS** | Design tokens / `lint:design` / `lint:tokens`: **N/A**, no `.svelte` file is touched. Route-contract manifest: **N/A**, no route is added or removed; `src/lib/routes/route-access-registry.ts` has no `api/gateway` entries. Paraglide `m.*()`: **N/A** — bridge refusals are API error strings the agent relays, not rendered UI copy, and the existing ones are plain strings in the handler. RBAC wiring: **this feature *is* the RBAC wiring clause**, applied to the surface that was exempt from it. Watch-out: `src/server/services/pos-service-boundaries.test.ts` freezes pos.service's export inventory, and two `actions/*` tests import `action-auth` directly — a changed guard signature reddens them in the same commit, which is the intended behaviour, not a surprise. |
| **V. Security and data work keeps human gates** | **PASS by construction** | Tagged security. The owner approves this spec before any code and merges every PR; no slice contains a production data mutation, so the dry-run/undo/run-twice rules do not apply. |
| **Open-items ledger** | **PASS** | Anything left open (notably the two `[NEEDS CLARIFICATION]` items, and S3's generic dispatcher if the create/edit decision is deferred) gets a `TODO(handoff)` at the site **and** an append to `proposals/2026-10-15-agent-harness-restoration.md`. `/speckit-converge` output is not a substitute. |
| **Artifact layout and registration** | **PASS with an action** | This feature lives in `specs/003-agent-bridge-rbac-parity/`. The meta board reads only top-level `specs/*.md` via `scripts/spec-index.mjs`, so a stub `specs/2026-10-15-agent-bridge-rbac-parity-spec.md` with `TEMPLATE.md` frontmatter and a pointer here is required for it to appear on the board — tracked as task T001. |

**Post-Phase-1 re-check**: unchanged. The design adds no new project, no new dependency and no new persisted state, so no Complexity Tracking row is needed. The single judgement call (one shared guard that returns decisions rather than one guard per concern) is the smaller of the two options and is recorded in `research.md` R1.

## Project Structure

### Documentation (this feature)

```text
specs/003-agent-bridge-rbac-parity/
├── spec.md
├── plan.md                 # this file
├── research.md             # Phase 0 — the five decisions and what was rejected
├── data-model.md           # Phase 1 — the authorization decision and its inputs
├── quickstart.md           # Phase 1 — how to prove each story, with the safe commands
├── contracts/
│   ├── shared-guard.md         # what every bridge endpoint may rely on
│   └── actions-human-path-map.md  # the table the parity test reads (FR-013)
├── checklists/requirements.md
├── analysis.md             # /speckit-analyze output
├── sdd-notes.md            # friction log for the SDD audit
└── tasks.md                # /speckit-tasks output
```

### Source Code (two repositories, existing layout)

```text
minion_hub/src/
├── routes/api/gateway/
│   ├── _shared/action-auth.ts              # the shared guard — the centre of this feature
│   ├── actions/{17 endpoints}/+server.ts   # capability reconciliation, actor stamp, workflow
│   ├── query/custom-tools/+server.ts       # tools:view on every path
│   ├── insight/+server.ts                  # AND instead of OR, finance field level
│   ├── search-crm-conversations/+server.ts # owner scope + masking
│   ├── crm-conversation-themes/+server.ts  # pass the ownerId its service already takes
│   └── actions/actions.server.test.ts      # the capability-parity test lands here
├── routes/api/{agent-memories/{recall,delete},messages/ingest}/+server.ts  # require serverId
└── server/services/
    ├── rbac.service.ts                     # apiWriteCapability (read, not changed)
    ├── modules.service.ts                  # isModuleEnabled (read, not changed)
    └── crm-conversation-vectors.service.ts # additive optional mask parameter

minion/src/agents/
├── tool-search/hub-capabilities.ts         # 404 ⇒ fail closed
├── tool-search/custom-tools.ts             # stop injecting the server token
└── tools/hub/module-action-tool.ts         # allowlist assertion + corrected wording
```

**Structure Decision**: no new directories. Every change lands in a file that already exists, beside tests that already exist, in the two repositories the audit covered. The hub work and the gateway work are independent and ship as separate PRs to separate bases; the only ordering constraint is that hub #541 (out of scope, currently **open**) touches three sibling files, so the hub slices rebase onto it rather than race it.

## Complexity Tracking

> No Constitution Check violations. Table intentionally empty.
