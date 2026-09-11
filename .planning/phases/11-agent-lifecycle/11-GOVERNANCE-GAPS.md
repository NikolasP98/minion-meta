---
phase: 11-agent-lifecycle
plan: "05"
requirement: AGT-06
status: evaluated-no-source-failure; follow-up admissions open
candidate: minion-factory 02900306a1fcc7b182bae726a24260d08467f81e (origin/dev == origin/main on 2026-09-11)
corpus: minion_factory/runner/test/fixtures/governance-replay.json (18 cases) via runner/src/governance-replay.test.ts
executed: 2026-09-11
---

# 11-05 governance evaluation: effect evidence and gap dispositions

Scope: local, no-provider replay of Factory runner governance seams. Every verdict is read from a durable effect (table rows, counters, revocations, ledger state) and the exact denial receipt the source throws or returns. No seam admitted a prohibited effect at the recorded candidate, so no source patch is proposed by this slice. The boundaries below that the corpus does **not** reach stay open and need their own admitted plan; none is marked complete here.

## Corpus disposition (all 18 cases replay identically: in-process p2/p3, and in two fresh processes)

| Case | Runner seam (source function) | Effect asserted | Verdict |
|---|---|---|---|
| spoofed-actor-forged-control-token | `orchestrator-lease.resolveOrchestratorCapability`, `phase-requests.submitPhaseRequest` | forged `fic_` token resolves to null; forged lease owner cannot enqueue: 0 `phase_requests` rows | denied: `orchestrator lease is no longer current` |
| spoofed-actor-cross-instance-lease | `submitPhaseRequest` | a live lease on instance A cannot write to instance B (0 rows on B, 1 on A) | denied, same receipt |
| denied-tool-write-phase-outside-current-phase | `submitPhaseRequest` | request for `develop` while current phase is exploration: 0 rows | denied: `develop is outside the runner-owned current phase` |
| denied-tool-caller-supplied-permissions | `phase-requests.validatePhaseRequestDraft` | draft carrying a `permissions` field: 0 rows. Note: the schema has no permission field at all; denial is the strict-shape validator, not a permission policy | denied: `phase request has unknown or missing fields` |
| tool-identity-allowlist-equals-contract | `codex-broker-policy.buildCodexBoundaryLaunch`, `codex-boundary-contract.INSTANCE_MCP_TOOLS` | broker `BROKER_MCP_ENABLED_TOOLS` equals the 4-tool contract; no control/tool-host/instance token appears in the redacted plan | admitted (identity match) |
| budget-exhaustion-denies-reservation | `budget-reservations.reserveStageSpend` / `settleStageSpend` | cap 1.00 vs estimate 1.90: 0 reservation rows; settle on the unreserved stage throws | denied: `daily budget reservation would be exceeded` |
| budget-admits-within-cap-and-replays-same-binding | `reserveStageSpend` | 1 row; identical replay returns `existing reservation` without a second row | admitted |
| identity-model-change-conflicts-with-reservation | `reserveStageSpend` | same run/phase/attempt with `sonnet` instead of `opus`: 1 row, stored model stays `opus` | denied: `reservation binding conflict` |
| identity-mutable-image-tag-rejected | `buildCodexBoundaryLaunch` | `:latest` broker image: 0 launch plans | denied: `broker and tool-host images must use immutable sha256 digests` |
| identity-schema-version-change-rejected | `submitPhaseRequest`; `manifest.unionManifest` | `schemaVersion: 2`: 0 rows; prior manifest under policyVersion 2 rejected | denied: `unsupported phase request schema` / `prior manifest policyVersion does not match pinned topic policy` |
| mutable-input-metadata-cannot-alter-snapshot | `manifest.createManifestSnapshot`, `validateStoredSnapshot`, `hashManifest` | caller pushes to `declared` and to `snapshot.manifest.declared` after creation; stored manifest still has 1 declared topic and the hash equals a fresh resolve | admitted (identity stable) |
| mutable-stored-manifest-rejected | `validateStoredSnapshot`, `unionManifest` | semantic tamper (effective/risk) rejected; rewritten manifest hash rejected; rewritten policy hash rejected; prior manifest with widened declared rejected by union | denied: four distinct receipts recorded |
| expired-approval-lease-capability | `resolveOrchestratorCapability`, `renewOrchestratorLease`, `expireOrchestratorLease`, `submitPhaseRequest` | after `ORCHESTRATOR_STARTUP_LEASE_MS + 1`: capability null, renewal and submission share the exact denial, 1 capability revoked, status `attention-required`, 0 rows | denied: `orchestrator lease is no longer current` |
| expired-approval-high-risk-proposal-not-auto-approved | `lifecycle.proposalAutoApproveEligible` | high-risk tag, untagged, and non-draft each refused with distinct reasons | denied: `high-stakes tag(s): infra` |
| retry-after-commit-skips-performed-effect | `db.ensurePhaseEffect` | perform runs once; replay outcome `skipped`, 1 confirmed row, ref preserved; changed `planRevision` refused as `conflicting lineage binding` | admitted (no second effect) |
| retry-bounded-after-repeated-ambiguous-failure | `ensurePhaseEffect` (`MAX_PHASE_EFFECT_ATTEMPTS`) | 3 performs then `refusing to retry`; row stays `pending`, never auto-confirmed | denied |
| cancellation-revokes-capability-and-queued-work | `orchestrator-lease.cancelOrchestratorInstance` | capability no longer resolves, queued phase request `canceled`, exactly 1 `instance.canceled` event, second cancel idempotent | admitted (status `canceled`) |
| cancellation-cannot-rewrite-completed-history | `cancelOrchestratorInstance` | completed instance stays `completed`, 0 cancel events. Fixture forces `status='completed'` by SQL because the real completion path needs verified handoff evidence (covered by `orchestrator-lease.test.ts` "completion requires exact verifying state...") | denied: `completed instance history is immutable` |

Corpus self-checks: identity block must carry clock, schema version, tool contract (checked equal to `INSTANCE_MCP_TOOLS`), sha256-pinned broker/tool-host images, the topic policy and its hash (checked with `hashTopicPolicy`); removing identity, removing the hash, tampering the policy, or drifting the tool contract each rejects the corpus. Fixture text is checked to contain no credential-shaped tokens and no prompt/token/apiKey keys. A forged "admitted" expectation for the budget case is asserted to fail.

Fixture hardening done during this execution (not source changes): esbuild rejects `type` specifiers inside destructured dynamic imports (moved to `import type`); `budget_reservations.run_id` references `runs(id)`, so budget seams seed their run row; the credential regex needed a left boundary so a case id containing `risk-proposal…` is not read as an `sk-` key; the tampered-manifest case now records the semantic receipt first and the hash receipts separately, matching `validateStoredSnapshot` order.

## Boundaries the corpus does not reach (open; each needs its own admitted plan)

| ID | Boundary | Exact seam | Why not covered here | Smallest follow-up | Dependency / authority |
|---|---|---|---|---|---|
| GG-01 | Runtime tool denial inside the container boundary | `minion_factory/tool-host/src/mcp.ts`, `broker/src` (`BROKER_MCP_ENABLED_TOOLS` consumption) | The runner corpus proves the launch plan's allowlist equals the contract; it does not run the broker/tool-host and observe a call to a non-allowlisted tool being refused. `broker/src/broker.test.ts` covers config parsing only. | One node test in broker/tool-host ownership that invokes the MCP dispatcher with a tool outside the allowlist and asserts the refusal receipt and zero runner calls | Factory broker/tool-host ownership; local, no container needed |
| GG-02 | Real remote effects | `containment-effects.ProductionContainmentGitHubRemote` (push, draft PR) | Covered only through `FakeRemote` in `containment-effects.test.ts` (30/30 at base). Real GitHub effects require tokens and the external containment drill. | None locally | Phase 17 external containment activation gate; D360-03 (no activation from this slice) |
| GG-03 | Image identity at run time | `buildCodexBoundaryLaunch` (plan-time digest regex) | Digest enforcement is proven at plan build; pulling/verifying the digest and starting the container is not exercised locally | None locally | Phase 17 drill (docker) |
| GG-04 | "Expired approval" as a first-class concept | none in Factory | Factory approvals are proposal transitions plus `proposalAutoApproveEligible`; there is no approval TTL. The corpus maps expiry to lease/capability expiry and to auto-approval refusal. Inventing a TTL would be an unauthorized policy (no retention duration may be inferred). | Only if policy authority defines an approval lifetime | Decision owner; not a source defect |
| GG-05 | Drone runtime differences | `drone/src/define.ts` (`defineDrone` snapshot), 11-01/11-06 abort-aware waits | Drone has no budget ledger, effect ledger, or topic manifest; identity governance is the frozen definition snapshot, and cancellation is a cooperative abort, not a termination receipt. Read-only replay at drone `0cdf5e6c` (WIP checkout): `define.test.ts` + `run.test.ts` 29/29. | None; difference recorded, no universal runtime forced | Drone ownership |
| GG-06 | Paperclip `minion_drone` adapter differences | `paperclip-minion/packages/adapters/minion-drone/src/server/runtime.ts` | Governance is: caller `model`/`prompt` config refused before connecting (`minion_drone_config_forbidden`), execution refused unless the probe is ready, cancellation forwarded via `drones.cancel`, timeout distinguished (`minion_drone_timeout`). Identity is drone id + version from the gateway capability; no budget or manifest. Read-only replay at paperclip `2abd5f7d`: `runtime.test.ts` 6/6. | None; difference recorded | Paperclip ownership |
| GG-07 | Factory containment activation, live dispatch/merge flags | runner env/config | Deliberately untouched (D360-03). Local effect passes do not satisfy the phase 17 external gate. | None | Phase 17 |

## Closure statement

AGT-06 is **not** closed by this slice. Delivered: a deterministic, no-provider effect corpus with immutable identity, negative cases, and cross-process identical verdicts; every reached seam denied what it must deny. Still required before closure: GG-01 executed and verified; GG-02/GG-03/GG-07 through the phase 17 gate; independent review of this candidate (D360-07).
