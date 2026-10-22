# Pass 1 independent review: alert receipts, accounting and Factory bounds

Reviewed spec: `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, pass 1, status review. Reviewed gateway `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`, Factory `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`, prior revalidation reports and the current spec. No product implementation or spec edits made. This review's ownership is alert provenance/receipts/SDK and Factory data/budget/deadline contracts; it also checked experiment eligibility and relevant overall slice boundaries.

**Verdict: changes_requested.** The design has the right boundaries, but several remaining alternatives and missing callers prevent a junior implementer from producing one determinate solution. The blockers below are contract gaps, not requests for a new framework.

## Blocking findings and smallest corrections

### P1-A: Certified flow provenance needs an unlisted external caller, or explicit exclusion

Spec §6.1 lines 168–177 and Slices 9–10 promise trusted flow/run/node origin. The gateway does not own that producer: `src/flows/trigger-manager.ts:280–290` calls `FLOWS_RUNNER_URL/flows/run-triggered`. Local discovery found `langgraph-server/src/flow/compile-flow.ts:456–466` calling the plugin method with only `{input,runId,nodeId,config}`. `server.ts:160–168` does have eventPayload, but compile-flow's pluginAction branch does not forward it. That repository is absent from the spec repo/ownership/source-pin matrix and from the current `repo-policy.yaml` search. The inspected local HEAD is `5d9860fba62cc258680a76c6ae4e6841f55b1cf6`; no claim is made that it is deployed or its latest branch tip. No nested AGENTS/CLAUDE file was found there.

Even forwarding fields would not make them authoritative: the spec must define the authenticated lookup/receipt that binds a flow call to the original channel event and policy, rather than trust arbitrary RPC `runId/nodeId` strings.

**Smallest correction:** keep existing flow/RPC functionality but explicitly designate it uncertified/fresh-invocation for this milestone; certify raw hooks plus Telegram agent dispatch only. Do not include flow cases in cross-source dedup or active Jev claims. If certified flow origin is required now, add an independently pinned/owned producer slice and an exact trusted origin-reference protocol, along with registry resolution. Merely adding a consumer field in gateway cannot fulfill the contract.

### P1-B: Policy changes currently select a new computation before finding the old admission

§6.1 line 174 keys computation by effective policy revision and input hash, while line 179 says redelivery resumes the first admission's immutable policy. After configuration revision R1→R2, computing the current key finds no R1 row and authorizes new work for the old event. A changed payload under the same provider ID has the same ambiguity.

**Smallest correction:** define a stable admission identity independent of current rule/model revisions: `(authority namespace, stable watcher policy ID, canonical source identity, explicit reevaluation generation)`. First admission atomically binds one immutable input/policy hash. Ordinary redelivery resolves that binding first. Different input bytes for an existing immutable source identity are `identity_conflict` unless the transport supplies a verified edit revision. A policy change does not create an explicit reevaluation generation. Define source/policy IDs and canonical serialization fields precisely; do not concatenate ambiguous colon-delimited values. Tests must cover config-change redelivery, same-ID changed text, explicit reevaluation and overlapping channel/agent observers.

### P1-C: Classification state machine, retry owner and retained-data lifecycle are incomplete

§6.2 lines 185–187 require claims, bounded snapshots/history/backoff and restart recovery but leave the actual bounds/worker mechanism unspecified. The states lack a terminal outcome for a *known provider response with invalid schema* or exhausted safe retries. `received` is described as resumable, but the point where raw response versus validated result is durably written is not defined. There is no exact lease duration/renewal/recovery cadence, attempt transition table or implementation file for the bounded dispatcher. “Existing log or capped JSON” leaves two incompatible audit mechanisms.

Persisting negative results and all admitted input snapshots also expands storage beyond the current positive-only complaints table. No watcher-specific retention/deletion/tombstone policy is given; the 30-day paragraph in §7.4 applies to the digest.

**Smallest correction:** choose one bounded attempts representation and state transition table, with `failed`/`canceled`/`indeterminate` terminal semantics, retryable error evidence, fixed configurable limits, lease/renewal and restart tick behavior. Commit provider response/usage as `received` before validation/local materialization when a response exists; reject invalid results without inventing negative output or rerequesting automatically. Specify watcher snapshot retention and deletion while preserving minimal non-sensitive admission tombstones until replay namespace retirement. Name new `classification-work.ts`, its store migration, and the service dispatcher owner. Break storage/state-machine work from service integration if it cannot fit one slice.

### P1-D: Delivery bridge is still an implementation choice; existing queue already exposes the needed narrow seams

§6.2 line 189 says to use a stable identity “where supported” and extend the queue “if” necessary; Slice 11 promises replay after durable enqueue returns the same receipt. The pinned source already has `queueId` and `completionPolicy:'caller'` (`src/infra/outbound/deliver.ts:318–327`), but `enqueueDeliveryWithLease` rejects an existing ID rather than returning it (`delivery-queue-store.ts:72–107`). `acknowledgeCallerManagedDelivery` keeps terminal entries until correlated caller state settles (`delivery-queue-store.ts:277–315`). A second blind enqueue cannot satisfy the proposed DoD.

The cross-file transaction needs an explicit crash protocol. Cooldown is also not one existing contract: hook mode counts messages before classification and marks cooldown after a successful/partial delivery; flow gate currently counts actionable matches and marks before send. Saying “according to existing user contract” does not resolve these differences. Unconditional recovery by the generic queue can also outlive watcher revocation unless authority linearization or a specific recovery guard is defined.

**Smallest correction:** prescribe `SQLite recipient admission + persisted queueId → caller-managed queue enqueue/send → SQLite receipt settlement → queue acknowledgement`. On restart, inspect the existing queue entry under its lease, validate channel/account/recipient/payload identity, reconcile terminal/uncertain/pending states; never recreate missing evidence as safe-to-send after an admitted unknown outcome. Define the exact authorization linearization point and revocation limit. Pick a precise once-only cooldown transition and observed-message counting rule per supported policy. Name `deliver.ts`, `delivery-queue-store.ts`, `delivery-queue-files.ts`, `delivery-queue-recovery.ts`, watcher `destinations.ts`, store/index and reply-flow integration tests. Split queue bridge, watcher dispatch and legacy cut-over as independently testable slices.

### P1-E: Accounting repair omits reply-suggestion callers and leaves SDK strategy unresolved

§6.3/Slice 12 correctly rejects shared last-key attribution and requires final `resolvedModel`. However, it names classifier invocations while alert-watcher also invokes `runSuggestionsDrone(state.droneHost, model, ...)` from the flow method (`index.ts:536`) and `runSuggestionsDrone(droneHost, cfg.classifier.model, ...)` from the hook (`index.ts:765`). Those remain concurrently configurable model calls on the shared host. The current suggestion wrapper also absorbs results internally.

**Smallest correction:** choose the narrow opt-in Gateway run wrapper now: new per-invocation host, ordinary lifecycle events retained, inferred priced event suppressed only for opted-in runs, one final usage record from the returned `DroneRunResult`. Include both classifier and suggestions wrappers, on both hook and flow paths, with no SDK release needed unless qualification disproves that result seam. Specify failure-with-usage/unknown-model records and ensure no duplicate finalizer emission. Add mixed classifier/suggestion and overlapping suggestion A/B tests. Remove “caller search determines whether SDK or adapter” as an unresolved implementation decision.

### P1-F: Factory run reservation and deadline require the actual HTTP boundary and remint interleaving

§5.2 bounds one flight “per run capability” while also retaining accounting across token remints. The current capability entry is keyed by token (`runner/src/jev-proxy.ts:38–69`); simply preserving totals during mint still permits an old in-flight token and newly minted token to each hold a flight. §5.3 requires client disconnect cancellation, but Slice 8 omits the Express route in `runner/src/index.ts:1168–1172`, which currently passes only token and body. The existing `jevDecide` takes neither an external AbortSignal nor remaining duration (`runner/src/jev.ts:187–225`).

Relative remaining duration at each hop controls local budgets but cannot by itself prove an upstream call stopped within the original wall deadline after network/queue delay. A timeout must remain an uncertain bill.

**Smallest correction:** define a run-keyed ledger/flight independent of token lookup; remint rotates authority only, preserving flight/generation/unknown-spend state. Specify settlement by admitted attempt ID after revocation and bounded ledger expiry that cannot reset a still-live run. Add the Express route to ownership: connect request abort/response close to an AbortController, pass the signal and validated remaining milliseconds into proxy/client, use a local monotonic deadline covering body consumption, and always preserve timeout uncertainty. Distinguish bounded hook wait from proof of canceled provider work. Test remint while old request is unresolved, revoked request settles once, slow body after response headers, delayed route before upstream admission, and malformed requests at the call cap. State explicitly whether busy denials consume an attempt count. No distributed limiter is needed.

## Slice sizing and exact impact map

Slice 9 currently combines shared type changes, generic transport certification, Telegram batching, dispatcher adaptation and watcher consumption. Slice 10 combines a new transactional queue/state machine with live hook/flow integration. Slice 11 combines a queue reconciliation bridge, recipient dispatcher, cooldown behavior, reply-flow correlation and legacy cut-over. These exceed the stated 4–8-hour junior scope unless support is deliberately narrowed and the work is split before approval, not deferred to the implementer.

Minimum pinned gateway file map for the narrowed provenance repair:

- `src/plugins/types/hooks.ts` — optional typed provenance on raw/received hooks.
- `src/auto-reply/templating.ts` — `MsgContext` carrier.
- `src/auto-reply/reply/dispatch-from-config.ts` — exact metadata producer.
- `src/channels/impl/telegram/bot-handlers.ts` — ordered debounce constituents.
- `src/channels/impl/telegram/bot-message-context.ts` — raw identity into dispatch context.
- `src/channels/fire-message-inbound.ts` — common raw boundary; `src/web/inbound/monitor.ts` is a separate WhatsApp path and cannot be implied covered.
- `extensions/alert-watcher/index.ts`, `src/envelope.ts`, `src/dedup.ts`, `src/classifier.ts`, `src/store.ts`, `src/migrate.ts`, `src/destinations.ts`, `src/reply-flow/suggestions-drone.ts` — consumer/receipt/delivery/accounting changes, split by ownership.

Existing raw hook IDs may be normalized locally for every channel, but cross-hook canonical provenance should initially claim only explicitly certified transport adapters. All others preserve fresh-invocation baseline semantics and remain outside experimental promotion.

Factory record/report slices are appropriately narrow. The proposed single-flight choice is a reasonable Ponytail tradeoff; the missing interleavings and HTTP ownership should be added to Slice 8, with deadline transport separable from budget ledger if size requires it. A versioned logical `decisionId` must be allocated by the caller and reused across its retry attempts, while proxy `attemptId` is server-issued. The current prose states the relationship but does not specify that allocation; add it to avoid orphan retries becoming new decisions.

## Experiment review

Default-rubric-only eligibility, unknown-cost accounting, independent labels, frozen holdout and inactive-by-default promotion are sound. No fabricated measured threshold was found. Proposed numerical router tolerances are explicitly acceptance choices. Before declaring the harness implementable, name the existing fixture runner/evaluation adapter paths and exact CLI/manifests/schema ownership for Slices 20–22; “existing harness adapters” alone is not a runnable integration contract. Thresholds requiring later owner-selected miss tolerances must remain promotion-blocking until present in the approved run manifest, as §9 already says.

## G2 axis scores

| Axis | Score | Reason |
|---|---:|---|
| slice_size | 4 | Broad provenance/receipt/delivery slices still defer their split decisions |
| dod_verifiability | 6 | Strong scenarios, but unresolved state/queue/deadline semantics make several expected results ambiguous |
| scope_containment | 6 | Reuse direction is disciplined; flow provenance reaches an unlisted external repository |
| impact_zones | 5 | Missing external flow producer, suggestion callers and actual Factory HTTP boundary |
| collisions | 7 | Existing proposals and file serialization recognized; add exact owners for new seams |
| testability | 7 | Most defects have excellent controlled repro families; crash/clock and receipt lifecycle need explicit expected transitions |

Verdict veto remains `changes_requested` regardless of arithmetic score. No new runtime or product expansion is requested; narrow the supported origin cohort, choose the existing queue/result seams, and specify the remaining transitions.
