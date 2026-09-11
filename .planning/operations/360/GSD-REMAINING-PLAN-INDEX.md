# Remaining executable360 plan inventory

Created2026-09-09 by the GSD planning lane. This is a plan inventory, not an implementation or release certificate. Root owns canonical ROADMAP/STATE/REQUIREMENTS; this lane changed no source, commits, branches or worktrees.

## Coverage and completion rules

- **89 admitted plans across12 phases; all51 requirements are mapped from exact plan frontmatter.** Each child plan has bounded tasks, declared files, verification, dependencies and explicit boundaries. Security threats are recorded in plan-specific threat models.
- Existing09-01/09-02/11-01/13-01 files were preserved. Phase 09 now includes four admitted follow-up slices; 20-01 supplies cross-project integration, while phase 09 still requires its own complete verification.
- Phases11 and13 cannot close from their first summary.11-06 explicitly covers exported streaming APIs missing from11-01.13-03 covers native/browser acceptance beyond SSR or source tests.
- Discovery/decision plans are executable gates. Where current evidence cannot identify a safe exact source mutation, the gate must produce/review **additional bounded child PLANs** before that mutation. Such a gate never fulfills the final requirement by itself. Add new plans to this inventory and canonical roadmap before phase completion.
- No inferred credentials, legal retention, SLO, RPO/RTO, paid-model budget, containment activation or release permission. Actual missing auth/policy/authority becomes a dynamic checkpoint once the concrete dependent step is ready. Independent work continues.
- All plans require current candidate/dirty-state checks and exclusive ownership. IDs/waves are phase-local; ROADMAP cross-phase dependencies still govern acceptance. In particular phases14/15/17/19/20 must not be dispatched as if local wave1 meant no prerequisite.


## Exact-path execution boundary

Only the linked plan paths in this inventory belong to this milestone. The pre-existing `.planning/phases/15-structured-output-notification-intelligence/` contains three unrelated plans with colliding numeric IDs; preserve it untouched and exclude it from this program. Historical numeric-glob counts are not current scope. The exact allowlist currently contains84 admitted plans. Numeric GSD phase selection currently resolves15 to `15-data-pipelines`, but ordering is not an execution guarantee. Root must validate the resolved directory and plan against the exact-path allowlist before any dispatch; a mismatch, duplicate ID or unlisted child plan fails admission. No legacy move/delete/renumber is authorized by this inventory.

Cross-phase fixture/receiver ordering:

- 13-02 owns and qualifies initial synthetic authenticated `fixtures.ts`/`personas.ts` before Home/Calendar tests; 13-03 expands the same fixture and adds the broader release matrix.
- If 11-03 discovers missing receiver acknowledgment, root admits an exact disjoint phase14 receiver child plan early under D360-06, dependent on11-02 plus the recorded journal contract. Receiver behavior must pass before11-03 delivery closure; the child cannot wait for the phase11 closure it enables.
- 12-01 inventories every supported repository/container dependency surface while mutating only Hub; affected non-Hub families require separately owned, reviewed and executed child plans before DEP-01 closure.

## Executable plan inventory

| Plan | Boundary | Wave | Dependencies | Requirements | Current gate |
| --- | --- | --- | --- | --- | --- |
| [09-01](../../phases/09-security-containment/09-01-PLAN.md) | Hub raw-SQL containment, actor binding and log redaction | 1 | Phase/ownership gates | SEC-01, SEC-02, SEC-03 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [09-02](../../phases/09-security-containment/09-02-PLAN.md) | Gateway read-only SQL engine and bound flow parameters | 1 | Phase/ownership gates | SEC-04, SEC-05 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [09-03](../../phases/09-security-containment/09-03-PLAN.md) | Deny inferred tenant authority and align server URL policy | 2 | 09-01 | SEC-07, SEC-02, SEC-03 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [09-04](../../phases/09-security-containment/09-04-PLAN.md) | Constrain filesystem paths and SQL file-management under explicit writer trust | 2 | 09-02 | SEC-08, SEC-04 | ADOPTED: minion-ai #266 merged to DEV (with 09-05); `:dev` deployed-verified; macOS fixture realpath fix #269. |
| [09-05](../../phases/09-security-containment/09-05-PLAN.md) | Restore shared-ledger CRUD and explicit consume marking only where the actual ledger initializer can establish its own handle history and the supported current schema/profile. Close the shared-writer restoration gap from 09-04 without weakening its path, SQL or independent-reader controls. This is conditional source restoration, not complete SEC-08 acceptance or a hostile-plugin sandbox | 3 | 09-04 | SEC-08, SEC-04 | ADOPTED: minion-ai #266 merged to DEV (with 09-04); `:dev` deployed-verified. |
| [09-06](../../phases/09-security-containment/09-06-PLAN.md) | Constrain the gateway-side Shells receiver before adding durable outcome delivery. This is the receiver counterpart of11-02, not its sender implementation or a durable acknowledgment protocol.</objective> | 3 | 11-02 | SEC-02, SDK-01, AGT-03 | ADOPTED: minion-ai #267 merged to DEV; `:dev` deployed-verified 2026-09-10. |
| [10-01](../../phases/10-durable-jobs-stock/10-01-PLAN.md) | Fence background leases and heartbeat admitted work | 1 | Phase/ownership gates | JOB-01 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-02](../../phases/10-durable-jobs-stock/10-02-PLAN.md) | Serialize invoice stock issue and recover interrupted submission | 1 | Phase/ownership gates | STK-01, STK-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-03](../../phases/10-durable-jobs-stock/10-03-PLAN.md) | Qualify handler effect ownership with disposable PostgreSQL | 2 | 10-01, 10-02 | JOB-02, JOB-01, STK-01, STK-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-04](../../phases/10-durable-jobs-stock/10-04-PLAN.md) | Fence statement import chunks and explicit undo/retry requests while preserving financial parsing and accounting policy | 4 | 10-03, 10-07 | JOB-01, JOB-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-05](../../phases/10-durable-jobs-stock/10-05-PLAN.md) | Make brain_ingest use durable request revisions, bounded embedding receipts and atomic tenant-scoped document publication | 4 | 10-03, 10-07 | JOB-01, JOB-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-06](../../phases/10-durable-jobs-stock/10-06-PLAN.md) | Adopt current ownership and durable effect receipts in conversation, legacy WhatsApp and business corpus jobs, including their downstream writes | 4 | 10-03, 10-07 | JOB-01, JOB-02 | Review exact task admission before execution. |
| [10-07](../../phases/10-durable-jobs-stock/10-07-PLAN.md) | Provide one tenant-scoped request-revision and durable embedding receipt foundation for the remaining job handlers | 3 | 10-03 | JOB-01, JOB-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-08](../../phases/10-durable-jobs-stock/10-08-PLAN.md) | Separate offline unit discovery from native database qualification. Current include src/**/*.test.ts also discovers four legacy SQL tests that load normal application environment and the newly mandatory disposable fixture.</objective> | 3 | 10-03 | JOB-02, AGT-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-09](../../phases/10-durable-jobs-stock/10-09-PLAN.md) | Bind the complete brain ingestion plan once per semantic request revision, so duplicate jobs cannot choose incompatible dynamic-source snapshots or embedding modes. Pin the request actually dispatched and enforce readiness at admission | 5 | 10-07 | JOB-01, JOB-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [10-10](../../phases/10-durable-jobs-stock/10-10-PLAN.md) | Provide the shared effect foundation needed for corpus jobs to retain existing cross-document batching and page atomicity while safely reusing vectors across overlapping pages. Qualify ownership and semantic authority separately from immutable provider-response retention | 6 | 10-07, 10-09 | JOB-01, JOB-02 | 48 native/43 unit cases, strict types and combined Hub check independently pass; caller/worker adoption remains open. |
| [11-01](../../phases/11-agent-lifecycle/11-01-PLAN.md) | Nonstream Drone definition and deadline slice | 1 | Phase/ownership gates | AGT-01, AGT-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [11-02](../../phases/11-agent-lifecycle/11-02-PLAN.md) | Enforce Shells session admission and request correlation | 1 | Phase/ownership gates | AGT-03 | ADOPTED: meta #375 merged to dev, on main via #377. |
| [11-03](../../phases/11-agent-lifecycle/11-03-PLAN.md) | Sender-only durable integration: execute under receiver identity, journal-then-commit terminals via `shells.commit_outcome`, replay after reconnect; backup/restore moves to 11-09 (to draft) | 3 | 11-02, 11-07, 14-12, 14-16 | AGT-04 | Executed 2026-09-10 (sender-only, synthetic loopback receiver): 113/113 bridge tests, red-green proven; staged meta PR pending signing; end-to-end with adopted gateway open. |
| [11-04](../../phases/11-agent-lifecycle/11-04-PLAN.md) | Establish pinned ACP conformance before adapter replacement | 3 | 11-02 | AGT-05 | Research complete; SDK, caller and real harness qualification remain. |
| [11-05](../../phases/11-agent-lifecycle/11-05-PLAN.md) | Verify governance through effects and immutable manifests | 4 | 11-01, 11-04, 11-06 | AGT-06 | Evaluation executes locally; any newly evidenced source mutation requires generated bounded gap plan. |
| [11-06](../../phases/11-agent-lifecycle/11-06-PLAN.md) | Apply definition and deadline guarantees to both streaming APIs | 2 | 11-01 | AGT-01, AGT-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [11-07](../../phases/11-agent-lifecycle/11-07-PLAN.md) | Native durable run/outbox foundation | 2 | 11-02 | AGT-04 | ADOPTED: meta #375 merged to dev, on main via #377 (shells-bridge 0.2.0 pending publish). |
| [11-08](../../phases/11-agent-lifecycle/11-08-PLAN.md) | Consistent bridge environment injection | 1 | 11-04 research | AGT-05 | ADOPTED: meta #375 merged to dev, on main via #377. |
| [12-01](../../phases/12-dependency-provenance/12-01-PLAN.md) | Patch reachable Hub runtime dependency families | 1 | Phase/ownership gates | DEP-01 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [12-02](../../phases/12-dependency-provenance/12-02-PLAN.md) | Remove proven dead declarations and replace deprecated locale adapter | 2 | 12-01 | DEP-02 | Executed 2026-09-10 Task 1: 6 hub + 2 site dead declarations removed with clean builds; Paraglide adapter migration NOT done (files outside ownership → proposal); locale-bleed race characterized; staged PRs pending signing. |
| [12-03](../../phases/12-dependency-provenance/12-03-PLAN.md) | Prove internal archive identity and shipped licenses | 3 | 12-02 | DEP-03 | Executed 2026-09-10: package-provenance + consumer-matrix scripts (15/15, 6/6); shared@0.9.0 and design-tokens@0.1.0 published bytes differ from local; crm-sdk prepack fixed; 12-LICENSE-DECISION.md (owner choice); staged meta PR pending signing. |
| [12-04](../../phases/12-dependency-provenance/12-04-PLAN.md) | Resolve the postgres3.4.9 asynchronous null-socket crash discovered by10-03 without silently maintaining a driver fork or accepting hung queries.</objective> | 2 | 12-01, 10-03 | DEP-01, JOB-02, CAP-02 | Review exact task admission before execution. |
| [12-05](../../phases/12-dependency-provenance/12-05-PLAN.md) | Identify why Hub Vercel packaging exhausts memory before changing build configuration or admitting the frozen 12-01 dependency candidate.</objective> | 1 | Phase/ownership gates | DEP-01, DEP-02 | Review exact task admission before execution. |
| [12-06](../../phases/12-dependency-provenance/12-06-PLAN.md) | Obtain faithful bounded build-graph evidence inside a proven isolated filesystem, so ordinary absent-path probes do not consult host metadata and the unresolved packaging OOM can be investigated without suppressing dependencies.</objective> | 1 | 12-05 | DEP-01, DEP-02 | Review exact task admission before execution. |
| [12-07](../../phases/12-dependency-provenance/12-07-PLAN.md) | Identify where CPU samples concentrate during the messages-only nft analysis that did not finish within 60 seconds, while retaining reliable partial evidence on timeout and preserving the qualified contained-trace behavior.</objective> | 1 | 12-06 | DEP-01, DEP-02 | Review exact task admission before execution. |
| [12-08](../../phases/12-dependency-provenance/12-08-PLAN.md) | Clean shared SDK release emission while preserving public exports and test typechecking | 1 | Exact private snapshot/setup | DEP-03 | ADOPTED + RELEASED: meta #374/#377/#378 on main (npm publish blocked on NPM_TOKEN); license gate open. |
| [13-01](../../phases/13-ui-qualification/13-01-PLAN.md) | Dialog and tooltip source slice | 1 | Phase/ownership gates | UI-01, UI-02, UI-03 | ADOPTED + DEPLOYED: hub #245 merged, Vercel production READY for 1df0a921. |
| [13-02](../../phases/13-ui-qualification/13-02-PLAN.md) | Qualify mobile Home and Calendar composition | 2 | 13-01 | UI-04, UI-03 | Executed 2026-09-10: Home rail/dock and calendar lane-width repairs, Playwright 13/13 at 390/360/768 (12/13 fail on master); staged hub PR pending signing; found #244 UTC-offset defect (separate fix PR); UI-04 not closed (Chromium-only, no authenticated shell). |
| [13-03](../../phases/13-ui-qualification/13-03-PLAN.md) | Install seeded cross-browser journey release gates | 3 | 13-02 | UI-05, UI-01, UI-03 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [13-04](../../phases/13-ui-qualification/13-04-PLAN.md) | Qualify reduced motion and nonvisual chart/canvas access | 4 | 13-03, 13-01 | UI-06, UI-03 | Executed 2026-09-10: shared Chart honors reduced motion + role=img/aria-label + table alternative, CrmSentimentTrend wired; Playwright 8/8; 13-CANVAS-COVERAGE.md inventories 11 consumers; staged hub PR pending signing; unit vitest env-blocked (Vite 8 optimizer). |
| [14-01](../../phases/14-sdk-transport/14-01-PLAN.md) | Specify and validate transport authority contracts | 1 | Phase/ownership gates | SDK-01 | Local schema/client work executable after phase11/12 contracts; receiver gaps must have exact child plans before acceptance. |
| [14-02](../../phases/14-sdk-transport/14-02-PLAN.md) | Prove Hub Site and Paperclip consumer interoperability | 2 | 14-01 | SDK-02, SDK-01 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [14-03](../../phases/14-sdk-transport/14-03-PLAN.md) | Enforce server-only CRM SDK consumption | 2 | 14-01 | SDK-03 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [14-04](../../phases/14-sdk-transport/14-04-PLAN.md) | Qualify and repair the existing plugin iframe postMessage boundary. Recover the compatibility requirements of the superseded June distribution proposal without restarting its packaging or blue-green deployment program | 1 | Phase/ownership gates | SDK-01, SDK-02 | ADOPTED gateway side: minion-ai #268 merged to DEV (brace-only lint commit on top of verified bytes); hub side PR in progress. |
| [14-05](../../phases/14-sdk-transport/14-05-PLAN.md) | Bound Workforce JSON response processing, carry caller cancellation and classify safe HTTP errors without disturbing legitimate streaming or binary proxy routes. Preserve existing typed-error work rather than implementing it twice | 1 | Phase/ownership gates | SDK-01, SDK-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [14-06](../../phases/14-sdk-transport/14-06-PLAN.md) | Connect the reviewed compatibility utility to the actual plugin component lifecycle. Eliminate the permissive pre-capability mount and stale one-shot capability snapshot without expanding this child into gateway loader or transport reconstruction | 2 | 14-04, 14-09, 14-15 | SDK-01, SDK-02 | 56 mounted cases, full Hub check and native Chromium both handshake orderings independently pass; active adoption open. |
| [14-07](../../phases/14-sdk-transport/14-07-PLAN.md) | Replace the three handwritten artifact protocol implementations with a generated inline bundle of the qualified PluginBridge plus a thin context/render adapter, and make prompt propagation explicit. Preserve self-contained artifact delivery and the restricted opaque sandbox context RPC without claiming that prose instructions enforce arbitrary generated code | 2 | 14-04 | SDK-01, SDK-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [14-08](../../phases/14-sdk-transport/14-08-PLAN.md) | Publish authenticated attempts and fence stale reconnect work | 1 | Phase/ownership gates | SDK-01, SDK-02 | ADOPTED: meta #376 merged to dev, on main via #377. |
| [14-09](../../phases/14-sdk-transport/14-09-PLAN.md) | Hub authenticated-session publication and cutover fencing | 2 | 14-08 | SDK-01, SDK-02 | 58 focused cases and final paired Hub check independently pass; active adoption open. |
| [14-10](../../phases/14-sdk-transport/14-10-PLAN.md) | Site reconnect and stale-operation fencing | 2 | 14-08 | SDK-01, SDK-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [14-11](../../phases/14-sdk-transport/14-11-PLAN.md) | Qualify complete shared package candidate runtime and declarations | 2 | 14-08, 14-13 | SDK-01, SDK-02, DEP-03 | Three complete archives independently qualified, including required-profile f6a3c237; local unpublished only. |
| [14-12](../../phases/14-sdk-transport/14-12-PLAN.md) | Injected native durable receiver: three-table SQLite store, manager durable invoke/query/commit/quiesce, machine `shells.commit_outcome` endpoint | 4 | 11-07, 09-06, 14-16, 14-11, 14-14 | SDK-01, SDK-02, AGT-04 | 69 native/loopback cases, strict types, lint and format independently pass in the private candidate; caller routing, sender 11-03, lifecycle wiring and adoption remain open. |
| [14-17](../../phases/14-sdk-transport/14-17-PLAN.md) | Caller publication of `shells.invoke_durable`/outcome query with connect-time organization only, strict receiver configuration, ordered store open and owned quiesce/close | 5 | 14-12, 14-14, 09-06 | SDK-01, SDK-02, AGT-04 | Executed 2026-09-10 as private candidate on the receiver snapshot: 127/127 root rerun, owned types 0, capabilities regenerated; adoption waits on shared 0.12.0 publish. |
| [14-13](../../phases/14-sdk-transport/14-13-PLAN.md) | Canonical bilateral durable negotiation | 2 | 11-07 | SDK-01, AGT-04 | 46 independent contract cases and strict types pass; runtime wiring remains. |
| [14-14](../../phases/14-sdk-transport/14-14-PLAN.md) | Canonical gateway facade and bounded text invocation grammar | 3 | 14-13, 14-11 | SDK-01, SDK-02, AGT-04 | 91-case input/facade baseline plus 110-case profile amendment (fresh f6a3c237 artifact) independently pass; facade synced into the 14-12 receiver snapshot; routing and installed adoption excluded. |
| [14-15](../../phases/14-sdk-transport/14-15-PLAN.md) | Typed pending versus incompatible plugin facts | 2 | 14-04 | SDK-01, SDK-02 | 53 utility cases and strict types independently pass; component consumption/full Hub check also pass. |
| [14-16](../../phases/14-sdk-transport/14-16-PLAN.md) | Explicit durable invocation and immutable v1 input/outcome profiles | 2 | 14-13 | SDK-01, AGT-04 | ADOPTED + RELEASED: meta #374/#377/#378 on main as shared 0.12.0 (npm publish blocked on NPM_TOKEN). |
| [15-01](../../phases/15-data-pipelines/15-01-PLAN.md) | Choose typed analytics datasets and authorization policy | 1 | Phase/ownership gates | SEC-06 | Contract/evidence executable; dataset activation waits only on truly unresolved business field policy, then generated implementation plans. |
| [15-02](../../phases/15-data-pipelines/15-02-PLAN.md) | Preserve finance parser provenance and bounded ingestion | 1 | Phase/ownership gates | DATA-01 | Executed 2026-09-10 Task 1 (hub PR #246 CI-green): parser provenance + bounds; Task 2 replay/cursor blocked until 10-07/10-04 land on master. |
| [15-03](../../phases/15-data-pipelines/15-03-PLAN.md) | Qualify brain ingestion cursor and copy ownership | 2 | 15-02 | DATA-01, DATA-03 | Synthetic cursor checks and metadata inventory executable; retention/deletion mutation awaits established policy. |
| [15-04](../../phases/15-data-pipelines/15-04-PLAN.md) | Establish one migration authority per physical schema | 1 | Phase/ownership gates | DATA-02 | Executed 2026-09-10: migration-authority + drift gate (26/26 with 18-03); real findings (drizzle 0012–0015 divergence, 3 supabase name clashes, 3 tables without CREATE); staged meta PR pending signing. |
| [15-05](../../phases/15-data-pipelines/15-05-PLAN.md) | Prepare and qualify a bounded canonical vector-worker claim-fencing candidate. Separate source revision from transient claim ownership, prevent stale database settlement, and stop new work after process cancellation or lease loss. Preserve the existing serving/search/reconcile APIs and make unresolved remote effects explicit. This plan does not activate the candidate or replace the Hub corpus pipeline | 1 | Phase/ownership gates | DATA-02, JOB-02 | Task1 comments verified; behavior/migration/native execution gated. |
| [16-01](../../phases/16-observability/16-01-PLAN.md) | Attach sanitized execution identity to server and agent events | 1 | Phase/ownership gates | OBS-01 | Executed 2026-09-10 (hub PR #246 CI-green): sanitized observability context + single capture path; producer matrix lists Sentry/gateway/factory gaps. |
| [16-02](../../phases/16-observability/16-02-PLAN.md) | Prove source-map and telemetry receipt from execution environment | 2 | 16-01 | OBS-02 | Local fixture executable; remote upload/receipt requires existing legitimate Sentry access and identified target environment. |
| [16-03](../../phases/16-observability/16-03-PLAN.md) | Qualify attributable incident views and alert routes | 3 | 16-02 | OBS-03 | Read-only views/local contracts executable; external messages require explicit recipient/test authorization. |
| [17-01](../../phases/17-container-runtime/17-01-PLAN.md) | Record exact runtime posture and prepare bounded operational gate | 1 | Phase/ownership gates | OPS-01 | Read-only ready; operational gate packet does not itself authorize runner recreation. |
| [17-02](../../phases/17-container-runtime/17-02-PLAN.md) | Qualify one supported disposable deployment profile | 2 | 17-01 | OPS-02 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [17-03](../../phases/17-container-runtime/17-03-PLAN.md) | Exercise external containment and effect restart gates | 3 | 17-02 | OPS-03 | Manifest/local tests ready; real remote disposable drill gated on environment access; production activation remains separate authority. |
| [17-04](../../phases/17-container-runtime/17-04-PLAN.md) | Prove rebuild provenance fixture restore and rollback | 3 | 17-02 | OPS-04 | Executable after stated dependency and exclusive file-ownership gates; independently check before dispatch. |
| [18-01](../../phases/18-docs-governance/18-01-PLAN.md) | Correct active instructions against current source | 1 | Phase/ownership gates | DOC-01 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [18-02](../../phases/18-docs-governance/18-02-PLAN.md) | Map specs and proposals to current requirements | 2 | 18-01 | DOC-02 | Scoped verification exists; consult dated receipts and remaining integration gates. |
| [18-03](../../phases/18-docs-governance/18-03-PLAN.md) | Enforce two-sided handoff and evidence closure | 3 | 18-02 | DOC-03 | Executed 2026-09-10: handoff-ledger gate; 109 markers, 20 unlinked recorded; staged meta PR pending signing. |
| [19-01](../../phases/19-capacity-recovery/19-01-PLAN.md) | Define synthetic workload and measure disposable capacity | 1 | Phase/ownership gates | CAP-01 | Fixture design ready; measurement needs disposable profile; service qualification needs established target policy. |
| [19-02](../../phases/19-capacity-recovery/19-02-PLAN.md) | Repair measured queue and pool bounds with fairness proof | 2 | 19-01 | CAP-02 | Measure before mutation; source repair plans are generated from actual limiting seams, not guessed capacity. |
| [19-03](../../phases/19-capacity-recovery/19-03-PLAN.md) | Qualify restore and erasure against decided policy | 3 | 19-02 | CAP-03, DATA-03 | Fixture and policy validation ready; deletion/qualification waits for actual retention and recovery decisions. |
| [20-01](../../phases/20-integration-reaudit/20-01-PLAN.md) | Verify full requirement coverage on exact candidates | 1 | Phase/ownership gates | QC-01 | Manifest validation executable early; release qualification requires all mandatory source/runtime/policy gates. |
| [20-02](../../phases/20-integration-reaudit/20-02-PLAN.md) | Prepare authorized release and exact-identity smoke | 2 | 20-01 | QC-02 | Packet/local verifier ready; all publish/migration/restart/promotion actions require concrete existing live authority. |
| [20-03](../../phases/20-integration-reaudit/20-03-PLAN.md) | Repeat all original 360 questions with before-after evidence | 3 | 20-02 | QC-03 | Repeat audit can run source-only as interim evidence; final completion requires authorized release and all mandatory gates. |

## Requirement coverage

All remain pending until independent goal-backward verification. A linked plan can be a bounded evidence gate, not yet a source repair.

| Requirement | Plans | Completion boundary |
|---|---|---|
| AGT-01 | [11-01](../../phases/11-agent-lifecycle/11-01-PLAN.md), [11-06](../../phases/11-agent-lifecycle/11-06-PLAN.md) | All exported nonstream and streaming APIs;11-01 alone is insufficient. |
| AGT-02 | [10-08](../../phases/10-durable-jobs-stock/10-08-PLAN.md), [11-01](../../phases/11-agent-lifecycle/11-01-PLAN.md), [11-06](../../phases/11-agent-lifecycle/11-06-PLAN.md) | All exported nonstream and streaming APIs;11-01 alone is insufficient. |
| AGT-03 | [09-06](../../phases/09-security-containment/09-06-PLAN.md), [11-02](../../phases/11-agent-lifecycle/11-02-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| AGT-04 | [11-03](../../phases/11-agent-lifecycle/11-03-PLAN.md), [11-07](../../phases/11-agent-lifecycle/11-07-PLAN.md), [14-13](../../phases/14-sdk-transport/14-13-PLAN.md), [14-14](../../phases/14-sdk-transport/14-14-PLAN.md), [14-16](../../phases/14-sdk-transport/14-16-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| AGT-05 | [11-04](../../phases/11-agent-lifecycle/11-04-PLAN.md), [11-08](../../phases/11-agent-lifecycle/11-08-PLAN.md) | Pinned real harness receipt; protocol mocks alone insufficient. |
| AGT-06 | [11-05](../../phases/11-agent-lifecycle/11-05-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |
| CAP-01 | [19-01](../../phases/19-capacity-recovery/19-01-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| CAP-02 | [12-04](../../phases/12-dependency-provenance/12-04-PLAN.md), [19-02](../../phases/19-capacity-recovery/19-02-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |
| CAP-03 | [19-03](../../phases/19-capacity-recovery/19-03-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| DATA-01 | [15-02](../../phases/15-data-pipelines/15-02-PLAN.md), [15-03](../../phases/15-data-pipelines/15-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DATA-02 | [15-04](../../phases/15-data-pipelines/15-04-PLAN.md), [15-05](../../phases/15-data-pipelines/15-05-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |
| DATA-03 | [15-03](../../phases/15-data-pipelines/15-03-PLAN.md), [19-03](../../phases/19-capacity-recovery/19-03-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |
| DEP-01 | [12-01](../../phases/12-dependency-provenance/12-01-PLAN.md), [12-04](../../phases/12-dependency-provenance/12-04-PLAN.md), [12-05](../../phases/12-dependency-provenance/12-05-PLAN.md), [12-06](../../phases/12-dependency-provenance/12-06-PLAN.md), [12-07](../../phases/12-dependency-provenance/12-07-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DEP-02 | [12-02](../../phases/12-dependency-provenance/12-02-PLAN.md), [12-05](../../phases/12-dependency-provenance/12-05-PLAN.md), [12-06](../../phases/12-dependency-provenance/12-06-PLAN.md), [12-07](../../phases/12-dependency-provenance/12-07-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DEP-03 | [12-03](../../phases/12-dependency-provenance/12-03-PLAN.md), [14-11](../../phases/14-sdk-transport/14-11-PLAN.md), [12-08](../../phases/12-dependency-provenance/12-08-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DOC-01 | [18-01](../../phases/18-docs-governance/18-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DOC-02 | [18-02](../../phases/18-docs-governance/18-02-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| DOC-03 | [18-03](../../phases/18-docs-governance/18-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| JOB-01 | [10-01](../../phases/10-durable-jobs-stock/10-01-PLAN.md), [10-03](../../phases/10-durable-jobs-stock/10-03-PLAN.md), [10-04](../../phases/10-durable-jobs-stock/10-04-PLAN.md), [10-05](../../phases/10-durable-jobs-stock/10-05-PLAN.md), [10-06](../../phases/10-durable-jobs-stock/10-06-PLAN.md), [10-07](../../phases/10-durable-jobs-stock/10-07-PLAN.md), [10-09](../../phases/10-durable-jobs-stock/10-09-PLAN.md), [10-10](../../phases/10-durable-jobs-stock/10-10-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| JOB-02 | [10-03](../../phases/10-durable-jobs-stock/10-03-PLAN.md), [10-04](../../phases/10-durable-jobs-stock/10-04-PLAN.md), [10-05](../../phases/10-durable-jobs-stock/10-05-PLAN.md), [10-06](../../phases/10-durable-jobs-stock/10-06-PLAN.md), [10-07](../../phases/10-durable-jobs-stock/10-07-PLAN.md), [10-08](../../phases/10-durable-jobs-stock/10-08-PLAN.md), [10-09](../../phases/10-durable-jobs-stock/10-09-PLAN.md), [10-10](../../phases/10-durable-jobs-stock/10-10-PLAN.md), [12-04](../../phases/12-dependency-provenance/12-04-PLAN.md), [15-05](../../phases/15-data-pipelines/15-05-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| OBS-01 | [16-01](../../phases/16-observability/16-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| OBS-02 | [16-02](../../phases/16-observability/16-02-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| OBS-03 | [16-03](../../phases/16-observability/16-03-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| OPS-01 | [17-01](../../phases/17-container-runtime/17-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| OPS-02 | [17-02](../../phases/17-container-runtime/17-02-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| OPS-03 | [17-03](../../phases/17-container-runtime/17-03-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| OPS-04 | [17-04](../../phases/17-container-runtime/17-04-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| QC-01 | [20-01](../../phases/20-integration-reaudit/20-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| QC-02 | [20-02](../../phases/20-integration-reaudit/20-02-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| QC-03 | [20-03](../../phases/20-integration-reaudit/20-03-PLAN.md) | Actual environment/policy/authority receipt required where specified; local fixture cannot substitute. |
| SDK-01 | [09-06](../../phases/09-security-containment/09-06-PLAN.md), [14-01](../../phases/14-sdk-transport/14-01-PLAN.md), [14-02](../../phases/14-sdk-transport/14-02-PLAN.md), [14-04](../../phases/14-sdk-transport/14-04-PLAN.md), [14-05](../../phases/14-sdk-transport/14-05-PLAN.md), [14-06](../../phases/14-sdk-transport/14-06-PLAN.md), [14-07](../../phases/14-sdk-transport/14-07-PLAN.md), [14-08](../../phases/14-sdk-transport/14-08-PLAN.md), [14-09](../../phases/14-sdk-transport/14-09-PLAN.md), [14-10](../../phases/14-sdk-transport/14-10-PLAN.md), [14-11](../../phases/14-sdk-transport/14-11-PLAN.md), [14-13](../../phases/14-sdk-transport/14-13-PLAN.md), [14-14](../../phases/14-sdk-transport/14-14-PLAN.md), [14-15](../../phases/14-sdk-transport/14-15-PLAN.md), [14-16](../../phases/14-sdk-transport/14-16-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SDK-02 | [14-02](../../phases/14-sdk-transport/14-02-PLAN.md), [14-04](../../phases/14-sdk-transport/14-04-PLAN.md), [14-05](../../phases/14-sdk-transport/14-05-PLAN.md), [14-06](../../phases/14-sdk-transport/14-06-PLAN.md), [14-07](../../phases/14-sdk-transport/14-07-PLAN.md), [14-08](../../phases/14-sdk-transport/14-08-PLAN.md), [14-09](../../phases/14-sdk-transport/14-09-PLAN.md), [14-10](../../phases/14-sdk-transport/14-10-PLAN.md), [14-11](../../phases/14-sdk-transport/14-11-PLAN.md), [14-14](../../phases/14-sdk-transport/14-14-PLAN.md), [14-15](../../phases/14-sdk-transport/14-15-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SDK-03 | [14-03](../../phases/14-sdk-transport/14-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-01 | [09-01](../../phases/09-security-containment/09-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-02 | [09-01](../../phases/09-security-containment/09-01-PLAN.md), [09-03](../../phases/09-security-containment/09-03-PLAN.md), [09-06](../../phases/09-security-containment/09-06-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-03 | [09-01](../../phases/09-security-containment/09-01-PLAN.md), [09-03](../../phases/09-security-containment/09-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-04 | [09-02](../../phases/09-security-containment/09-02-PLAN.md), [09-04](../../phases/09-security-containment/09-04-PLAN.md), [09-05](../../phases/09-security-containment/09-05-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-05 | [09-02](../../phases/09-security-containment/09-02-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| SEC-06 | [15-01](../../phases/15-data-pipelines/15-01-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |
| STK-01 | [10-02](../../phases/10-durable-jobs-stock/10-02-PLAN.md), [10-03](../../phases/10-durable-jobs-stock/10-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| STK-02 | [10-02](../../phases/10-durable-jobs-stock/10-02-PLAN.md), [10-03](../../phases/10-durable-jobs-stock/10-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-01 | [13-01](../../phases/13-ui-qualification/13-01-PLAN.md), [13-03](../../phases/13-ui-qualification/13-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-02 | [13-01](../../phases/13-ui-qualification/13-01-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-03 | [13-01](../../phases/13-ui-qualification/13-01-PLAN.md), [13-02](../../phases/13-ui-qualification/13-02-PLAN.md), [13-03](../../phases/13-ui-qualification/13-03-PLAN.md), [13-04](../../phases/13-ui-qualification/13-04-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-04 | [13-02](../../phases/13-ui-qualification/13-02-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-05 | [13-03](../../phases/13-ui-qualification/13-03-PLAN.md) | Actual behavior and exact candidate identity; a summary alone does not prove deployment. |
| UI-06 | [13-04](../../phases/13-ui-qualification/13-04-PLAN.md) | Evidence gate plus every generated exact repair/adoption plan must pass. |

## Decisions preserved

| Locked decision | Implementing plans / task boundary | Coverage |
|---|---|---|
| D360-01 Preserve WIP and source ownership | Every plan boundaries;20-01 scoped patch manifest | Full |
| D360-02 Raw SQL containment before typed restoration | Preserved09-01;15-01 closed datasets and denial gate | Full; SEC-06 implementation follows accepted exact dataset plans |
| D360-03 Runtime evidence and separate operational authority |17-01 exact image/pause packet;17-03 external drills;20-02 authorized release | Full; no activation implied |
| D360-04 Keys are not live-test authority |11-01;11-04 real-harness gate;11-06 fake-host streaming tests | Full |
| D360-05 Actual assignment/schema metadata |09-01 preserved;10-02 database uniqueness preflight;15-04 applied drift | Full |
| D360-06 Disjoint slices versus phase dependencies | Every plan boundaries and this inventory;20-01 integrated acceptance | Full |

## Ownership and sequencing constraints

1. **Hub runtime/handlers:**10-01 →10-03;10-02 owns stock separately;15 handler adaptations wait for10 contracts. Stock and jobs migrations use different proposed names but share one root-granted schema writer; recheck timestamp collision before creation.
2. **Root lock and packages:**11-04 ACP dependency transaction,12 package provenance and14 shared SDK/adoption cannot write pnpm-lock.yaml/manifests concurrently. Root allocates one lock owner and revalidates the installed baseline before every install.
3. **Hub/Site locks and Vite:**12-01 →12-02;14 adoption then16-02 Sentry Vite/CI wiring require released ownership. Do not replace dirty locks with remote snapshots.
4. **Shells:**11-02 →11-03 →11-04;14 must implement any receiver acknowledgment/version contract before durable delivery acceptance. Sender-only journal is incomplete.
5. **Drone:**11-06 waits for11-01 helper/contracts and owns stream.ts/streaming-schema.ts/tests plus explicitly handed-off README/types.11-05 depends on both streaming closure and ACP conformance.
6. **UI:**13-02 reconciles concurrent Home/Calendar work;13-03 owns fixture/CI changes;13-04 chart consumer changes depend on prior tooltip slice and browser fixtures. Root's current native Dialog foundation repair remains part of initial validation, not duplicated here.
7. **Hooks/telemetry:**09 source containment before16-01 hooks edits;16-02 Vite/CI after dependency and browser-CI owners release files. Agent producers missing attribution get exact child plans, not a claim that Hub logging covers agents.
8. **Docs/indexes:**18 owns proposed canonical doc/index edits only when root grants ownership; root alone applies roadmap/requirement status. Never make index-only closure when source document status remains inconsistent.
9. **Live runtime:**17 read-only metadata can run early. Disposable build/load/restore requires isolated target identity. Production maintenance/activation/publish/migration is only20-02 or the separately reviewed concrete operator packet with explicit authority.

## Required evidence / decision gates

| Gate | Concrete work that proceeds now | Dependent action that remains gated |
|---|---|---|
| ACP harness/version/auth/budget |11-04 official-doc research, transcript fixtures and pinned command | Real paid harness prompt only with actual credential and explicit test authority; no phase closure from mock transcript |
| Analytics field visibility |15-01 question/dataset matrix, policy-denial fixtures | Enabling unresolved dataset/field; create exact implementation plans after decision |
| Migration authorities and existing collisions |10-02 dry-run preflight;15-04 metadata/hash compare | Applied migration or duplicate reconciliation; no deleting rows or changing hashes |
| Retention and recovery obligations |15-03 copy/owner map;17-04 observed disposable restore;19-03 policy validator | Deletion durations, backup resurrection behavior and target RPO/RTO acceptance |
| Sentry access |16-02 local mapping fixture and project/access metadata | Remote receipt/source-map/alert proof; unavailable access stays pending |
| Alert recipients/thresholds |16-03 read-only current rules and denominator contracts | Sending external test notifications or inventing paging thresholds |
| Capacity targets |19-01 identified synthetic workload and bounded baseline | Stating service SLO pass or production capacity promise |
| Factory containment |17-01 exact runtime/gating packet;17-03 disposable drill manifest | Live flags/recreation and containment activation; preserve explicit maintenance-race disclosure |
| Release |20-01 exact owned candidate checks;20-02 ready immutable packet | Publishing/migration/restart/promotion without recorded action-specific authority |

## Source evidence read in this planning pass

Current source inspection supplemented the original audit and current research; re-read exact candidates at execution because these checkouts are dirty and concurrent.

| Seam | Verified source paths |
|---|---|
| Background ownership |minion_hub/src/server/services/bg-runtime.ts; src/server/db/pg-schema/bg-jobs.ts; groupchat.service.ts registration inventory |
| Invoice effects |minion_hub/src/server/services/stock.service.ts createIssueFromInvoice; pg-schema/stock.ts; supabase/migrations directory |
| Shells |packages/shells-bridge/src/bridge.ts, acp-client.ts, package.json; packages/shared/src/gateway/shells.ts |
| Drone streaming gap |drone/src/stream.ts resolveApiKey/anySignal; streaming-schema.ts defineStreamingDrone, credential/iterator/final awaits |
| SDK consumers |packages/shared/src/gateway/client.ts, protocol.ts, version.ts; Hub gateway.svelte.ts; Site member-gateway.svelte.ts; Paperclip openclaw-gateway/src/server/execute.ts/gateway-client.ts |
| CRM server boundary |packages/crm-sdk/package.json and src/index.ts; minion_site/src/routes/api/leads/+server.ts |
| Parser/cursor |finance-statement-parser.ts exported rejection contract; brain-corpus-jobs.service.ts dirty/reconcile cursor |
| UI |Chart.svelte current options/rendering; Home/Calendar routes; actual ui-audit fixture/config files |
| Telemetry |Hub hooks.server.ts serverErrorHandler/Sentry initialization; src/lib/server/posthog.ts batching |
| Runtime/containers |ops/compose.yml and Caddy paths; Factory docker-compose/Dockerfile/promotion paths; current360-infrastructure-verification.md exact live identity |
| Docs/history |AGENTS/Hub/Site/Paperclip instructions; PROGRAM/REQUIREMENTS/ROADMAP/DECISIONS/STATE; current audit specialist reports and360 research |

## Validation and next step

New plans use the installed GSD runtime at /home/nikolas/.claude/get-shit-done. The ~/.Codex catalog path is absent. GSD frontmatter and structural checks passed for all37 new files: zero errors and zero warnings. The new inventory contains74 tasks, no same-phase/same-wave file overlap,47 requirement IDs and no missing index links. Root still needs independent semantic plan review; structure validation is not approval to execute uncertain architecture or live changes.

No requirement, phase or release has been marked complete by this inventory. Root should update canonical plan counts/lists from this file, dispatch only reviewed ownership-safe slices and repeat the applicable PROGRAM questions after each wave. Full repeat audit remains20-03.

## First-wave expansion

Independent source verification added SEC-07 (09-03 admitted) and SEC-08 (09-04 admitted). The original41-plan/47-requirement validation remains historical; exact admitted inventory is plan-allowlist.json. New requirements are not fulfilled by their addition.

| Requirement | Child plan | Gate |
|---|---|---|
| SEC-07 | [09-03](../../phases/09-security-containment/09-03-PLAN.md) | Actual hook/helper/route/enrollment behavior and independent source review |
| SEC-08 | [09-04](../../phases/09-security-containment/09-04-PLAN.md), [09-05](../../phases/09-security-containment/09-05-PLAN.md) | SQL file-management denial, link/ancestor confinement and explicit writer-trust boundary |

## Additional admitted restoration slice

| Plan | Requirements | Exact boundary | Acceptance |
|---|---|---|---|
|09-05|SEC-08, SEC-04|Seven gateway owner/profile/flow files; constructor-owned receipt with no caller mint; canonical outbox profile only|Actual SQLite positive shared CRUD/consume, invalidation/HMR/foreign handle and all existing escape negatives; independent review; runtime/data trust remains gated|

## Driver recovery child admission

| Plan | Requirements | Boundary | Gate |
|---|---|---|---|
|[12-04](../../phases/12-dependency-provenance/12-04-PLAN.md)|DEP-01, JOB-02, CAP-02|Six files; compatible fixed release or reproducible tracked driver patch with real backend-loss settlement tests|Four baseline failures recorded; automatic safety review interrupted further fault injection. Candidate untested/unaccepted; Task 2 remains incomplete. An avoided exception with a hung caller would fail acceptance.|

## Remaining handler adoption plans

| Plan | Scope | Dependency gate |
|---|---|---|
|10-07|Shared entity revisions, embedding receipts, RLS reuse and cancellation|10-03 source verified; exclusive foundation ownership; backend-loss health still12-04|
|10-04|Finance deterministic chunks and reset/retry revision fencing|10-07 independent verification|
|10-05|Brain document lifecycle and paid embedding publication|10-07 and actual pgvector fixture|
|10-06|Conversation, legacy WhatsApp and business corpus effects|10-07 and actual vector/generation fixtures|

All four have independent root admission in10-CHILD-PLAN-REVIEW.md. Numeric order does not override dependency order. JOB-01/02 remain open.

## Gateway receiver admission

09-06 is independently admitted for four gateway receiver/manager files. It validates malformed frames, connection-owned pending outcomes, reusable-credential registration ordering and bridge-origin event allowlists. It does not implement durable acknowledgment or certify deployment;11-03 and phase14 retain those boundaries.

12-05 is independently admitted for four build-diagnostic files. It consumes frozen failure artifacts while12-01 is pending; no product repair is authorized. Initial real traces are sequential, at most60seconds/2GiB heap, with exact input and cleanup receipts.

10-08 is independently admitted for four test-lane config/test/documentation files. Default discovery excludes SQL integration modules; the separate disposable lane initially admits only the current job-stock fixture and fails absent explicit opt-in/identity. New native fixtures require exact config admission.

## Contained packaging diagnostic child

[12-06](../../phases/12-dependency-provenance/12-06-PLAN.md) follows the independently reviewed 12-05 diagnostic. Exact four-file ownership wraps existing Bubblewrap for immutable artifact/runtime isolation and real nft asset-preservation tests. Root must accept those proofs before four bounded application traces. No product repair, package upgrade or deployment is included.

## Shared manifest extension

[10-09](../../phases/10-durable-jobs-stock/10-09-PLAN.md) adds bind-once full-source/provider identity and atomic readiness admission to JOB-01/JOB-02. Three tasks, nine exact files, depends on10-07. Root admitted the plan after two failing native duplicate-job probes. Brain10-05 and corpus10-06 qualification depend on the corrected foundation; counts remain scope only.

[12-07](../../phases/12-dependency-provenance/12-07-PLAN.md) adds bounded partial CPU profiling to the existing diagnostic harness. Three tasks; real application profiling remains gated on synthetic timeout/decode/fidelity acceptance. No packaging cause or repair is inferred.

## Recovered interoperability requirements

[14-04](../../phases/14-sdk-transport/14-04-PLAN.md) qualifies the existing plugin iframe bridge, with Task1 matrix admission before source edits. [14-05](../../phases/14-sdk-transport/14-05-PLAN.md) selects existing Workforce patches and JSON/cancellation/error policy before source changes. Both have three tasks and exact bounded ownership; Task1 only is initially active. See14-HISTORY-CHILD-PLAN-REVIEW.md and360-sdk-container-history.md.


## Plugin consumer children after the foundation

14-06 (component mount/capability identity) and 14-07 (handwritten artifact peers and prompt propagation) are admitted for Task 1 evidence only. They add no implicit source/browser authority. SDK-01/02 map to both. 14-04 now has independent 75-test evidence and a full Hub check with zero errors/warnings; installed/bundled/browser adoption remains open. 14-05 Task 2 independently passes 105 package tests/typecheck; Task 3 consumer adoption remains gated.

Earlier SDK checkpoint: the initial candidate-admission gates have since advanced; see the current checkpoint below and exact per-plan receipts.


Historical 70-plan checkpoint: Canonical14-13 independently passes46 cases/types; both complete shared archives are independently qualified. Hub58 focused cases pass; paired component repair and corpus source are active. Gateway14-14 private facade/input work is admitted. Worker15-05 comments are independently verified; behavior remains gated. Active app dependencies and production remain unchanged.

## UI-first child admission —2026-09-11

- [13-05](../../phases/13-ui-qualification/13-05-PLAN.md): nine exact Home/call-control and fixture files;44px compact targets, complete accessible names and reduced motion. Existing staged source preserved.
- [13-06](../../phases/13-ui-qualification/13-06-PLAN.md): eight exact files for actual-component journeys and real gateway-client transitions with synthetic transport, mandatory engine/case manifest and no required-case skips. Authenticated app coverage stays13-03.

Both three-task plans pass native GSD structure validation with zero errors/warnings. Shared-file ownership is serialized:13-05 owns the mobile helper/builder;13-06 reads an ordinary frozen snapshot and owns separate files. Root combines source only after hashes and behavior are reviewed. Current exact inventory76 plans;49 requirements remain open.

## UI re-audit children —2026-09-11

- [13-07](../../phases/13-ui-qualification/13-07-PLAN.md): eight exact Hub navigation/fixture files. Native Sheet focus/dismissal, shared permission-filtered desktop/mobile utility links and compact touch targets.
- [13-08](../../phases/13-ui-qualification/13-08-PLAN.md): eight exact Site graph/file component and fixture files. Stable chart lifecycle, safe tooltip data, stale-response fencing and explicit retries.

Both three-task scopes pass native GSD structure validation without errors/warnings; separate repositories/source seams avoid active13-04/05/06 ownership. Exact inventory now78; no global requirement closure.

## 2026-09-11 UI continuation admission

Current exact inventory:80 plans,51 requirements. [13-09](../../phases/13-ui-qualification/13-09-PLAN.md) owns provider-aware Site logout and failure recovery; [13-10](../../phases/13-ui-qualification/13-10-PLAN.md) owns the observed Calendar toolbar touch-target defect. Both require independent acceptance.13-08 owns twelve files including native Vitest workspace/config and declared development test dependencies. SEC-09 real durable revocation remains distinct from synthetic endpoint success. Earlier rows labelled RELEASED with npm publish blocked describe merged source only; the September11 resume review confirms packages remain unpublished. No phase or global requirement is closed.

[13-11](../../phases/13-ui-qualification/13-11-PLAN.md) queues twelve-file Site chat/tab/viewport qualification after13-08/09 freeze. Translation/workspace ownership must transfer before dispatch. Current exact inventory81 plans/51 requirements; scope growth is not completion.

## September11 next-wave corrective children

[16-04](../../phases/16-observability/16-04-PLAN.md) owns ten server telemetry/context/producer/test files; [15-06](../../phases/15-data-pipelines/15-06-PLAN.md) owns two parser files. Both follow independent source confirmation on clean PR246 candidate99715f5. The former also removes observed raw request-body/credential debug logging and prevents telemetry failure from changing business outcomes. The latter preserves monetary/source-row semantics while correcting header/capacity boundaries. Exact inventory83 plans/51 requirements; UI remains first and no requirement closes from child admission.

[13-12](../../phases/13-ui-qualification/13-12-PLAN.md) admits eight-file Site font delivery/fixture qualification. Existing Google-hosted fonts were omitted by standalone fixtures; their prior geometry used fallback fonts. Native Fontsource imports preserve the design families/weights, carry exact upstream notices and eliminate external font requests. Font/package/lock ownership stays separate from active13-11 messages/workspace/product files. Current exact inventory84 plans/51 requirements.

[14-18](../../phases/14-sdk-transport/14-18-PLAN.md) admits a ten-file private Site manifest/archive/service/browser transaction after the complete UI check passed. It combines the exact clean SDK archive and frozen 14-10 service with the final UI, then exercises actual local HTTP/WebSocket lifecycle. Existing installations, license/publication and real authentication remain separate. Current exact inventory: 85 plans / 51 requirements.

[13-13](../../phases/13-ui-qualification/13-13-PLAN.md) records the inherited seven-file Calendar timezone repair in exact delivery ownership. The new packet checker exposed missing PLAN mapping; it did not discover an unauthorized code change or a new behavior failure. Earlier implementation/test receipts retain their dates. Current exact inventory: 86 plans / 51 requirements.


## September 11 next implementation admissions

- [13-14](../../phases/13-ui-qualification/13-14-PLAN.md): eight-file portable Site native/UI/gateway CI lane, preserving previous jobs and full format debt; source implementation active.
- [15-07](../../phases/15-data-pipelines/15-07-PLAN.md): five-file parser v3/durable service binding, with D360-20 historical-version refusal and independent raw/normalized source digests; source implementation active, private native fixture requires root admission.

The earlier 86-plan UI packet remains pinned to its own exact catalogue. Current admission is 88; newer plans are not retroactively included in that source packet.

## Wrap-up checkpoint (2026-09-11)

All89 exact allowlisted plans pass installed GSD structural verification.11-10 sender correction and15-07 finance binding independently pass their native tests;13-14 portable Site acceptance is locally qualified. Their canonical summaries distinguish local implementation from release. The auditable task tally is172/229 (75.1%), including37/40 UI tasks (92.5%); no51-requirement closure is implied. Release integration is tracked separately in RELEASE-2026-09-11.md.
