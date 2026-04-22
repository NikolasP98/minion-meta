---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 08-polish-automation-08-04-PLAN.md
last_updated: "2026-04-22T01:51:32.839Z"
last_activity: 2026-04-22
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 42
  completed_plans: 41
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-19)

**Core value:** One command resolves the right env and runs the right build for any subproject, and every piece of cross-cutting code lives in exactly one place under uniform standardization — no exceptions.
**Current focus:** Phase 08 — polish-automation

## Current Position

Phase: 08 (polish-automation) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-04-22

Progress: ████████░░ 97%

## Performance Metrics

**Velocity:**

- Total plans completed: 33
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |
| 1 | 5 | - | - |
| 02 | 8 | - | - |
| 3 | 6 | - | - |
| 05 | 5 | - | - |
| 06 | 5 | - | - |
| 07 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: — (not yet started)

| Phase 02 P07 | 90 min | 6 tasks | 11 files |
| Phase 02 P08 | 8 | 3 tasks | 3 files |
| Phase 03 P01 | 35 min | 3 tasks | 8 files |
| Phase 03 P04 | 16 min | 3 tasks tasks | 6 files files |
| Phase 03 P02 | 11 min | 3 tasks | 6 files |
| Phase 03 P03 | 17 min | 3 tasks tasks | 8 files files |
| Phase 03 P05 | 8min | 3 tasks tasks | 10 files files |
| Phase 03 P06 | 2min | 2 tasks | 2 files |
| Phase 04 P01 | 12 | 2 tasks | 13 files |
| Phase 04-fold-minion-shared P03 | 15min | 2 tasks | 5 files |
| Phase 04-fold-minion-shared P04 | 2min | 2 tasks | 2 files |
| Phase 06-auth-extraction P06-01 | 30min | 3 tasks | 10 files |
| Phase 06 P02 | 25min | 1 tasks | 3 files |
| Phase 06-auth-extraction P03 | 3min | 1 tasks | 3 files |
| Phase 07 P01 | 25 | 1 tasks | 1 files |
| Phase 07 P02 | 30 | 2 tasks | 10 files |
| Phase 07 P03 | 90 min | 3 tasks | 20 files |
| Phase 07 P04 | 4min | 3 tasks | 2 files |
| Phase 08-polish-automation P01 | 12 | 2 tasks | 8 files |
| Phase 08 P02 | 8 | 2 tasks | 2 files |
| Phase 08-polish-automation P08-03 | 3 | 2 tasks | 6 files |
| Phase 08-polish-automation P04 | 3 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- 2026-04-19: Meta-repo (Option A), not true monorepo — subproject independence wins
- 2026-04-19: Root-level branding is "minion", not OpenClaw
- 2026-04-19: Aggressive shared-package extraction (Option C) — uniform standardization
- 2026-04-19: Root becomes its own git repo; subprojects stay gitignored
- 2026-04-19: Per-subproject `.env.defaults` + `.env.example` (not centralized)
- 2026-04-19: Fold `minion-shared/` into `packages/shared` (no exceptions)
- 2026-04-19: Publishing via npm under `@minion/*` scope
- 2026-04-19: Orchestration via `concurrently`, not Turborepo
- 2026-04-19: M0 (clean slate) first priority per explicit user request
- [Phase 02]: Dashboard-only Infisical rename path (CLI v0.43.76 has no projects subcommand) — Discovery §1 confirmed no CLI support for project mgmt; user executed via web dashboard at http://100.80.222.29:8080
- [Phase 02]: UUID-based zero-edit Netcup — paperclip + bot-prd targeted Infisical by projectId, so slug rename required zero production edits — Confirmed on-host during Task 5 verification; Discovery §7 risk prediction held
- [Phase 02]: Voice-call smoke test deferred per user 2026-04-20 — Automated proof-of-life (/voice/webhook 401 + systemd active 2d uptime) sufficient given UUID-stable targeting; tracked in deferred-items.md for future belt-and-suspenders run
- [Phase 02]: Phase 2 closed with docs-only plan (02-08): CLAUDE.md Meta-repo Workflow section + README.md onboarding (138 lines) + infisical-dev.sh deprecation shim
- [Phase 03]: Transitional noUncheckedIndexedAccess=false in minion/tsconfig.json — enabling shared base default would surface 1616 warnings; Phase 8 follow-up
- [Phase 03]: pnpm.minimumReleaseAgeExclude for @minion-stack/* required — minion's 48h min-release-age blocks freshly published internal packages
- [Phase 03]: Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false in paperclip-minion/tsconfig.base.json — 428 errors across 13 packages; Phase 8 refactor
- [Phase 03]: Local prettier.config.cjs shim in paperclip — @minion-stack/lint-config@0.1.0 ships CJS Prettier config in ESM package; bump to 0.1.1 before Wave 2
- [Phase 03]: Consume @minion-stack/lint-config@0.1.1 directly via package.json prettier key — 0.1.0 CJS/ESM bug (03-04 shim workaround) is fixed; Wave 2 blocker resolved for 03-03
- [Phase 03]: Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false in minion_hub/tsconfig.json — 408 errors across MinionLogo/WorkshopCanvas/reliability; Phase 8 refactor
- [Phase 03]: Separate formatting-only commit (218 files) from adoption commits in hub — keeps logical 3-commit diff reviewable on un-formatted codebase
- [Phase 03]: Consume @minion-stack/lint-config@0.1.1 directly in minion_site via package.json prettier key (no shim) — Wave 2 structural-copy pattern matches 03-02 hub
- [Phase 03]: Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false in minion_site/tsconfig.json — 53 errors concentrated in Channels.svelte; Phase 8 refactor
- [Phase 03]: Separate formatting-only commit (26 files) from adoption commits in site — keeps logical 4-commit diff reviewable, mirrors 03-02 pattern
- [Phase 03]: Fork-based PR flow for pixel-agents — pablodelucca upstream, NikolasP98 fork head, PR targets upstream main
- [Phase 03]: Dual tsconfig adoption in pixel-agents — extension extends node.json + webview-ui extends base.json (same @minion-stack/tsconfig package)
- [Phase 03]: Local eslint-plugin-pixel-agents preserved per D-14 — shared preset spread FIRST, local plugin + rules layered on top
- [Phase 03]: Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false in both pixel-agents tsconfigs — 12+108=120 errors vs 0 pre-adoption; Phase 8 follow-up
- [Phase 03]: Shared lint-config preset needs 'files' scoping in downstream consumers with nested node_modules — workaround applied in pixel-agents/webview-ui, upstream fix deferred to lint-config 0.1.2
- [Phase 03]: minion_plugins fully deferred per D-27 — markdown+YAML catalog with 0 TS/JS + 0 Infisical secrets; ADOPT-06 + ADOPT-07 closed as N/A with Phase 8 revisit triggers
- [Phase 03]: Phase 3 CLOSED — 5 adoption PRs open + 1 documented deferral for the no-code subproject
- [Phase 04]: SHARE-01 git subtree N/A: minion-shared/ has no independent git history (plain gitignored directory, not a submodule) — source copied verbatim
- [Phase 04]: tsconfig extends @minion-stack/tsconfig/library.json (with .json extension) per package exports map
- [Phase 04]: noUncheckedIndexedAccess narrowing fix in _formatTs: hm[1] -> hm?.[1] for strict-mode compatibility with base.json
- [Phase 04-fold-minion-shared]: SHARE-04: All 3 consumer files in minion_site updated to @minion-stack/shared; minion_hub and paperclip-minion confirmed non-consumers; migration branch from master produces clean PR
- [Phase 04-fold-minion-shared]: SHARE-01 N/A: minion-shared/ had no git history (plain gitignored directory, not a submodule)
- [Phase 04-fold-minion-shared]: SHARE-05 N/A: minion-shared had no GitHub repo (npm-only package, nothing to archive)
- [Phase 04-fold-minion-shared]: Phase 04 complete: all 5 SHARE requirements satisfied or documented N/A with rationale
- [Phase 05-01]: @minion-stack/db@0.2.0 published (0.1.0 was already live from prior session; changeset bumped to 0.2.0)
- [Phase 05-01]: A1=FAILED — drizzle-kit cannot read .ts from node_modules even with src/ in npm files array; error: "No schema files found"
- [Phase 05-01]: Plan 05-03 uses Option B: hub keeps thin local re-export stubs in src/server/db/schema/ pointing at @minion-stack/db; drizzle-kit reads hub-local stubs
- [Phase 06-auth-extraction]: Version 0.2.0 not 0.1.0: changeset minor bump applied to 0.1.0 scaffold → produced 0.2.0 as initial npm release
- [Phase 06-auth-extraction]: factory.ts excludes organization() (D-02 revised): hub passes organization+oidcProvider via plugins param; site passes organization(); factory never calls organization() internally
- [Phase 06-auth-extraction]: schema NOT imported in factory — passed as param to keep @minion-stack/auth decoupled from @minion-stack/db internals
- [Phase 06]: Hub auth.ts delegates to createAuth() factory; @minion-stack/db added as explicit dep; PR #19 open on NikolasP98/minion_hub targeting dev (not merged — gated on 06-04 staging)
- [Phase 06-auth-extraction]: Used @minion-stack/auth@^0.2.0 for site consumer (plan referenced 0.1.0 but 0.2.0 was published in 06-01)
- [Phase 06-auth-extraction]: secret: env.BETTER_AUTH_SECRET ?? '' in site auth.ts to satisfy strict TypeScript — site's ambient.d.ts types env vars as string|undefined
- [Phase 06]: Phase 6 complete — createAuth() factory live at @minion-stack/auth@0.2.0; hub + site migrated; JWKS kid gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc identical on both services; session continuity verified staging + prod; AUTH-01..04 all Complete
- [Phase 07]: D-01..D-08 locked for Phase 7 WS consolidation: package target @minion-stack/shared; publish 0.2.0 then 0.3.0; Yjs binary frames and onLog stay local; hub text.ts kept local; site uses manual smoke runbook; minion/ gateway server out of scope
- [Phase 07]: vitest downgraded to ^2.1.9 in packages/shared — workspace vite@5.4.21 conflicts with vitest@4.x (requires vite^6)
- [Phase 07]: vitest downgraded to ^2.1.9 (workspace vite@5.4.21 conflicts with vitest@4.x)
- [Phase 07]: ws is optional peerDep — browser consumers of root '.' entry never pull ws into bundle
- [Phase 07]: Hub binary channel (Yjs) uses (client as any).ws shim — TODO(phase-8) upstream proper binary channel accessor
- [Phase 07]: gateway-client.ts paperclip shim is 29 lines (re-exports helpers); deviceIdentity hoisted outside while loop for onChallenge closure access
- [Phase 07]: Sweep 1 match in gateway-client.ts re-export shim classified as CLEAR — re-export, not local declaration
- [Phase 07]: E2E checkpoint auto-approved; manual staging smoke deferred to post-PR-merge (SITE-SMOKE.md in place)
- [Phase 08-polish-automation]: build-all runs sequentially (not --parallel) so downstream packages have upstream dists for typecheck
- [Phase 08-polish-automation]: changeset:status in CI only runs on pull_request events — omitting on push-to-main avoids failure after changesets are consumed
- [Phase 08-polish-automation]: oxlint added as explicit devDependency per TS package to ensure binary resolves correctly within each package
- [Phase 08]: D-01 honored: classic NPM_TOKEN (automation type) over OIDC — OIDC deferred to REL-03 per plan decision
- [Phase 08]: cancel-in-progress: false on release workflow — prevents concurrent publishes from corrupting npm state
- [Phase 08-polish-automation]: MINION_PKGS extended to 7 packages; git column uses count-only output (no filenames); clone-presence guard before resolveEnv prevents authFailure masking; local-only per D-03
- [Phase 08-polish-automation]: Kept all 7 subproject detail sections per D-04 — audience is orchestrator agent dispatching subagents
- [Phase 08-polish-automation]: CI & Release Automation subsection added to CLAUDE.md Meta-repo Workflow (not Architecture) — it describes workflow, not system topology

### Pending Todos

None yet.

### Blockers/Concerns

yet. Phase 1 depends on nothing and can be planned immediately.

- Pending: user must run 'cd packages/cli && npm publish --access public' to ship @minion-stack/cli@0.1.0 (2FA)

## Session Continuity

Last session: 2026-04-22T01:51:32.836Z
Stopped at: Completed 08-polish-automation-08-04-PLAN.md
Resume file: None
