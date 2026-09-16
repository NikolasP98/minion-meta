# Independent GSD roadmap review — Minion 360

Reviewed: 2026-09-09. Scope: program, requirements, roadmap, state, decisions, available phase contexts/plans, infrastructure/UI research and September 8 audit. Canonical planning files remain owned by the root orchestrator; this review does not modify them or approve deployment.

## Verdict

The 12 delivery boundaries are coherent for this unusually broad milestone. **All 47 requirements map to exactly one phase**, and all 47 traceability rows agree with the phase details. No dependency cycles or unknown dependency numbers were found. Keep phases 9–20; do not compress them merely to match `granularity: standard`.

Before unattended GSD execution, correct the completion hazard, broaden the phase goals and register the remaining executable work. The first-wave plans already exist and some source work is complete: this is a retrospective plan/coverage review, not evidence that independent admission occurred before execution. Passing plan structure alone is not passing behavior verification.

## Checks performed

- Parsed every requirement definition, traceability row and phase requirement list: 47 unique definitions, 47 trace rows, no duplicates, no orphans, no mapping disagreements.
- Checked 60 canonical file references across the 12 phase CONTEXT files: all exist locally. The existing references are real but too generic for later implementation; add phase-specific authoritative specs and source entry points before planning those slices.
- Ran the installed `~/.claude/get-shit-done/bin/gsd-tools.cjs roadmap analyze`: 12 phases recognized, no missing detail sections from its parser's perspective. It incorrectly suggested two disk-complete phases and 100% progress from four PLANs/four SUMMARY files.
- Ran `gsd-tools.cjs init plan-phase 10`: finds phase10 and its four requirement IDs; reports zero plans/research and `commit_docs: true`. That last value must not override the explicit shared-checkout prohibition on automatic commits.
- Checked the installed verification workflow: `status: gaps_found` follows the native `plan-phase --gaps` route and skips auto-advance. Use that route rather than adding a second workflow engine.

## Required corrections before automatic continuation

### R1 — Summary counts are not full-phase completion

At review time phase11 has only 11-01, which covers AGT-01/02; AGT-03–06 are not implemented by that plan. Phase13 has only 13-01 and an extra noncanonical SUMMARY file, while UI-04–06 and actual dialog interaction evidence are still open. The current GSD disk calculation labels both complete regardless of roadmap checkboxes and partial summary metadata.

Use the native GSD correction:

1. Normalize the newly created duplicate phase13 SUMMARY into its canonical 13-01 summary or an evidence filename without the `SUMMARY.md` suffix, preserving all evidence. Root owns this operation.
2. Write phase-wide `11-VERIFICATION.md` and `13-VERIFICATION.md` with `status: gaps_found`, explicit unmet observable truths, artifact paths, and missing work. In phase13 distinguish missing implementation from unexecuted native browser qualification. Write equivalent phase09 verification after its two source slices finish.
3. Run `gsd-plan-phase 11 --gaps` and `gsd-plan-phase 13 --gaps` to create genuine remaining plans. The full requirement inventory must be represented before calling phase completion or autonomous transition. Do not create empty plans or fake summaries merely to affect a counter.
4. For phase11 plan AGT-03, AGT-04, AGT-05 and AGT-06; for phase13 plan remaining UI-01 acceptance, UI-03 qualification, UI-04, UI-05 and UI-06. Refinement of a requirement across plans is allowed; its ownership across phases stays unique.
5. Preserve the current explicit no-commit/no-branch instruction on every executor dispatch. The installed config's `commit_docs: true` is not user authorization. Do not mutate global GSD settings or installed GSD source to solve this project-specific constraint.

Once remaining real plans exist, SUMMARY/PLAN counts become less misleading, but only phase-wide verification and recorded release evidence can close requirements. Never publish the tool's generated percentage as milestone progress.

### R2 — Phase goals currently repeat only the first requirement

The detailed criteria cover all 47 requirements, but most goals and summary checklist descriptions ignore most of their own phase. Replace goals with the phase-level outcomes below. Phase11 and phase13 each have six criteria; combine related observable behavior into at most five without losing requirements.

| Phase | Replacement goal | Required observable coverage |
|---|---|---|
| 9 | Assistant and flow requests cannot gain unauthorized data or write authority, and server diagnostics do not expose credentials. | Raw SQL denied before DB access (SEC-01); assigned actor/org only (SEC-02); safe diagnostic outputs (SEC-03); actual SQLite mutation denial (SEC-04); message remains bound data (SEC-05). |
| 10 | Retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history. | Fence/heartbeat ownership (JOB-01); canonical outcomes and effect IDs (JOB-02); one submitted issue under concurrency (STK-01); create/submit crash recovery (STK-02). |
| 11 | An admitted agent run retains its approved definition, one owner and a recoverable outcome across harness lifecycle changes. | One immutable definition and deterministic policy/budget/identity/effect replay criterion (AGT-01/06); no paid default tests and explicit async deadline contract (AGT-02); concurrency correlation (AGT-03); durable disconnect/cancel/restore behavior (AGT-04); pinned real ACP conformance (AGT-05). |
| 12 | Supported consumers run patched, compatible dependencies with verifiable immutable package contents. | Advisory disposition plus compatibility (DEP-01); demonstrated replacement/removal safety (DEP-02); version/source/archive/license identity (DEP-03). |
| 13 | Critical user journeys remain readable and operable across supported viewports, input methods and accessibility settings. | Focus/dismissal/return-focus (UI-01); safe localized tooltip (UI-02); mobile Home/Calendar readability (UI-04); seeded browser gates with design-token qualification (UI-03/05); reduced-motion and nonvisual chart/canvas alternatives (UI-06). |
| 14 | Supported applications and agents exchange authorized, version-compatible requests and recoverable events without exposing server credentials. | Envelope validation (SDK-01); consumer/reconnect/idempotency matrix (SDK-02); server-only SDK and immutable-package adoption (SDK-03). |
| 15 | Authorized questions and repeated imports produce bounded, provenance-preserving results under explicit schema and retention ownership. | Useful typed datasets and policy denials (SEC-06); identity/rejection/cursor/bounds (DATA-01); single migration authority and drift (DATA-02); retained-copy ownership (DATA-03). |
| 16 | An operator can trace a sanitized failure or agent effect to its actual environment, release and original source. | Event attribution (OBS-01); actual source-map delivery (OBS-02); attributable rates and alert routing (OBS-03). |
| 17 | The supported deployment has an identifiable policy boundary and can start, stop and recover through reproducible procedures. | Live posture identity (OPS-01); disposable bring-up/shutdown (OPS-02); external containment/effect drills and gated authority (OPS-03); provenance/restore/rollback (OPS-04). |
| 18 | Active instructions and proposal dispositions lead the operator to the supported behavior and remaining work. | Verified commands/current architecture (DOC-01); historical reconciliation (DOC-02); evidence-backed handoff closure (DOC-03). |
| 19 | Measured workloads stay correct and fair through saturation and recover within the explicitly chosen policy. | Reproducible load envelope (CAP-01); bounded/fair overload (CAP-02); restore/deletion policy proof (CAP-03). |
| 20 | The authorized integrated release is verified on its actual identity and reassessed against every original audit question. | Requirement evidence (QC-01); candidate/deployment checks (QC-02); before/after full audit and residuals (QC-03). |

Add the missing `## Phase Details` heading and `**UI hint**: yes` to phase13. Add the hint to phase15 if its accepted questions require a new user interface, or explicitly keep that phase API-only; decide when scoping 15-01. No new UI should be hidden in a transport or data plan to avoid UI-SPEC gates.

### R3 — Material rollout obligations need named plan ownership

Existing counts cover the audit domains, but two new containment changes create compatibility work that must not disappear between phases:

- **SEC-05 saved-flow compatibility:** 09-02 rejects legacy SQL `{input}`. Add an explicit phase09 rollout gate: inventory affected saved definitions read-only, deliver reviewed conversion and editor support under a named SDK-02/phase14 plan, or document a temporary disabled-flow experience. Compiler deployment must not silently break saved definitions. No production migration until its exact packet is authorized. Keeping a proposal alone does not complete the accepted integration behavior.
- **SEC-01/02 capability advertisement:** containment disables raw query and brain delegation. Name current gateway/tool-advertisement consumers in the phase09 verification, and put useful typed replacement plus intentional delegated-brain restoration decisions in 15-01/SEC-06. The agent must receive a stable unavailable capability rather than repeatedly retry an advertised tool that cannot work.

For SEC-04 retain the precise statement: caller SQL is engine-read-only; an explicitly authorized consume-marking step may write after the read. Do not describe the combined operation as having no writes. Tests must cover both authority paths.

## Dependency interpretation and next wave

The declared phase dependency graph is acyclic. D360-06 already clarifies that it is an integration graph; keep that distinction directly beside `Depends on` in ROADMAP so the default next-phase reader sees it.

| Work | May start now | Closure dependency |
|---|---|---|
| 10-01 jobs and 10-02 stock | Read/source research, migration preflight and disposable race fixtures after explicit Hub file ownership | Phase09 accepted authority contract; shared schema writer serialized; candidate-specific concurrency proof |
| 11-02 Shells admission/outcome | Yes, independent package files after phase-wide gap plan review | Agent permission identity and ACP/restore plans before phase11 closes |
| 12-01 security patch families | Yes, coherent current lock baseline and one manifest/lock owner | Runtime/editor/XML fixtures and immutable package identity before phase12 closes |
| 13 dialog acceptance / Home-Calendar plan | Fixture repair now; Home/Calendar only after scheduling ownership reconciliation | All named journeys pass declared browser/input matrix |
| 16 telemetry attribution | Access inventory and sanitized local fixtures now | Final trace contract aligned with SDK-01; actual delivery requires legitimate environment access |
| 17 runtime safety | Read-only checks and concrete packet now; this must not wait for whole phases11/12/16 | Explicit maintenance authority, exact identity and external drills before runtime activation |
| 18 docs/proposal map | Correct objectively stale active instructions now | Final commands, package identities and handoff dispositions track shipped artifacts |
| 19 capacity | Workload/seed/SLO decision evidence now | Final capacity conclusions depend on job correctness, ownership, telemetry and qualified runtime |

**Next executable implementation priority: phase10**, specifically an independently checked disposable PostgreSQL race/failure plan followed by the smallest job and stock repairs. Live metadata now confirms absent invoice uniqueness, so the domain risk is stronger than the audit's earlier unknown. Preserve physical-consumption vs invoice semantics and append-only history; do not copy the old backfill wholesale into the ordinary issue API.

In parallel, finish phase09 independent verification, phase13 actual browser acceptance, phase11 Shells plan inventory, and phase12 minimal security patch planning. The exact-image runtime gating packet is the highest-priority live decision, but its pending approval must not halt these independent source tracks.

Do not defer every useful release until all 12 phases finish. Phase20 owns integrated release qualification, but a phase09 security candidate can have its own narrowly scoped release packet with exact source/image/consumer and rollback gates. Any missing compatibility or maintenance decision stays explicit; this is not permission to auto-merge or deploy.

## Evidence that changes decisions now

1. Infrastructure research now verifies live Factory identity and flags, root process, writable Docker socket and absent configured limits. The earlier audit's runtime-unknown conclusion is superseded for those facts. Retain D360-03 and its concrete packet. AUTOPROMOTE is proposal/spec admission, not production release promotion. No zero-downtime pause is established on the existing process.
2. Sentry project access is still unavailable. Add source-side release/source-map integration and sanitized fixture work where current code proves a gap; do not interpret absent credentials as an absent deployment configuration or successful telemetry delivery. OBS-02 remains runtime-pending.
3. UI source tests are green, but the native browser fixture did not mount. UI-01 remains unqualified. Fix the local Svelte fixture/runtime problem before treating shared Dialog adoption as proven focus behavior. No new component foundation is needed merely to fix the test harness.
4. Remote/dirty dependency locks differ in 15 package records. Never replace a whole shared dirty lock with the remote snapshot. Select one coherent candidate baseline, patch advisory families and preserve persisted editor/XML/locale fixtures before removals or major upgrades.

## Historical work and scope cuts

The generic canonical refs exist, but named precedent must be read before its corresponding plan is finalized:

| Existing local file | Relevant scope | Treatment |
|---|---|---|
| `specs/2026-08-17-gw-shells-lifecycle-stubs-spec.md` | Phase11 lifecycle and phase14 transport consumers | Frontmatter currently says approved. It discusses archived wake, concurrency and multi-replica lease limits; reconcile current implementation and requirement ownership rather than implementing duplicate lifecycle machinery. |
| `proposals/2026-08-28-factory-containment-base-reconciliation.md` | Phase17 controlled merge/reconciliation | Frontmatter draft; specific behind-base resume mechanism, not blanket authority to activate containment or automatic merge. |
| `specs/2026-07-13-org-agnostic-ha-service-fabric.md` | Phases10/17/19 fencing, identity and recovery | Frontmatter unknown; useful invariant precedent, not permission to adopt its entire controller/Swarm topology. |
| `specs/2026-07-17-hub-performance-optimization-plan.md` | Phases13/19 payload and latency | Frontmatter unknown; compare to current upstream performance proposal and telemetry before repeating obsolete fixes. |
| `proposals/2026-09-09-flow-sql-bindings-migration.md` | SEC-05 and consumer rollout | Newly scoped handoff; map conversion/editor acceptance explicitly. |
| `proposals/2026-09-09-assistant-query-delegation-restoration.md` | SEC-06 restoration | Preserve disabled-capability truth until typed authorization and current consumer tests prove restoration. |

No claim is made that this bounded reference review exhausts proposal history. Phase18 owns the complete requirement-to-current-proposal disposition matrix. Retired NATS architecture does not become approved because its containers are running.

Keep the following cuts explicit: no new universal agent framework/client, no blanket dependency update, no SQL sanitizer promoted into a security boundary, no data-store replacement from row counts, no artificial unification of transports with different authority, no Workshop deletion without usage/value evidence, no overlapping table engine. Existing native Dialog, TypeBox, Postgres transactions, ACP SDK and token machinery are the starting points.

## Acceptance gaps to resolve during detailed planning

- **Governance (AGT-06):** enumerate hostile tool/document prompt-injection fixtures, permission escalation, budget exhaustion, approval expiry, cross-tenant retrieval and log redaction. Reproducible policy/effect outcomes are the goal; stochastic model text is not promised byte-identical. Paid provider tests stay opt-in.
- **Bounded jobs (JOB-02):** classify idempotent/reconcilable/irreversible external effects. A fenced database completion cannot retract an already sent third-party effect. Each handler needs a policy for an unknown commit outcome rather than blind replay.
- **Capacity (CAP-01/02):** name the workload and decision owner for targets before success is scored. Include pool checkout wait, connection count, memory, queue age, per-tenant admission and retry amplification. No numeric capacity promise exists yet.
- **UI (UI-05/06):** declare critical routes and viewport/browser/input matrix. Automated axe or screenshots do not certify assistive-technology use; record which human checks remain and their exact steps.
- **Data (DATA-01/03, CAP-03):** select ingestion sources, maximum input/chunk sizes, invalid/duplicate examples and deletion policy. Backups may use expiry rather than immediate individual erasure; prohibit deleted data from silently reappearing after restore, using the decided policy. Do not invent business retention durations.
- **Containers (OPS-02/04):** choose one supported disposable profile and one restore fixture. Separate same-digest redeployment from byte-identical rebuild guarantees. Live root/socket facts need a reviewed authority reduction design, not an untested `user:` change that prevents required operations.
- **Security breadth:** phase20 repeat audit must revisit session/CSRF/CORS, SSRF/egress, uploads/parsers, websocket authentication/reconnect, secret lifecycle, signed callbacks, CI/supply-chain authority and backup exposure. These are targeted review questions, not unsupported new defect claims. Confirmed findings receive IDs and phase ownership before implementation.

## Boundaries for user decisions

The existing instruction authorizes local implementation, scoped tests and read-only evidence. Do not ask generic roadmap approval again. Seek only decisions that actually remain unspecified: a live maintenance interruption/rotation/promotion packet, retention/recovery or product-value policy, access requiring interactive authentication, or a paid evaluation budget. Prepare the exact candidate and alternatives before asking; continue unrelated work while that decision is pending.

Phase-wide verification must report implemented, behavior-verified, runtime-pending and released separately. The original 14 repeat-review questions are appropriately included in PROGRAM and should run against each relevant wave, then all run at phase20. New findings amend requirement ownership instead of declaring the program complete with untracked exceptions.

## Root application checklist

- Apply broader phase goals and 2–5 criteria, add Phase Details/UI hint annotations.
- Normalize duplicate summary naming and create native phase-wide gap verification.
- Admit complete genuine remaining PLAN inventory through GSD plan/check/gap workflows; preserve shared-workspace no-commit authority.
- Add phase-specific precedent and explicit SQL/tool consumer rollout gates.
- Make decisions link unambiguous: PROGRAM's decisions file is `.planning/DECISIONS.md`, not `operations/360/DECISIONS.md`.
- Update STATE to include 11-01 source work and partial phase13 native acceptance; keep runtime flags/evidence current.
- Prioritize phase10 race/failure work alongside independent phase11/12/13 work; retain the live runtime packet as a separate pending decision.

No canonical file, application source, branch, worktree, dependency lock, production record or runtime setting was changed by this review.
