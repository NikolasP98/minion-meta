# F Evaluation SDD independent pass 1

Reviewer: `/root/astra_sdd_pulse_digest`. Date: 2026-10-23. **Standards: approved. Spec: changes_requested.** This review is independent of F authorship. Only this report and the assigned A review report were written. No runtime/spec/index edits, commits, branch operations, provider calls or deployment occurred.

## Evidence identity and scope

Workspace prefix: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst`. Paths below are relative to meta `f-evals` unless marked Hub or Gateway. Meta runtime base is `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; observed HEAD `935eb8e4f9846e1aa4cb114fb71476a331d18b08` adds two SDD-document commits. Branch `feature/agent-harness-f-evals`, PR base `dev`; `pnpm-lock.yaml` SHA-256 `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`. All eight F artifacts match the author freeze:

```text
4f49be57f7cdd4a7648f4d163f4e6523b7088cddf2741ef9ecf308d95ffaa524  specs/110-harness-evals/checklists/requirements.md
8eb2aa82191d7d01dcc5603d28e1f6754a069b88996a948e829bd3117d88fcce  specs/110-harness-evals/contracts/evaluation.md
7980c98e0efc2bd82ac77048604292725a720aa575f6ea79ebd5fbd7362270a3  specs/110-harness-evals/contracts/quickstart.md
f154d617ab8e4e7b6590f89f4c792028686c7ade549db540c93533eebdac80dd  specs/110-harness-evals/plan.md
82ce94452d7fc31617f347ffcfe63686e054c1045018daf14aa0d51df169c63a  specs/110-harness-evals/research.md
076363cee8500468a4cea64e0318c3a586df70c01a2e7ea3fff963e27cd371e1  specs/110-harness-evals/spec.md
f0e87d521896db8ef885b8820fce8fc26fb5b97ba2f6c455058a181c098d7653  specs/110-harness-evals/tasks.md
60a70a4641b3aa814dd8d2b467455b435a5e73271473e98a22559abcffd61086  specs/2026-10-23-harness-evals-spec.md
```

Reviewed full spec, plan, tasks, research, both contracts, checklist and board stub against parent A26–A31 and §§9.1–9.4. Also reviewed A's complete adapter contract and actual Hub source/installed SDK/fixture builder, and the frozen C usage-shadow export contract (`21cd4843a4d72327edd1a1bb7c7d4e9a3278cd20fb5dabbbf3e3ffdb1329bee2`, read from committed `935eb8e4f` while C revisions are pending). Gateway source baseline is `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`; this review does not approve C's pending runtime design. F correctly requires later C implementation commit/schema SHA and C-produced fixtures instead of treating the prose hash as runtime evidence.

At this source pin `scripts/agent-evals/` does not exist. These are pre-implementation contract findings, not allegations about an implemented budget module. Actual root `package.json:27` executes only `scripts/*.test.mjs`, and `.github/workflows/ci.yml:53` calls that command; F T022 explicitly adds an executed nested lane. Hub `@minion-stack/shared` 0.9.0 and its actual beginRequest behavior were checked in the A review. The fixed provider profiles are reviewable request-shaping contracts to be stub-qualified, with no assertion of live provider availability or current prices.

## Standards

AS-IS/TO-BE/DELTA, parent traceability, source/lock gates, implementation ownership and test/operation boundaries are explicit. The one-PR packaging is the owner's override for separately bounded slices; no separate service, production credential resolver, automatic policy promotion or live execution is added. A's adapter and C's authoritative schema remain their owners' implementations; F does not clone either. Optional E feedback is explicit, file-based and revisioned.

Read-only checks executed: all frozen hashes matched; repository frontmatter/scalar/array/date/state/verdict and required-heading validators accepted the F board stub. Shared index was neither regenerated nor claimed fresh. The test plan correctly requires actual CLI/subprocess and production provider-adapter stub paths, crash tests and source/dependency manifests; pure helper tests cannot qualify the runner.

No blocking Standards finding. The detached built-in-crypto verifier is within the approved narrow trust boundary and does not need a new approval service. Human corpus labeling, paid smoke, held-out execution, promotion and release remain separate operations.

## Spec — blocking finding

### F1-01 — high: caller-selected journal path can create a second spend authority for one approval

**SDD anchors:** `specs/110-harness-evals/contracts/evaluation.md:18–20`, `:42–48`, `:82`; `tasks.md:43–48` (T014–T019); `spec.md:80–83,99,114`. Parent A31 and §9.1 require bounded admission, persistent unknown exposure and zero dispatch when approved exposure is exhausted or ambiguous.

**Trigger:** Invoke the future actual live CLI with a valid attestation, its configured trusted public key/owner and `--budget-journal /private/ledger-a`. An admitted attempt becomes indeterminate, consumes the day limit or its namespace is retired. Invoke the same approved namespace/binding with `--budget-journal /private/ledger-b`, or run both paths concurrently. The contract defines the journal key and lock but does not bind the canonical journal/registry identity or location into trusted operator configuration or the signed approval. Its CLI accepts an arbitrary absolute journal path. Separate paths can therefore start with empty histories and separate locks while every specified signature/manifest/namespace check still passes.

**Consequence:** Same run/day authority may receive a new allowance; unknown or permanent-retirement markers in the first file are not consulted; one-active-request is only enforced per selected file. Immutable `approvalNamespace` alone cannot find state that the invocation can relocate. The symlink prohibition at line 20 covers generated artifact roots and does not establish which existing accounting registry is authoritative. Existing source provides no preexisting evaluation registry to fill this gap.

**Smallest correction:** Bind the one accounting root/registry identity for an approved authority namespace in read-only trusted operator configuration and/or the signed approval scope, outside caller-generated run outputs. Resolve and verify that canonical identity before any lock/admission; a `--budget-journal` argument must identify that already-authoritative registry, never create a replacement authority merely by selecting a new path. Define safe first initialization separately from reopening: missing/replaced/corrupt expected state must fail closed, and relocation must preserve all reservations, unknown fences and retirement markers through an explicit operator reconciliation boundary. Reject escaping/symlink aliases or make permitted aliases resolve to the same identity/lock; new run/manifest/approval aliases cannot reset the binding. This is a small local filesystem contract, not a daemon, database service or new key-signing tool.

**Required proving cases:** Using the actual live CLI with test-only approval and stub provider, (1) run two subprocesses with the same approved namespace but different journal arguments and prove at most the authoritative path may dispatch; (2) an unknown reservation, exhausted day allowance and retired namespace in the authoritative journal each refuse a fresh alternate path; (3) symlink/alias paths cannot acquire a separate lock; (4) deleting/replacing expected state does not automatically initialize an empty allowance. Keep valid canonical-path admission covered so the correction does not reduce live support to always-reject. Add these cases to T014/T016/T019 and freeze the corrected approval/budget contract.

## Acceptance coverage beyond F1-01

| Parent acceptance | Review result |
|---|---|
| A26 | Actual A stdio adapter, mounted real contexts/parser/tool paths, strict handshake/reset, three arms, event dedupe/explicit joins, missing receipts and default network denial are required. `contracts/eval-adapter.md:11–38` rules out a synthetic fallback claiming real integration. A's separate transition finding must be resolved before cross-group safety completion. |
| A27 | Strict truth/permissions/receipts, leakage groups and independent label revisions; dev-mode holdout refusal before loading bodies; twelve families, bilingual/compaction fixtures and truthful human-label readiness. No fabricated 300-episode completion. |
| A28 | All-attempt CPS numerator, matched cluster resampling with 10,000 seeded draws, repeated-observation policy, nonfinite draw handling, adverse unknown bounds, critical veto and drift cohorts align with parent. Synthetic computation qualification is separate from a powered quality conclusion. |
| A29 | Deterministic receipt checks precede semantic screening; gold labels are isolated, controls retain selection probabilities, fixed-budget weighted misses/uncertainty and abstention remain explicit. No billing or release authority. |
| A30 evaluation | Exact C schema import/version pinning, receiptRevision reconciliation and immutable known bills are explicit. Logical-source denominator includes all eligible sources. Actual shadow gate/baseline/suggestion costs remain separate from forwarded-subset counterfactual estimates. Missing independent severity labels or frozen bounds blocks recommendation; no eligible traffic yields do-not-pilot. |
| A31 | Complete valid-attestation live path uses actual provider shaping with stubs, fixed endpoint profiles, explicit credentials, fixture-only tools and no retries/fallback/redirect. Reservation-before-dispatch, received-evidence-before-interpretation, unknown crash fence and conservative recovery are specified. Canonical budget registry authority is the single blocking gap above. |

C's current implementation has incomplete SDK fallback billing coverage, and its export contract preserves that uncertainty. F does not turn a final resolved model or an unknown gate into a known zero/negative. Cross-group qualification must pin the eventual independently reviewed C schema and retain its purpose/attempt constraints; no copied second schema is authorized. No further blocking finding was identified.

## Disposition and G2 scoring

**Pass 1: changes_requested**, limited to F1-01. Standards are approved; Spec approval waits for the bounded accounting-identity correction and hash-bound re-review. No software execution, actual paid smoke, corpus readiness, quality promotion or release is claimed by this SDD review.

Final canonical G2 scores are deferred until the revised artifacts are approved. The axes are `slice_size`, `dod_verifiability`, `scope_containment`, `impact_zones`, `collisions`, `testability`, scored on the underlying bounded slices with the owner's authorized group packaging.
