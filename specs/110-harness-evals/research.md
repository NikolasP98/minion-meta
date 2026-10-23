# Evaluation batch source decisions

Meta `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; Hub adapter source baseline `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`.

| Decision | Rationale / current source | Alternative rejected |
|---|---|---|
| Node ESM scripts with built-in test runner | Root package declares Node ≥22 and pnpm; `test:scripts` only selects top-level tests, so nested tests need explicit wiring. | A new service/framework adds no value to a bounded offline tool. |
| Actual A-owned Hub adapter | Current critical-journeys exercises installed gateway/component paths; A03/A05 establish real lineage/event producers. | Reimplementing routing in meta would compare a simulation to itself. |
| Default deny network, explicit live transport | Parent pass-2 router review required a valid-manifest live path exercised with stubs. | An always-reject parser or fake live runner cannot satisfy A31. |
| Small detached local approval attestation | Manifest authoring cannot self-authorize; parent approved separate live approval. Parent orchestrator accepted this narrow refinement for review. | `approved:true`, an arbitrary reference string, manifest-owned trust key or new approval service fails the trust/scope boundary. |
| Append-only runner receipts and single-writer budget journal | Parent §4.2 makes analytics incomplete; §9.1 requires all attempts and per-call/run/day exposure. | Pure in-memory counters or a per-run-only file resets allowance on crash/new run. |
| Retain unknown reservations and fail-closed crash recovery | Provider acceptance cannot be inferred from timeout/cancel or a missing receipt. | Automatic replay or stale-lock removal can spend twice. |
| Strict corpus/split/independent labels | Parent A27 explicitly separates software from 300-episode adjudication. | Repeating synthetic cases to claim corpus readiness or using screener output as truth is invalid. |
| Paired episode-cluster statistics | Parent §9.2 defines exact CPS formula, 10,000 draws and critical veto. | Mean cost of successes alone rewards cheap failures; discarding undefined bootstrap draws hides uncertainty. |
| C exports, F reports complaint experiments | One C PR owns runtime watcher state; one F PR owns evaluation. | Shipping a second watcher implementation or a seventh PR violates batch scope. |

No external model price/accuracy is asserted. Supported live provider profiles reuse Hub's existing OpenRouter decisions endpoint and standard explicit chat-completion transport, but acceptance is demonstrated by bounded wire fixtures and actual adapter code with injected transport. A later paid operation must supply approved current pricing/bounds/model identity. Missing price/bound support blocks admission, not software tests.

Bounded assumptions: a single evaluation writer owns one approval namespace at a time; a stale/corrupt journal fails closed pending audited operator reconciliation. No generic multi-host budgeting/approval service is introduced. The one-case-per-arm live smoke cap is from parent §9.1. C export field names are resolved in the authoritative cross-batch versioned interface; implementation must pin its delivered schema artifact.

C's exact `ComplaintEvaluationRecordV1` contract is authoritative in `../107-harness-gateway/contracts/usage-shadow.md`; F consumes the C-owned schema and frozen fixtures pinned by commit/schema hash. Monotonic `receiptRevision` prevents late exports from double-billing or overwriting terminal facts. Actual shadow bills include every baseline; counterfactual forwarded-subset estimates are labeled separately. The severity-label rubric is independently frozen, not inferred from classifier agreement.
