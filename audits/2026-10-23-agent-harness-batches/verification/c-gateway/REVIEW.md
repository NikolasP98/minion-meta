# Independent Gateway implementation review — correction required

Reviewed frozen candidate, not approved SDD alone. This is a blocking interim review for Sol C correction, **not completion approval**. Product source stayed read-only. No provider/network call, commit, push, PR, merge, deployment or production change was performed.

Candidate: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`, branch `feature/agent-harness-c-gateway`, base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`. Source-manifest SHA-256 `0281116f467587f5bf800b479799984dfb472f5c47848f9c14d41c7654fbd5ff`, patch `c204df732fabce898237b711c95a3ac387a88ca309783e5434cfbddcf4bd47aa`. Independent hash/mode comparison found zero mismatches across all 58 candidate files, all 20 preserved installation-noise files and recorded lock/SDK pins. HEAD alone is not the candidate identity.

## Standards

No independent style or dependency violation is confirmed in the inspected code. The existing queue, SQLite store and lifecycle are reused; the implementation is within the approved backend scope. Source changes require targeted regression tests for the findings below. Final explicit 55-file type-aware lint, full check, full test and build are parent-owned and not yet accepted by this review. Earlier focused/full-check receipts do not substitute for final candidate gates. The 57 unchanged core warnings must remain labeled as baseline evidence.

## Spec

**Blocked** by three confirmed implementation/integration defects. Normative sources are sibling `f-evals/specs/107-harness-gateway/{spec,plan,tasks}.md`, its four contracts, and parent A11–A16/A20gateway/A30gateway. Existing unchecked task boxes were not treated as evidence of absence or completion.

### C-IR-01 — P1: a revoked recipient gets a new owner-reply grant

- Site: `extensions/alert-watcher/src/delivery-bridge.ts:109` and `:365`.
- Trigger: two frozen intended recipients; current destination configuration revokes the second before queue admission. The first recipient still receives a confirmed alert.
- Observed: the bridge sends only to the valid recipient and cancels the revoked recipient, but first-sent settlement copies **all** frozen destination strings into `pending_replies`. The real `handleOwnerReply` accepts the revoked sender and forwards its text to the original chat.
- Native proof: `revoked-reply-probe.mts` invokes real `drainDeliveryReceipts`, real queue filesystem and provider checkpoints, and actual `handleOwnerReply` with a stub forward transport. Output: one send, revoked receipt `canceled`, pending destinations include revoked sender, revoked reply `forwarded`, one origin forward. Assertion expecting `ignored` fails (exit 1).
- Impact: recipient revocation/owner filtering at queue admission is bypassed by a newly materialized reply authorization. This is a new local grant after revocation, not the approved best-effort limit for already-admitted queue effects.
- Contract: FR-C05/FR-C09 and receipts “Preserve owner reply materialization” require valid authorized destinations and current authority at local completion; T016/T017.
- Smallest correction: determine the authorized subset of the original intended destinations at settlement using the current destination set and each bound destination-account/ownership proof; recheck after send awaits. Pass that explicit subset into the first-sent transaction. Preserve known sent evidence when no reply grant can be authorized, and never reset/rewrite an existing pending row or its original window.
- Acceptance: actual bridge/owner-handler test with one valid plus one revoked destination forwards zero replies from the revoked sender; account reassignment/missing destination authority and revocation during provider await must likewise create no new grant. Normal two-recipient reply behavior and known-sent evidence remain intact.

### C-IR-02 — P2: definitely unsubmitted SDK calls become unknown bills

- Site: `src/drones/run-with-usage.ts:34–78`, through `extensions/alert-watcher/src/classification-work.ts:429` and `src/complaint-evaluation.ts:145–164`.
- Trigger: installed Drone 0.6.0 cannot resolve any candidate credential and returns `NO_API_KEY` before post-auth preparation or any provider request.
- Observed: real classifier → terminal observer → SQLite → exporter emits one failed attempt with unknown USD/incomplete coverage. Actual F accounting includes every exported attempt as billed evidence and lists this as unknown exposure (`scripts/agent-evals/complaint.mjs:237–252`).
- Native proof: `no-api-key-probe.mts` uses actual installed SDK with a host whose only credential lookup throws and whose post-auth preparation is unreachable. One credential lookup, zero provider requests, real `NO_API_KEY`, one unknown bill. Exit 1 on the independent no-unknown-exposure assertion.
- Impact: safe pre-dispatch retries manufacture unresolved provider exposure and can make census/shadow cost conclusions inconclusive even after a later successful attempt.
- Contract: usage-shadow contract states no denied/unsubmitted operation is a paid attempt; A16 distinguishes actual invocation evidence from provider billing and A30 includes actual unknown exposure, not invented bills.
- Smallest correction: preserve local bounded SDK invocation/retry history, but represent proven no-dispatch evidence explicitly so exported billing excludes it or reports independently proven zero exposure with compatible semantics. Do not change ambiguous network errors, SDK schema failures after a response, or hidden fallback requests to zero. No new schema is required merely to hide the problem; coordinate the actual C/F boundary.
- Acceptance: actual installed NO_API_KEY and suggestion no-key paths create zero unknown provider bills; real schema errors and fallback ambiguity retain unknown/incomplete coverage. Denied shadow remains unavailable with empty attempt IDs.

### C-IR-03 — P2: legal safe retry cannot extend the C/F export

- Site: `extensions/alert-watcher/src/complaint-evaluation.ts:215–225,239`; `classification-work.ts:448–463`. Cross-consumer: F `scripts/agent-evals/complaint.mjs:87–102`.
- Trigger: export after an actual NO_API_KEY failure has returned to queued; after the permitted 5-second retry, export a valid negative terminal result.
- Observed: same record, revision 4 exposes `resultId=attempt1` and baseline `failed`; revision 7 exposes `resultId=attempt2` and baseline `negative`. Both records validate against C's current schema. Actual F reconciliation quarantines the legitimate evolution as `result replacement` and retains zero accepted records. Even changing resultId alone leaves the prematurely terminal baseline conflict.
- Native proof: `retry-export-probe.mts` uses real SDK no-key failure, real store retry/due/claim/admit/receive/finish/export, a labeled terminal receipt fixture for the successful retry, C schema validation via Ajv, and actual F `reconcileComplaints`. Exit 1 on expected zero quarantine.
- Impact: supported retry histories disappear from the logical-source cohort when incremental export is used. This contradicts the monotonic receipt revision/attempt dedup contract.
- Smallest correction: keep computation result ID/disposition nonterminal while a safe retry remains possible, while retaining immutable per-attempt failure records. Publish terminal computation identity only when it will remain stable; preserve received-state recovery and known bills. Add an actual C→F multirevision test instead of loosening F's conflict rejection generally.
- Acceptance: queued no-key → admitted retry → received → completed and exhausted no-key sequences reconcile without quarantining legal evolution, duplicating bills or changing immutable attempt facts. Conflicting same-revision and terminal replacements still quarantine.

## Checked-and-cleared question

Generic pending queue recovery while the watcher is absent/disabled enforces caller expiry but has no current watcher-authority callback. This is within the approved admitted-work limit: parent §6.2 explicitly says authorization linearizes at recipient queue admission and later generic recovery cannot promise revocation before remote execution. The new queue guard addresses expiry independently. No additional authority framework or blocker is requested for that admitted-work behavior.

## Review coverage and next acceptance

Inspected actual hooks/lifecycle, canonical source/hash adapter, source-qualified JSON/DB authority, dispatcher claim/receive/recovery/retention, delivery queue bridge and generic recovery, first-sent reply consumer, installed Drone 0.6.0 result and candidate loop, usage finalizer/export, trusted-shadow adapter, and cron binding validator. The three new native probes provide independent runtime evidence for the findings. They do not replace the broader current-candidate full gates or complete A20/A30 joint qualification.

This pass stops for scoped corrections. After fixes: refreeze source; rerun the probes and affected native queue/crash/retention, SDK/usage/export and C→F tests; complete final parent-owned required gates; then finish the full A11–A16/A20gateway/A30gateway acceptance trace and T030 joint D/F review. Human merge, deployment, deployed gateway qualification, live census and paid experiment remain separate gates.

Commands (cwd for all runtime probes: C clone):

```sh
node --import tsx /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/c-gateway/revoked-reply-probe.mts /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway
node --import tsx /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/c-gateway/no-api-key-probe.mts /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway
node --import tsx /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/c-gateway/retry-export-probe.mts /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals
```

All three runtime probes exited 1 at their intended behavioral assertion; logs are adjacent. An initial invocation from meta failed before execution because meta cannot resolve `tsx`; the correctly scoped C invocation supplies the behavior evidence. Probe scripts remain outside product source and use disposable local data/stub transports only.
