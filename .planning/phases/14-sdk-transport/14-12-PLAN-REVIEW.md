---
phase: 14-sdk-transport
plan: "12"
status: amendments_required
reviewed: 2026-09-09
reviewer: jobs_fencing_execute
implementation_authorized: false
requirements_completed: []
---

# 14-12 independent plan review

The six-file receiver foundation is a reasonable boundary, but it is not ready for execution. Amend keyed recovery ordering, lazy native-engine loading and prerequisite sequencing before admission. Root accepted those directions during this review; the reviewed documents below have not yet incorporated that selection. This is independent review of the receiver author’s plan, not implementation verification. I authored the earlier journal design, but did not author these receiver drafts or execute their proposed code.

Read root/gateway instructions, the engineering skill, both receiver documents, the final 11-07 and 09-06 verification records, and the directly relevant canonical contract, registry, manager, machine endpoint and native loader source. Read-only branch check returned `fix/ci-cost-remaining-gaps`. No source, dependency, database, runtime, network or global-plan mutation occurred. Only this report was written.

## Required amendments

| Finding | Concrete evidence and consequence | Minimum amendment and acceptance |
|---|---|---|
| R1: exact keyed recovery must precede the live-bridge requirement | PLAN Task 3 line 124 first requires an owned stored shell and capable current bridge; the packet’s durable retry policy promises the stored identity on duplicate calls. Existing `manager.ts:315–324` also checks bridge availability before forwarding. If the first admission response is lost and the bridge disconnects, the caller has only invocationKey. Canonical `ShellsGetOutcomeParams` requires runId, which the caller has not received. Requiring a live bridge before duplicate lookup strands recoverable durable identity behind transport availability. | After validating authoritative org and normalized key/input/session, look up an existing org+shell+key and verify exact input/session equality first. Return its original identity/status without sending, even while the bridge is offline or incapable. New admissions still require owned current shell, accepted capability, current socket and non-stopping receiver. Select historical keyed recovery consistently with the proposed deleted-shell query policy. Tests: lost first response plus bridge loss, exact retry returns original runId/startedAt and zero additional forwards; changed input/session conflicts; foreign org cannot discover it; capacity does not block exact retry. Root selected this order during review. |
| R2: optional durability must not make legacy module import require SQLite | Gateway declares Node >=22.12.0 while the selected no-flag feature floor is 22.13.0. `src/memory/sqlite.ts:6` loads the builtin only when `requireNodeSqlite()` is called, but bridge precedent `packages/shells-bridge/src/run-journal.ts:15–16` invokes the native loader at module scope. Copying that pattern into a receiver imported by manager could break disabled legacy mode before any feature policy is evaluated. Merely deferring the exact minimum-runtime test would not preserve the selected legacy behavior. | Native loading occurs only when explicitly opening the durable store; manager imports must remain safe when no durable store is injected. Unavailable native SQLite denies durable opening/readiness with a bounded feature-unavailable error and no fallback store. Add an import/disabled-manager fixture with the loader unavailable and a required-mode refusal fixture; label this controlled loader evidence separately from actual unsupported-runtime and exact 22.13.0 tests. Root selected lazy loading and feature-unavailable refusal, with no gateway engine change. |
| R3: prerequisite P and package A form a qualification cycle as written | P owns canonical additions plus gateway shim re-exports and their parity/input tests; A then supplies the candidate containing those additions. Installed gateway shared 0.6.0 lacks that contract. P’s gateway imports cannot be qualified against the new public entry before A exists; an old declaration, copied guard or source alias is explicitly forbidden. PLAN requires both completed P/A receipts before receiver work. | Split P into canonical two-file source/test child (`packages/shared/src/gateway/shells.ts`, `shells-outcome.test.ts`), then root’s complete private emitted package preparation, then gateway parity/input four-file child (`shared-types.ts`, new `shared-types.test.ts`, new `invoke-contract.ts`, new `invoke-contract.test.ts`). Receiver depends on their actual verified receipts. Keep later immutable package/lock adoption separate from private artifact preparation. No receiver file expansion is needed. Root requested this precise split during review. |

These are contract and execution-order amendments, not a request to fold caller routing, startup or sender work into 14-12.

## Required acceptance details within the six files

**Registration capability and current socket.** The proposed machine commit checks are sound: registration is necessary, actual current/open ws identity is checked around the awaited registry lookup, admitted owner/tuple is compared, and native COMMIT has no awaited authority gap. Keep the registration response honest too. Current `bridge-ws.ts` checks closed/open after `attachBridge()` but not manager current identity before setting registered state and responding. A queued replacement can supersede the returned connection before that continuation. Normally closing the old socket hides this; a failed close leaving an old socket open is already an admitted negative fixture. Require current manager connection and receiver readiness at the successful registration response, and bind accepted v1 to that actual connection. A stale response must not advertise receiver acceptance. This fits manager/endpoint ownership and must preserve the existing registration reservation and reusable device-token behavior.

**Quiesce linearization.** Define when an operation becomes admitted for draining. `manager.ts:672` queues short operations through `previous.then(operation)`; checking stopping only before enqueue is insufficient. Require a stopping/current-authority check again when the operation begins and immediately before the synchronous native transaction. Quiesce prevents new writes/readiness advertisement, waits for admitted short operations, and then permits store close. It must not hold the short-operation lock/drain count across the existing 60-second `forwardToBridge()` response wait at line 1033. Test held registry lookup plus queued commit/admission, quiesce, release, and close ordering. Document whether read-only historical query/keyed recovery remains available while stopping; neither should silently resend.

**Physical path and transaction claims.** Retain 11-07’s private trusted-parent and same-UID assumptions explicitly. Schema/policy revalidation inside BEGIN IMMEDIATE protects database-state decisions, not pathname/inode replacement between native opens. Check full schema identity including unexpected objects, persisted policy equality, regular single-link main/sidecars and effective WAL/FULL/foreign-key settings. Reopen with altered policy must refuse without mutation. Native statement rollback, committed visibility and controlled contention do not establish failed COMMIT, process loss, power loss or RPO. Two handles alone are not evidence of simultaneous competing execution: name the actual lock/conflict sequence in the receipt.

**Capacity feasibility.** The plan correctly requires global/per-org retained-run bounds, no pruning and an admission-time obligation. Before schema/API freeze, select explicit bounds for authoritative org, caller key, record/outcome/receipt, and the combined query envelope. Canonical `normalizeShellsGetOutcomeResponse()` applies recordBytes again to outcome plus receipt; valid individual records can exceed that combined bound. Admission must reserve a feasible receipt/query obligation, not simply count an outcome row. Require boundary tests with maximum permitted identifiers/text, full global and per-org capacity, exact duplicate/terminal replay, denied distinct admission and unchanged reservation after an oversized terminal. Logical bounds are not disk quotas or production tuning. No bridge-global one-open-run index belongs in this receiver; distinct shells and organizations must coexist.

**Stored text claim.** “Do not store raw errors” needs precise wording. Canonical `ShellRunOutcome.errorMessage` is bounded sender-supplied public-safe text by contract; its validator cannot prove that arbitrary text is redacted. Reject raw error objects, extra payload/usage and unknown fields. Do not claim that schema or digest validation makes accepted strings secret-free. A stricter vocabulary/redaction rule requires an explicit canonical sender/receiver policy, not silent outcome rewriting after digest verification.

## Authority and dependency assessment

The packet correctly distinguishes JWT-derived org, the literal configured service-account namespace `service`, and unscoped shared-token admin. New durable APIs must reject absent organization rather than inherit `getOwnedRecord(shellId, orgId?)`’s omission bypass. Machine authority comes from the registered credential and stored shell; it cannot choose organization, adopt an unknown run or change the admitted tuple. Query is org-level, not an invented per-user/session ACL. Retained history ownership can survive registry deletion, while new commits still require a current registered shell with matching stored owner.

Separate caller C is necessary: the real dispatcher’s scope classification and method list cannot be proved by manager mocks. Separate lifecycle L is necessary: the current server opens only JsonShellsStore and lacks durable config/drain/close wiring. The six-file receiver can expose injected readiness and quiesce APIs without editing those external seams. Receiver native storage must remain distinct from both the bridge journal and unrelated message ledger. 11-07’s corrected foundation is source/native verified but unwired; it is not a remote receipt store or an archive containing all future P changes. 09-06’s 39-case qualification remains the baseline for device/current-socket and pending-forward ownership, not proof of durable receipt delivery.

After R3, the order is acyclic: canonical contract freeze → complete private emitted package → gateway parity/input qualification → receiver/native manager → actual caller dispatcher → controlled sender integration. Production lifecycle, immutable package installation, exact minimum/unsupported runtime and image qualification remain independently named gates. The earlier 14-11 archive cannot stand in for 11-07 or the new canonical addition.

## Disposition and reviewed identities

**Standards:** Conditional pass for existing-library reuse, isolated native fixtures, source/package distinction and the six-file ownership boundary. Required readiness selections are still pending; no execution is admitted here.

**Spec:** Amendments required for R1–R3 and the explicit acceptance details above. With those recorded, the proposed six files can deliver the scoped injected receiver. They cannot deliver production activation, authenticated caller routing, sender/restore guarantees or SDK-01/SDK-02/AGT-04 completion by themselves.

Root owns proposal/global updates and exact downstream admission. The future source executor owns TODO insertion at still-unwired seams; this read-only reviewer has no source-edit authority.

| Reviewed input | SHA-256 |
|---|---|
| 14-12 PLAN | `c60925f7ae45c934939e7f89340f246f1f32dd9c4cdf63e421eb363a80e89025` |
| Receiver decision packet | `abc224208c002d6fa22b1f3ee31d42c4a30245fa250c23d1864ecc4ac7730e85` |
| Final 11-07 verification | `7753207c14807fee5611409c4f01b090c107dbc6941f45b71f143e07927e3099` |
| 09-06 verification | `8988c0b616642cff5cc274c17dc6e3565eedfab62170969fea5d5a9082f490e6` |
| Gateway manager | `a8db03c3683c13a4ef2794b7f3e41186384ec98ad13ce9e6e9304546f426cbe2` |
| Gateway bridge WS | `8a0b6fbd2026e7d30a2fa61e21684eaad185be9cc09b6880b20665bce5fde451` |
| Canonical shells source | `bc1c4ea5cb4c63bec21c1f1c13058e0e474e0485a1a3331139a25965ed601f80` |


## Consolidated receiver amendment review — 2026-09-09

Root read the complete six-file amendment SHA-256 `aa288b0b79ca532b84cc3878483549a8e2004f24741fef2812c57716a1862b20`. The strict internal `shells.invoke_durable` envelope/ACK, three-table immutable native store, exact keyed replay before capacity/current-peer checks, registered-socket organization binding and short-operation quiesce boundary are accepted for setup. `assertReady` verifies compatibility without treating full capacity as unavailable. The owned literal-loopback fixture preserves actual WebSocket controls.

The required-profile 14-11 archive `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` is independently qualified. Matching 14-14 facade amendment and exact private setup remain pending. Receiver source/test execution is not yet admitted; active gateway, caller authorization/configuration, sender and production lifecycle remain separate.
