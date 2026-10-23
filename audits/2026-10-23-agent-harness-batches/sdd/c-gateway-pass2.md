# Gateway C — independent Astra technical pass 2

Reviewer: `/root/astra_sdd_pulse_digest`. Date: 2026-10-23. **Standards: approved with nonblocking precision notes. Spec: changes_requested.** This adversarial review is independent of C authorship. No runtime source, SDD files, indices, branches or commits were changed; no provider call or deployment was performed.

## Reviewed identity and evidence

Meta source `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; Gateway source `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`, branch `feature/agent-harness-c-gateway`, registered PR base `DEV`.

Rehashed all ten C artifacts against `sdd/factory-gateway-report.md`: all match. Principal frozen hashes:

- spec: `72e8a4c9f8be077a2614dd0dedf7dd055fc907310859af9c23414eb6a9fe47f6`
- plan: `25a74716a16091753d81fe026baab9e78f15876dd8b0d9802a9a22701bd74223`
- tasks: `752bac4f7e531c8ff020c4def179dcfe3eec3ed5e4a82929e109025566cff509`
- receipts: `031b74bda355d2ce93ca962136685560ea91bf4281eafc7e0f5de1b1d88f27a2`
- usage/shadow: `21cd4843a4d72327edd1a1bb7c7d4e9a3278cd20fb5dabbbf3e3ffdb1329bee2`
- cron binding: `b453ab412003b5ed1c9b9e8007182d35f68f2783fa8144b54dfb30c6a1b08fb8`
- validation: `c50882a68c8b5914fd67bd96f0bd90e62bac10f7bc504c9b879e17d81f258f47`

Read Gateway AGENTS.md, C spec/plan/tasks/research/checklist/all contracts/stub, the approved parent §§6/7.1/9 and acceptance requirements, and F's actual schema-import contract. Read actual watcher hook/flow/lifecycle/classifier/suggestion/reply store callers, org authority helpers, installed Drone result/fallback implementation, host/events usage boundary, outbound queue admission/checkpoint/recovery/acknowledgement, cron normalization/add/update/main/isolated execution. Source/SDK checks are static review evidence, not executed runtime acceptance.

Verified Gateway lock SHA-256 `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649`; installed Drone 0.6.0 `dist/types.d.ts` SHA-256 `79ea1737f1b5f02251bc4244a34fb8332e5041f547f7d8760cd50e1e0efd97b9`; `dist/run.js` SHA-256 `8616e0559081a095a05bdc28e562e25413ebc9f7792e82421b6f64f45f68e79a`. Actual spec-index exported heading and frontmatter type checks pass the C board stub.

## Standards

The approved parent's scope, one-group PR authorization, disabled experiment defaults, independent review and human release/live gates are retained. Actual source pins and meaningful SQLite/process/filesystem/installed-SDK tests are present. No extra engine, service, framework, protocol field or unrelated repository is proposed. Shared watcher index/store/queue edits serialize within C; D and F consume contracts rather than editing C runtime. The broader group is not misrepresented as a single four-hour slice.

Nonblocking precision:

1. `tasks.md:3,29,32,58` declares paths Gateway-relative, then uses `src/delivery-bridge.test.ts`, `src/delivery-recovery.test.ts` and `src/jev-shadow-eligibility.ts` for files intended under `extensions/alert-watcher/`. Normalize these to full Gateway-relative paths or declare the abbreviation once. The validation guide has the correct test locations.
2. `contracts/cron-binding.md:11` says blank supplied IDs remain invalid schema inputs. Current `src/platform/cron/normalize.ts:309–319` deletes a blank/whitespace ID before the actual RPC schema check (`src/gateway/server-methods/cron.ts:70–72,89–95`); a downstream validator cannot distinguish it from omission. Explicitly preserve/check raw presence before normalization if retaining this new rejection, and test both add/update. Alternatively state the existing blank behavior as outside the parent's nonempty-ID change. Do not assert that schema already rejects it.

## Spec — blocking findings

### C2-01 — Current-authority resolver still permits stale fallback

**Severity:** High. **Acceptance:** A11/A13/A15; FR-C01/C03/C09.

**Artifact:** `contracts/receipts.md:9`; `research.md` current-authority paragraph; `tasks.md:16,27,33`.

**Source:** `src/plugins/org-enforcement.ts:51–81,89–97`; `src/gateway/channel-mirror.ts:41,108,133`.

The contract correctly requires missing/ambiguous ownership to deny certified resumption, but names `resolveAccountOrgIds` plus `isPluginEnabledForAnyOrg` as the authority seam. In DB scope mode, `resolveAccountOrgIds` falls back to gateway JSON after a mirror miss; absent mapping also returns `[]`, indistinguishable from a genuinely unscoped account, and `isPluginEnabledForAnyOrg([])` returns true. Freshly loading config does not make a stale JSON fallback authoritative in DB scope mode.

**Trigger:** queued certified work is pinned to org A; DB ownership is removed/reassigned and its mirror entry is unavailable, while JSON still names A. The proposed helper pair reports the old unchanged owner and enabled state, so admission can proceed instead of fencing. An initially missing mapping can similarly be mistaken for explicit unscoped local authority.

**Minimal correction:** define one narrow watcher authority adapter returning a discriminated scoped/unscoped/unavailable result with its existing source identity. In DB scope mode require the relevant current mirror evidence and deny a miss/unavailable result for certified durable work; do not silently use the helper's JSON fallback. In JSON mode explicitly define what installed account/config evidence establishes local unscoped authority, and reject missing/malformed account identity. Reuse existing config/mirror APIs; no global authority service or wire change. Preserve legacy uncertified compatibility separately. Pin tests for DB mirror miss with stale JSON, ownership reassignment, missing account mapping and an explicitly valid local-unscoped account before admission and received-state settlement.

### C2-02 — Queue expiry is not enforced by the caller that can send

**Severity:** High. **Acceptance:** A14/A15; FR-C04/C05/C09.

**Artifact:** `contracts/receipts.md:47–59`; `tasks.md:31,35`.

**Source:** `src/infra/outbound/delivery-queue-types.ts:65–101` has no expiry/owner retention metadata; `delivery-queue-recovery.ts:117–177` takes the entry lease and can send pending payloads without an expiry check; `src/gateway/server.impl.ts:1428–1445` launches generic queue recovery independently from watcher housekeeping.

The design tells pending safe entries to continue through existing recovery while placing expiry/redaction in the watcher's bounded dispatcher. It specifies a cleanup-before-dispatch test, but no queue-visible deadline or recovery guard that can make it true. Scheduling cleanup ahead of expiry does not cover downtime, disabled watcher startup or generic recovery winning the lease first.

**Trigger:** a caller-managed watcher entry remains safely pending while the gateway is offline beyond retention; on restart generic recovery sends its old body before watcher cleanup runs, or while that plugin is disabled. No tombstone exists yet, so the tombstone-only check does not help.

**Minimal correction:** freeze an opt-in caller-managed payload retention deadline/namespace binding in queue admission and parsing (or an equally concrete existing queue-readable guard). Under the entry lease, generic recovery and any resumed send must enforce expiry before dispatch, atomically redact/retire payload and retain the replay tombstone. Unrelated queue entries retain existing behavior. Name ownership of the types/parser/recovery seam and add the actual generic recovery test with an expired watcher entry and watcher service absent. Distinguish physical cleanup during process downtime from the enforceable rule that expired data is never reused on restart. Include existing complaint/pending-reply raw copies in the cleanup inventory where the new certified path writes them.

### C2-03 — Owner reply state is missing from recovered first-send settlement

**Severity:** Medium, blocking compatibility. **Acceptance:** A15; FR-C05/C09.

**Artifact:** `contracts/receipts.md:40–53`; `plan.md` caller map; `tasks.md:32–35`.

**Source:** existing hook `extensions/alert-watcher/index.ts:788–800` calls `insertPending` after any confirmed delivery; `src/reply-flow/store.ts:38–57` blindly inserts an unkeyed pending row; `src/reply-flow/handle-reply.ts:43–73` depends on it to interpret owner selections. These paths are not named in the new positive/recipient materialization or first-confirmed-send transition.

**Trigger:** a certified positive is delivered, then process death occurs before legacy `insertPending`, or the new worker replaces the legacy handle entirely. The durable recipient recovers as sent, but the owner sees suggestions that have no claim/reply row. Reusing the old insert after each recipient settlement/recovery can instead create multiple pending rows and restart the reply window.

**Minimal correction:** explicitly preserve the existing owner reply integration for the new certified hook path: idempotently materialize/update one bound pending-reply record at the appropriate first-confirmed-delivery settlement using the frozen complaint/origin/suggestions and existing reply configuration, in the same local transaction where practical. Name the existing `reply-flow/store.ts` caller/schema helper and the immutable correlation/uniqueness guard; do not redesign forwarding or add a third general work table. Add two-recipient and crash/recovery tests that prove one pending reply, a stable window, identical suggestion interpretation and unchanged owner handling. Include its raw suggestions/destination copies in the already-required retention inventory. Manual flow compatibility remains separately unchanged.

## Other adversarial checks and evidence limits

- Stable source identity excludes mutable policy/model hashes; exact text and ordered Telegram originals are preserved. Account/org ownership is a separate frozen check rather than a replay-key rotation. No forged flow envelope becomes certified. The missing strict resolver is C2-01, not a request to broaden certification.
- Real `BEGIN IMMEDIATE`, state/generation/due predicates, three bounded pre-dispatch attempts, admitted uncertainty and received local-only replay are specified. `NO_API_KEY` can be proven pre-dispatch from installed SDK `run.js:110–127`; generic network exceptions cannot. Suggestion admission has a separate single-call receipt and unknown fallback remains informational.
- Existing queue signature supports required durability, explicit queueId and caller completion. `deliver.ts:650–654` retains terminal caller evidence; store `acknowledgeCallerManagedDelivery:282–310` only accepts terminal success. C correctly orders SQLite settlement before acknowledgement and never reenqueues missing admitted evidence. Expiry and the preserved reply consumer are the identified missing boundaries.
- Installed SDK fallback catches provider errors at `run.js:168–185`; success has resolvedModel, failures at schema validation omit it, and earlier usage can be lost. C's result-mode host and incomplete cost coverage are appropriate. `usage-shadow.md:36` calls attemptId an external-request attempt, while its wrapper observes one SDK invocation that may contain fallback requests. Clarify that identity/array caps describe admitted invocations, with internal request count/usage unknown unless observable; do not infer a five-network-request cap or invent hidden attempt IDs. This is a precision correction, not a request for SDK changes or disabling ordinary caller fallback.
- `usage-shadow.md:11–13` persists the receipt then emits and forbids received-state reemission. A crash in that gap can omit the analytics event; existing `src/events/emitter.ts:120–142` is also explicitly best effort. Durable receipt export must remain authoritative and analytics emission cannot be claimed as exactly-once durable billing evidence. Add a fault test and document this evidence boundary; a new global event outbox is not required by this review.
- Cron's effective merged update under lock and main/isolated execution checks cover the necessary callers. Validation must precede main-path universal-session discard (`timer.ts:459–477`) and isolated workspace/provider preparation (`isolated-agent/run.ts:174–217`); the current contract says so. Omitted IDs retain default behavior and no session-isolation rewrite is requested. Blank normalization is the nonblocking precision note above.
- C/F exact schema ownership, pinned import, monotonic receiptRevision, stable attempt reconciliation, actual shadow bill versus counterfactual forwarded bill distinction, independent label provenance and no-eligible stop align with F. The frozen SDK result shapes are real. No active mode, live census or paid holdout is authorized.
- Test strategy is credible: installed SDK through stub transport, actual plugin hooks, file-backed SQLite across processes, actual queue files/leases, and real cron store execution. Helper-only tests are explicitly insufficient. The three blockers require additional specific caller cases, not wholesale replacement of the test plan.

## Disposition and G2 scoring

**Pass 2: changes_requested**, limited to C2-01/C2-02/C2-03. Standards are approved with the two precision notes; Spec approval waits for the bounded contract/task corrections and source-backed re-review at new hashes. No runtime qualification, merge or deployment is claimed.

Final canonical G2 scores are deferred until the revised artifacts are approved, as requested. They will score the underlying bounded slices (`slice_size`, `dod_verifiability`, `scope_containment`, `impact_zones`, `collisions`, `testability`), with the owner's group packaging exception; they will not characterize the whole batch as a single 4–8 hour slice.

## Revision 1 bounded re-review — 2026-10-23

The original findings above are preserved. This re-review checks their corrections and the changed integration contracts only; unchanged cleared areas were not reopened. **Standards: approved. Spec: changes_requested solely for the shared add-null compatibility precision below.** All three C2 blocking findings are resolved in the SDD. No runtime acceptance is claimed.

### Frozen evidence

All ten revision-1 artifact hashes match `c-gateway-revision1.md`:

```text
b70f3d744bc5925c46943bfffa812f33d9366bac47b1bb88ba511bfd46f421e6  specs/107-harness-gateway/checklists/requirements.md
6531d7db715239235d63b45026dea434d6e6eb8ea71c8925d684766f471ac7b4  specs/107-harness-gateway/contracts/cron-binding.md
6df70534be754cf48ddc1a5717a2a4eec9478e7ff02e301e0469bc7355dd5a13  specs/107-harness-gateway/contracts/receipts.md
de18af030d6795059d6995d95d842de960e05340298bf7cb530ad64f521c4a63  specs/107-harness-gateway/contracts/usage-shadow.md
ff52f30811f618ccad956014b89ffc27ee09aa55d90af092c8aa71acf75bb891  specs/107-harness-gateway/contracts/validation.md
68832c7547296e257885e57b2383b7a0d1071e651374af671377750f68afcf65  specs/107-harness-gateway/plan.md
887ab0906488d6736aa108c76da3e3b12546cbcf23f0b461b89bf1c76cbc76ac  specs/107-harness-gateway/research.md
de5d9b505abbf5ed6dff20aefee6f387fa734779dd96364b1018dde8be2a4ddf  specs/107-harness-gateway/spec.md
a4b20d81320005e01fd00dcce07fd5e18a3554410a416085ff51416e5c3a8153  specs/107-harness-gateway/tasks.md
07cbfad7f104e8dfb44bfab6b198c4fd0a060752124b2c23c70d4371269b0ab2  specs/2026-10-23-harness-gateway-spec.md
```

All eleven source hashes in the revision report also match. Gateway HEAD remains `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`; lock and installed Drone types/run hashes remain exactly those in the original review. Actual board frontmatter/scalar/array/date/required-heading checks pass. Only this review report was appended; no runtime, SDD, index, branch or commit mutation occurred.

### Original finding disposition

| Finding | Disposition | Source-backed correction |
|---|---|---|
| C2-01 strict authority | Resolved | `contracts/receipts.md:15–23` now defines one discriminated watcher authority adapter. DB mode requires exact current mirror ownership, enabled projection and bounded fresh observation; missing/stale/malformed evidence cannot use JSON fallback. JSON unscoped requires an actually configured installed account and an explicit own-property empty mapping. Rechecks include received materialization/settlement and preserve terminal accounting. Actual `channel-mirror.ts:41,108,133,156–163` supplies these APIs and documents last-good retention; Telegram's installed channel config adapter exposes resolveAccount/isConfigured at `extensions/telegram/src/channel.ts:86–105`. T004–T006/T011 exercise the failing real hook/settlement paths. The five-minute cache limitation is explicit, not misrepresented as instantaneous remote revocation. |
| C2-02 expiry at actual sender | Resolved | `contracts/receipts.md:79–94` persists a strict opt-in callerRetention binding through queue types/parser/store/recovery; entry-lease checks cover generic startup recovery, post-backoff, post-preparation and every provider/chunk boundary. Tombstone write/fsync precedes cleanup and retains accepted/uncertain evidence; cleanup failure cannot send. The watcher may be absent/disabled. T013–T015/T019 and validation require actual queue files, subprocess barriers, before-plugin-startup recovery and unrelated-caller regression. This extends the existing `delivery-queue-recovery.ts:108–190` lease/backoff/send path rather than relying on watcher housekeeping. |
| C2-03 pending owner reply | Resolved | `contracts/receipts.md:67–73` names additive nullable receipt binding, partial unique index and keyed helper in the existing reply store. The first confirmed recipient transaction commits sent/cooldown/reply state before queue acknowledgement, freezing original acceptedAt-based expiry and suggestions. Two-recipient/restart cannot reset claim/window; expired/redacted bindings remain closed. `delivery-queue-types.ts:54–62` already carries acceptedAt, and `delivery-queue-store.ts:176–181` persists it. T007–T009/T016–T019 test migration, unique materialization and actual owner-selection handling against the existing `reply-flow/store.ts:38–98` consumers. No forwarding redesign or third work table was added. |

The provider-success/crash gap explicitly reuses the actual queue mechanism: `deliver.ts:1095` checkpoints in-flight before invocation, `:1139–1159` checkpoints accepted evidence, store `:219–239` recovers in-flight as uncertain, and files `:327–370` fsync/rename under lease. Required kill barriers preserve this mechanism rather than inventing a second queue or exactly-once remote promise. Pending-reply settlement after accepted evidence and before caller acknowledgement is compatible with that ordering.

### Precision notes and changed integration contract

- Gateway-relative task paths are corrected, including delivery bridge/recovery and shadow eligibility.
- Raw blank agent/session presence is now checked before lossy normalization, including actual RPC unwrap and direct service paths. Candidate-copy update validates before live mutation/persistence, and existing session scope is preserved through create/patch/reload. T023–T025 name actual normalization, memory/disk rollback and execution tests. Explicit canonical D origin binding and same-agent isolated execution remain unchanged.
- `contracts/usage-shadow.md:38,104` now defines attempt IDs/caps as admitted SDK invocations, with hidden fallback request coverage incomplete; no fabricated network-attempt ceiling or bills. F schema names/enums and receiptRevision remain unchanged.
- `contracts/usage-shadow.md:11–17` makes durable receipt export authoritative and analytics best effort. T022 tests receipt-commit→emission death without inference/event replay. No new global outbox is required.
- The changed complaint config seam is explicit and narrow: `usage-shadow.md:21–23` adds the exact strict manifest object, current resolver and actual plugin loader/registration tests, default off and no active mode. Config cannot manufacture paid approval. This remains compatible with the previously reviewed C/F receipt contract.

**Remaining shared precision item:** `contracts/cron-binding.md:13` says “add-null remains schema-invalid.” Actual `src/gateway/protocol/schema/cron.ts:24–26,203` accepts null for the common optional binding fields; `src/platform/cron/normalize.ts:309–332` preserves null, and `service/jobs.ts:345–348` passes it through the optional normalizers. Preserve existing add-null omission/default behavior, along with update-null clearing, rather than assert/reintroduce a schema rejection. The parent identified this in pass 1 during this frozen re-review and will coordinate the exact sentence/test-compatibility correction after both reviews. No other new blocker was identified.

### Interim disposition

C2-01/C2-02/C2-03 and all original precision notes are closed by revision 1. Standards are **approved**. Spec waits only for the bounded add-null correction and final changed-hash acknowledgement; this is not a request to reopen the cleared design. Final G2 scores will accompany that approval and score the bounded underlying slices with the owner's one-PR group packaging.

## Final null-compatibility acknowledgement and approval — 2026-10-23

The parent applied only the documented add-null compatibility correction in `c-gateway-null-compatibility.json`. I reread all three changed sites and verified all ten final artifacts: seven remain byte-identical to revision 1, and these three now have the approved hashes:

| Artifact | Final SHA-256 |
|---|---|
| `specs/107-harness-gateway/contracts/cron-binding.md` | `44048d6dc157657b110ad29c6ec3d7d01ea0086c32a30473b76f2f60f2339ca7` |
| `specs/107-harness-gateway/tasks.md` | `5cebf1747a4d2d8a82f1e1e71c2ea75af7cc24576f8d7548881564aa9a4a39be` |
| `specs/107-harness-gateway/contracts/validation.md` | `fcfc8fe1058c12a0a7213f7f97bb111008ffb6b0b22319ef28cb92e2ea249f11` |

`cron-binding.md:11,13,21`, T023 and validation line 35 now consistently preserve add-null omission/default behavior and update-null clearing while rejecting supplied blank strings before lossy normalization. This matches the actual current schema/normalizer/service path and closes the sole remaining precision item. No other requirement changed.

**Final Standards: approved. Final Spec: approved. Independent pass 2: approved for development at the exact final ten-file set above (revision-1 manifest plus these three replacements), subject to the separately required independent pass 1.** C2-01/C2-02/C2-03 and all precision findings are closed. This approval covers the SDD; required runtime tests, independent code review, D/F integration, human merge, deployment and live-operation gates remain separate.

### Final canonical G2 scores

These scores assess the underlying bounded slices A11–A16/A20gateway/A30gateway and their explicit interfaces. The owner authorized one PR for the group; the combined group is not characterized as a single 4–8-hour slice.

| Axis | Score / 10 | Basis |
|---|---:|---|
| slice_size | 7 | Queue-retention and receipt/reply integration are the largest bounded slices, with named existing seams and separately testable task chains; the shared batch remains serialized. |
| dod_verifiability | 9 | Each assigned acceptance maps to actual hooks, SQLite transactions, queue checkpoints, cron normalization/execution or the installed SDK; crash/unknown and compatibility cases have concrete expected outcomes. |
| scope_containment | 9 | Corrections use narrow watcher authority, existing queue/SQLite/reply state and existing cron fields. No new service, forwarding redesign, protocol capability or active experiment is introduced. |
| impact_zones | 9 | Core queue/host/cron and watcher consumers are named; unrelated caller defaults, legacy flows, current mirror limits and D/F integration evidence are explicit. |
| collisions | 8 | Shared watcher/store/queue changes require serialization, which the task graph states; D and F consume frozen interfaces with separate implementation ownership. |
| testability | 9 | Real file-backed SQLite/process races, filesystem fsync/kill barriers, generic recovery before plugin startup, installed SDK stubs and actual RPC/service lifecycle tests make the critical failure modes observable without paid calls. |

All six axes meet the constitution's threshold. No unresolved pass-2 SDD finding remains at the final hashes. Reviewer stops here for parent-managed development and verification.
