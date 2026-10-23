# Pass 2 independent review: alert receipts, accounting and Factory bounds

Reviewed spec: `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, pass 2. Initial reviewed SHA-256: `8f97591a08878bab4da6b580c5de5c62c347235b1dc903cc4aed627ec01df4e3`.

**Interim verdict: changes_requested.** Pass 1 findings P1-A through P1-F are substantially addressed. Two narrow recovery-boundary corrections remain, plus one retention clarification. This review owns no spec or product code edits.

## Resolved pass 1 findings

| Finding | Pass 2 disposition |
|---|---|
| P1-A flow producer | §6.1 explicitly excludes external langgraph flows from authoritative provenance and the Jev pilot. Legacy flow/manual calls remain fresh invocations; run/node IDs cannot grant authority. |
| P1-B revision-dependent identity | Stable admission precedes policy/result revision, with immutable input binding, conflict semantics and explicit reevaluation. A config change no longer silently reprocesses old events. |
| P1-C receipts/retry ownership | §6.2 specifies the SQLite receipt state machine, capped attempt JSON, worker cadence, lease/renewal, retry cap/backoff, failed/unknown outcomes and retention/tombstones. Slices 12–13 separate persistence from service integration. |
| P1-D delivery bridge | Queue ID is the persisted recipient receipt UUID. SQLite admission precedes caller-managed enqueue; SQLite settlement precedes acknowledgement. Missing admitted evidence cannot authorize replay. Cooldown and revocation linearization are explicit. Slices 14–15 separate bridge from watcher integration. |
| P1-E usage callers | §6.3 selects the local opt-in run adapter and includes classifier plus suggestion calls on hook and flow paths. Failure without resolved model remains unknown; no global signature or speculative SDK change is required. |
| P1-F Factory | §5 now places the flight and budget in a run-keyed ledger independent of capability remint, defines busy/malformed debit semantics, and wires Express cancellation through proxy/fetch/body consumption. Remote cancellation is correctly distinguished from bounded hook wait. |

## Pass 2 findings

### P2-A: Default suggestion generation needs its own recovery disposition

Pinned gateway `extensions/alert-watcher/index.ts:763–776` invokes `runSuggestionsDrone` after classification and before alert formatting/delivery. The helper at `src/reply-flow/suggestions-drone.ts:65–106` performs another paid run and collapses failure to an empty array. §6.2 says received classification resumes materialization without another model call, while Slice 15 mentions suggestion publication without specifying where suggestion admission/results are persisted.

A crash after suggestion inference but before recipient payload persistence can therefore repeat a paid call or leave recovery unable to reconstruct the intended payload. Minimal correction: keep a bounded optional suggestion subreceipt on the existing classification row, persist its admission before calling, then persist terminal suggestions/usage before creating recipient payloads. On ambiguous admitted suggestion recovery, use the already-supported empty-suggestion fallback with explicit unknown usage and never automatically recall. No third generic queue/table is needed. Test crashes before/after suggestion admission/result and before recipient materialization.

### P2-B: Persist the SDK result at the available seam, not raw bytes before SDK validation

§6.2 currently requests persisting a provider response before validation. The chosen §6.3 seam is `runDrone`'s returned result. Installed `@minion-stack/drone` 0.3.1 (`dist/run.js:200–236`, `dist/types.d.ts:98–119`) validates structured output internally and returns `SCHEMA_INVALID` with usage but without raw response/resolved model. The local drone repository at `0cdf5e6c127cc21c006ad33abf65ba8b9a112171` declares 0.5.0 and has the same boundary at `src/run.ts:307–349`. Neither is asserted to be the pinned Gateway dependency: its lockfile selects 0.6.0. Exact-version qualification remains required.

Smallest correction: define received as the bounded terminal SDK result plus exposed usage, persisted before watcher-side materialization. SDK validation failures are terminal failed with known/unknown bill, never a negative or automatic repeat. Do not promise raw pre-SDK-validation durability or manufacture a resolved model absent from the failure result. This preserves the selected adapter architecture without expanding the SDK scope.

### P2-C: Raw retention includes mirrored queue payloads

The seven-day default raw source/response/recipient payload limit must apply to caller-managed queue copies as well as SQLite. Otherwise an unknown or unacknowledged queue entry can retain customer text after SQLite redaction. Housekeeping must cancel queued work whose snapshot expires; admitted unknown work retains minimal uncertainty/tombstone evidence and is never re-created. Queue redaction/retirement must respect the queue lease and recovery ownership.

## Scope, experiment and slice review

Factory record/report/admission/deadline work is split into four independently verifiable slices. Gateway provenance producer, watcher adapter, store, dispatcher, bridge, integration and usage work is now separately owned. The narrowed Telegram certification avoids promising generic channel correctness or changing an unregistered external flow repository. These are plausible 4–8-hour slices with focused fixtures; exact dependency installation and full repository qualification remain execution gates rather than evidence already achieved.

The complaint pilot remains census-first, default-policy-only, certified-source-only and inactive by default. Custom policies and legacy flow inputs bypass it. Shadow always runs the baseline; unknown results cannot become negatives. Severity-specific miss tolerance/sample support must be approved before paid holdout/promotion. No measured accuracy, volume, cost saving or fabricated runtime success is claimed. Router numerical tolerances are explicitly proposed acceptance choices, and the runner/corpus/report paths and commands are now named.

## G2 scores (interim)

| Axis | Score | Reason |
|---|---:|---|
| slice_size | 8 | Provenance, store, dispatcher, bridge and integration split; bounded supported transports |
| dod_verifiability | 8 | Concrete state/budget/deadline and crash outcomes; remaining suggestion/SDK receipt boundary must be fixed |
| scope_containment | 9 | Explicit flow exclusion, narrow adapters and existing SQLite/queue reuse |
| impact_zones | 8 | Actual Factory HTTP route and both suggestion callers named; receipt coverage needs P2-A |
| collisions | 9 | Shared file serialization and related proposal ownership explicit |
| testability | 8 | Real SQLite/PG, stubs, restart boundaries and exact-dependency gates; add suggestion recovery cases |

This is a design review, not implementation acceptance, frozen-dependency qualification, deployment proof or human approval. No tests or paid calls were run in this review turn; source and existing probe evidence were inspected read-only.

## Final pass 2 disposition

Final reviewed specification SHA-256: `1f3ef8329b698570eeebdfde6d1df96611d700565706a71d0963b0bba88cd70e`.

**Technical verdict: approved for this review scope.** This final disposition supersedes the interim verdict and scores above. No blocking findings remain in alert provenance/receipts/accounting, Factory decision records/budgets/deadlines, or the reviewed complaint experiment contract.

- **P2-A resolved:** §6.2 line 193 adds the bounded suggestion subreceipt, admission before inference, terminal result before recipient rendering, and explicit empty fallback for ambiguous recovery. It prohibits an automatic second suggestion invocation. A15 and E3 require crashes at those boundaries.
- **P2-B resolved:** §6.2 line 191 defines received at the terminal SDK-result boundary and treats SDK schema failures as failed with supplied usage or unknown bill. It no longer promises unavailable raw pre-SDK-validation persistence. §6.3 line 201 also distinguishes final resolved-model attribution from complete retry/fallback bill coverage.
- **P2-C resolved:** §6.2 line 197 applies retention to queue and usage copies, requires queue-lease coordination and preserved tombstones, and cancels queued work when required input expires. A15/E3 cover the retention behavior.

Factory §5 and the previously reviewed P1-A–F corrections remain intact. The final technical approval applies to the identified content hash; substantive later edits require renewed review. It does not authorize product implementation, paid experiments, deployment, security/data approval, merge, or claims of existing runtime qualification.

### Final G2 scores

| Axis | Score | Reason |
|---|---:|---|
| slice_size | 8 | Narrow transport certification and separately owned store/dispatcher/bridge/integration work; full qualification remains explicit |
| dod_verifiability | 9 | Classifier, suggestion, recipient and budget transitions now have determinate crash/recovery outcomes |
| scope_containment | 9 | Existing SQLite/queue/result seams reused; external flow producer and generic runtime expansion excluded |
| impact_zones | 9 | Both inference wrappers, transport carrier/Telegram producer, queue mirrors and actual Factory HTTP route included |
| collisions | 9 | Shared-file serialization and existing proposal ownership retained |
| testability | 9 | Focused failure/clock/remint/restart fixtures, real storage tests and exact-dependency gates named |

Final check was read-only source/spec inspection plus SHA-256 verification. No new runtime tests, network inference, or product/spec edits were performed by this reviewer.
