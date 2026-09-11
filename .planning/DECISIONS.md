# v1.1 decisions

## 2026-09-09 — D360-01: Preserve working source ownership

Evidence: baseline.json records substantial pre-existing Hub/Drone/meta changes. Decision: scoped edits in assigned files, no branch/worktree/stash/automatic commits. This adapts GSD's default commit/cleanup steps to the user's shared-workspace rules. Release candidates must exclude unrelated WIP and revalidate upstream identity. Reversible through scoped patches, never a whole-tree reset.

## D360-02: Contain raw SQL before restoring analytics

Evidence: isolated tenant-context attack plus current matching source. Decision: stable non-retryable disabled raw-SQL surface; bind personal actors to persisted assignment and deny unassigned brain gateway access. Restore useful typed datasets under SEC-06, not a regex-based ad-hoc query gateway. Existing typed query authorization is independently reviewed, not presumed safe because raw SQL is disabled.

## D360-03: Runtime evidence changes release priority

Evidence: research/360-infrastructure-verification.md confirms Factory exact running SHA02900306, AUTOMERGE=1/AUTOPROMOTE=1/CONTAINMENT_V2=0, root process, Docker socket and no configured CPU/memory/PID limits. AUTOPROMOTE means proposal/spec lifecycle admission, not GitHub production deployment promotion. Decision: prepare exact-image safety gate before any new automatic run dispatch; approval requested for pausing dispatch and disabling automatic merge/admission with runner-only recreation. No runtime change is authorized by silence. Continue independent source work meanwhile. Containment activation remains gated by external drills.

## D360-04: Credential access is not live-test authorization

Evidence: default Drone glob discovered paid provider tests when a key existed. Decision: exclude live files from unit configuration and require DRONE_LIVE_TESTS=1 in the dedicated live configuration. No paid evaluation was run. Async deadline response is distinct from effect termination; hosts or isolated processes own hard cancellation.

## D360-05: Incoming catalogs strengthen two requirements

Read-only live schema metadata confirms personal_agents/profile/gateway assignment fields and no brain gateway assignment. Gateway legacy_server_id has a nonunique index, so ambiguous aliases must deny authorization. Live stk_entries has no invoice-source uniqueness index, strengthening STK-01; existing collision handling must be preflighted before a migration. No business rows or production exploit were used.

## D360-06: Distinguish phase dependencies from disjoint slice execution

The milestone roadmap declares final integration dependencies. Independent bounded slices (Drone metadata, UI focus, read-only runtime evidence) may execute before all phase09 verification finishes because they consume no changing security API. They cannot close their parent phases or release ahead of prerequisite evidence. Only root grants file ownership; manifests, schemas and shared contracts have one writer per wave.

## D360-07: Independent admission before the next wave

The first urgent slices09-01/09-02/11-01/13-01 were implemented under root-reviewed bounded plans before an independent GSD plan review. The retrospective checker correctly records this sequencing exception; it is not described as pre-execution approval. Future implementation waves require independent GSD plan admission, full requirement-to-plan coverage for their scope and named prerequisites. Phasewide VERIFICATION.md files remain gaps_found while required work is unfinished; SUMMARY counts must never override this evidence.

## D360-08: Repair declared local test installation without dependency churn

The final Hub check found two missing PGlite module errors. PGlite0.5.5 was already declared in both package.json and bun.lock. `bun install --frozen-lockfile --ignore-scripts` installed it and reinstated four exact locked internal tarballs; before/after manifest and lock SHA256 matched. No lifecycle scripts ran and no dependency versions were selected. Full Hub check subsequently reports0 errors/0 warnings. Candidate advisory updates remain a separate single-owner Phase12 operation.

## D360-09: Dispatch from an exact milestone allowlist

Independent GSD review found a preserved older phase15 with three unrelated plans. The current program has41 plans; a numeric glob sees44. `operations/360/plan-allowlist.json` is the dispatch inventory. Use exact PLAN paths and validate their current content before execution; never infer milestone membership from the numeric prefix, summary counts or whichever directory a convenience command finds first. Preserve the older work. Newly discovered child plans require review and explicit allowlist/index addition.

## D360-10: Close evidence-ordering gaps before dispatch

Plan review requires platform-wide dependency inventory under12-01, deterministic local journey fixture creation before13-02 uses it, and an early bounded receiver-acknowledgement slice if11-03 discovers it needs a protocol receiver change. That receiver slice may run before phase14 completion underD360-06, with exact receiver ownership and independent admission; it does not close SDK-01 or bypass14 integration qualification. This avoids a cycle where11 waits for14 while14 waits for11.

## D360-11: Fence domain effects without weakening tenant isolation

The remaining background handlers need domain-specific ownership admission. Finance can reuse its deterministic import cursor and dedupe inside a transaction that holds the job lease lock and preserves the existing app_ledger organization/profile scope. Reset/retry currently has no epoch, so finance also needs the shared entity-head revision to prevent an old worker crossing a reset boundary; nextChunk remains its progress checkpoint. Extract a helper for scoping an existing transaction and restoring captured role/GUC context before job finalization; do not replace withOrgCore with an unscoped callback, nest an independent transaction, or grant app_ledger broad job-table authority. Aborted SQL transactions must preserve the original error.

Paid embedding jobs require a shared durable effect receipt with entity/request-revision arbitration. A job cursor alone cannot arbitrate duplicate jobs or reingestion. The receipt binds the resolved provider/model and normalized payload; generation identifies authority, not a new business effect. Provider calls happen outside database locks. Missing provider outcome evidence is indeterminate and cannot authorize an automatic repeat.

The foundation needs an additive canonical schema/migration/RLS/grant plan, then separately owned brain and corpus adoption plans. Cancellation must reach the embedding transport and backoff loop; tests count actual outbound attempts. These architectural choices authorize drafting bounded plans, not unreviewed schema/source expansion or production migration. Root must independently admit exact files and dependency order before execution.

### D360-11 finance adoption clarification

Reject unversioned imports as ambiguous, including those with partial progress. Explicit retry may replace queued/parsing/failed/undone work with a new revision while preserving persisted rows and progress; done remains no-op and parsing undo remains 409. Status is checked under head/domain locks. This provides recovery without inventing a legacy request history. The existing authenticated retry endpoint needs only its contract comment updated; no UI control is asserted. Root admitted this bounded 10-04 amendment after the implementation lane identified that the old failed/undone-only retry otherwise stranded legacy jobs.

### D360-11 shared full-manifest arbitration

Two native brain regressions proved that per-job cursors and per-batch receipts do not arbitrate an entire loaded document. Admitted10-09 binds one canonical chunks/pipeline/embedded-disabled-empty provider manifest per request revision. An additive904 head field preserves prior receipt rows. Null plus prior receipts requires explicit reingest; no historical plan is inferred. Actual prepared provider identity is checked before admission, and missing admissions serialize with document readiness. Six foundation/fixture files and three brain files have separate owners. No production schema change or immutable historical manifest archive is implied.

## D360-12: Recover partial historical requirements without replaying obsolete designs

SDK/container history is reviewed against separate working and reference identities. Root selects exact existing reference patches before new SDK implementation. Plugin iframe compatibility and bounded Workforce JSON/error/cancellation handling belong to existing SDK-01/02 goals; admitted14-04/05 start with read-only source/policy packets. Whole-document supersession does not erase useful requirements or preserve rejected blue-green deployment advice. Gateway error hooks require a3-consumer×3-hook decision matrix; silent handlers in the working root are not fixed by a reference status label. No source overwrite, source activation, publication or deployment is inferred.


### D360-13 — preserve corpus batching and separate response retention from publication

Selected a draft shared semantic-unit membership extension before 10-06 adoption. Preserve 64-input cross-document batching and bounded concurrency; per-document request multiplication is rejected. Unique unit admission must survive overlapping pages, with exact provider/payload/full-source manifests. A currently owned dispatch may retain its complete immutable response after a member revision changes; stale owners cannot persist it, and superseded members cannot publish. Publication revalidates every current semantic head and source observation, with page output, consumption and progress atomic. Existing single-head APIs retain their guarantees. No implementation scope is admitted by this decision; 10-10 requires a reviewed schema/API plan. Existing Qdrant serving mode stays; worker durable receipts, claim-generation fencing and cancellation require separate work.


### D360-14 — SDK protocol and HTTP boundaries

Plugin ordinary peers require exact origin plus source; explicit opaque artifacts require source plus null origin. Omitted bridge version retains legacy v1, constrained unknown capabilities deny at the utility boundary, and component mounting requires a proven authenticated-session identity. Preserve operation-specific timeouts. Reuse the existing bridge implementation where standalone artifact packaging permits it.

Workforce candidate JSON requests use finite 30-second/4-MiB ceilings, OR cancellation and byte-bounded reads. These are engineering failure limits, not measured SLOs. The helper projects safe errors while preserving actual HTTP 404 and mapping invalid-success to local 502; abort remains a rejection without an invented HTTP status. Native RequestInit headers/body/method are preserved through a private per-call adapter. Existing loader cancellation swallowing and streaming proxy behavior remain separate work. Candidate and installed bytes must be checked separately, including transitive files and the explicit identity-jwt subpath.

Select a successful-authentication observer using the shared client's real generation and exact socket, preserving all three reference error hooks. Stale challenge continuations must not send through or settle a replacement connection. Shared foundation and Hub/Site publication require separately admitted source plans; no callback or installed rollout is implied by this decision.


### D360-15 — durable receiver authority and dependency order

Select organization-scoped durable text invocation and outcome query using the authenticated connection's nonempty orgId. Service credentials retain their actual service namespace; shared admin credentials without an organization do not acquire tenant authority. Preserve the existing effective admin-only invoke gate. New outcome reads accept operator.read/write/admin within the same organization; no per-user ACL is claimed. Preserve historical admission ownership after shell deletion.

Exact keyed retries first locate the immutable admission under authoritative org+shell and verify the same session/input. They return its identity without requiring a presently online bridge and without retransmitting. New admission requires current shell ownership, authenticated current bridge, bilateral version negotiation and available durable storage. Explicit durable mode never downgrades. No-key requests receive a new native random identity.

Use exact text semantics and a fixed SHA-256 UTF-8 projection; multimodal durable input requires a later explicit grammar. Split canonical negotiation from gateway parity: canonical contract → complete private emitted package → gateway shim/input contract → receiver store/manager → caller routing. Production opening/closing is a separate child. The gateway keeps its existing engine declaration; disabled legacy mode must import without loading SQLite, while durable mode refuses an unavailable supported builtin without fallback.

These are root architecture selections, not source admission. Receiver capacity values, exact package emission, native/runtime evidence and independent review remain necessary. 11-03 is explicitly held because its old ownership overlaps verified 11-07 and mixes restore with sender integration. 11-04 may research ACP independently; sender/restore may not make research depend on their own completion.

### D360-13 corpus recovery refinement

Select nonblocking, tenant-filtered foreign-owner prelocks before any head/domain locks, preserving bookkeeping-role authority without broader app_ledger grants. For never-admitted work only, atomically tombstone an unusable reserved batch and release/repack current semantic units. Admitted/received membership and receipts stay immutable. Only a successful committed reserved-to-admitted transition grants one dispatch permission; replay does not renew it.

The new page API will cap active calls at four, retaining 64-input cross-document packing. Existing corpus configuration remains unchanged until its separate adoption. Retryable contention/frontier changes must yield with the canonical cursor rather than become remote uncertainty. Project only needed historical vector indices and separately bound complete canonical input, prepared bytes and foreign lock closure. A bounded synthetic capacity experiment informs explicit limits; no numerical production capacity or source/DDL admission follows yet.


### D360-13 bounded page candidate selected after synthetic measurement

Root reviewed the capacity probe source and receipt (54 synthetic scenarios; no application imports or remote effects). Select these engineering ceilings for the new API: 64 current heads; 256 total canonical units and at most 256 required units; 2,097,152 full-source UTF-16 code units and 6 MiB UTF-8 bytes; 256 KiB canonical descriptor; 3 MiB prepared JSON per batch and 12 MiB per page; four active attempts, each at most 64 inputs. Count unchanged/disabled units and full source text before preparing further copies. Non-ASCII boundary cases remain required in implementation tests.

Select bounded foreign recovery discovery: 1,024 units/heads, 256 batches/owners and 1 MiB serialized metadata; reject an oversized closure in full rather than truncate it. Fetch limit+1 bounded fields and revalidate the exact frontier under locks. These are logical rejection limits, not qualified lock-performance or process-memory guarantees. Limit historical projection to 256 vectors of 1,536 finite dimensions and explicitly bound cumulative serialized projected results in the amended packet; the measurement's roughly 8 MiB is an observation, not an upper bound for every finite number representation.

No existing corpus pagination or configuration changes follow. A current 25/50-source page can exceed these expanded head/unit limits and must receive an explicit capacity result until consumer policy is independently selected. No partial publication, truncation or per-document request multiplication is allowed. Amend and independently review the seven-file 10-10 contract before source/DDL execution. The synthetic probe does not cover JSON parsing, driver encoding, real provider results, database contention or production concurrency.


### D360-14 compatibility classification refinement

Both missing constrained gateway facts and incompatible facts deny plugin mounting/dispatch. Preserve their distinction in the existing compatibility utility: typed pending versus incompatible, absent methods versus knownempty, unknown versus malformed version. Invalid declarations or known mismatch outrank pending facts. Preserve unconstrained legacy acceptance after authenticated-session gating. Component consumes structured results and native URL serialization; it must not duplicate grammar or parse diagnostic prose.14-15 and14-06 own the coordinated private source slices.


### D360-16 — explicit durable invocation and finite v1 policy

Select a distinct `shells.invoke_durable` method. An old gateway returns unknown method; callers must never retry through legacy invocation. Successful response is strictly `{version:1,durability:"required",runId,startedAt}` and attests admission only. Preserve legacy invocation in disabled mode, but reject supplied invocationKey explicitly rather than discard it. Required mode refuses legacy invocation. Capability absence, malformed advertisement, disabled storage and stopped storage never downgrade a required request.

Select strict optional `gateway.shells.durability`: omitted or `{mode:"disabled"}` preserves legacy operation without loading SQLite; `{mode:"required",storePath?,maxRuns?,maxRunsPerOrg?}` requires actual durable storage. Default required-mode path is `<stateDir>/shells/outcomes.sqlite`, distinct from registry/bridge journal. Persist effective policy; incompatible reopen refuses. Required startup failure must not be swallowed by the existing broad startup catch. No production enablement follows this decision.

Fixed v1 bounds: identifiers/org/caller key256 UTF-8 bytes; input text64KiB and normalized input envelope512KiB; each outcome text4KiB; outcome56KiB, receipt8KiB, complete aggregate query64KiB including wrapper; admission metadata16KiB. Reserve80KiB logical/run (aggregate64KiB plus metadata16KiB). Default retained counts4096global/1024per-org; completed rows still count; no pruning. These are conservative rejection limits, not measured disk or workload capacity. Input and outcome profiles must remain distinct. Actual worst-escaped canonical outcome/receipt/query normalize to57161/6323/63540bytes. Root independently repeated12 assertions against the full emitted public package; receipt `/tmp/minion-durable-capacity-m027f5ne/result.json`, SHA1ff3dfdeebd504e83a055dcd0180ef4dd1ae8cfc1ca2078bba9c67aba0f29636. Actual admission metadata serialization and outer WebSocket framing remain receiver/caller checks.

Retain D360-15 organization authority and exact keyed recovery before current-peer/capacity checks. At quiesce, refuse newly entering queries/admissions/commits, recheck externally waiting/queued operations before native access, and drain entered short local work. Never hold a drain counter across remote bridge execution. Historical wrong-org and absent-run queries share not_found; unavailable/disabled/stopping storage is unavailable.

Implement canonical wire/profile in14-16, then a new whole-package artifact and two-file facade amendment, then14-12 receiver. Caller/config/lifecycle are separate bounded children; sender11-03 follows receiver. Existing qualified14-14 text parser remains unchanged. No framework/library addition, release, install, live data or runtime mutation is authorized by this architecture decision alone.


## D360-17 — UI parity first (2026-09-11)

The user explicitly prioritizes mobile/desktop UI parity before the remaining360 program. Execute the prepared calendar correctness, Home/Calendar composition and chart accessibility candidates first, then critical cross-browser journeys and outstanding consumer gaps. Preserve scoped candidate identities and signed delivery work. A SUMMARY or synthetic route fixture does not close authenticated app parity; startup/auth/backend and real-device limits remain explicit. Resume security/parser, durable agents, provenance, data, observability, containers and capacity work after this UI wave, without declaring the overall program complete.

## D360-18 — Track newly evidenced member/navigation behavior

Date:2026-09-11. Authority: the user's full implementation and UI-first direction. Source review found navigation utility/focus gaps, Site graph/file publication bugs and provider-mismatched logout outside the original narrowly named Home/Calendar/sentiment requirements. Add UI-07 and SEC-09 rather than claim those behaviors were already closed. Exact scope is13-07/08/09; Site chat and real-session revocation remain open gates. No new deployment or live-session authority is inferred.


## D360-20 — Bind current parser versions without relabeling historical imports (2026-09-11)

Root selects fail-closed stale-version resumable work and retry for the bounded 15-07 integration. Existing historical rows, parser version, counters, cursor and transactions stay attributable. A fixed conflict does not claim recovery; no automatic version reset, backfill, re-ingest or zero-cursor shortcut is admitted. Keep exact uploaded byte SHA distinct from normalized decoded parser provenance, since BOM and CRLF transformations can differ. Preserve current same-version durable retry and exact stored terminal outcomes. A later explicit historical recovery contract is separate. This source behavior decision executes the user's authorized quality work and makes no live-data change.


## D360-19 — Fresh durable admission grants dispatch; replay does not (2026-09-11)

The sender must distinguish a newly committed journal insertion from an identical existing record atomically. Only the successful fresh insertion grants its caller one dispatch opportunity. Restart after admission, local timeout, lost response and unknown protocol result retain unresolved obligations rather than authorize another prompt. A failed outcome write cannot release the local owner. A valid persisted terminal may release before its delivery acknowledgment. These source invariants implement the existing no-replay/durable-outcome contract; they do not select a historical recovery policy or grant actual harness execution. 11-10 owns the four-file correction before official ACP replacement.
