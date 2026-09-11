# Minion 360 implementation program

**Current checkpoint (2026-09-11):**89 admitted plans,51 requirements,12 phases; none globally complete. The user prioritizes UI parity before the remaining program (D360-17). Calendar DST correctness, chart accessibility/reduced motion, Home call controls (13-05) and mandatory component journeys across browser engines (13-06) are in local qualification. Full authenticated app acceptance remains13-03. See [resume review](RESUME-2026-09-11.md) for verified Claude continuation, merged work, unpublished packages and remaining release gates. Historical evidence below is retained; SUMMARY presence alone never closes a plan.

Started: 2026-09-09. Milestone: v1.1. Owner: root orchestrator.

## Mandate and outcome

The user authorized a complete stepped implementation program, parallel completion of remaining checks, evidence-driven decisions, implementation, and another full quality-control cycle. The September 8 audit is the starting evidence, not an immutable specification. Preserve the useful transactional core while fixing authority, lifecycle, compatibility and operational evidence.

Primary evidence: `.lavish/minion-qc-2026-09-08/report.md` and its specialist appendices. Public-safe handoff: `proposals/2026-09-08-platform-qc-remediation.md`. Historical proposal IDs are reused where they already own the work; superseded or retired proposals confer no current deployment authority.

## Operating boundaries

- Root owns roadmap, requirement traceability, integration decisions, dependency ordering and final evidence. Specialists own only explicitly assigned files. A task starts with current branch/SHA/dirty-file inspection and its nearest instructions.
- User authorization covers implementation, local reversible validation and read-only checks. Production migrations, restarts, containment activation, credential rotation, publishing and promotion are prepared as concrete release packets; check existing explicit authorization for each before executing. The broad request does not identify which live tenants or environments may be disrupted.
- Do not switch branches, create/remove worktrees, stash, blanket-stage, reset or erase unrelated edits. No automatic GSD commits in these shared dirty checkouts. Record a before-image/hash for edited WIP and keep changes scoped. Release preparation later produces exact isolated patches without silently incorporating unrelated work.
- Existing source and deployed source are different evidence classes. Revalidate a finding against current upstream before release. Installed packages, registry releases and image contents are different identities.
- Synthetic fixtures and ephemeral local databases are the default. No production exploits, bulk customer-data exports, paid live-model tests, production load tests or business mutations merely to verify behavior.
- Browser login/MFA requires the user's intervention in the designated session. If unavailable, keep that acceptance gate pending and continue independent work.
- No blanket dependency updates, infrastructure replacement, schema rewrite, permanent feature deletion or estimated progress. Each cut requires reachability/peer review, compatibility evidence and a rollback path.
- GSD state records planned / implementing / source-verified / runtime-pending / released / re-audited separately. A SUMMARY alone is not proof. Do not mark a milestone complete while any required gate remains open.

## GSD adaptation

Use the installed new-milestone, plan-phase, autonomous and verification workflows. Their catalog references `~/.Codex/get-shit-done`, which is absent; the verified installation is `~/.claude/get-shit-done`. `gsd-tools.cjs init new-milestone` recognizes this project and its completed v1.0.

The user's explicit instruction to proceed supplies milestone/scoping approval; repeated generic confirmation prompts add no new decision. Preserve existing v1.0 phase directories and snapshot its planning files under `.planning/milestones/v1.0-pre360/`; do not run destructive phase cleanup. Preserve global GSD config. Per-operation commit/branch behavior follows the stricter shared-workspace rules above.

Every phase has a CONTEXT with included/excluded behavior and canonical references. Executable PLANs use GSD requirement IDs, files_modified, dependencies, tasks, must_haves and concrete verification. Future phase charters are detailed below; implementation PLANs are finalized against current source and incoming research, then independently checked before that phase proceeds. This avoids treating an old audit as executable truth.

## Execution sequence

### Phase 09 — Security containment

**Outcome:** current raw-SQL and actor-confusion paths fail closed; flow data stays data; credentials do not enter normal logs.

**Included:** disable arbitrary assistant SQL at service and exposed gateway route with a stable error and no DB execution; bind gateway-selected personal actor to persisted assignment and org membership; deny brain delegation until an explicit authority contract exists; remove request/exception credential dumps; enforce engine read-only flow querying and parameter bindings.

**Excluded:** new analytics product capabilities, broad IAM redesign, historical credential rotation, production policy changes. Containment may intentionally remove unsafe capabilities; restoration belongs to phase15 and requires independent authorization evidence.

**Slices:** 09-01 Hub SEC-01/02/03; 09-02 gateway/LangGraph SEC-04/05; independently discovered09-03 tenant-context/URL parity SEC-07;09-04 filesystem and SQL file-management confinement SEC-08. Child plans require separate admission and exact ownership.

**Acceptance:** malicious SQL never reaches DB; synthetic cross-tenant/actor attempts denied; browser self/admin behavior preserved; log capture contains no token; real SQLite mutation denied; quoted input round-trips through bound params; caller dependencies checked. Review standards and required behavior separately.

**Rollback:** revert only the reviewed slice if implementation regresses unrelated behavior; never restore an exposed unsafe capability to solve a convenience failure without an equivalent boundary.

### Phase 10 — Durable jobs and stock effects

**Outcome:** retries, slow model calls and two workers cannot duplicate a business effect or let a stale owner finalize work.

**Included:** job lease generation/fencing, heartbeat while handling, cancellation semantics, retries with deterministic effect IDs; invoice-to-stock issue uniqueness/serialization and recovery between create and submit. Reuse finance sync's proven ownership patterns where appropriate.

**Excluded:** accounting policy/UOM changes, reposting history, true-up replay, broker migration, blanket data cleanup.

**Slices:** 10-01 fences the generic runner; 10-02 serializes stock issuance; 10-03 adds the owned handler envelope, groupchat recovery and native concurrency fixture; 10-07 supplies shared request revisions and embedding receipts; 10-04, 10-05 and 10-06 separately adopt that foundation in finance, brains and corpus jobs. 10-08 isolates explicitly admitted native tests from ordinary unit discovery. The foundation must pass independent review before adoption. Serialize schema ownership with phase 15 and assign one Hub data owner per slice.

**Acceptance:** concurrent requests yield one submitted issue; worker A loses lease, worker B succeeds, A's late completion is rejected; cancellation prevents new effects; process failure after commit recovers without duplicate posting; migration preflight reports existing collisions without deleting them. Production migration remains a separate release step.

### Phase 11 — Agent and harness lifecycle

**Outcome:** a run has one owner, an observable terminal state and repeatable permission boundaries.

**Included:** Shells admission/correlation, idempotency, durable terminal delivery/reconnect reconciliation, explicit cancellation truth and staged quiesced restore; official ACP lifecycle/capability conformance; Drone immutable definition admission, cooperative-host deadline contract and live-test opt-in; effect-based governance fixtures and pinned execution manifests.

**Excluded:** another general agent framework, changing stochastic output into a byte-exact promise, claiming a Promise timeout kills effects, activating Factory containment without its external drills.

**Slices:** 11-01 Drone integrity/test isolation; 11-02 Shells concurrency/terminal ownership; 11-03 durable delivery and quiesced restore; 11-04 pinned ACP conformance; 11-05 governance evaluation; 11-06 streaming definition and deadline guarantees. Future work gets explicit ownership transfer.

**Acceptance:** caller mutation cannot change an admitted definition; default tests never call paid providers; two simultaneous prompts cannot overwrite ownership; disconnect/reconnect reconciles outcome; cancelled vs timed-out remains distinguishable; a pinned real harness initializes, creates session, handles permission request and cancels; restore runs with harness stopped. Factory remains separately gated by phase17.

### Phase 12 — Dependency and package provenance

**Outcome:** reachable advisories are patched with compatibility evidence and every delivered internal package has a unique identity.

**Included:** current-lock reconciliation, SvelteKit/Tiptap/XML/Vitest patch families, deprecated Paraglide adapter migration, stub-type removal, peer-aware dead dependency trials, tarball license content and version/source/digest manifests.

**Excluded:** blanket latest upgrades, deleting Site postgres required by CRM SDK, removing actual Workshop features solely for bundle size, a third table engine, untested migration of persisted editor content.

**Slices:** 12-01 runtime security patch families; 12-02 deprecated/build dependency diet; 12-03 internal package publication contents and consumer matrix. Shared manifest/lock edits have one owner. Current upstream lock may differ substantially from local WIP: choose a coherent baseline before installation, never paste individual remote lock sections.

**Acceptance:** advisory scan records patched/residual/reachability; editor paste/import/export fixtures and XML signatures survive; EN/ES generation/routing pass; peer-aware clean removal build passes; same version cannot identify differing bytes; package license files ship. Publishing is phase20 release work.

### Phase 13 — Mobile, desktop and accessibility qualification

**Outcome:** supported user journeys are readable, operable and release-tested across viewport and input modes.

**Included:** native/shared dialog focus, Escape and return-focus behavior; safe sentiment tooltip formatting; compact Home controls; compact Calendar/staff view; reduced motion and nonvisual chart alternatives; seeded Chromium/WebKit/Firefox, keyboard and coarse-pointer smoke gates.

**Excluded:** conflicting edits to ongoing scheduling work, cosmetic redesign, broad page replacement, claiming screenshots alone certify interaction or assistive technology.

**Slices:** 13-01 three isolated overlay/tooltip components (Volta); 13-02 Home/Calendar composition after scheduling ownership reconciliation; 13-03 CI fixtures and cross-browser journeys; 13-04 chart/canvas access and reduced motion. Before UI edits use the design governance skill and phase UI-SPEC.

**Acceptance:** Escape closes allowed dialogs, focus stays inside then returns, saving preserves intentional close constraints; malicious labels stay text; controls are visible and usable at 390px; multi-staff calendar is readable; no unwanted motion under reduced-motion; token/design gates pass; authenticated journeys have deterministic fixtures. Real assistive-technology checks remain explicit human evidence where tools cannot prove them.

### Phase 14 — SDK and transport interoperability

**Outcome:** HTTP, WebSocket, ACP and tool calls share compatible identity/error/lifecycle contracts without hiding their different authority models.

**Included:** runtime schema/version/capability negotiation, actor/tenant delegation, request/trace/effect/idempotency IDs, reconnect/event sequencing, consumer contract matrix, server-only CRM SDK enforcement and package adoption checks.

**Excluded:** one universal transport, exposing privileged SDK credentials to browsers, breaking all consumers in one unversioned change, silent retry of non-idempotent commands.

**Slices:** 14-01 canonical envelope and compatibility policy; 14-02 Hub/Site/Paperclip interoperability; 14-03 server-only CRM SDK enforcement; 14-04 plugin bridge foundation and request identity; 14-05 bounded Workforce HTTP and safe Hub errors; 14-06 component capability gates; 14-07 generated artifact peers; 14-08 authenticated reconnect ownership. 14-09/10 split Hub and Site adoption through isolated candidate snapshots;14-11 qualifies the complete shared archive. Depends on phases09/11 and package identity from12.

**Acceptance:** old supported consumer/new server and new consumer/old supported server fixtures; malformed frames and unsupported versions rejected deterministically; token rotation/reconnect/cancel behavior qualified; idempotent retries preserve the same effect; server-only exports absent from public bundles.

### Phase 15 — Authorized data products and pipeline ownership

**Outcome:** safe useful analytics replaces disabled raw SQL, and parsing/migration responsibilities are explicit.

**Included:** server-owned typed datasets with tenant/module/owner/field authorization and pre-materialization row/byte limits; inventory of required assistant questions; deterministic parsing/rejection/provenance fixtures; resumable bounded worker ownership; one migration authority per physical schema; cross-store retention/deletion inventory.

**Excluded:** arbitrary ad-hoc SQL under a mutable tenant setting, fabricated ingestion fallback, unmeasured distributed analytics platform, changing invoice-vs-consumption semantics.

**Slices:** 15-01 typed datasets and delegation restoration; 15-02 finance parser provenance; 15-03 brain ingestion cursor and retained-copy ownership; 15-04 migration ownership/drift attestation. Depends09/10/14.

**Acceptance:** permitted questions work with least privilege; forbidden module/field/tenant fixtures fail; large results stop before allocation; repeated imports preserve hash identity and rejection reasons; parser runs once per work unit where measured; migration preflight detects drift; all retained copies have an owner and stated policy. User decisions needed only for genuinely unspecified data-retention/business policy.

### Phase 16 — Observability and incident evidence

**Outcome:** an operator can attribute an error or agent effect to environment, release, route and trace without leaking sensitive data.

**Included:** PostHog and Sentry configuration/access evidence; sanitized event contracts; source maps and release association; serverless delivery; agent/run/effect linking; actionable alerts and fixture-generated incident verification.

**Excluded:** interpreting mixed-project 500 counts as production error rate, scraping private customer payloads, adding redundant telemetry vendors, sending test notifications to other people without authorization.

**Slices:** 16-01 event attribution/redaction; 16-02 Sentry maps/delivery and local incident fixtures; 16-03 alert/dashboard decision packet. Parallel read-only availability checks start immediately.

**Acceptance:** fixture error traces to exact build and original source; emitted properties contain no token/customer body; environment-filtered rate has denominator; a job's state and effect link to its request. An unavailable project/token is recorded as missing evidence, not a clean bill of health.

### Phase 17 — Containers, runtime containment and recovery

**Outcome:** one documented supported deployment path starts cleanly and its boundaries survive restart/failure.

**Included:** inspect exact live images/flags; repair or explicitly retire stale umbrella Compose; ports/adapters/secrets/readiness/shutdown; immutable images and dependency/SBOM provenance; Factory's already specified external restart/effect drills; backup/restore/rollback packet.

**Excluded:** disruptive production drills without environment approval, asserting containment because code exists, quietly enabling retired NATS architecture, promising byte-identical rebuilds from mutable installers.

**Slices:** 17-01 runtime evidence; 17-02 disposable Compose/image qualification; 17-03 existing containment drill execution and activation packet; 17-04 recovery rehearsal. Starts with read-only checks now; live steps depend on environment access and concrete release authorization.

**Acceptance:** clean disposable startup, correct ports/health, explicit mounts/network/resource/capabilities policy, graceful shutdown, image digest and SBOM linked to source; restart cannot bypass policy/effect ownership; restore validates known fixture records and rollback works. Runtime access failure leaves the relevant gates pending.

### Phase 18 — Documentation, ownership and proposal convergence

**Outcome:** instructions match supported behavior and new work closes existing proposals rather than duplicating them.

**Included:** current repository/branch/runtime/store/auth inventory, generated policy and doc drift checks, proposal/spec status reconciliation, source/release ownership, supported commands, handoff closure.

**Excluded:** rewriting historical records as current fact, resurrecting retired specs, declaring all history reviewed from a title inventory, deleting provenance.

**Slices:** 18-01 current instructions and generated truth; 18-02 proposal-to-requirement closure matrix; 18-03 supported operations runbook and reviewer onboarding. Reuse existing repo-policy/spec gates; feature docs follow verified implementation.

**Acceptance:** commands execute in the stated environment; no active Turso/BetterAuth assumptions for PostgreSQL/GoTrue paths; all current requirement IDs map to source/tests/proposal; known open ends remain both local TODO and proposal; recorded heading debt decreases without suppressing new rules.

### Phase 19 — Capacity, fairness and recovery qualification

**Outcome:** supported capacity is a measured envelope with limiting resources and failure behavior.

**Included:** disposable synthetic load harness, pool/worker/admission budgets, queue age and lineage query scaling, bursts/retries/slow dependencies, tenant fairness, storage growth, backup/restore and cross-store deletion verification.

**Excluded:** arbitrary tenant promises, uncontrolled production traffic, replacing Postgres from row count alone, load results from unidentified hardware or source revisions.

**Slices:** 19-01 workload model and baseline; 19-02 measured bottleneck repairs; 19-03 failure/fairness/restore regression. Depends on durable execution, telemetry and container qualification. Start fixture design while those implement.

**Acceptance:** workload + source/image + hardware + data seed + concurrency recorded; target SLO decisions explicit; report latency/error/checkout wait/CPU/memory/queue growth; bounded memory/connections under overload; admitted effects remain correct; restore/deletion meets decided policy. No guessed production throughput.

### Phase 20 — Integration, release and repeat 360 review

**Outcome:** the integrated release is reviewable, qualified on its actual identity and assessed against the original questions again.

**Included:** independent GSD plan/spec/standards verification; release patch ownership; cross-project compatibility; exact-SHA CI and deployment packet; post-release read-only smoke; repeat review questions below; evidence-based next backlog.

**Excluded:** blanket merge, merging audit artifacts that contain operational data, declaring pending runtime gates complete, claiming source fixes changed production before deployment evidence.

**Slices:** 20-01 integration and release candidates; 20-02 approved promotion and smoke; 20-03 repeat 360 audit. Every prerequisite must have recorded disposition; no automatic waiver.

**Acceptance:** each requirement has a behavior proof and current source identity; all required checks pass on candidate; allowed live changes have explicit recorded authority; deployment identity matches; repeat audit distinguishes fixed/source-only/residual/new findings. Keep milestone active if release or mandatory evidence is pending.

## Parallel research and decision routing

| Check | Owner | Decision unlocked | If unavailable |
|---|---|---|---|
| DB grants/RLS/assignment catalog | Tesla | typed analytics boundary, migration prerequisites | synthetic denial fixtures; live policy gate pending |
| Netcup image/flags/container posture | Maxwell | supported deploy profile, containment drills | keep runtime unverified; build local qualification packet |
| Sentry access/maps/release evidence | Volta | instrument missing attribution vs fix configuration | no false clean result; local telemetry fixtures proceed |
| Current locks/peers/deprecations | Volta | minimal patches and dependency cuts | retain candidates; no blind manifest churn |
| Browser/auth availability | Volta | required fixture/login path and CI coverage | local seeded component/journey tests; authenticated live gate pending |
| GSD plans and traceability | independent checker after a slot frees | admit next implementation wave | fix plan findings before dispatch |

Decisions are appended to `.planning/DECISIONS.md` with evidence, alternatives, choice, scope and reversal. A failed access attempt does not block unrelated work. Missing policy/credentials is presented only when a concrete dependent step is ready.

## Repeat review questions

After each wave, ask the applicable subset; after integration, ask all. Answer with evidence and changes since the September8 baseline, not general recommendations.

1. Which capabilities are demonstrably safer or more reliable, and which are only source-fixed?
2. What should now be kept, cut, replaced or redesigned, and what measured cost/value supports that decision?
3. Do instructions, specs, proposal statuses and operational commands match the actual supported release?
4. Can every critical journey be completed on mobile/desktop, keyboard/coarse pointer and supported browsers? What remains inaccessible?
5. Are advisories patched, dead dependencies proven removable, and homegrown substitutes cheaper or safer than maintained libraries?
6. Can an agent's actor, policy, prompt/tool/model/image identity, budget, approval and effects be reconstructed and tested?
7. Do timeout, cancel, retry, restart, reconnect and restore preserve one canonical execution outcome?
8. Are parsers bounded, deterministic and provenance-preserving? Do duplicate or ambiguous inputs stay safe?
9. Do database constraints and least-privilege contracts enforce the rules under concurrency, beyond happy-path tests?
10. Do SDK and HTTP/WS/ACP consumers interoperate through explicit versioned contracts without leaking authority?
11. Can the supported container deployment be rebuilt/redeployed, verified, restored and rolled back?
12. What load was actually tested, where is saturation, and how does overload affect another tenant?
13. Can telemetry attribute real failures to release/environment/trace while protecting sensitive data?
14. What did the previous proposals or this implementation miss? Add the smallest new requirement with an owner and gate.

## Evidence record

Initial branch/SHA/dirty baseline: `baseline.json`. Executable plans and summaries: `.planning/phases/09-*` onward. Independent verification lives beside each phase. Live operational payloads remain under gitignored `.lavish/`; no credentials or customer rows in planning records. This program is active, not a completion certificate.

## Executable inventory and admission

The detailed [plan inventory](GSD-REMAINING-PLAN-INDEX.md) began with47 requirements across41 initial plans; independent verification expanded it to49 requirements across53 admitted plans (including 09-03/04/05/06, 10-04/05/06/07/08 and 12-04/05/06). Use [plan-allowlist.json](plan-allowlist.json) exact paths: a preserved historical phase15 is outside this milestone. The [independent review](GSD-FULL-PLAN-REVIEW.md) governs next-wave admission. New source seams require bounded child plans and explicit inventory updates. Planning counts measure scope, not implementation progress.

## History review: recovered boundaries

The bounded SDK/container history review found full-document supersession masking still-valid requirements and exact source differences between this working root and the clean nested reference. Preserve June plugin compatibility intent while discarding its obsolete concurrent-gateway blue-green advice. Plans14-04/05 now cover existing iframe bridge qualification and Workforce bounded JSON transport. Task1 selection precedes implementation.14-01/02 must reconcile reference shared-client patches and a three-consumer by three-error-hook adoption matrix; a reference merged status does not establish installed or deployed adoption. Container plans must retain host deployment-principal, marker and external-receipt authority; top-level CLI pinning alone is not image reproducibility. Full evidence and historical limits are in research/360-sdk-container-history.md.

### Current SDK execution checkpoint

14-04 independently passes84 plugin tests;14-05 package/Hub source and14-08 shared reconnect are verified at their scoped identities.14-07 now passes106 cases, fullHubcheck and local native opaque iframe/BFCache tests.14-09 Hub and14-10 Site are implemented in isolated candidate snapshots; Site independently passes22cases/fullcheck, Hub independently passes 44 cases and its full app check.14-11 qualifies the complete unpublished shared archive. Active package/source adoption remains separate.


## Current SDK execution checkpoint

14-04 independently passes84 plugin bridge tests;14-08 passes65 shared reconnect tests.14-05 independently passes105 package cases plus39 candidate/36 installed-baseline Hub cases and its dated full Hub check.14-07 independently passes106 actual-script/generator/prompt cases; local native iframe/BFCache checks and the full Hub type check also pass.14-11's121-member unpublished archive passes independent content, export and declaration checks.14-09/10 now test actual consumer services in private snapshots with matching candidate runtime/declarations. Active installed apps remain unchanged. No phase or release is complete.


## Durable agent foundation checkpoint

11-07 implements a native SQLite run/outbox foundation with immutable identities, bounded cancellation/uncertainty records and exact ACK matching. Native tests run against actual emitted packages on22.23.2 and22.23.1. The same-timestamp cancellation correction independently passes 33 native cases on both available runtimes; receiver/sender wiring and the exact minimum runtime remain unverified. A linked test-cache isolation exception was recorded and corrected through private directories.


## Current continuation and newly selected boundaries

The inventory now contains67 admitted exact paths with explicit task gates. Canonical bilateral negotiation14-13 independently passes46 cases and strict types. Root is reviewing a new complete private shared artifact; previous Hub/Site package bytes remain unchanged. The Hub accepted-session token captures construction-time routing identity, and actual mounted PluginIframe fixtures are in preparation.

Corpus10-10 retains64-input batching, caps the new API at four active calls and bounds complete canonical/foreign discovery. Its seven-file source implementation is active. Missing historical reservation owners require explicit recovery; locked/live owners are retryable contention. Admitted remote uncertainty never authorizes another attempt. Worker15-05 has recorded exact-site handoffs; behavioral claim/migration and remote-effect work remain separately gated.

ACP research identifies initialization, session creation, permission-ID dispatch and cancellation gaps. The official SDK is a candidate for replacing custom protocol machinery, with finite byte bounds, permission policy, process generation and real caller adaptation still required. No installed or upstream harness was executed as a credential-free conformance proof.


Current continuation:68 exact admitted plans. The newly admitted14-14 owns only four private gateway facade/input files and consumes the independently verified full shared package.14-06 component source now follows independently reproduced regressions;10-10 SQL actor refinement remains under review.15-05 Task1 comments are independently verified; behavior remains gated.


Current checkpoint:69 admitted plans.11-08 environment injection is implemented and independently verified10tests/types.14-14 private gateway facade/input is independently verified91tests/types.14-06 independently passes47focusedcases; fullcheck found two fixture typing errors and URL-equivalence review opened a bounded correction.10-10 initial native diagnostic passed19of20 before a wrapped-error assertion correction; broader qualification remains active. No requirement/phase/release closed.


Current checkpoint: 70 admitted plans across 12 phases and 49 requirements. The final private 14-06 component independently passes 56 mounted cases and the full paired Hub check with zero errors/warnings; 14-09 session and 14-15 compatibility are included in that aggregate check. Native browser qualification is being prepared. 11-08 injected environment parsing and 14-14 gateway input/facade are independently verified. Corpus 10-10 passed 38 native cases before an additional exact PostgreSQL descriptor-boundary correction; final expanded qualification is still active. No phase, requirement or release is closed.
