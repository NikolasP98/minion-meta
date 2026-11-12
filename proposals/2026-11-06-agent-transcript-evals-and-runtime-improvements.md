---
id: 2026-11-06-agent-transcript-evals-and-runtime-improvements
title: Evaluate real agent traces and correct date, outcome, access, and completion behavior
status: in-spec
created: 2026-11-06
updated: 2026-11-11
repos: [minion-meta, minion, minion_hub]
---

# Agent transcript evals and runtime improvements

## AS-IS

The owner requested collection of agent message ledgers and a review of recurring patterns and improvements. The read-only audit is at [the transcript review](../audits/2026-11-06-agent-transcript-review/README.md); `findings.json` supplies exact retained source windows and measurement limits. Private source exports and executable collection/analysis scripts live under `.local/agent-transcript-review-2026-11-06/` and must not be published as evaluation fixtures.

Observed examples include a relative-day error corrected by the user; a gateway-assignment denial turned into personality onboarding; sale price substituted for margin; raw model tool-protocol text in final content; no-op calls; rejected memory writes followed by completion claims; booking actions without resolvable reference data; and environment enumeration that persisted unmasked secret-bearing fields. Historical provider failures and workshop memory chatter form separate cohorts. These observations establish past behavior, not an assertion that every defect remains live.

The audit also captures positive cases: one-call catalog answers with all tied maxima, explicit refusal to compute from incomplete data, and successful memory-write recovery. The candidate eval seeds are agent-reviewed and human-unreviewed; they are not an executed benchmark or a production evaluator.

## TO-BE

Minion answers authorized business requests using scoped tools, the organization's local date, the requested metric, and evidence of the actual outcome. It distinguishes unavailable data, denied access, incomplete coverage, invalid input, transient failure, and uncertain effects. It confirms writes only from successful receipts and bounds retries by progress. Secrets do not enter persisted transcripts or shareable eval exports.

Authorization and confirmation remain deterministic. Existing organization isolation and permission checks must remain enforced. Model judges do not grant permissions, authorize writes, infer credential validity, or turn uncertain effects into successful ones. Useful abstentions and valid alternative tool sequences remain acceptable.

## DELTA

1. **Scope and sanitize (audit F12).** Reproduce environment enumeration using synthetic credentials only. Apply task-appropriate tool allowlists and redact secret-bearing keys and credential-bearing URLs before persistence/export. Assess the affected historical credentials through an explicitly authorized operator process; no credential rotation is authorized by this audit.
2. **Outcome and format contracts (F04/F08).** Adapt actual tool responses to typed outcomes with retryability and effect certainty. Prove outer-success/body-error, empty success, denied access, timeout/unknown, and raw DSML cases. Do not execute tool calls parsed from ordinary final text.
3. **Date and metric correctness (F01/F03).** Resolve local calendar periods once, generate half-open timestamp bounds, and return local display times. Keep quantity, sale price, revenue, margin, period, coverage, and cost provenance explicit. Test local midnight, day boundaries, ties, capped lists, missing costs, and partial-period samples.
4. **Readiness and action closure (F02/F07).** Separate gateway assignment, module authorization, tool availability, and conversational onboarding. Preserve the pending user task. Resolve booking service/event-type IDs through authorized typed reference data before promising creation; retain confirmation and effect receipts.
5. **Progress and receipts (F05/F06/F10).** Bound unchanged discovery, permanent-error retries, invalid-schema retries, and provider failures separately. Require success receipts before completion claims. Preserve correct repair sequences; an intermediate failure alone does not fail the user task.
6. **Memory and workshop provenance (F09).** Distinguish user facts, plans, peer opinions, tool receipts, and inferred state. Exclude duplicate heartbeat filler and incomplete promises from completed-task memories. Add workshop goals, bounded rounds, and stop conditions.
7. **Qualification (F11 and all seeds).** Build sanitized, executable trace fixtures; explicitly label human, automation, workshop, synthetic test, historical, and continuation cohorts. Add negative controls and positive regression cases. Obtain human adjudication and a holdout before making model-quality claims. Run offline first, then shadow scoring; enabling per-request intervention is a separate reviewed change.
8. **Trace correlation.** Measure agent/session/run/tool-call/effect attribution where events are genuinely agent-generated. The canonical snapshot has only 140 nonempty agent_id values, including a no-agent sentinel, so it cannot supply a complete AI-only denominator. Preserve human/imported channel history without inventing attribution. Reconcile the 20 distinct Default outbox client IDs absent from the canonical snapshot against retention, routing, timestamps, and source provenance before alleging data loss. Use immutable provenance and timestamped source revisions rather than treating all outbound messages as AI replies.

## Evidence and definition of done

- Every implemented change maps to an audit finding, source reproduction, and executable acceptance check.
- Failed writes cannot produce a saved confirmation; uncertain effects cannot be retried as confirmed failures without reconciliation.
- Local-day and metric tests reject the observed wrong behavior; positive tied-price and honest-abstention cases still pass.
- Synthetic PAT/API key/token/password/secret-key/URL fixtures cannot persist raw secrets.
- Evaluation reports separate structural signals from task outcomes, historical operational faults from reasoning quality, and sampled review from complete collection.
- Source changes, local checks, CI, deployment, runtime verification, and human adjudication are reported separately.

## Lifecycle and handoff

This draft records the audit's improvement backlog; it does not authorize product implementation, live evaluators, paid model calls, outbound messaging, credential changes, or deployment. Security/data work retains human approval and merge gates. Product implementation proceeds through the normal reviewed spec and development lifecycle. Related proposals cover assistant lifecycle, dynamic tools, and prior harness evaluation work; deduplicate against their current implementation before planning replacements.

The private report builder contains the corresponding `TODO(handoff)` pointer for proposed checks and unqualified live behavior. Raw transcript excerpts must be sanitized before promotion into repository fixtures. Repository-wide proposal-index validation currently encounters unrelated existing invalid topics/status values; preserve that work and resolve it in its owning change.

## Deeper code review — 6 November 2026

The owner requested examination of whether agents skip checks or assume outcomes. [The code review](../audits/2026-11-06-agent-transcript-review/code-review/README.md) qualifies findings against freshly fetched Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd` and Hub master `1f1ab6a327b347645aeff16f5bd675b8d9fbf54d`, rather than the older shared working checkouts. Fifteen synthetic source-boundary probes reproduce eight improvement areas and verify positive controls. These probes do not call production services, databases, or model providers.

| Item | Verified code behavior | Required correction |
| --- | --- | --- |
| C01 | Durable extraction receives at most two current-turn messages; its default threshold is four, so the attempt caller never opens the gate. | Accumulate real new messages against an input cursor; retain context stripping and deduplication. This does not disable the separate KG extractor or explicit remember tools. |
| C02 | The bootstrap gate forbids ordinary tasks until onboarding completes, while personality guidance says to process ordinary tasks normally. | Set one personal-agent policy and separate optional preferences from actual authority/readiness. |
| C03 | Booking preview returns HTTP 200 for nonexistent references without semantic booking validation; customer/staff IDs are absent from the preview. | Add an authorized read-only preflight, include resolved effect-defining fields, and revalidate availability at commit. |
| C04 | Booking service defaults to 500 rows; its agent route returns a bare list without completeness/count/cursor information. | Add an assistant bounded-list/exact-count contract with explicit truncation so partial results cannot silently stand for totals; no full enumeration is promised. |
| C05 | Malformed finance dates become the rolling twelve-month default; the agent tool cannot explicitly forward the Hub's all-time selector. | Strictly validate explicit agent periods and expose intentional all-time queries without breaking absent-filter UI defaults. |
| C06 | The exact DSML protocol family seen in retained finals passes the outbound sanitizer unchanged. | Validate provider terminal output and add bounded recovery; never execute narrated protocol text or silently discard the entire answer. |
| C07 | Default tool-result persistence retains synthetic secret-bearing fields; egress misses named keys and fine-grained PAT shapes. | Make secret-aware persistence/export redaction mandatory and restrict unnecessary environment access. Use synthetic fixtures only. |
| C08 | Ten overlapping eligible extractions pass a budget of five and leave the cursor count at one. | Reserve capacity before scheduling and avoid captured stale-cursor commits. Fix with C01; historical/default-path overspending is not claimed. |

**Already addressed in canonical code:** the current Hub helper preserves structured error metadata and gateway identity; the current tracking wrapper marks fulfilled semantic errors with `isError`. The unused `extractMemories` convenience stub is not the runner's actual path. Do not recreate these fixes from the older working copies or mistake historical transcript counts for current defects.

Exact `TODO(handoff)` comments are recorded at nine sites in private annotated source snapshots and in the review's `handoff-todos.patch`. The original `git archive` snapshots and pre-annotation fingerprints are retained. Shared product checkouts remain untouched. This is an audit and correction contract, not an implemented fix or deployed-runtime qualification. C03–C05 are partly adjacent code defects found while following the chat workflow; the review explicitly distinguishes them from directly observed causal failures.


## EGM-tested candidate approaches — 6 November 2026

Status: **tested candidates, not adopted product changes**. The owner's request to find EGM approaches and test them is fulfilled in [the consolidated EGM report](../audits/2026-11-06-agent-transcript-review/egm/consolidated_review_report.md). The design covers C01–C08, includes alternatives, and was challenged in five stages by nine fresh reviewers plus three fresh reviewers in one Stage9 re-audit. Two blocker-level composition defects were found, corrected and closed by re-audit; original severities remain recorded. Final RR-1 coverage closure is root-tested after that re-audit, not independently re-reviewed. No convergence or production approval is claimed.

Exported Gateway/Hub patches modify18source files against the previously pinned source. Independent reconstruction matches every changed-file hash and passes253distinct tests (153new,100nearby);293raw executions include40duplicates. No shared source checkout, branch, commit, deployment or provider was changed/called. Runtime/dependencies were reused and are disclosed in verification.json.

Selected changes: real buffered memory admission with synchronous budget reservations and generation fences; personal non-blocking onboarding; shared native booking preflight; bounded list/exact count with truncation; strict agent dates/all-time and presence-aware adapter validation; fail-closed DSML and terminal fallback through enabled/disabled TTS; mandatory supported-secret redaction after persistence transforms and at qualified text/speech boundaries.

### Candidate handoff ledger

The candidate's exact-site TODO(handoff) comments point here. Production adoption remains open:

- **Memory write detection:** attempt.ts cannot yet recognize authenticated filesystem/plugin-specific memory writes; known explicit memory-tool attempts are conservatively suppressed. Add an outcome contract before broader adoption.
- **Durable sink acknowledgment:** attempt.ts calls recordExtractedMemories without storage acknowledgment/idempotency. Processed extraction is not proof of durable delivery. Define receipts and partial-delivery behavior.
- **Provider settlement:** extract-memories-runner.ts has no abort/timeout transport contract for injected model calls. A hung provider can retain active capacity; cancel/clear fences later writes without retracting dispatched calls.
- **Other session rotation:** sessions.ts wires gateway RPC reset/delete only. Qualify command/automatic rotation; lazy30min idle expiry and cap256 bound retained states without claiming a lifetime budget.
- **Native authority and concurrency:** the local native-service fixture replaces withOrgCore with a transaction. Its TODO names actual app_ledger role/GUC/RLS testing; deployed policies, authenticated route-to-native-service composition and concurrent booking exclusion remain unproven.
- **Alternate egress/persistence:** tts.ts and reply-dispatcher.ts TODOs identify direct speech/telephony and dispatcher-bypass paths. Qualify custom delivery/export/disk serialization; supported-pattern redaction is not universal secret detection. Historical data and credential changes remain separate operator-authorized work.
- **Dependencies/full checks:** native SDK SessionManager suites are blocked before assertions by pi-ai ./providers/all exports; qualify supported runtime, clean locked dependencies and complete builds/checks. Focused mocks do not replace this proof.
- **Booking prerequisites and environment authority:** authorized service/event-type discovery and restrictions on unnecessary environment access are not implemented by preflight/redaction. Keep these earlier backlog items open; no access grant or credential rotation is inferred.

The accepted bounded booking read does not enumerate all matches; filters can still leave >500identical-time rows, which must remain visibly truncated. Preview is not a reservation, and optional resource assignment may be recomputed by commit. Pattern recognition covers listed fixtures and preserves explicit unsupported-path limits. Normal spec/development/independent review gates remain, with human approval and merge for security/data work and later deployed-runtime verification.

## Applied-status recon — 10 November 2026

The owner requested reconnaissance of Minion user conversations and improvements that have not already been applied. [The follow-up report](../audits/2026-11-10-agent-chat-recon/README.md) and [evidence ledger](../audits/2026-11-10-agent-chat-recon/findings.json) reconcile retained conversations against freshly fetched canonical source. This is a read-only audit; it does not resume the earlier release process or grant new product/security/data approval.

### AS-IS

All 74 conversation-like episodes dated October 1 onward in the retained export were screened, with targeted continuation/UI feedback review. The snapshot was collected November 6 and its latest message is November 3. New gateway-session collection is unavailable: SSH timed out and local Tailscale reports `Stopped`. Nine organization/tenant-filtered canonical REST GETs succeeded but returned no qualifying newer rows; `messages` queries excluded null agent attribution. This cannot establish zero newer conversations or qualify current model behavior.

Fresh Gateway DEV remains `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`, the earlier audit base. Reviewed release files on main `50a3036ad7fac23710943e7eeadfe66b38d96fcd` share the affected implementations. C01/C02/C06/C07/C08 candidate corrections are therefore still outside canonical source. Open production promotion PR368 does not include them. Source identity is not deployed-container identity.

Hub master `206d9ae218efd4bf682d6c4063797c7441f4d52a` includes PR637's create preview, bounded/count booking read, strict finance dates/all-time/timezone, and PR643's pending-run recovery. Existing structured tool errors, semantic `isError`, personal-agent progress limits, catalog ties, navigation-link semantics and changelog product guidance must be preserved. Do not rebuild these protections from old chat evidence.

Three additional findings remain actionable:

| ID | Current evidence | Required improvement |
|---|---|---|
| N01 | A retained request specifies USD; current assistant form-fill catalog/adapter and Gateway/action schemas lack currency, although the native UI has currency controls. The actual canonical action strips a synthetic USD field and passes unconverted rate100 to draft creation. Native conversion of the same fixture at synthetic FX3.75 produces375 with FX provenance. | Preserve explicit currency and unit/line-total basis through form, typed tool, preview, action and native conversion. Preserve draft-only creation and separate posting. |
| N02 | The canonical reschedule action still previews syntax only, then creates and separately cancels. Actual-route synthetic failure injection leaves a replacement after cancellation throws; replay reaches creation again. Native slot conflicts may stop a particular duplicate. | Specify move versus replacement, use atomic native semantics, validate original/contact references, and reconcile idempotent effect receipts. No production duplicate incident is asserted. |
| N03 | A retained local-day appointment answer reports10bookings/3no-shows after receipts provide11unique booking IDs/4no-shows. Deterministic deduplication verifies the missing row was already returned. | Add a sanitized summary regression and reconcile rendered rows/status totals with scoped authoritative aggregates. Display labels cannot establish distinct people. This is historical summarization loss, not a replay against today's agent. |

Current residual contracts also include revenue-selected top15 being insufficient for quantity/margin rankings; missing dedicated typed service/event/resource/slot discovery; durable-memory sink acknowledgment/idempotency; provenance and live business-tool-policy qualification; and claimed-run interruption reconciliation. On-demand Hub release-note access is already owned by the October12 context-router proposal, whose current source TODO distinguishes fixed guidance from unavailable notes.

### TO-BE

Agents preserve units and currencies, preview and commit the same authorized action, report effects from durable receipts, and produce totals that reconcile with their evidence. They retain current error/progress/auth boundaries and distinguish unavailable references, incomplete data, uncertain effects and actual success. Historical mistakes already addressed in code remain positive regression cases.

### DELTA and acceptance

1. Recover and qualify existing Gateway guardrail candidates instead of starting competing implementations. Pin candidate source and pass the required review, checks, CI and applicable human gates before release. Verify deployed identity separately.
2. Add stock currency/rate-basis parity across both repositories. Cover PEN/USD, unit/line-total modes, missing FX, pre-existing draft rows, and preview/commit provenance. Unsupported input must not silently change monetary meaning.
3. Define atomic reschedule behavior and preserve related booking data. Cover missing/foreign originals, partial failures, overlapping same-resource moves, linked records and retry reconciliation.
4. Promote the retained appointment-summary counterexample only after sanitization. Test overlapping result windows, stable identity, equal display names, all statuses, ties and capped coverage. Keep exact count/truncation and correct abstentions.
5. Complete metric/reference/receipt contracts within their existing proposals; retain the documented claimed-run recovery boundary until qualified. Recollect gateway sessions after network recovery before asserting current conversational recurrence.

Five sanitizer cases, five reschedule scenarios, five stock route/helper scenarios and one retained receipt comparison ran successfully as defect reproductions and positive controls. They are not passing product acceptance tests, native SQL proof, model-quality scoring, or deployment evidence. Exact harnesses and private source identifiers live under `.local/agent-chat-recon-2026-11-10/`; sanitized results are beside the public report.

New exact-site `TODO(handoff)` comments are retained in private annotated source snapshots and the report's unapplied `handoff-todos.patch`. Existing Gateway comments remain in the November6 audit snapshots/patch. Shared product source and unrelated WIP were not changed. This proposal is the durable open-items ledger for the recon; implementation, native integrations and deployed-runtime checks remain open.


## Authorized implementation and release — 10 November 2026

The owner reviewed the recon and instructed: “ok, proceed with fixes, and lmk when they're live.” The implementation contract is [the reviewed follow-up spec](../specs/2026-11-10-agent-chat-contracts-followups-spec.md); its two-pass review is recorded in the matching sidecar. Work uses isolated Gateway/Hub/meta feature checkouts. Existing Gateway source was reconstructed from the saved signed bundle and exact R18 patch/tree, preserving prior fixes. No shared WIP is staged.

Local implementation includes stock currency/rate-basis parity; atomic same-ID guarded assistant rescheduling with funding/duration preservation; complete same-statement booking status counts; exact metric/source/currency rankings with explicit unavailable margins; scoped service/resource/local-day slot discovery; on-demand Hub release notes; bounded acknowledged automatic-memory writes with quoted user provenance; and an owner-scoped interruption journal that never replays effects. Passing local tests and fixture roles are not deployment proof. Commit/CI/merge/deploy/runtime states must be appended from actual receipts.

Additional independent review corrections close per-bucket finance cost exposure, unidentified invoice rows being merged into a fake product, oversized/malformed release content admission, automatic KG extraction of assistant-only claims, and failed stock-item resolution repricing an earlier row. Their behavior regressions are required in the final candidate.

### Remaining boundaries retained explicitly

- **Global calendar writer exclusion:** the new assistant path can serialize assistant moves targeting one resource, but legacy create/group/human override writers do not share that lock. Existing explicit human overlap overrides require a separate calendar concurrency policy; no global exclusion guarantee is claimed. The exact new assistant lock carries `TODO(handoff)` with this pointer. Native fixture tests qualify assistant-to-assistant contention, not every deployed writer/policy.
- **Remote KG deletion mirror:** acknowledged automatic-memory writes do not make `deleteMemory` remote KG mirroring acknowledged or bounded. Local KG forget remains a separate durable local operation. The sink's exact-site TODO points here and to existing Gateway PR367's deadline work; do not duplicate its message-ledger scope or claim remote deletion success without a receipt.
- **Live business tool restrictions:** existing explicit scope-removal hard ceilings are preserved and tested. Personal-agent IDs do not identify business-only intent, so no developer agent is silently restricted. Current live agent configuration must be inspected and the intended business scope qualified before declaring environment-tool restriction fixed.
- **Evidence age/runtime:** retained conversation evidence still ends November3. Deterministic aggregate/provenance tests do not prove current model interpretation or quality. The native PostgreSQL fixture uses explicit task schema/RLS and actual service/role/GUC composition; it is not qualification of deployed migration policies. Live identity/configuration/safe read verification remains required.
- **Historical interactive artifact:** the original November6 checksum list retains a local `.lavish` HTML reference. Its digest was verified in the owner's workspace; the private interactive original is intentionally outside the copied source bundle. The added `BUNDLE.md` and `PUBLIC-BUNDLE-SHA256SUMS` describe and verify that boundary without rewriting historical receipts. A portable historical report would require a separately reviewed sanitized export; the exact bundle note retains a handoff TODO.

At implementation start, local Tailscale was stopped and the configured 1Password signer probe timed out. Connectivity was restored with the existing Tailscale settings. Read-only probes found both production Gateway services healthy on the previous revision `50a3036ad7fac23710943e7eeadfe66b38d96fcd`; this task has not deployed. The configured signer still times out, so signed source publication remains blocked. The owner has been asked to unlock it. Normal signing remains enabled.

Live policy qualification located the actual `gateway.json` and per-agent manifests rather than the unused legacy `minion.json`. Executing the immutable production source's pure policy resolvers against those selected fields yields eight standard FACES agents and one explicit administrator; standard baseline scopes include execution and filesystem access. This is policy-input admission, not arbitrary-command execution proof. Trusted configuration does not identify which personal agents are intended to be business-only. An owner mapping question is pending; no live scope change or personal-agent default flip has occurred.

The final local PostgreSQL17 fixture rerun passed 13 cases with actual postgres-js/Drizzle services, app_ledger role and transaction-local org/actor settings under explicit fixture FORCE-RLS policies. The actual interruption-notice component passed 10 desktop/mobile fixture checks, with matching source fingerprints. Independent review reproduced native details, message and text-block serialization secret bypasses; all three unchanged native probes and 31 guard persistence tests now pass after correction. Full final source checks, CI, applicable gates and immutable deployment/runtime evidence remain required.

The actual memory HTTP contract review also reproduced a missing server-identity header under supported shared-token topology. The client correction binds ingest, recall and delete to the configured server identity; body `gatewayId` remains provenance. Four regressions failed before correction, 32 focused cases pass, and five independent probes execute the actual Gateway request through Hub authentication and ingest interfaces with only storage/entitlement/embedding boundaries stubbed. No Hub source, authorization policy or live configuration change was needed. Both live disk configurations already provide their identities. Earlier full-shard passes are archived as pre-correction evidence; final-source build/check/protocol and fresh complete shards are qualified separately. No historical memory relocation or production incident is asserted.

## Release validation routing — 10 November 2026

Normal 1Password source signing now works. Signed source trees match the qualified snapshots. Hub and the exact-main Gateway hotfix continue through No Mistakes on their correct forge-default bases. The optional validator’s installed v1.57 ignores the canonical development PR base unless its configuration exists on the forge-default main branch. Its metadata run selected main, attempted unrelated DEV history and was cancelled before publication; supported custody recovery preserved the original signed commit. Metadata and DEV parity use the existing independent review, full local checks and actual GitHub CI on their canonical dev/DEV PR bases. No validation result is treated as green without execution, and no trusted-main setting, release automation or command-trust policy is changed merely to satisfy the tool. The configuration comment retains the handoff for a future explicit tooling repair. The initial local qualification ledger is a dated source snapshot; subsequent gate fixes and deployment must be recorded separately from it.


## November 10 secret-scan qualification addendum

Actual Gateway production PR369 and canonical DEV PR370 exposed a secret-scanner qualification gap. The initial failed snapshot is not a complete union: the independent detector replay covers every changed-file snapshot in both pinned application ranges, including merged ancestry. Its frozen manifest records 24 snapshots, 46 unique type/path/hash findings and 162 occurrences, containing only classified synthetic fixtures, public identifiers/checksums and a CI result enum. It contains no raw credential values. These are scanner findings, not evidence of real credential exposure or a live-model evaluation.

The [dedicated audit spec](../specs/2026-11-10-agent-fixture-secret-audit-spec.md) received two-pass review. Dedicated Gateway PR371 must qualify the exact baseline transition on DEV, preserve existing PR334 proofs and historical scanning, and pass real CI before its reviewed scanner/baseline files can be adopted into production PR369. Adoption requires bounded source identities, proof the exact audit landed on DEV, actual event/merge validation and rejection of extra consumer edits or new findings. Owner authorization and applicable security/data merge gates remain required; independent technical review does not replace them.

Release remains incomplete. No task runtime deployment is claimed. After deployment, record exact Hub/Gateway source/image identities and bounded runtime probes. The one-time PR371 transition and PR369 adoption must later be retired through a tracked baseline-maintenance change; implementation must carry exact-site TODO(handoff) pointers here. Business-only agent selection, historical credential remediation and live model evaluation remain separate from this scoped release.


## Fixture audit retirement

After the scoped agent release is verified, retire the exact PR371 audit transition and PR369 production-adoption cases through a separately reviewed baseline-maintenance change. Preserve ordinary baseline-mutation rejection, every historical changed-file scan and fatal scanner error semantics. Preserve PR334 and its original immutable byte-pair tests until that prior case is separately reviewed for retirement. Retain source/merge/CI identities and negative controls proving every remaining boundary; do not broaden one-time cases into a reusable approval mechanism. The implementation's exact-site TODO(handoff) must point to this section. This is a tracked maintenance follow-up, not permission to remove a guard during the current release.

## Deployment checkpoint — 11 November 2026

**Hub is deployed; the paired Gateway release remains pending.** The verified deployment facts below supersede earlier pending-state prose for delivery status. The separate release record remains prepared and uncommitted until final qualification. Initial qualification files, historical checksums and source/test counts remain unchanged. Neither this proposal nor the implementing specs are marked done.

The owner's “proceed” resolved the exact Hub PR651 override and signer retry. Root merged guarded head `fb95efffd6be779c5af2f8e273ae6275c6f6e072` into `523ca2e934e93d0fc0d6f7d052c94694b86553b6` at 06:49:31Z, with protection settings unchanged. All 18 recorded actual PR checks passed. The successful build-job checkout and actual merged commit share tree `58a840fbe2a47e251b491dcefe0590decd75cd9f` and identical ordered parents, including the newer CRM-auth base. Authenticated Vercel metadata then proved that exact source behind the production alias in READY state. All five bounded owner-principal GET checks passed: permissions, catalog metadata, limited booking references, invalid-calendar rejection and same-statement count/status consistency. Public release metadata omits business counts, rows and raw identities. These probes do not qualify mutations, other roles, model behavior or the paired Gateway memory adapter.

The dedicated nine-file audit PR371 passed applicable actual CI and merged at `9ce4a18b4dd3d264c73a714f0d5b80c2eb995da1`, with reviewed/landed tree equality. DEV application PR370 subsequently merged at `70414b7dddbe8967d2a7b8afa0097e8acbbd683a`; its actual full post-merge CI42978052688 and Docker Release42978052902 both passed at exact70414b7 (root verified07:29:45Z). Independent review reproduced and closed a landed-merge-tree proof gap before audit publication. Exact production722 consumer qualification then exposed the fixture portability defect tracked below. Bounded externally attested technical adoption, fresh exact-head PR369 application/security CI, tested/actual merge-tree proof and immutable Gateway deployment/runtime evidence remain required. No broad DEV promotion, detector-setting change or global trust change is authorized by this checkpoint.

The latest application No Mistakes reviews corrected two Hub categories—journal creation before async handoff and Home interruption-notice rendering—and two Gateway categories—trusted automatic-memory trigger/input provenance and terminal acceptance across payload/reasoning fallbacks. Those four categories belong only to the latest two application runs. Earlier native serialization and tenant-identity fixes, and the separate audit merge-tree correction, retain their own evidence.

The bounded fresh session review reaches November 9: three byte-distinct sessions, 70 events and five direct conversation candidates, with system and UI-feedback inputs counted separately. It repeats known shell/environment inspection; the observed credential-shaped result is removed by current pure helpers in offline replay. No validity or live egress claim follows, and no new deterministic unapplied defect was established. Live business-agent scope mapping, broader calendar-writer exclusion, remote KG deletion mirroring, historical credential remediation and model evaluation remain separately recorded boundaries. Root will append final Gateway receipts before any overall live/completion claim.


## Portable fixture audit follow-up

The exact production722 consumer probe confirms a test portability defect:52 of57 focused audit/security cases passed, with five fixture failures before their intended scanner boundaries. The actual historical371 guard correctly rejects the synthetic main-workflow bytes; no runtime authorization bypass is demonstrated. [The reviewed addendum](../specs/2026-11-11-agent-fixture-audit-portability-spec.md) defines separate fixed historical9ce classification proof and one externally reviewed canonicalDEV technical source, with an explicit old/new adoption path table. Original371, baselineed4 and content-manifesta0c remain immutable. No detector setting, generic scanner exemption or broad DEV promotion is proposed.

The terminal gate's signed application/test-cleanup anchor isEB `eb1de47f2384cec2785d729980170142097b8d2b`; original2696 ancestry and main workflow0d5 remain required. The main-only assertion cleanup stays in that anchor. A historical-status wording correction must be reproduced externally and included in the exact technical source. The actual main workflow has no main-push CI trigger; its security-base resolver intentionally admits DEV only. The diagnostic helper main-push rejection is not a release-entrypoint defect. Preserve workflow0d5 and require actual PR369 CI, tested/actual merge ordered-parent/tree equality and actual Docker Release/deployment/runtime proof.

The implementation contract fixes [technical PR372](https://github.com/NikolasP98/minion-ai/pull/372) and branch `chore/portable-agent-audit-consumers` against canonical DEV70414b7, with a closed five-path scope and independently checked old-input blobs. Independent pass1 and root pass2 approve this bounded contract. Open items: implement, independently freeze exact new manifest/path/blob identities, and qualify both real DEV/main projections and the three-source Git/API graph; scan every retained historical changed-file snapshot; pass actual DEV technical-source and PR369 CI, then verify tested/actual merge-tree equality and Docker Release; then record immutable Gateway deployment/runtime proof. No new main gate begins before the technical source is qualified. The forthcoming implementation must attach exact-site `TODO(handoff)` pointers to any deferred one-time-case retirement. This reviewed contract permits the bounded implementation after its approved state is normally signed. Adoption/publication requires separate exact-content and merge qualification; no Gateway-live claim follows.


### Portability checkpoint — signed reservation and reviewed contract

The owner authorized another normal signing attempt (“try again”) and stated they would approve its prompt, continuing the existing scoped fix/live-delivery instruction. After the earlier two completed 1Password failures, normal signing succeeded for reservation commit `17b158dcbd08d8fdf0d8945d3e5e81d2c81e8a6d`, and actual draft PR372 now exists on `chore/portable-agent-audit-consumers` against DEV70414b7. Its temporary reservation document is excluded from the final technical diff. Independent identity-bound pass1 and root pass2 approve the five-path implementation contract; exact new blobs and adoption remain separately qualified after implementation. Original371/9ce/ed4/a0c and mainEB/0d5 remain unchanged; Gateway production remains pending.

## R8 current-attempt output qualification

Independent clean local reproduction confirms R8 on unchanged production candidateEE6: real SDK AgentSession, actual attempt, outer run and channel payload composition return prior synthetic success/reasoning after a current user abort before new `message_end`. The SDK terminal event is aborted. The clean invocation has one RED regression and one skipped outer-timeout variant; no attempt result is fabricated. Seven independent current-text/tool/compaction controls pass separately. This establishes reachable local behavior, not a live incident or actual booking receipt. Fresh main No Mistakes run `01M76R5K6BHS4CTM4E5DWKX3VK` remains parked under root ownership.

[The R8 addendum](../specs/2026-11-12-agent-current-attempt-output-spec.md) fixes [source PR373](https://github.com/NikolasP98/minion-ai/pull/373), branch `fix/current-attempt-output-qualification`, baseCC90, reserved at normally signed docs-only head `4d2b7c3ce29ac33104d18792a35c8c428bcccef8`. Its upper fence is six named runtime/regression files plus the original five technical proof files; native implementation need not touch all six. Root independently verified every old-input cell on actual DEVCC90/mainEB. Independent identity-bound pass1 and root pass2 verify the fixed scope and all22 old-input cells; normal contract signature must precede native runtime authoring.

The producer must expose the latest CURRENT COMPLETED handler-routed terminal message, including completed error/aborted metadata. Handler-routed means nonduplicate and still subscribed, not successful stopReason. Do not read partially updated `state.lastAssistant`, restore older success after a later completed error, or populate the receipt from prior history. Retain completed current metadata across later partial starts and reset on `willRetry`. Preserve current text/tool output, terminal/protocol/error handling, no-retry compaction/timeout behavior and current usage/log/hook provenance; historical snapshots remain history. Name the real SDK regression `attempt.current-output.test.ts` so mandatory default Node CI discovers it. Offline real SDK/fake-provider controls are allowed; live/remote model/provider calls are outside scope.

After normal signed approval, root's native No Mistakes process authors only within the six-file runtime fence. On the native/production candidate, the original five-file CI proof stays unchanged until the exact native runtime subset plus bounded latest helper/test/manifest/docs proof are independently qualified on external DEV and actually landed. After signed contract approval and native runtime-byte availability, external DEV373 may implement its five bounded proof paths before qualifying that combined source; no circular already-qualified-code prerequisite applies. New content identities freeze after implementation and before external qualification. Existing50bf contract, original9ce/ed4/A0c, actual372/CC90 history, fixed main50/EB/0d5 and all pending release artifacts remain unchanged. No generic flag, baseline weakening, source self-SHA or unqualified anchor change is introduced. The core repair and normal existing automatic publication already have owner authorization.

Open items: normal signature, native runtime implementation, exact touched-subset/new-blob freeze, independent source/runtime/adoption consumer qualification, actual external/main CI and merge/deployment/publication/runtime receipts. No production369 merge or Gateway-live claim follows from this contract. Root owns disposition of the parked run; pending release facts stay uncommitted until final runtime qualification.
