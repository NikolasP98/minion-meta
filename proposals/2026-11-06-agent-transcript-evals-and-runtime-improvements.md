---
id: 2026-11-06-agent-transcript-evals-and-runtime-improvements
title: Evaluate real agent traces and correct date, outcome, access, and completion behavior
status: draft
created: 2026-11-06
updated: 2026-11-06
repos: [minion-meta, minion, minion_hub]
---

# Agent transcript evals and runtime improvements

## AS-IS

The owner requested collection of agent message ledgers and a review of recurring patterns and improvements. The read-only audit is at [the transcript review](../audits/2026-11-06-agent-transcript-review/README.md); Private-local `findings.json` supplies exact retained source windows and measurement limits; it is excluded from this PR. Private source exports and executable collection/analysis scripts live under `.local/agent-transcript-review-2026-11-06/` and must not be published as evaluation fixtures.

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
