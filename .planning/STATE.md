---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: 360 quality and reliability
status: executing
stopped_at: Executing security and jobs-stock gap closure before SDK-transport
last_updated: "2026-09-12"
---

# Project State

## Project Reference

See PROJECT.md and operations/360/PROGRAM.md. Historical v1.0 files copied to milestones/v1.0-pre360; existing phase history preserved.

## Current Position

Independent takeover review and resumed repairs are recorded in [PRIORITY-DELIVERY-2026-09-12.md](operations/360/PRIORITY-DELIVERY-2026-09-12.md), with the original findings in [REVIEW-2026-09-12.md](operations/360/REVIEW-2026-09-12.md) and the refreshed [task table](operations/360/PROGRESS-2026-09-12.md).

**89 plans / 229 tasks / 51 requirements / 12 phases.** 193 scoped deliverables complete (84.3%),29 partial, seven without complete receipts. This includes private/preparatory work; no whole requirement is independently closed. New review findings remain outside the historical denominator.

Hub jobs repairs PR269 deployed f97efb2d; UI PR270 deployed77445c01 with3800 ordinary passing tests (25 existing skips),148 native cases without skips, required build/design gates and public mobile/desktop smoke. Meta Node-floor PR400 mergeddev6103e982. Gateway security/portability PR292/294 and Nitter/fixture PR295 are merged through DEVb841c367; production PR293 merged normally to7a1501e9 after full repaired DEV Windows qualification; both production Gateway services are verified healthy on the exact immutable image with on-host HTTP200/WS101 challenge. Public ingress and authenticated durable-session acceptance remain separate. Factory boundary/planner repairs are merged to dev467906db; trusted promotion failed before rollout twice with an unclassified broker502, leaving live/main02900306 unchanged. ACP qualification PR401 is merged to dev48e67faf as a dev-only candidate. Current exact final release status belongs to the priority-delivery report rather than inferred branch state.

## Current Decisions

- Current user priority: close remaining security and jobs/stock gaps, then SDK/transport. See operations/360/GAP-CLOSURE-2026-09-12.md. Bounded subagents implement and independently verify; root owns canonical planning and cross-project admission.
- Preserve active dirty checkouts; separate private, merged, published and deployed identities.
- Exact SDK1.4.0/Zod4.3.6 qualify outside production build/exports. Do not silently replace caller conversation history with one-shot sessions.
- Original task metric stays comparable; an audit deliverable and its proposed repairs are counted separately.

## Current Blockers / Evidence Gaps

- Netcup jobs-only cron is paused after verifying an August10 unfenced runtime.10-15 owns safe Node worker adoption and exact restoration; other scheduled work remains unchanged.
- Attachment linked-record authorization and link/sweeper deletion races remain high findings; cron scheduling stays pending.
- Booking transaction rollback is fixed; postcommit stock realization/release still needs durable admission and recovery. The bounded design is recorded in phase10; source-backed compatibility policy now preserves existing drafts, operation-time resolution and explicit business retry; durable producer/worker implementation is active.
- Authenticated ERP/UI, remaining Workshop/chart keyboard tasks, native AT/devices, B2 acceptance and actual provider revocation remain unqualified.
- SDK/provider session continuation, complete governance corpus, installed sender/image adoption, containers, application load and cross-store restore remain open.
- Prior automatic approval rejection of PostgreSQL backend fault injection remains recorded. It was not rerun; owned disposable Factory child restart tests are a distinct qualified scope.

## Historical Accumulated Context (v1.0; not current runtime truth)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- 2026-04-19: Meta-repo (Option A), not true monorepo — subproject independence wins
- 2026-04-19: Root-level branding is "minion", not Minion
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
- [Phase 08-polish-automation]: D-05 honored: scratch shell dry-run on maintainer machine completed PASS in < 10 min — no README patches required (POLISH-05 satisfied)

### Pending Todos

None yet.

### Blockers/Concerns

yet. Phase 1 depends on nothing and can be planned immediately.

- Pending: user must run 'cd packages/cli && npm publish --access public' to ship @minion-stack/cli@0.1.0 (2FA)


## Session Continuity

Resume: operations/360/PROGRAM.md, ROADMAP.md, REQUIREMENTS.md, DECISIONS.md, phase PLAN/SUMMARY/VERIFICATION files. Root owns progress updates. Do not mark pending release/runtime evidence complete.

## Earlier execution checkpoints (superseded by Current Position)

10-05/10-09 now independently pass brain30native/43unit and foundation25native/27unit; fresh Hub check0errors/0warnings. Four contained traces timed out under their60-second limits with successful isolation/input/cleanup checks, so12-07 profiling is admitted as a diagnostic. Corpus10-06 remains gated on explicit batching and canonical Qdrant outbox decisions. Differently named brain-business-persistence.service.test.ts loads application environment; narrow10-08 quarantine is being verified before any broad default suite. Production remains unchanged.

14-11 independently passes isolated archive/export/runtime/declaration checks for its exact unpublished candidate; Hub/Site snapshots now contain the full matching package. Missing license/README and immutable release version remain open; local candidate preparation does not change active packages.

11-07 native SQLite journal foundation is implemented and independently verified after timestamp/ACK ordering correction. Current/pinned-local runtimes passed native tests; minimum22.13 and receiver/sender/image adoption remain open. Prior linked Vitest cache writes are recorded as an isolation exception; corrected private-cache runs preserve active caches.


Current continuation: Hub 14-09 independently passed 44 cases and its full native app check. Task 4 now supplies the remaining read-only accepted-session association for first-mount plugin consumers; 14-06 component code is still gated. Canonical 14-13 bilateral version negotiation passes 43 initial cases/types/lint; three additional invalid representatives await the independent 46-case run. Corpus 10-10 has measured synthetic capacity and selected logical limits but remains outside the admitted inventory pending contract revision/review. Receiver 14-12 is likewise a reviewed draft, with no source admission. ACP 11-04 research is active without depending on sender 11-03, whose superseded combined scope is explicitly held.


Latest continuation: 67 admitted exact paths with per-task gates. Canonical14-13 independently passes46 cases/types. A new complete durable-contract archive is built; root review is pending, while prior Hub/Site package bytes remain unchanged. Hub14-09 routing correction passes58 author cases, with root focused verification underway; final fullcheck is serialized with14-06 fixture freeze. Corpus10-10 seven-file implementation is active; root selected a separate private three-file unit lane, native SQL is not admitted. Worker15-05 comments-only Task1 is complete; claim behavior and migration remain gated. ACP research is complete; SDK adoption and actual caller/process semantics remain open.


2026-09-09 continuation:68 exact plans admitted.14-06 component repair active after independent5-control/8-red baseline;10-10 source foundation active with actor-SQL contract under review;14-14 pure gateway facade/input candidate admitted in isolated full-package snapshot.15-05 comment-only preparation independently verified. No phase or requirement closed.


Current checkpoint:69 admitted plans.11-08 environment injection is implemented and independently verified10tests/types.14-14 private gateway facade/input is independently verified91tests/types.14-06 independently passes47focusedcases; fullcheck found two fixture typing errors and URL-equivalence review opened a bounded correction.10-10 initial native diagnostic passed19of20 before a wrapped-error assertion correction; broader qualification remains active. No requirement/phase/release closed.


Current checkpoint: 70 admitted plans across 12 phases and 49 requirements. The final private 14-06 component independently passes 56 mounted cases and the full paired Hub check with zero errors/warnings; 14-09 session and 14-15 compatibility are included in that aggregate check. Native browser qualification is being prepared. 11-08 injected environment parsing and 14-14 gateway input/facade are independently verified. Corpus 10-10 passed 38 native cases before an additional exact PostgreSQL descriptor-boundary correction; final expanded qualification is still active. No phase, requirement or release is closed.


## Preserved earlier Current Position

The following checkpoint was replaced by the current summary above; its pending gates and counts are historical.

### Prior position

Phase: 09–20 — parallel implementation with exact-plan admission
Plan: 67 admitted plans / 49 requirements. Source verification exists for 09-01/02/03/04/05/06, 10-01/02/03/04/05/07/08/09, 11-01/02/06, 13-01 and 18-01. These receipts have bounded scope; no phase is complete. 18-02 inventory tooling is verified; semantic disposition remains open.
Status: Executing; no phase complete or released.
Last activity: 2026-09-09 — 14-04 plugin foundation independently passes 75 tests and package typecheck. Fresh Hub snapshot (2,417 files plus six plugin sibling source/dist files) passes with zero errors and warnings. 14-05 Workforce package transport independently passes 105 tests, typecheck and local build. Task 3 helper integration independently passes 39 candidate and 36 installed-baseline cases; current 2,418-file Hub snapshot plus six plugin siblings passes full check with zero errors and warnings. The current Hub installed packages remain separate from these candidates.

12-07 independently passes 20 diagnostic tests. Its one application profile and one decoder finished, but profile output stops at 3.570s of a 60.025s run and mostly describes initialization. No packaging cause or OOM attribution is established; no further experiment is admitted. The 12-01 dependency candidate stays unapplied. 12-04 remains incomplete after automatic safety review stopped fault injection; its guard candidate is untested and unaccepted.

10-10 remains a draft: cross-document batch reservations must be distinct from remote admission; capacity ceilings and safe cross-job orphan reclamation are unresolved. Existing Qdrant mode stays. Worker durable results, claim generation and cancellation require separate repair.

14-06 Task 1 is complete and component source remains gated. 14-07 generated package reuse passes106 tests/fullHubcheck and local native iframe/BFCache qualification. Reconnect review found that Hub and Site do not republish an authenticated session after shared-client internal reconnect, and deferred challenge work can cross socket generations. 14-08 shared-client source independently passes 65 tests and typecheck; 14-09 Hub snapshot independently passes 44 tests and the full app check; 15 existing regressions passed before the final event amendments.14-10 Site snapshot independently passes22 tests and fullSitecheck. Both use the full14-11 candidate; active app adoption/component mounting remain gated. The final plugin identity amendment independently passes 84 tests. Artifact generation uses that exact emitted package.
