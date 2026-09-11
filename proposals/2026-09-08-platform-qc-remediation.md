---
id: 2026-09-08-platform-qc-remediation
title: Platform QC follow-ups — authorization, durable execution, compatibility and release evidence
status: draft
created: 2026-09-08
updated: 2026-09-08
repos: [minion-meta, minion_hub, minion, minion_site, minion-factory, paperclip, pixel-agents]
---

# Platform quality-control remediation

## Product request

Evaluate the entire Minion project across security, agent governance, data pipelines, SDK interoperability, containerization, scalability, dependencies, documentation and mobile/desktop usability. Prioritize evidence-backed repairs and reduce redundant maintenance.

## Evidence and scope

Private local review: `.lavish/minion-qc-2026-09-08/report.html` and `report.md`, with specialist appendices, read-only DB catalog, PostHog aggregates and browser screenshots. These contain operational details and are intentionally gitignored; this proposal contains no credentials, tenant records or reproduction payloads. Do not publish the private evidence automatically.

Current source identities checked: meta `0cceed399490c7e9d1996783d5e586f4309bb688`; Hub master `d1c5d8022b2887f60fa0c3ef6e96f9f017902b57`; gateway DEV `1d40d9a77164ea3461884f1a4e56296e94305a4c`; Factory dev `02900306a1fcc7b182bae726a24260d08467f81e`; Site dev `a23ee4b21bc695c45ef0311f492d12fe01dc3f95`. Critical remote files were compared to the audited local files. Local working trees were not aligned to those revisions.

This draft authorizes no production action. Audit completed; implementation remains open. Source TODO(handoff) comments identify confirmed local code sites. The detailed report distinguishes current-upstream evidence, local-only observations, known debt, recommendations and unavailable verification.

## Priority slices and definition of done

1. **Assistant authorization (HDS-01/02/03/07).** Replace raw caller-authored analytics SQL with server-owned, tenant/module/owner/field-authorized operations. Bind gateway credentials to permitted actors/orgs through explicit delegation. Add synthetic PostgreSQL tests proving cross-tenant and cross-module denial and bounded result materialization. A role switch or statement-prefix check alone does not qualify the boundary. Sites: `minion_hub/src/server/services/assistant-query.service.ts`, `src/server/auth/assistant-principal.ts`, `src/server/services/rbac.service.ts`, and gateway query/action routes.
2. **Secret logging (HDS-04).** Replace full request-body logging in `minion_hub/src/routes/api/servers/+server.ts` with nonsecret allowlisted diagnostics. Prove sensitive fields never reach the logger. Historical exposure review and any credential rotation are separate authorized operational actions.
3. **Flow data and authority (A1/A2/A9).** Enforce read-only execution in `minion/extensions/flows/src/data-nodes.ts`; replace input-to-SQL interpolation in `langgraph-server/src/flow/compile-flow.ts` with bindings. Propagate caller authority and cancellation through the runner. Tests assert engine-level mutation denial, bound input, denied capabilities and no new effects after confirmed cancellation.
4. **Durable job/stock effects (HDS-05/06).** Fence/heartbeat generic job leases and make domain effects idempotent; reconcile the 60s lease with 120s handlers. Enforce invoice issue uniqueness or actual row serialization and recover create/submit interruptions. Require two-worker PostgreSQL race tests and stale-owner/cancel/retry tests. Sites: Hub `bg-runtime.ts`, `groupchat.service.ts`, `stock.service.ts`.
5. **Shells contract (A3/A4/A5).** Enforce per-session admission/idempotency, correlation ownership, durable terminal delivery, confirmed cancellation and quiesced staged restore. Adopt official ACP client lifecycle after provider compatibility validation. Remove no-test masking and certify one pinned real harness. Sites: `packages/shells-bridge/src/{bridge,acp-client,backup}.ts`, gateway shells manager. Gateway-only lifecycle-stub work does not cover these bridge defects.
   **Drone primitive:** snapshot nested definition references, bound or explicitly delegate non-cooperative host deadlines, and exclude paid live tests from the default suite independently of credential presence. Require mutation-after-definition, stalled-host and default-test-discovery fixtures. Sites: `drone/src/define.ts`, `drone/src/run.ts`, `drone/vitest.config.ts`. Retain the existing typed primitive and establish a committed version baseline before release certification.
6. **Browser qualification (UI-01/02/03/04/05/UI-MOBILE).** Repair mobile Home rail/composer and calendar density; converge bespoke overlays on shared dialog focus behavior; repair sentiment-tooltip HTML; test canvas reduced motion. Require seeded mobile/desktop/keyboard/coarse-pointer CI smoke and critical WebKit/Firefox journeys. Verify readable content and occlusion in addition to document overflow.
7. **Dependency/release provenance (UI-06).** Patch current-lock framework/editor/XML advisories with family-specific fixtures. Replace deprecated Paraglide adapter, remove unnecessary DOMPurify stub types, and validate proposed dependency removals with graph/peer review and clean builds. Keep Site postgres for CRM SDK. Publish distinct package versions/digests, package license text, consumer matrix and image dependency provenance. No blanket latest-version bump.
8. **Observability (OBS-01).** Add environment/release/route-template/trace identities and sanitized meaningful error fields to server events. Prove serverless delivery, Sentry source maps and alert routing where configured. Current mixed project counts cannot be a production error rate. Site: `minion_hub/src/hooks.server.ts` and telemetry wrappers.
9. **Existing governance/deployment debt.** Complete the current Factory external restart/effect activation drills and verify exact deployed image/flags before certifying containment. Repair or retire unsupported umbrella Compose and legacy Shells images. Generate accurate storage/auth/package docs from current source. Preserve historical migration ledgers.
10. **Capacity and recovery qualification.** Benchmark pool budgets, bounded worker concurrency and Factory historical-lineage queries. Define cross-store deletion/recovery acceptance (Postgres, vector/search, blobs, memory, retained backups). Qualify a stated load envelope and restore/deletion evidence; do not invent supported tenant counts.

## Existing work to reuse

- `2026-08-18-factory-worker-containment-spec`, `2026-08-23-factory-containment-effect-ledger-integration` and containment base-reconciliation work: already own activation/restart evidence.
- `2026-08-18-factory-durable-state-outbox-spec`: reuse effect-ledger/outbox principles; do not silently extend its scope to every Hub worker.
- `2026-07-13-hub-ui-coherence-implementation-spec`, `2026-08-22-hub-load-nav-performance-spec`: reuse fixtures, capture manifest and performance instrumentation.
- `2026-08-26-spec-heading-lint-baseline-backfill-spec`: current measured baseline is 114 entries, not the older title's 126.
- `2026-07-25-nats-jetstream-event-plane-implementation-spec` is **retired** despite stale approved prose. Keep transactional outbox/bounded worker requirements; re-propose any broker cutover from current architecture.
- Current meta already addresses old local CRM delivery idempotency/identity defects and sealed env-cache work. Verify package/release adoption instead of opening duplicate code fixes.

## Verification and exclusions

Targeted tests passed: Factory 66, LangGraph 115, Drone 170 (live excluded), Hub assistant 7, design tokens 6. These are scoped test results, not whole-platform coverage. Shells has no test suite; controlled transport probe demonstrated correlation loss. Synthetic-data engine checks demonstrated authorization/read-only contract failures. No production exploit was attempted.

Current Hub lock scan returned 32 unique advisories, with reachability separated from scanner severity. Read-only DB catalogs and PostHog aggregates were collected. Selected live browser routes were inspected; Base protected views, Sentry data, VPS/runtime posture, full browser/device/AT matrix, load and restore drills were unavailable/unperformed.

Out of scope for this audit: behavior changes, dependency installation/removal, schema/data repair, runtime flags, credential rotation, production tests, deploys, commits/merges, branch or worktree changes. Root follow-up edits are comments, this proposal/index row and private audit artifacts only. Split implementation into reviewed feature slices with a source-identity check before starting.

## 2026-09-09 implementation and independent review follow-up

Initial source slices are under `.planning/phases/09-security-containment`, `11-agent-lifecycle`, `13-ui-qualification`; full program and release boundaries are in `.planning/operations/360/PROGRAM.md`. No production remediation is implied.

Drone's `runDrone` now snapshots metadata and bounds async waits, but independent review found exported `runDroneStream` and `defineStreamingDrone`/`runStreamingSchemaDrone` still have aliased definitions or unbounded credential/iterator/final waits. A synthetic no-provider probe started the schema callback after its configured deadline and returned done. Complete AGT-01/02 across these APIs before closing them; add stalled-stream, pre-abort and no-new-effect fixtures. Source markers: `drone/src/stream.ts`, `drone/src/streaming-schema.ts`. Host callback closure isolation remains a documented responsibility, not a JS freeze guarantee.

Native overlay qualification additionally reproduced a stale queued close event closing a newly reopened dialog. Root repaired shared Dialog event ownership and is preserving a production-bundled local fixture with keyboard/save/reopen evidence. Full mobile/browser qualification remains phase13 work.

## Independent source review: additional security boundaries

SV-01/SEC-07: a verified browser identity without resolved membership can pass through the global-organization fallback into server creation. A synthetic actual-hook/actual-handler probe returned200 and persisted the unrelated fixture tenant. Remove the global fallback in hooks and tenant-ctx; preserve the explicit join/invite/onboarding path. Plan09-03 owns durable negative/positive regressions and URL update parity. PUT currently accepts a URL denied by creation policy; no outgoing SSRF chain is claimed.

SV-02/SEC-08: actual flow handlers followed a database symlink and a directory symlink outside configured roots in disposable fixtures. Separately, db.exec VACUUM INTO created an outside file without any symlink. Plan09-04 must constrain the SQL writer surface and filesystem objects together. A realpath precheck is not proof against a hostile same-UID writer; supported filesystem ownership/trust and stronger isolation requirements must be explicit. Source sites: minion/extensions/flows/src/data-nodes.ts resolveDbForNode, resolveFileWithinBase and handleDbExec.

The server service's legacy ID migration and per-user link model also need review before universal isolation claims. Its upsert conflict target is tenantId+url, not id: caller-supplied id alone has not been shown to overwrite another row. Do not relabel a source suspicion as a confirmed IDOR. Track the actual mutation/persistence/consumer authority in phase14/15 and retain the existing migration handoff.

## Active instruction and CLI identity follow-up

Phase18-01 refreshed active storage/auth/registry claims and removed an executable first-tenant fallback example. Read-only CLI verification found PATH resolves the gateway's `minion`, while the meta CLI uses the same binary name. The documented built entrypoint `node packages/cli/dist/index.js` provides explicit registry selection without mutating global installs. Before a broader CLI naming change, inventory external scripts and operator usage. Meta `packages/cli/src/index.ts` also hardcodes display version0.1.0 while package metadata differs; derive it from package identity in a bounded package/release slice. The docs manifest does not substitute package metadata for the observed CLI display.

## Generic job ownership progress

10-01 source now uses generation, tenant and live-lease predicates for owner writes, plus non-overlapping heartbeat and cancellation revocation. Fourteen actual Drizzle/PGlite cases and twenty finance neighbors passed. This does not fence domain side effects:10-03 must carry handler cancellation/effect identity and execute multi-connection PostgreSQL/crash tests. Deploy the additive schema before the code and drain old binaries; mixed versions can still ignore generation predicates. No live migration or queue mutation occurred.

## Filesystem containment restoration gate

09-04 independently passes 60 focused tests and the compiled-flow/SQLite integration. Borrowed shared writes and consume remain intentionally denied because the mutable global ledger has no initializer-owned provenance receipt. A bounded child must bind receipt lifetime, canonical file identity, known initializer/profile and close invalidation in message-ledger and the constructor boundary, then test flow adoption. Caller-provided trust flags and matching function names are insufficient. Qualify the exact runtime image, operator-controlled roots/concurrent writers, persisted schema/data and SQLite temporary-storage profile before rollout; restart alone does not cleanse persisted state. No hostile same-UID filesystem or arbitrary in-process plugin isolation is claimed. Exact source handoffs remain in extensions/flows/src/data-nodes.ts.

## Stock identity review gate

10-02 adds source uniqueness/preflight, retry recovery, submission payload locking and draft edit/delete locks. Initial 61 passing tests did not cover every UUID spelling accepted by PostgreSQL. Independent review found canonical invoice input drift after draft creation; correction and real-engine alternate-spelling fixtures now independently pass66 tests. Item/warehouse inputs require canonical UUID shape and normalize case before UOM lookup; invalid forms are rejected before writes. Target collision preflight, additive migration, old-binary drain and separate-connection/crash qualification remain outstanding. Historical stock metadata and ledger rows are not rewritten.

## Shells active admission boundary

11-02 repairs instance max1, active request replay and identity-checked cleanup. 11-03 must persist completed request/effect outcomes and define retries across reconnect/restart. 11-03/04 must qualify late session updates after timeout/cancel before session reuse. Current ACP frames expose no run ID; active mapping is not proof of remote effect termination. Active-only dedup is deliberately bounded and does not claim durable completed-request deduplication.

Independent11-02 review also reproduced an uncaught JSON-null frame error in Bridge.onFrame. The object guard and malformed-frame recovery cases now pass18 independently rerun tests. Full frame schema, size, negotiated capability and authority checks remain14-01/11-04.

## Proposal-history snapshot and disposition gate

18-02 current-source inventory covers660 Markdown artifacts from the working meta checkout and the separate current reference snapshot, with56 divergent same-ID bodies. Both indexes match their own bodies; cross-snapshot agreement and implementation closure are not implied. The NATS working copy says approved while reference frontmatter says retired; even that retired reference retains stale approved body prose. Use the exact status packet in18-STATUS-PATCH-PACKET.md and the candidate's own lifecycle parser before a bounded body/index update. Manual body/source dispositions, orphan supersessions, heading ratchet and removed/archive-only Git history remain open. The mapper's source TODO keeps DOC-02 visible; topic candidates cannot close requirements.

## PostgreSQL driver crash boundary

10-03 real backend-termination test reproduced postgres3.4.9 nextWrite dereferencing a null socket during rollback. This can crash the caller process even while database invariants hold.3.4.9 remains the latest registry version; primary upstream issue1066/PR1168 describe the boundary. Preserve an isolated child-process reproduction and recovery assertion, then admit an exact dependency patch/replacement slice with connection-close, rollback, query-settlement and retry tests. Do not suppress uncaught exceptions or silently edit node_modules. Domain crash-recovery success does not close this runtime defect. Source handoff is owned by10-03's native integration fixture.

## Remaining job handlers

10-03 adopts the ownership/effect envelope for groupchat. Registration inventory found five other job types on four source seams that still ignore it: statement_ingest in finance-statements.service.ts; brain_ingest in brains.service.ts; brain_corpus_conversations and brain_corpus_whatsapp in brain-corpus-jobs.service.ts; brain_corpus_business in brain-business-corpus-jobs.service.ts. Each registration now has an exact source handoff. Add bounded source/test child plans preserving parser/source/cursor and external-effect semantics, with no blind replay of indeterminate outcomes. Groupchat acceptance cannot close JOB-02 for these handlers. Root added comments only to those four files; behavior is unchanged.

## SQLite power-loss durability qualification

Independent docs amendment corrected the tuning comment in minion/src/memory/sqlite-pragmas.ts: WAL synchronous=NORMAL preserves consistency but can lose committed transactions after power/OS failure. The old unconditional power-loss data-safety and2x speed claims lacked support. Runtime PRAGMA values are preserved. Phases17/19 must establish outbox durability/RPO requirements and storage/crash evidence before claiming power-loss durability; raising synchronous or changing storage requires its own compatibility/operational decision. Official source: https://www.sqlite.org/pragma.html#pragma_synchronous .

09-05 now independently restores shared flow writes/consume only for current initializer-owned file-backed outbox-v1 handles:45ledger and154flow tests pass. Exact catalog matching intentionally rejects unknown/alternate DDL spellings, extra user schema and inherited HMR handles. Inventory/admit additional legacy profiles before restoration, without caller bypass. Raw getDb/SDK consumers remain trusted process code; receipt history/anomaly checks cannot attest callbacks or enforce hostile-plugin isolation. Exact runtime, same-UID writers/plugins, persisted lineage and temporary storage remain gated.

Independent18-02 tooling review corrected four gaps before acceptance: recursive inventory now includes18 nested Markdown files (678total), requirement description/hash changes invalidate stale output, partially malformed requirement definitions are rejected, and duplicate frontmatter keys fail rather than silently replacing lifecycle values. Ten durable tests pass. The earlier660count described top-level files only. Manual dispositions/history and status patches remain open.

## Additional domain-effect admission decision

D360-11 selects a shared entity revision and durable receipt foundation for paid embedding effects, followed by separately reviewed brain/corpus adoption. Finance keeps nextChunk as deterministic progress but also needs revision arbitration: undo/retry can otherwise reset to zero while an old worker remains active. Existing tenant RLS scope must be preserved inside the owned transaction and restored before job finalization; no broad app_ledger job-table grant is implied. Embedding cancellation must reach transport/backoff so it prevents subsequent paid attempts. Provider outcome without a receipt remains indeterminate. Exact child plans are being drafted; this entry is not an implemented fix.

## Native effect verification and receiver follow-up

10-03 now independently passes44 final native/groupchat/runtime tests. The committed-message finalization failure found during review is repaired; explicit retry finalizes without repeating RPC. Unreadable checkpoint ownership and storage-unavailable terminal persistence still require an explicit recovery path; exact-site TODO remains. The current driver crash is independently reproduced inside an isolated child, not suppressed or certified healthy.

A separate gateway receiver plan09-06 is under review: pre-auth JSONnull escapes current shape assumptions, pending bridge responses lack originating connection binding, and stale close callbacks detach by shell ID. Random UUID request IDs reduce guessability but are not an ownership check. Durable receiver acknowledgment is absent and remains11-03/phase14 work. No production exploit was attempted.

## Build packaging gate

12-01 isolated candidate compiles client/server but default-heap Vercel packaging exhausts Node memory. An explicit8GB diagnostic remained incomplete and was stopped at its bounded cutoff; that interruption is not another OOM. A matched original-lock baseline is running sequentially to establish whether this is a dependency regression or an existing build limitation. The actual CI build step retains a comment-only TODO; its pre-existing staged workflow changes and build command are preserved. Diagnose the reachable @vercel/nft graph and actual glob expansion before proposing route splitting, tracing options or heap changes. No candidate lock is accepted and no CI memory policy is silently changed.

## Test-lane isolation

10-08 separates default unit discovery from explicit marked native PostgreSQL qualification. Eight discovery/empty-run cases pass; independent native rerun is pending. Four preserved legacy SQL files read normal application environment and are excluded before import. The dedicated lane initially admits only the actual job-stock fixture, whose crash child explicitly inherits that config. Each future job/driver native fixture needs source/marker review and exact allowlist admission; the config retains a TODO. Temporary candidate configs do not expand release qualification. This is not a claim that every unrelated unit test is network-free.

09-06 source verification must retain three further boundaries: terminal relay is transient until11-03/14 receipts; persisted online status has no implemented disconnect sweeper; caught auxiliary timestamp/timer-read failures lack durable retry/reporting. Exact TODOs remain in the manager. Existing administrative provider/timer lifecycle races are outside this bridge-origin slice.


### Current execution checkpoint: receipts, build tracing and driver qualification

The shared 10-07 job-effect foundation independently passed 24 unit and 14 native PostgreSQL tests plus the full current-source Hub type check (zero errors/warnings). Canonical native-lane admission explicitly adds only its reviewed fixture. Finance 10-04 now rejects ambiguous unversioned imports and uses explicit retry to establish a fresh revision while preserving persisted progress; adoption and independent qualification remain in progress.

12-05's generated translation-module trace completes at about 218 MiB sampled RSS, but full manifest/entry traces stop before outside-root metadata probes. Both matched full builds still fail packaging; the OOM cause remains unresolved. Existing CI TODO(handoff) points here. An isolated filesystem diagnostic must pass its own exact plan and capability gates before further tracing. No excluded assets, altered locale behavior or dependency candidate acceptance follows from these partial traces.

12-04's existing baseline fixture records four driver failures. Automatic safety review interrupted the fault-injection agent; the isolated null-guard candidate was never executed or selected. Do not represent it as a fix, a demonstrated hang, or healthy connection reuse. No rejected action was repeated or rerouted. The driver correction, package-wide/runtime compatibility and domain interruption qualification remain open; actual evidence is in 12-POSTGRES-DECISION.md and 12-04-SUMMARY.md.


### OBS-02 live connector follow-up

On 2026-09-09 the active PostHog project 129899 returned zero valid uploaded symbol sets. This is a connector-visible source-map gap, not a Sentry conclusion or an error-rate measurement. The advertised SDK doctor and tool-discovery endpoints returned Tool not found, so live SDK health remains unverified. No events, flags, maps or project settings were changed. Hub hooks.client.ts has a TODO(handoff) at exception-capture initialization; phase 16 must prove an exact released event, symbolication, delivery and attribution rather than treating capture configuration as health. Evidence: .planning/research/360-posthog-followup.md.

### Finance statement blob reconciliation

10-04's concurrent content-dedup test exposed wrapped23505 handling, now independently verified within the finance adoption scope. Upload occurs before unique import admission; failed/losing requests can leave uploaded blobs. Reconcile those orphan candidates without deleting the winning import's source. The exact upload-site TODO(handoff) and finance summary preserve this retained-copy ownership gap for the data/retention phase; no cleanup is authorized or performed by the adoption slice.

### JOB-02 finance terminal state and recovery UI

Job termination and statement-import state still commit separately. A failed or rejected unversioned job can leave its import queued or parsing; a committed import can be done while the job reports failure after a lost response. The existing authenticated explicit retry API creates a fresh request revision and preserves imported rows, counters and chunk position, but no statement recovery UI was implemented or verified. A separate bounded recovery slice must define truthful paired job/import states, expose the authorized recovery action and prove failed-job, stale-status and already-committed cases without duplicating statement rows. The exact handler TODO in finance-statements.service.ts and 10-04-SUMMARY.md track this gap. The 47 unit/parser and 19 native passing tests qualify ownership and rollback behavior, not terminal-state convergence or recovery UX.

### JOB-02 shared document manifest and history

Native brain adoption tests reproduced a mutable module duplicate admitting a later batch after another job published, and an empty URL duplicate competing with an admitted embedded document. Admitted10-09 binds a complete canonical chunk/pipeline/provider-mode hash to the shared request head, with actual provider and domain-ready checks before new admission. Null manifest plus existing receipts requires explicit new revision; neither batch zero nor job cursor proves the whole prior intent. Current head binding is cleared on explicit revision reset, while historical receipts remain. A forensic whole-manifest archive and operator recovery/retention policy remain separate decisions; the nullable-head repair must not be described as immutable manifest history or remote exactly-once execution.

### Contained trace RSS attribution

The 12-06 launcher reports the RSS of Bubblewrap's child-pid, which is the namespace reaper in the qualified local runtime. That field does not measure the Node worker and must not support build-memory conclusions. The first application trace has no worker RSS measurement. Later external 100 ms Node-descendant samples are auxiliary: the manifest trace covers only a late partial window; per-process and aggregate sampled maxima are not continuous process peaks. Preserve those limits and the original artifacts. A separately admitted measurement repair must identify the actual worker lineage and test process accounting; the current run's numbers must not be relabeled retroactively.

### JOB-02 vector propagation qualification

The 10-05/10-09 native brain fixture exercises real PostgreSQL document/chunk/vector constraints and RLS, but does not install the later Qdrant generation/outbox triggers. Transactional chunk publication is verified; end-to-end vector propagation and generation selection are not. Keep 10-06's actual generation function/trigger acceptance and phase15 migration authority checks open. The exact fixture migration-list TODO prevents its passing count from being used as Qdrant evidence.

### Legacy business test lane

Corpus preflight found brain-business-persistence.service.test.ts eagerly resolves SUPABASE_DB_URL through loadEnv and conditionally runs live EXPLAINs. Its name bypasses the SQL-suffix exclusion.10-08 now explicitly quarantines that file before default import; a file-only regression first reproduced its unwanted selection without executing the module. Preserve and split its four offline persistence regressions (205-record batching,501 stale deletes,pending without vectors,unchanged/dedup) from the application-environment SQL cases, then migrate the latter to a marked disposable fixture under a bounded child amendment. No missing credentials or skipped describe.runIf is acceptance. Exact source TODO and QC README record the pending re-admission; no live SQL was run.

### Legacy CRM test lane

crm-funnel.concurrent.integration.test.ts eagerly reads application configuration, selects an existing organization and performs concurrent test writes. It is now explicitly excluded from default collection before import. Preserve its concurrency assertions, but provide a canonical full-schema, synthetic-tenant, explicitly marked PostgreSQL fixture before re-admission; absence of shell credentials does not make its loadEnv fallback safe. Exact source TODO and QC README track this gap. This operation did not execute the module or its SQL.


### Continued corpus and SDK history decisions

Corpus preflight found that per-document embedding grouping can multiply the existing cross-document request count. Preserve current batching while drafting 10-10 semantic-unit membership and multi-head publication support; 10-06 stays gated. Current dispatch ownership may preserve a complete historical batch response after partial member supersession, but only current member revisions may publish. The existing vector worker is not a qualified common embedding owner: generated vectors remain in memory, retry after Qdrant/ACK failure can repeat paid embedding, and desired source revision does not fence a reclaimed claim. Worker source/DDL sites and hashes are recorded in `10-REMAINING-HANDLER-DECISION.md`; a separate bounded worker child must address durable response retention, claim generation and cancellation without switching deployed serving mode.

History review recovered plugin iframe handshake/version/RPC requirements and Workforce HTTP response handling boundaries. 14-04 Task 1 owns the actual host/iframe compatibility matrix; 14-05 Task 1 owns a reference patch and per-consumer JSON/raw/streaming policy packet. Existing bridge implementations and reference HTTP fixes must be inspected before replacement. A bounded error preview alone does not bound `res.text()` allocation. No package bump, compatibility policy or consumer source patch is admitted yet. Preserve valid requirements in partially superseded proposals while excluding obsolete blue/green gateway and container npm-update instructions. See `360-sdk-container-history.md` for bounded local history evidence; this is not a semantic review of all historical revisions.


### Plugin consumer gates beyond the 14-04 foundation

14-04 now repairs exact-window plus exact-origin validation, v1 compatibility, message fields and disposal/correlation in the existing package/host. Remaining seams are: PluginIframe's initial permissive mount before capability discovery; gateway manifest normalization/projection; three handwritten builtin artifact peers and the generator's copied bridge template; existing stored artifacts; gateway token delivery and method authority; operation-specific cancellation/timeouts; installed bundle/browser/release parity. A utility deny for unknown constrained capabilities does not fix an already mounted component. No blanket 30-second bridge timeout is selected because actual generation/edit calls allow 180 seconds. Packet `14-PLUGIN-BRIDGE-MATRIX.md` freezes every identified peer path and source/installed identity; exact child admission is required before edits outside the foundation.


### Bounded CPU profiling qualification

12-07 now independently passes 20 actual harness tests, including useful partial decoding after forced timeout and ordinary/profile nft asset parity. Root admitted exactly one candidate messages-only profile and at most one isolated decode at 60 seconds/2048 MiB each. Initial startup-only failures remain recorded; no guaranteed startup timing is claimed. Application attribution, full packaging, runtime assets and EN/ES qualification remain open. The reaper RSS measurement remains uncorrected and cannot support worker-memory conclusions. This new diagnostic does not resume the separately stopped driver fault-injection work.


### Workforce candidate JSON transport and remaining consumers

14-05 Task 2 selects the pinned reference typed-error correction plus finite candidate JSON limits (30 seconds, 4 MiB), OR cancellation and byte-bounded body consumption. These are failure ceilings, not measured production guarantees; actual Hub installed adoption waits for safe error projection and explicit candidate resolution. Raw upstream bodies/cause remain unsafe to log, including JSON. Additional exact source children are needed for intake and loader log sinks/status assumptions, workspace's abandoned two-second request, streaming/binary proxy bounds and disconnect handling, file-ignoring asset upload methods and endpoint shape validation. Packet `14-WORKFORCE-HTTP-PACKET.md` records exact paths/hashes. No source package change alone updates Hub installed0.3.0 or proves browser/release parity.


### Partial CPU-profile coverage

12-07's one admitted messages profile timed out after 60.025 seconds with 4,201,827 retained bytes; the last profiler receipt was at 3.570 seconds. The one isolated built-in decoder completed, but observed 2,801 ticks with 171 unaccounted, only 24 JavaScript ticks, an empty native-C++ section and an overflow-frame diagnostic. A 65-byte incomplete tail was removed only from the derived decoder input. Most samples identify startup/library work. There is no evidence attributing the remaining roughly 56 seconds, Acorn parse/scope/walk time or the packaging OOM. Proof/inventories/runtime identity/input immutability and process cleanup passed; no retry or product change followed. Qualify actual analysis coverage or propose separately admitted faithful stage timing before drawing a causal conclusion. The exact lastReceiptMs source site now records this gap; reaper RSS remains unsuitable for worker memory claims.


### Workforce helper integration boundary

14-05 Task 3 is admitted for helper-owned safe error projection, caller signal transport and raw JSON body-preserving adaptation against explicitly identified candidate and installed packages. Actual HTTP 404 stays distinguishable from malformed-success 502; abort remains a rejection without an invented HTTP status. Some loaders intentionally swallow all rejections or use allSettled fallbacks, so helper cancellation does not qualify end-to-end cancellation. Direct workspace clients, route-local DB/schema failures and streaming/binary proxy bypass this helper. Those exact caller seams remain separate children. Candidate transport policy must not be represented as present in the old installed package; source type compatibility is not runtime adoption.

### Authenticated reconnect foundation admitted

14-08 now owns only shared GatewayClient source and its offline injected-socket tests. It adds current-attempt authenticated notification and prevents stale challenge work from crossing socket generations, while preserving all three reference error hooks. Hub and Site adoption (14-09/10), emitted declarations, archive identities and installed consumers remain separate gates. No network fixture or package installation is authorized in this slice.

### Bridge request identity across restored document lifetimes

Review found per-instance sequence plus timestamp IDs can collide when a bridge is replaced on the same WindowProxy in one clock tick. Root admits a three-file 14-04 amendment: native random per-instance namespace, nonwrapping sequence and actual two-instance late-response regressions. Artifact adapter restoration will use a fresh bridge after persisted pageshow, but source/browser generation remains gated on the revised candidate. Native browser entropy and real BFCache behavior require direct qualification; synthetic lifecycle events do not prove native restoration.

### Workforce helper verification checkpoint

Root independently repeated 39 candidate and 36 installed-baseline helper/real-route cases; both pass. Current Hub snapshot contains 2,418 files plus six plugin sibling files and passes full check with zero errors/warnings. Installed 0.3.0 still ignores deadline/byte options. The real inbox loader swallows cancellation into degraded success; streaming proxy, upload stubs and domain schemas remain separate follow-ups, recorded at workforce-fetch.ts and the actual boundary test.

### Consumer reconnect review additions

Draft 14-09 must reject cutover if the source authenticated tuple changed during backup connection, including same-object reconnect. Direct Hub server/activity initialization and polling finalizers need captured session ownership. Draft 14-10 must also fence chat-send settlements and activity timers, cleaning only retired-operation flags. Isolated contract.fixture.ts files avoid accidental default-lane discovery. All three error hooks use fixed nonpayload messages; existing raw log paths and imported hydration completion remain separate follow-ups. Root accepted the independent review before implementation.

### Shared gateway source follow-ups

14-08 preserves generic request send-failure behavior outside its handshake scope; request cleanup needs a separate 14-01 regression and repair. Runtime envelope/hello validation also remains14-01. Exact source TODOs at shared gateway client request and message dispatch preserve these gaps. Shared authenticated notification does not itself adopt any consumer package.

### Shared candidate artifact and shipping gap

14-11 prepares an isolated unpublished shared package from verified14-08 source. Existing package metadata declares README and MIT, but current package/root README/license text was not found in the inspected locations. The native compiler also emits tests/maps. Exact archive, runtime/declaration closure, shipped-file/license disposition and immutable version are separate release gates; local candidate test use is permitted while those gates remain open. Active dist, application packages and locks remain unchanged.

The bridge request-identity amendment is now independently accepted: 84 tests and typecheck. A synthetic reentrant entropy sequence-limit finding was reproduced and corrected. Root-selected generated-artifact input is emitted entry `4f7bd0418fdf85d8a3206cab1c9f3db767de7dc5745a93fbb73b6ab110a098d6`; native iframe/BFCache and installed-package gates remain open.

### Artifact generation source admission

14-07 Task2 now replaces the three inline protocol implementations with the independently qualified package plus a small lifecycle/render adapter. Actual render bodies remain preserved except an explicit TODO at overview stats interpolation. Generation enforcement, stored HTML migration, network CSP, full theme identity and native BFCache remain separate gates. Exact package entry and one-time script split are recorded in the admitted plan; browser work remains unadmitted.


### 14-07 generated artifact follow-ups at frozen source

- artifact-bridge.ts: host binary theme projection does not establish full design-theme identity; native opaque crypto and actual persisted pageshow require Task3.
- builtin/overview/index.html: preserved stats innerHTML requires context-schema/renderer review; source TODO identifies exact site.
- builder-prompt.ts validateBundle: shallow acceptance cannot enforce protected-region construction or constrain other generated scripts. Stored artifact inventory/adoption remains separate.
- build-inline-bridge.mjs: compiler helper attribution must be pinned and retained before distribution. Root verified registry-integrity runtime0.139.0 archive and exact four helper bytes; retaining its and inherited notices is a remaining generation amendment.

Shared14-11 local archive retains shipping LICENSE/README, test/map pruning and immutable release-version gates. Consumer14-09/10 snapshots qualify source against full candidate runtime/declarations only; adoption must update matching source and package together.


### Current local verification and remaining journal integration

14-07 now passes scoped native opaque-frame/viewport and real BFCache tests for all3 builtins;106 source cases/fullHub check pass. Exact OXC/Babel helper attribution is retained. ActualArtifactHost component/theme authority, arbitrarygenerated/storedcontent, renderer schema and deployment remain separate. Browser request blocking was attached after child navigation; do not infer startup confinement.

11-07 intentionally leaves production integration unwired: canonical shells.ts envelope/input scope/digest semantics belong14-12; journal production path, process generation/startup uncertainty and contention tuning belong11-03; ACK only becomes authoritative through authenticated committed receiver receipts. Exact source TODOs identify those APIs. Statement rollback does not prove failed-COMMIT/power/process loss; minimumNode22.13, unsupported distribution and archive/image adoption remain open.

Journal test-copy isolation exception: hidden .vite links allowed Vitest results.json writes in active package caches. Source remained unchanged. Reviewer is replacing only private symlink entries with real private directories and rerunning; earlier cache isolation claims are withdrawn. Preserve active caches and report corrected proof separately.

14-10 isolated Site source now passes independent22cases and full native appcheck. Exact source TODOs preserve surviving signing/connect/agents diagnostic redaction and HelloOk envelope validation. Active source/package adoption remains paired and unperformed. Root corrected a test-snapshot src/lib/data exclusion and supplied synthetic static-public env names; initial13 compiler errors were fixture setup, not app regressions.


### Shells bilateral durable negotiation and remaining wiring

14-13 adds a canonical receiver acceptance field and a browser-safe bilateral version decision. An omitted advertisement is observable legacy; any explicit malformed/unsupported value is rejected. The helper grants no caller authority or storage readiness. Receiver registration must advertise v1 only after peer-v1, current-connection and durable-store checks; required durable invocation must never silently downgrade. Sender/receiver use, a new complete emitted package, gateway canonical parity/input validation, tenant-scoped persisted admission and actual route/lifecycle wiring remain separate gates. Exact source TODO: packages/shared/src/gateway/shells.ts at negotiateShellDurableOutcomeVersion.

Hub event follow-up: the verified session repair does not yet fence all onAgentEvent working/status timers or onChatEvent stream completion and imported-history continuations. Those callbacks can outlive a session; subsequent component/service children must bind captured session and operation identity before they write or notify. The private 14-09 Task 4 amendment records these exact sites without claiming a behavior fix. Imported history/config/group modules need their own completion ownership. Active Hub source/package adoption remains pending.


### ACP protocol and lifecycle findings from 11-04 research

The custom bridge lacks initialization and canonical ACP session creation, forwards an incompatible prompt shape, sends cancellation as a request and can confuse numeric-ID server permission requests with responses. A colliding permission ID can resolve an unrelated pending call. The official SDK candidate is recorded with exact version/provenance in 11-ACP-RESEARCH.md; adoption is not implemented. It also needs host-side pre-dispatch cancellation, finite line/response bounds and explicit permission policy. No runtime tool permission is implied by QC authorization.

Timeout/local abort, permission cancellation, child exit and the original prompt's cancelled terminal result are different observations. Sender admission and process-generation ownership must preserve unresolved work until supported evidence arrives. Current loadConfig(env) helpers still read ambient process.env; synthetic harness qualification must not rely on that injection alone. Installed Hermes startup reads normal environment/session state and was not executed. The upstream no-provider example is a candidate fixture, not full conformance evidence, and has a static cancellation-during-permission concern. Follow-up source ownership must include actual bridge/config callers and retain exact-site handoff annotations. Image pinning/systemd environment and stop-before-restore remain separate container/lifecycle gates.


### Canonical vector-worker handoff ledger (15-05 Task1)

The worker's in-memory materialization, uncertain provider/Qdrant/ACK retries, unclaimed reconcile writes and sleep-only cancellation remain open. The outbox lacks a changing claim generation and live-lease checks; reclaim of the same desired revision must invalidate older claimants. Its migration runner executes before version/hash/catalog verification while the CLI still targets001. Use a reviewed forward002 and explicit runner/CLI compatibility; never rewrite applied001.

Exact comments now sit in minion/services/brain-vector/src/worker.ts at materializeEmbeddings, process retry/ACK paths, reconcile and run; src/outbox.ts at claim parsing and settlement; src/database-migration.ts before execution. Eight TODO blocks are annotations only. Removing them restores every original byte, and applied001 is unchanged. No behavioral repair, paid receipt, Qdrant ordering, native migration or deployment is claimed.

Corpus10-10 source is separately admitted. Its missing historical owner outcome is recovery_required, not endless busy retry or evidence authorizing reclaim. It preserves reserved state until a separately selected recovery path exists. Exact-site TODO and focused native denial evidence are required in that implementation.


### Bridge configuration follow-up

11-08 corrects loadConfig(env) to consistently use its explicit environment, preserving default ambient invocation and existing value parsing. The exact command-split site now carries a TODO for structured argv/quoted arguments and actual provisioned systemd environment evidence. Those behaviors remain unresolved; this configuration fix does not certify ACP readiness, image startup, integer range policy or harness isolation beyond the loader boundary.


### Corpus foundation limits retained through10-10

The page service's exact TODO sites retain four boundaries: bound source database reads before full materialization; provide explicit recovery for committed admission before call/unknown remote outcome without automatic retransmission; bound provider response bytes before existing res.json(); and decide missing historical owner reconciliation plus receipt/tombstone retention. New logical page/projection limits do not prove earlier source/HTTP allocation bounds. No owner invalidation, automatic paid replay, deletion or endless busy loop may be inferred from missing history. Native foundation evidence and later corpus/worker adoption must remain separate.


### Required durable invocation follow-through (D360-16)

Select the distinct `shells.invoke_durable` method and literal required/version admission response. Old gateways must refuse rather than execute legacy fallback.14-16 owns canonical source/profile only; a new complete emitted package, facade consumption,14-12 receiver, dispatcher authorization, strict disabled|required configuration and actual startup/quiesce still need their bounded implementation. Fixed input64KiB and outcome-text4KiB policies remain separate.80KiB logical admission reservation includes the complete64KiB outcome/receipt wrapper plus16KiB bounded metadata; actual receiver transactions must enforce it. Conservative retained-run defaults do not establish production capacity or retention policy. Required startup must not swallow native storage failure; legacy invocation must not discard caller keys. No new runtime guarantee follows from a method constant or passing canonical tests.


### Shared SDK packaging and license follow-through — 12-08

The independently qualified unpublished SDK archive `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` contains 40 test-derived outputs and 62 maps, including local build paths; no source, README or applicable license text is shipped. Plan `.planning/phases/12-dependency-provenance/12-08-PLAN.md` owns a four-file private packaging repair: production-only clean emission, preserved noEmit test coverage, lifecycle failure propagation and README. It preserves public exports and optional ws behavior.

Applicable license text and attribution remain unresolved; an MIT metadata value alone does not resolve provenance. Do not invent a LICENSE/NOTICE. The README must carry the matching TODO(handoff). Publication additionally needs an immutable version, matching installed consumers and canonical CI integration of the private packaging regressions under12-03. Omitted maps deliberately do not claim TypeScript-source stepping; future debugging support requires portable maps and matching source with actual consumer proof. No library or SDK source behavior is removed by this packaging child.

## Shared package release emission gate

12-08 proved, in a private lane only, a production-only clean emission for `@minion-stack/shared` (tsconfig.build.json + scripts/build.mjs + prepack routing + README): 44-member archive `d01a5285…`, no tests/maps/local paths, all five entry points and the optional `ws` peer behavior verified from the extracted tarball, root rerun byte-identical. Still open before any release: applicable license text/attribution (metadata says MIT, nothing shipped or verified), a distinct immutable version (0.9.0 is reused locally), qualification of the installed consumers (hub, site, paperclip `minion_gateway`), and adoption of the four candidate files into the active package. The README `TODO(handoff)` points here. Evidence: `.planning/phases/12-dependency-provenance/12-08-VERIFICATION.md`, `/tmp/minion-12-08-fa2dci45/RECEIPT.json`.

## Shells durable receiver handoff (14-12)

The private 14-12 candidate implements the injected native receiver (MSR1 three-table node:sqlite store, manager durable invoke/query/current-socket commit/quiesce, registered `shells.commit_outcome`) with 69 native/loopback cases and root rerun. Exact-site `TODO(handoff)` comments in the candidate point here for: production store path and open/close lifecycle wiring, caller method/JWT organization authorization (dispatcher child), sender 11-03 adoption of the `shells.invoke_durable` envelope/response, exact minimum Node/image runtime for node:sqlite, untested failed-COMMIT/process/power-loss recovery, transient `shell.final` limits, and the same-UID pathname/inode replacement gap inherited from 11-07. Nothing is adopted into the active gateway. Evidence: `.planning/phases/14-sdk-transport/14-12-VERIFICATION.md`, `/tmp/minion-14-12-receiver-foox9ehr/checks/freeze.json`.

## UI-first continuation —2026-09-11

13-05 and13-06 implement call-control parity and mandatory component journeys. Shared Chart source now has a paired TODO for dataset/encode, tuple data, mixed category axes and non-Cartesian alternatives; exact consumer inventory is `.planning/phases/13-ui-qualification/13-CANVAS-COVERAGE.md`. A correct table for scalar Cartesian data cannot close workshop/canvas keyboard interaction, sparklines or all chart callers. Preserve those source TODOs and issue consumer-specific completion scopes during the UI re-audit.

The second chart review also found callback props captured at engine initialization and motion flags retained by merge updates. Both have local native regressions and repaired source. Consumer keyboard filters/legend equivalents and effectScatter/lines effects still require engine-specific work, paired with TODOs in Chart.svelte.

New UI-first children13-07/13-08 cover mobile navigation utility/focus parity and Site graph/file asynchronous correctness. Site provider-aware logout and chat IME/scroll/mobile viewport behavior are still queued exact follow-up scopes; navigation to login cannot be treated as proof of session revocation.


### September11 Site logout and dependency qualification

The13-09 endpoint's source TODO records a real library limitation: installed Better Auth1.4.19 catches durable session-deletion failure and can return success with cookie deletion. Qualify both supported providers with disposable sessions and storage-failure injection before authenticated logout closure. A synthetic endpoint result, cleared cookie or navigation is insufficient. Keep native provider behavior; no replacement session engine is authorized by this UI slice.

13-08 adds native mounted/browser test tooling and aligns Vitest3.2.6 with the existing Vite6/Svelte plugin. An explicit development ws8.20.0 pin preserves existing gateway/LibSQL optional-peer resolution while HappyDOM owns its newer nested ws. Track removal only after native resolver evidence proves the same production identities. Better Auth's existing optional Vitest peer can materialize test dependencies in Bun's production-only install; investigate packaging separately and do not describe these files as an observed shipped browser bundle.

## Site formatter debt — September 11

The 13-08 supplement pins the native Svelte formatter plugin and extends the installed shared preset. Focused changed files pass. Global `bun run format:check` now parses all Svelte files, but reports 289 style warnings in files byte-identical to the active baseline. The exact paired TODO is in the private candidate's `prettier.config.cjs`. Preserve that baseline distinction; do not mass-format concurrent work or call the global gate green. A later scoped formatting slice should establish reviewable file ownership, apply the canonical preset, and verify no semantic change. Evidence: `/tmp/minion-13-08-dn7zbntf/checks/formatter/final.json`; root's comment-only addition is recorded separately in `root-config-sha256.txt`.


## Current-source handoff reconciliation — September 11

The native-parser checker passes 25 independently repeated tests. Its full current-source inventory remains incomplete: 82 parsed markers initially lacked structured reverse records, and five scan limitations remain explicit. Root has reviewed the two checker sites below. These records pair their known open work; they do not complete DOC-02/DOC-03, certify proposal history or close implementation. Review each remaining source comment and its actual owner/next gate before adding a record. Do not automatically classify unstructured prose as research or remove source comments to make the count fall.

```handoff-ledger
[
  {
    "id": "qc-handoff-reconciliation",
    "kind": "implementation",
    "state": "unresolved",
    "sources": [
      {
        "path": "scripts/qc/handoff-ledger.mjs",
        "markerSha256": "fab388657f78f900bed725b514a62c7ef5a425f1d7cccb175afcba776a610d92"
      }
    ],
    "owner": "Minion meta-repo orchestrator",
    "nextPlan": ".planning/phases/18-docs-governance/18-03-PLAN.md"
  },
  {
    "id": "qc-history-body-review",
    "kind": "implementation",
    "state": "unresolved",
    "sources": [
      {
        "path": "scripts/qc/proposal-requirement-map.mjs",
        "markerSha256": "a345f6222e34d8cbf2bf755ceac89371e127b47f45b092aa6af11224bd8b8860"
      }
    ],
    "owner": "Minion meta-repo orchestrator",
    "nextPlan": ".planning/phases/18-docs-governance/18-02-PLAN.md"
  }
]
```


## Portable UI regression automation — September 11

13-14 now owns an eight-file Site CI implementation derived from the qualified 14-18 candidate. It reuses native Paraglide, Vitest and Playwright for 56 ordinary plus 22 service cases and 75 browser cases across three engines. The workflow must preserve the existing global format/build gates, including the 289 current baseline style warnings. Its exact source TODO must retain actual stock Ubuntu CI execution as pending until that job runs; local Arch/Linux evidence and prepared YAML are not hosted CI success. Real authorization, physical-device behavior and deployment remain separate. Hub critical and remaining component matrices need their own explicit portable runner scopes; no new replacement browser/test framework is proposed.


## Sender restart and uncertain-terminal correction — September 11

Read-only review of the preserved `meta-11-03` candidate found a dispatch-authority gap at `packages/shells-bridge/src/bridge.ts`, `handleInvokeDurable`: `journal.admit()` returns both newly committed and existing identical admissions, while `activeRuns` is process-local. After restart, the existing unresolved admission can therefore reach another prompt call. Native regression execution is pending; the source path is confirmed. The existing durable-dedup TODO at handleInvoke's boundary remains applicable. A bounded correction must distinguish fresh committed admission from replay atomically; a separate pre-read is insufficient. No automatic re-prompt is authorized by an unresolved journal record.

The same candidate maps any prompt rejection to a durable error outcome, even though a timeout or lost response does not prove remote termination. `settleDurable` also releases the local run in a finally block if journal outcome commit fails. Preserve unresolved obligations and admission occupancy until supported terminal evidence and successful durable commit. Actual ACP prompt schema/stop reasons and process lifecycle need their distinct library/adapter scope; synthetic passing sender tests do not close that contract. The source lifecycle TODO near the prompt call and run-journal startup TODO retain these gates. Preserve the original staged sender tree while preparing native regressions and a scoped candidate repair. No sender adoption or real prompt execution occurred during this review.


### Official ACP SDK diagnostic boundary

Static review verified complete SDK1.4.0 and Zod4.3.6 archives, including integrity, emitted modules and actual license files; receipt `/home/nikolas/.cache/minion-qc/acp-artifact-review/RECEIPT.json`. The official SDK remains the preferred replacement for handwritten JSON-RPC, but stock jsonrpc notification error handling logs the raw notification through global console.error and has no injected logger option in AppOptions. A malformed notification could expose content on stderr. Before release acceptance, execute a canary regression and select an official fix or separately tracked minimal upstream patch with exact provenance. Do not hide the issue with process-global console replacement or copied protocol schemas. The packaged example client also uses an unqualified interactive launch and unconditional success exit; it is not the conformance runner. Official compiled agent positives and its cancellation-during-permission negative remain distinct from a real production harness.

## 2026-09-11 sender correction qualification

11-10 now independently passes102 cases on final source. Fresh committed admission alone permits dispatch; restarted unresolved records cannot re-prompt, and failed terminal persistence cannot release ownership. The frozen four-file correction requires staged11-03. Official ACP adoption, actual process lifecycle and explicit unresolved recovery remain open at the existing source TODO sites.
