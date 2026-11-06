# Implementation Plan: Org entitlements (premium orgs)

**Branch**: `docs/043-hub-org-entitlements` (meta, spec artifacts) | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: [design.md](./design.md) (final, goldfish-reviewed 2026-10-29). Sections cited as "design §X" are not repeated here.
**Repos**: hub `minion_hub` (PR base `master`), gateway `minion` (PR base `DEV`), meta `langgraph-server/` (PR base `dev`). Check bases with `node scripts/repo-policy.mjs show <id>` before branching.
**Anchors**: hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a.
**Gate**: security + data. The owner approves this spec before S1 starts and merges every PR.

## Summary

Add a plan per org (Premium, Base) and a code-defined feature catalog. One pure hub evaluator decides; the hub enforces on its routes, model calls, ticks and jobs; the gateway enforces from JWT claims and a per-account `aiEnabled` mirror field; the flows runner enforces from a per-flow `aiEnabled` field. The UI renders only what the server resolved and never renders disabled AI. Everything is inert until `ENTITLEMENTS_ENFORCED=true`, which the owner turns on only after the backfill. Architecture: design §Technical Plan (Shape diagram).

## Technical Context

**Language/Version**: TypeScript (strict). Hub: Bun, SvelteKit 2, Svelte 5 runes. Gateway: Node 22+, pnpm. Runner: Node, LangGraph.
**Primary Dependencies**: Drizzle over Postgres (Supabase) with forced RLS; `@minion-stack/cache` (`cached`, `keys.hub`, `tags.tenantDomain`); Paraglide; PostHog server capture.
**Storage**: two new hub tables, `org_plans` and `org_plan_events` (design §Data model). One schema-only migration `20261029100000_org_entitlements.sql` (after the latest `20261025200000_crm_door_clicks.sql`).
**Testing**: hub vitest with `createMockDb()`, plus one `*.sql.integration.test.ts` on `HUB_TEST_DB_URL` (never prod); gateway vitest targeted files (`pnpm vitest run <files>`, never the full suite); runner vitest.
**Target Platform**: hub on Vercel; gateway on netcup swarm; runner co-located with the gateway, loopback only.
**Performance Goals**: one cached lookup per org per request (5 min TTL, 1 min SWR); gateway checks are synchronous (claims on the connection, mirror field in memory).
**Constraints**: FACES sees no change at any step; flag off = today's behavior on every surface; no channel runtime restart on a plan change; gateway and runner act only on what the hub sends.
**Scale/Scope**: 4 features, 2 plans, ~40 hub AI routes, 8 ticks/jobs families, 1 gateway method gate, 1 dispatch gate, 1 runner gate.

## Constitution Check

- **I. Spec before code**: spec.md, plan.md and tasks.md precede every commit in the three repos. ✔
- **II. AS-IS → TO-BE → DELTA with evidence**: spec.md AS-IS carries file:line anchors at the commits above; the gateway JWT-only finding was verified on `DEV` (design §Gateway connections without the shared token; review verification (a)). Bernibites' id is unverified by design and resolved at run time. ✔
- **III. Slice-scoped delivery**: five slices, one branch and one draft PR per repo touched, each from its own worktree with a real install (`bun install --frozen-lockfile` / `pnpm install --frozen-lockfile`). Gates run in the foreground with `timeout`, exit code captured, never piped. ✔
- **IV. Required build steps**: S1 owns the route contract (6 count files), RBAC registration (`route-access-registry.ts`), i18n (`nav_orgPlans`, `admin_plans_*`), design lint for `/orgs/plans`, and migration seed pairing. S3 is UI-only edits behind `hasFeature` and runs design lint. ✔
- **V. Security and data**: S1 (RLS, admin writes), S2 (gates, token endpoint), S4 (new JWT-only connect path, method gate) and S5 (prod data write) keep human gates at approval and merge. The backfill is dry-run by default, snapshots first, asserts an invariant (exactly one non-Premium org = Bernibites; FACES Premium), and is idempotent. ✔
- **Open-items ledger**: every accepted risk with a code site gets a `TODO(handoff)` in its slice and an entry in `proposals/2026-10-29-hub-org-entitlements-followups.md`. ✔

## Decisions

The binding decisions are design §Departures from the concepts brief, §Alternatives Considered, and `review/resolution_decisions.md`. The ones that shape slicing:

| # | Decision | Where |
|---|---|---|
| D1 | Missing plan row = Base; provisioning writes nothing; launch rows come from an owner-run script, never a migration | design §Data model, §Alternatives "What an org without a plan gets" |
| D2 | Mapping is the typed `PLAN_DEFAULTS` in code; no `plan_features` table | design §Catalog and rules |
| D3 | One flag gates every surface; gateway and runner are inert without hub-sent claims/fields | design §Rollout |
| D4 | Each AI route checks up front; `handleError` is unchanged; the chokepoint is a backstop | design §Enforcement points, §Alternatives "How hub routes return the 403" |
| D5 | Gateway gate is an allowlist evaluated before the admin bypass | design §Gateway access for Base orgs |
| D6 | Base orgs never receive the shared token; JWT-only connect added to the gateway | design §Gateway connections without the shared token |
| D7 | Channel AI is a mirror config field, no push, no restart | design §Channel AI is configuration |
| D8 | A skipped AI flow node ends its branch; it never passes input through | design §Flows |
| D9 | Disabled AI is not rendered; pages reuse the module 404 guard | design §UI |

**Addition to design.md**: hub `AGENTS.md` requires a migration PR to touch `scripts/qa/seed/**` (CI `migration-seed-pairing`). S1 therefore adds a small seed module (one Premium and one Base QA org) so the Base-org acceptance can run on `dev:local`. design.md does not list it.

## Project Structure

### Documentation (this feature)
```text
specs/043-hub-org-entitlements/
├── design.md            # source of truth (HOW)
├── concepts_brief.md, hypothesis.md, design_draft.md
├── review/              # goldfish reports + consolidated_review_report.md
├── spec.md              # this feature's WHAT/WHY
├── plan.md              # this file
└── tasks.md
specs/2026-10-29-hub-org-entitlements-spec.md     # board stub (index ignores NNN-* dirs)
proposals/2026-10-29-hub-org-entitlements-followups.md
```

### Source code
Hub paths are relative to `minion_hub/`, gateway paths to `minion/`, runner paths to `langgraph-server/`. Exact files per slice: design §Detailed Implementation and tasks.md.

## Slices

Every slice: worktree under `~/.cache/claude-tmp/`, draft PR, owner merge. Hub slices S2 and S3 branch from S1's branch while S1 is in review and rebase onto `origin/master` after it merges.

### S1 — hub: schema, catalog, evaluator, platform-admin page (inert) · security/data
- Repo/branch/base: `minion_hub`, `feat/entitlements-s1-model`, `master`. Worktree `~/.cache/claude-tmp/hub-ent-s1`.
- Scope: design §Slice S1 — migration, Drizzle schema, `src/server/entitlements/{catalog,evaluate}.ts`, `entitlements.service.ts`, `/orgs/plans`, links, route contract (6 counts), i18n, plus the seed pairing above.
- Gates: `bunx vitest run src/server/entitlements src/server/services/entitlements.service.test.ts 'src/routes/(app)/orgs/plans' src/lib/routes src/server/ui-audit/frontend-contract-scanner.test.ts scripts/ui-audit-inventory.test.ts src/lib/components/layout scripts/qa/seed`; `HUB_TEST_DB_URL=… bunx vitest run src/server/services/entitlements.sql.integration.test.ts`; `bun run qa:seed:verify`; `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens`; full `bun run test` with `SUPABASE_DB_URL` unset; `bun run build`.
- Live check (`dev:local`): CUJ 1 and CUJ 5 as a QA platform admin; a non-admin is refused.
- Depends on: spec approval.

### S2 — hub: server gates (behind `ENTITLEMENTS_ENFORCED`) · security
- Repo/branch/base: `minion_hub`, `feat/entitlements-s2-server-gates`, `master` (from S1's branch until S1 merges). Worktree `~/.cache/claude-tmp/hub-ent-s2`.
- Scope: design §Slice S2 — usage-scope org and `authenticated`, `EntitlementError`, chokepoint backstops, `requireFeature` on every listed route, agent-callback routes, assistant, marketplace, personal-agent provisioner, token endpoint, JWT claims, ticks, `bg-runtime`, `aiEnabled` on the channel and flow internal endpoints, `ai-call-inventory.test.ts`. `TODO(handoff)` for R6 (token route) and R13 (flows route).
- Gates: targeted vitest for every changed file family plus `src/server/entitlements/ai-call-inventory.test.ts`; check; full test with `SUPABASE_DB_URL` unset; build.
- Live check: with `ENTITLEMENTS_ENFORCED=true` locally and the seeded Base org, CUJ 3 and CUJ 4; with the flag off, the same calls succeed and log `would_deny`.
- Depends on: S1.

### S3 — hub: do not render disabled AI
- Repo/branch/base: `minion_hub`, `feat/entitlements-s3-hide-ai-ui`, `master` (from S1's branch until S1 merges). Worktree `~/.cache/claude-tmp/hub-ent-s3`.
- Scope: design §Slice S3 — `locals.entitlements` in the module guard, layout data, `MODULE_MANIFEST.feature`, `canViewPath` + `hasFeature`, JWT-only session on a 403 token answer, `/channels/[id]` 404 and comms links, `ChannelLinking` iframe entries, settings tabs, every listed inline AI control, `my-agent-rpc.ts`. `TODO(handoff)` for R8 in `hosts.svelte.ts` and `availability.ts`.
- Gates: targeted vitest (guard, availability, route-guard, can, sections, topbar-parity, EmailModal, my-agent-rpc, gateway.svelte, channels); check; `lint:design && lint:tokens`; full test; build. Re-run the client grep for fetches to gated routes and add any new caller.
- Live check: CUJ 2 as a Base-org member (flag on locally): open every visible nav item; AI URLs 404; then flag off: FACES-equivalent Premium org sees everything.
- Depends on: S1. Shares `src/hooks.server.ts` and `src/app.d.ts` with S2 (different functions/interfaces); merge S2 first, then rebase S3.

### S4 — gateway and flows runner · security
Two PRs.
- Gateway: `minion`, `feat/entitlements-s4-gateway`, base `DEV`. Worktree `~/.cache/claude-tmp/gw-ent-s4`. Scope: design §Slice S4 "Gateway PR" — JWT-only connect (skipping the rate limiter), claim parsing and propagation (WS client, `auth.refresh`, `/mcp`), `BASE_PLAN_GATEWAY_METHODS` and the gate in `authorizeGatewayMethod`, `flows-run.ts` `aiEnabled`, `channel-hydrate.ts` `aiEnabled`, dispatch gate, relay suggestion count. `TODO(handoff)` comments for R1, R2, R14, R19. Gates: `pnpm vitest run <the test files in design S4>` plus `pnpm vitest run test/ci/` (never the full suite); `pnpm check`; `pnpm tsgo`; `pnpm build`.
- Runner: meta repo, `feat/entitlements-s4-flows-runner`, base `dev`. Worktree `~/.cache/claude-tmp/meta-ent-s4`. Scope: design §Slice S4 "Flows runner PR" — `server.ts`, `compile-flow.ts` with `AI_PLUGIN_ACTION_METHODS` and `TODO(handoff)` (R20). Gates: the runner's vitest for `src/flow/`, its typecheck.
- Depends on: nothing in the hub (inert without claims and `aiEnabled: false`). The hub palette's copy of `AI_PLUGIN_ACTION_METHODS` lands in S3.

### S5 — data launch and docs · data
- Hub: `minion_hub`, `feat/entitlements-s5-backfill`, base `master`, after S1 merges. Scope: `scripts/entitlements/backfill-launch-plans.ts` (design §Slice S5) with a unit test of its planning and assertion logic, `.env.example` entry for `ENTITLEMENTS_ENFORCED`, `scripts/entitlements/snapshots/` ignored by git.
- Meta: this branch (`docs/043-hub-org-entitlements`, base `dev`) carries spec.md, plan.md, tasks.md, the board stub and the follow-up proposal.
- Owner-run steps: backfill dry run, apply, and the flag flip (tasks.md Phase 7).

## Launch order

design §Launch order, unchanged:
1. Merge S1 → S2 → S3; deploy hub (flag off).
2. Merge S4 gateway, release; merge and deploy the runner change.
3. Merge S5 hub; OWNER runs the backfill dry run, then `--apply --expect-base <id>`.
4. OWNER checks Q4 preconditions, sets `ENTITLEMENTS_ENFORCED=true`, redeploys the hub.
5. OWNER + orchestrator run the G9 acceptance walk with a test org, then move it back.

## Rollback

Unset `ENTITLEMENTS_ENFORCED` and redeploy the hub (design §Rollout). New JWTs carry no claims; sockets that call `auth.refresh` clear their features; others clear on reconnect. The mirror sends `aiEnabled: true` on its next refresh and the flow endpoint sends `true` on the next run. Tables and rows stay; the gateway and runner changes are inert without hub signals and need no revert. The backfill snapshot in `scripts/entitlements/snapshots/` restores `org_plans` if a row write must be undone.

## Risks

design §Risks & Mitigations (R1–R22) is the full table. Accepted items with a code site are in the follow-up proposal. Delivery risks specific to this plan:
- **Shared hub files**: S2 and S3 both edit `src/hooks.server.ts` and `src/app.d.ts`. Serialize the merge (S2 then S3) and re-run check and the guard tests after the rebase.
- **Route-contract counts**: two of the six count files live outside `src/lib/routes/`; a green `src/lib/routes` run is not proof (design S1).
- **Gateway full test suite**: never run `pnpm test` in `minion/`; use the targeted files.
- **Q4 unknown**: if `PUBLIC_GATEWAY_JWT_AUTH` is off in prod, Base-org sessions lose the gateway entirely once the flag is on. The owner checks before step 4.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Gateway JWT-only connect path | Base-org browsers must reach channels without the shared admin token | Keeping the token lets any Base-org user drop the JWT and bypass the gate (design §Alternatives) |
| CI AI call-site inventory | New AI call sites would otherwise ship ungated | A one-time audit drifts; the chokepoint alone cannot return a 403 |
| Runner branch cut instead of pass-through | A pass-through echoed customer input back | design §Alternatives "Turn a skipped AI flow node into a pass-through" |

## Bypassed

No Spec Kit `before_specify` hook ran (none registered). The design went through goldfish review (two rounds); the two-pass review here is owner review of this spec plus independent review on each implementation PR.
