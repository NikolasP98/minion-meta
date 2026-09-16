---
phase: 09-security-containment
verified: 2026-09-09T05:33:46Z
status: gaps_found
scope: independent source verification of 09-01 and 09-02; no phase completion or deployment certification
slice_status: passed
score: 5/5 roadmap containment criteria verified at the implemented source boundary
gaps:
  - truth: Server mutations require the authenticated caller's organization authority.
    status: failed
    reason: An authenticated user without a resolved organization reaches POST /api/servers under the first global organization selected by finishApp.
    artifacts:
      - path: minion_hub/src/hooks.server.ts
        issue: Lines 245-259 synthesize a tenant for /api/servers and return directly to the handler.
      - path: minion_hub/src/server/auth/tenant-ctx.ts
        issue: Lines 22-26 independently repeat the first-global-organization fallback.
      - path: minion_hub/src/routes/api/servers/+server.ts
        issue: Lines 29-41 require a user, then persist using the supplied tenant without membership authorization.
    missing:
      - Bounded child plan and permanent synthetic identity-to-hook-to-mutation regression fixture.
      - Deny or explicitly authorize organization-scoped server creation for users without membership; preserve intended no-org onboarding separately.
  - truth: Flow caller paths stay within the declared database and file roots.
    status: failed
    reason: Lexical path checks follow pre-existing symlinks outside the configured root; actual handlers reproduced both a database read and file write outside it.
    artifacts:
      - path: minion/extensions/flows/src/data-nodes.ts
        issue: resolveDbForNode lines 121-130 and resolveFileWithinBase lines 140-146 do not establish filesystem-object confinement.
    missing:
      - Bounded child plan defining trusted roots and symlink/race policy before implementation.
      - Real filesystem negative fixtures for symlinked database files and file-write ancestors, while preserving explicit trusted ledger configuration.
  - truth: SQL submitted to a flow writer cannot create files outside its admitted database resource.
    status: failed
    reason: The actual db.exec handler accepts VACUUM INTO with a bound external filename and creates that file; path validation of the opened ledger does not constrain SQL file-management operations.
    artifacts:
      - path: minion/extensions/flows/src/data-nodes.ts
        issue: handleDbExec prepares and runs caller SQL without a CRUD-only or single-statement policy.
    missing:
      - SEC-08 / 09-04 single-statement CRUD surface and negative VACUUM, ATTACH, PRAGMA and retained-attachment fixtures.
deferred:
  - truth: Disabled raw analytics and brain gateway delegation regain useful authorized semantics.
    addressed_in: Phase 15
    evidence: SEC-06 and Phase 15 criterion 1 require tenant/module/owner/field-bound typed analytics; the restoration proposal also owns brain gateway assignment.
  - truth: Flow effects carry admitted caller policy and cancellation across the runner boundary.
    addressed_in: Phase 11
    evidence: Phase 11 criterion 6 requires policy and effects governance fixtures; compile-flow.ts A9 handoff records the missing caller envelope.
human_verification:
  - test: Review exact candidate identity, saved-flow migration, gateway tool advertisement, and production acceptance before rollout.
    expected: No enabled consumer relies on the retired SQL interpolation or unassigned delegation; candidate behavior and identity are recorded.
    why_human: This verification made no production requests, migrations, container changes or releases.
---

# Phase 9 source verification

The five narrowly defined containment criteria are implemented and pass independent local checks. The broader phase goal is **not certified**: adjacent authorization and filesystem-confinement gaps require bounded follow-up work, and deployment has not been tested.

**Phase goal:** Assistant and flow requests cannot gain unauthorized data or write authority, and server diagnostics do not expose credentials.

**Scope:** Actual source, test definitions, callers, and safe synthetic probes for 09-01/09-02. Existing `09-VERIFICATION.md` remains the root-owned phase-wide open gate. No source, global planning state, packages, branches, production data or services were changed by this verifier. LangGraph has no local AGENTS.md/CLAUDE.md discovered; root instructions apply. Hub and gateway branches at inspection were `feat/level-2026-07-30` and `fix/ci-cost-remaining-gaps`.

## Observable truths and requirements

| Requirement / truth | Source result | Evidence and limit |
|---|---|---|
| SEC-01: Raw assistant SQL fails closed before DB work | VERIFIED | The service unconditionally throws `QueryRejected`; the POST route returns the shared 503/`ASSISTANT_SQL_DISABLED`/`retryable:false` contract without inspecting request data. Six service inputs and the actual route test pass. This proves the handler/service boundary, not absence of earlier identity-hook work. |
| SEC-02: Gateway actor/org requires current assignment and membership | VERIFIED | Fresh registry query rejects ambiguous canonical/legacy aliases; assignment join enforces gateway, organization, exact case-insensitive actor and active provisioning; fresh membership is required before capabilities. Unit and real PGlite fixtures cover denial and positive controls. Gateway brains are explicitly denied. Browser self/admin behavior remains gated. |
| SEC-03: Server create/update credential diagnostics are sanitized | VERIFIED | POST and PUT/DELETE log fixed strings and return fixed error messages; POST analytics omits request name/URL. Actual-handler sentinel tests pass. Lower server persistence service encrypts tokens and has no request/exception logging. Existing GET diagnostics are outside this changed mutation scope. |
| SEC-04: Caller SQL in read nodes cannot mutate SQLite | VERIFIED | A separate `DatabaseSync(..., {readOnly:true})` is opened and closed in `finally`; prepared `sourceSQL` must match the whole input. CTE INSERT/UPDATE/DELETE, appended SQL and ATTACH, and missing-file fixtures pass. Explicit consume marking remains an intentional separate write, not a read-only operation. |
| SEC-05: Upstream input only enters SQL through validated bindings | VERIFIED | Compiler captures static SQL, rejects legacy `{input}` SQL, validates scalar parameter templates, then replaces only a whole `{input}` parameter. Actual compiled graph reaches the actual gateway handler and SQLite with hostile-looking text remaining data. |

All five phase requirement IDs are declared across the two plans; no orphan requirement was found. These source results do not check off global requirements or authorize phase completion.

## Artifacts and wiring

| Artifact/link | Result | Actual proof |
|---|---|---|
| Raw SQL route → disabled contract | WIRED | Route imports `ASSISTANT_SQL_DISABLED` from the retired service and returns it. No service query execution branch remains. |
| Principal resolver → gateway/personal_agents → membership → capabilities | WIRED | Actual Drizzle queries and Supabase builders execute against synthetic PostgreSQL rows. Registry/actor queries use positional ORM binding. Membership removal and assignment removal deny the next request. |
| Principal resolver → assistant route consumers | WIRED | Brain search/remember/list, conversation search/themes, insight, notes, custom-tools/tool-permissions, and action-auth import/call this resolver. Actions/brain-search nearby tests pass. Their route tests mock the principal and therefore do not independently prove the complete HTTP identity chain. |
| Server mutations → persistence | WIRED | Actual handlers call upsert/update/delete services; secret tests intercept only downstream persistence. Service source retains encrypted token columns. |
| Flows plugin → data-node RPC handlers | WIRED | `minion/extensions/flows/index.ts` imports/calls `installDataNodes`; registration binds `flows.db.query`, `flows.db.exec`, `flows.file.write`. |
| Compiled database node → gateway RPC → SQLite | WIRED / FLOWING | Permanent integration fixture invokes the compiled graph, forwards `config.sql`/`config.params` to the real query handler, and reads one actual matching fixture row while preserving both rows. |

Native GSD `verify artifacts` passed 5/5 artifacts for 09-01 and 4/4 for 09-02. `verify key-links` reported only 1/3 and 0/2 because descriptive target strings and aliases do not match its textual target heuristic. Manual import/call tracing and real integration above resolve those false negatives; they are not evidence of missing runtime links.

Level-4 UI data tracing is not applicable to these source slices. The corresponding backend trace is real input → compiled graph → RPC handler → SQLite row, and real principal → assignment/membership rows → capabilities. PGlite uses a deliberately minimal schema and a constrained local Supabase SELECT transport. Global test setup uses a **noop cache**, so these tests do not certify deployed cache invalidation, PostgREST/JWT/RLS, provisioning, pooler behavior, or revocation timing inside an already-admitted request.

## Independent behavioral checks

Every bounded suite completed within its 10-second timeout. These reruns used installed project tools, no provider calls or production endpoints.

| Working directory and command | Observed result |
|---|---|
| Hub: `timeout 10s bun run vitest run src/server/services/assistant-query.service.test.ts src/routes/api/gateway/query/server.test.ts src/server/auth/assistant-principal.test.ts src/server/auth/assistant-principal.pg.test.ts src/routes/api/servers/server.test.ts 'src/routes/api/servers/[id]/server.test.ts' src/routes/api/gateway/actions/actions.server.test.ts src/routes/api/gateway/brain-search/server.test.ts` | 8 files / 89 tests passed; Vitest duration 5.13s. Includes 20 real-PG tests. |
| Gateway: `timeout 10s node node_modules/vitest/vitest.mjs run --config vitest.extensions.config.ts extensions/flows/src/data-nodes.test.ts` | 1 file / 18 tests passed; 8.05s including module import. |
| LangGraph: `timeout 10s node node_modules/vitest/vitest.mjs run src/flow/compile-flow.test.ts` | 1 file / 100 tests passed; 2.17s. |
| Meta root: `timeout 10s node --import ./langgraph-server/node_modules/tsx/dist/loader.mjs scripts/quality/flow-sql-integration.mts` | `flowToSQLite:PASS`, gatewayCalls 1, matchedRows 1, retainedRows 2, modelCalls 0. |

Typecheck and browser tests were already owned/running under the orchestrator and were deliberately not duplicated. Historical red-test claims in summaries were not independently rerun on earlier source versions. No full production readiness inference follows from these green local tests.

## Additional findings and safe reproduction

### SV-01 — Membership-free server creation inherits a global tenant

**Severity:** High authorization gap at the source boundary. Existing fallback behavior; newly established endpoint path beyond the original audit's unsafe-primitive observation.

`resolve-identity.ts:211-262` can produce a verified browser user with no `tenantCtx` when neither Supabase nor legacy membership resolves. `hooks.server.ts:230-259` includes `/api/servers` in its fallback allowlist; it chooses the first global organization and immediately calls `resolve(event)`. POST then calls `requireAuth` (user existence only), `getOrCreateTenantCtx`, and `upsertServer`. `API_WRITE_PREFIXES` also contains no servers prefix. `server.service.ts:70-84` persists `ctx.tenantId` and later links the caller to the row. The helper independently repeats the global fallback if invoked without populated locals.

**Safe executed probe:** TypeScript transpilation loaded the actual POST, actual `requireAuth`, actual tenant helper, and the exact `finishApp` AST declaration. The synthetic event began with a user and no tenant. Only Supabase/DB, URL validation and persistence boundaries were mocked; the mocked global organization was unrelated to that user. The actual hook and handler returned **200** and called persistence with that fallback organization. No network or real database write occurred. This demonstrates reachability from the identity resolver's documented no-membership output. It is not a live login exploit or a proof of current production account state.

**Required follow-up boundary:** Define whether adding a host is user-scoped or organization-scoped. For an organization write, require explicit membership/capability and never a globally selected organization. Remove the unsafe reusable fallback after classifying legitimate public/cron/onboarding consumers. A durable regression must start at verified-user/no-membership identity output and pass through the actual hook and handler; negative result must precede persistence. Preserve separately authorized onboarding rather than disabling it accidentally. Root owns the child PLAN and source TODO/proposal ledger.

### SV-02 — Existing symlinks defeat flow path confinement

**Severity:** High impact with a prerequisite: access to the data-node RPC and a planted or pre-existing symlink under an allowed root. New explicit finding relative to the original SQL A1/A2 issues. The read-only SQLite patch itself was not bypassed for SQL writes.

`data-nodes.ts:121-130` uses `path.resolve` and string-prefix checks before opening SQLite. `resolveFileWithinBase` at lines 140-146 uses the same lexical model. SQLite and `fs.writeFileSync` follow symlinks.

**Safe executed probe:** A disposable temp directory contained sibling `allowed/` and `outside/` directories. `outside/synthetic.db` contained a single harmless row. `allowed/linked.db` was a symlink to it, and `allowed/linked-dir` pointed to `outside/`. With `MINION_STATE_DIR=allowed`, the actual `handleDbQuery` returned that external row when given `allowed/linked.db`. Actual `handleFileWrite({fileWriteDir:allowed})` with path `linked-dir/result.txt` wrote the synthetic payload into `outside/result.txt`. Assertions passed; the complete temporary directory was removed in `finally`. No existing project/customer file was accessed or changed.

**Required follow-up boundary:** Establish trusted configured ledger/root exceptions explicitly; reject escaping filesystem objects and ancestor symlinks according to an approved policy. Handle not-yet-created files by checking existing ancestors. A one-time `realpath` check alone does not prove immunity to concurrent symlink replacement; define race-resistance or the trusted-writer assumption. Add database-read, database-write, file-overwrite/append and missing-file fixtures. Keep arbitrary path checks separate from caller-capability A9 work.

### SV-03 — Server URL update skips creation policy

**Severity:** Medium validation inconsistency; confirmed SSRF is **not** established.

POST calls `assertSafeUrl`; PUT at `[id]/+server.ts:29-38` verifies a user/server link then directly passes the body to `updateServer`, which accepts `updates.url` at `server.service.ts:36`. An actual-handler probe with a synthetic authorized linked user passed `http://127.0.0.1:9999/` to mocked persistence and returned **200**. It performed no outgoing request. Current primary host listing reads PostgreSQL gateway rows while this mutation writes legacy servers; a reachable outgoing sink from this updated legacy URL has not been established by this review.

**Required follow-up boundary:** Apply consistent create/update URL validation, with token-only and unchanged-URL positive controls, denied-link controls, and the same fixed diagnostic contract. Trace actual URL consumers before describing an exploitable SSRF chain or changing sanctioned private-network operator policy.

**Exact handoff-comment placements for the owning implementer:** SV-01 at `hooks.server.ts` immediately before its global `organizations` fallback query and `tenant-ctx.ts` before line 22; point both to the admitted 09-03 proposal/plan. SV-02 at `resolveDbForNode` before its lexical confinement check and `resolveFileWithinBase` before its current "catches every escape" assertion; point both to the admitted 09-04 proposal/plan and state the pre-existing-symlink prerequisite. SV-03 immediately before PUT forwards the parsed body to `updateServer`; point to 09-03 and describe missing policy parity without claiming a proven network exploit. Root/implementation owners add these comments and proposals; this verifier owns only this report.

### SV-04 — Writer SQL creates external database files without a symlink

**Follow-up verified during 09-04 planning:** On Node 22.23.2, a disposable directory contained `inside/main.db` with a synthetic table. Actual `handleDbExec({ledgerPath: inside/main.db})` received `config.sql = 'VACUUM INTO ?'` and `config.params = [outside.db]`, where the output was a sibling of `inside/`. The handler created the outside database and returned `{"changes":0}`. No symlink, live endpoint or provider call was involved. The verifier closed its disposable cached handles and removed its temp directory afterward.

This is a confirmed SQL file-management escape, separate from the read-node CTE defect already fixed. It has the existing db.exec RPC-access prerequisite. Generic gateway authorization admits `operator.admin` and rejects otherwise-unclassified extension methods; no unauthenticated remote access is claimed. Runner credentials and caller-authority propagation are separate A9 concerns. A path-only fix would leave this escape open. SEC-08 and draft `09-04-PLAN.md` therefore include a single prepared CRUD-only writer surface, forbidden connection/file-management operations, retained-attachment checks, and an explicit trusted-filesystem-writer model. Add the matching source TODO immediately before `handleDbExec` prepares caller SQL until this closure is verified.

## Anti-pattern and deferred review

| Site | Classification | Consequence |
|---|---|---|
| `assistant-query.service.ts:36`, `assistant-principal.ts:105` | Intentional containment plus documented restoration TODO | Raw analytics and gateway brain delegation remain unavailable. Phase 15 restoration is required. |
| `compile-flow.ts:731` | Rollout gate | Saved SQL using `{input}` now fails compilation; inventory/editor/migration acceptance must precede deployment. |
| `compile-flow.ts:746` | Existing policy gap, deferred Phase 11 governance | Runner-to-gateway caller authority remains incomplete. Explicit consume marking is not granted a separate safe reader identity. |
| `crm-query-tool.ts:8-44,63-98` | Stale capability advertisement | Tool still promises raw read-only RLS analytics and calls the disabled endpoint. The response carries non-retryable denial, but tool advertisement must be aligned under the restoration/rollout gate. |
| `data-nodes.ts:143-146` | Incorrect security comment | Claim that the prefix check catches every escape is disproved by the synthetic symlink probe. |
| Resolver early returns, empty/default node handling | Not stubs | Denial/control paths or intentionally empty node inputs; not disconnected implementation. |

**Standards review:** The implemented changes preserve package boundaries and existing RPC names, use real engine negative tests, maintain fixed diagnostic text, and record the intended capability loss. New findings require root-owned exact-site TODO/proposal follow-up; this verifier was explicitly restricted to this report.

**Spec review:** The five initial containment criteria pass locally. The wider goal cannot be declared achieved while confirmed adjacent authority/path gaps and candidate rollout gates remain. No phase auto-advance, commit or release is authorized by this report.

## Human and deployment verification still required

1. Review the source candidate and the three new findings; admit bounded child plans before dependent work.
2. Validate the exact released Hub/gateway/compiler identities and synthetic acceptance against the intended environment. No current deployment was tested here.
3. Review saved-flow migration, editor bindings and raw-tool advertisement; test representative authorized user questions after capability restoration.
4. Qualify real identity/cache/PostgREST/RLS and gateway provisioning behavior. Current PGlite fixtures certify SQL and resolver semantics at a synthetic boundary only.

## Source identity at inspection

| File | SHA-256 |
|---|---|
| `minion_hub/src/server/auth/assistant-principal.ts` | `4de53242f43606688389926d782ff00d928936edd8f22d6863dc346650c21def` |
| `minion_hub/src/server/services/assistant-query.service.ts` | `a3b69a0314b6283e447dfe5c869a6a4cb8123e9c54a08fa3728e4edf4f2120b5` |
| `minion_hub/src/routes/api/servers/+server.ts` | `0b0985f0386faaa018de861ee6c9227fd6633e0fb7ecdbb7abff33bb411cb809` |
| `minion_hub/src/routes/api/servers/[id]/+server.ts` | `d7230f1823127c8cc4538e2993278ff007968414b44ae9362c81c68b1e199c91` |
| `minion/extensions/flows/src/data-nodes.ts` | `cf1182a415209d8680f23218b981ed6229ccdac05232546149a8585b0a9fc86d` |
| `langgraph-server/src/flow/compile-flow.ts` | `33d3dabc62467cc2af023012b5ad1afbd0f1884100a05047ef6420d2ae1d87a5` |
| `scripts/quality/flow-sql-integration.mts` | `9ae870cd5f02a037314fa3c33fea97709acc4f0d1dc6466cb079135939dcf0f8` |

Hashes describe this shared-workspace inspection, not a committed/released tree. Subsequent orchestrator changes need corresponding re-verification.
