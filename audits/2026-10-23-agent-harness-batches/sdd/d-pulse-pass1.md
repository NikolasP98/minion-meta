# D Pulse SDD — independent technical pass 1

Date: 2026-10-23. Reviewer: `/root/astra_sdd_chat_evals` (Astra). **Standards: APPROVED. Spec: APPROVED.** No blocking or required SDD-revision findings at the exact hashes below.

## Evidence identity and scope

Source review is against Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; D/E branches are `feature/agent-harness-d-pulse` and `feature/agent-harness-e-digest`. Both have `bun.lock` SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` and identical Hub AGENTS SHA-256 `782e8f2c953134200af218064c46a4f6231864ecc6d0c050936e00314c7ec8a4`. Meta artifacts are in the delegated `f-evals` checkout. The approved parent §§0–12 governs scope; source changes in other groups were not edited. This reviewer did not author D or E, did not consult the other independent review, and spawned no children.

Read Hub instructions, MINION engineering/testing/change-safety and technical-writing guidance, UI governance, the complete assigned SDD artifacts and normative parent requirements. Revalidated all 19 authored hashes against `pulse-digest-report.md` at entry and before disposition. Actual repository metadata/heading/topic helpers, local-link/placeholder checks and sequential task checks passed. No runtime tests, database migrations, source fetch, provider request, browser acceptance, branch operation or commit was performed. This is approval of the reviewable implementation contract, not proof that its planned tests pass.

Review covers A17–A20 Hub work, the D→E shared seam and C's explicit-agent cron prerequisite. C's final approved `contracts/cron-binding.md` is consumed; D does not implement Gateway changes. D remains one PR against canonical Hub `master`; E stacks later. Owner-directed grouping changes packaging only. Human merge, deployed Gateway qualification and activation remain separate gates.

## Standards

Approved. The documents retain source-backed AS-IS/TO-BE/DELTA, bounded acceptance/task mapping, real migration/seed/RLS proof, current RBAC and UI caller ownership, Paraglide and design/token gates, explicit shared-file serialization, and separate software/deployment evidence. The 26 tasks preserve focused red/green and independent final review. No new scheduler, generic authority service, shared wire release or broad authentication refactor is required.

The proposed SQL seam matches actual code: `src/server/db/with-org-core.ts:25–65` scopes an existing transaction and restores role/GUCs; `src/server/services/bg-runtime.ts:263–289` supplies the owned short transaction; `job-effects.service.ts:375,423` already uses the same role transition. D's data model and T006 explicitly restore bookkeeping role before job writes instead of expanding `app_ledger` access. Restricted-role and same-org other-owner tests are required; a superuser-only green test cannot satisfy them.

## Spec

Approved. The source-confirmed defects have complete owned transitions and executable proof:

| Acceptance / boundary | Source evidence and reviewed correction | Proving tasks |
|---|---|---|
| A17 versioned atomic decision | Current `pulse.service.ts:63–98` mutates by org/id independently; route `src/routes/api/pulse/proposals/[id]/+server.ts:27–82` sends before deciding. SDD locks pending revision, freezes payload/actor/target and inserts one unique dispatch/job with decision in the same transaction. Scoped keys, immutable decided content, state checks and retained tombstones are explicit. | T003–T011, T023; independent PostgreSQL connections, actual routes, constraints/migration/seed rerun and crash tests. |
| A18 all current clients and receipts | Current `pulse.svelte.ts:30–43` sends only action; Pulse page `91–103,149–155` and `NotificationsPopup.svelte:106–114` call it or PATCH without revision. T013 includes all three, not only the page. Pending feed/count/detail and bounded recent/receipt readers share owner filtering. Missing/stale executable revisions conflict, duplicate identical approval returns the same receipt, informational kinds never dispatch, legacy executedAt is unverified. | T008–T014, T024/T025; actual mutation helpers and mounted EN/ES popup/page, keyboard, owner denial, reconnect and one-write committed-refresh failure. |
| A19 selection/claim/backoff | Current `bg-runtime.ts:130–156,355–377` lacks due-time/selected filters and counts every selected ID. Shared contract requires owner/org/type/due SQL before LIMIT, repeats selection/due/generation in atomic claim and direct advance, and counts acquired-and-invoked work only. `commitPostpone` updates domain retry state plus job due/cursor/generation in one owned transaction. Ordinary handler semantics stay unchanged. | T015–T018; more than 20 older unrelated jobs, interleaved postpone/claim, direct bypass, missing handler, stale generation and booking regressions. |
| A20 authority and transport identity | `gateway-rpc.ts:79–130` deliberately falls through to ambient credentials; `personal-agent-binding.ts:35–98` demonstrates available membership/lease/credential/agent rereads. D adds a strict opt-in path and fresh canonical RBAC rows rather than cached `resolveCapabilities` (`rbac.service.ts:340–425`). Qualification compares authenticated hello version/full commit to exact trusted deployment record and sends on the same prepared connection after committed admission; reconnect invalidates it. | T019–T022; actual local WS server, two same-gateway profiles, fallback trap, revoked grants/assignment, missing/changed build and crash/ambiguous response with zero automatic recall. |
| A20 actual action schemas and uncertainty | Gateway `calendar-tools.ts:95–116,248–279` exposes the `approved` bypass; D explicitly excludes it, retains downstream approval and never calls scheduling execution. Gateway `cron.ts:200–212` takes flat params; D removes current `job` wrapper and binds explicit agent/origin session, isolated execution and delivery none. `hello-ok.server` identity actually exists at `message-handler.ts:1077–1078`. | T009/T020/T021 and validation step 6 qualify actual serialized request against C; malformed IDs/unknown explicit agents never fall back. |
| D/E and lifecycle | D supplies transaction-taking enqueue, same-transaction postponement and selected remaining-budget signal. Selected execution accommodates E's full 30-second call while global tick keeps its existing 25-second cap. Current `/api/jobs/tick/+server.ts:42–53` remains opt-in for background jobs. Cancellation is wired to real `user.service.ts:205–215,280–325` removal callers plus config reconciliation; admitted identity survives cleanup. | T016/T017/T023 and shared contract; E consumes the D commit before shared edits. |

The same-origin browser mutation requirement in `contracts/pulse.md:5` must be implemented at the actual JSON POST/PATCH boundary and included in route tests; current hooks do not supply a generic JSON Origin guard. Existing `src/routes/api/dev/switch-user/+server.ts:12–24` is a local source pattern, not an auth exemption to copy. This is an implementation check of an already explicit contract, not a new SDD finding.

Retention likewise belongs to D T023's actual reconciliation/cancellation path, not merely a callable helper or a dependency on E. Its one-way raw-snapshot redaction must preserve frozen hashes/admission identity and cannot restore replayability. These existing obligations remain part of code review and runtime proof.

## Canonical G2 scores

Assessed over original bounded Slices 17, 18, 19 and Hub portion of 20, packaged in one authorized D PR. Scores do not treat the entire batch as one 4–8-hour slice.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Original slices remain separable, but SQL migration/RLS and live-socket/crash qualification are substantial. |
| dod_verifiability | 9 | Every acceptance names actual routes, SQL invariants, transport counts and UI outcomes. |
| scope_containment | 9 | Existing Pulse/runtime only; C runtime and deployment qualification are explicit boundaries. |
| impact_zones | 9 | Hub DB/API/UI/RBAC, strict RPC and C wire dependency are mapped to real callers. |
| collisions | 8 | D/E shared files and A/E fixture/localization overlap are identified and serialized by parent. |
| testability | 9 | Executable commands require real PostgreSQL, local WS, child-process failure and mounted/browser proof. |

Equal-weight mean: **8.5 / 10, pass**. No score is substituted for implementation evidence.

## Exact reviewed artifacts

| Meta-relative file | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `433626aee35d88ea157e6d1f4d4bea20e55083d6f03596f1d17efdfeb430be24` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `0838bbb2ecde42f077693ded6ee4d7e29c7ae61638bacc7b3c4b802164ec6f5d` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `46d8a9fcaedf597d833487b9e77a1072f51feeff532fb1bc823e9d4b1c555940` |
| `specs/108-harness-pulse/research.md` | `5b3180441368c36546e433c02ceaa8499c60edbfe81324b0cfac235e36630797` |
| `specs/108-harness-pulse/spec.md` | `60908aae64fee65aa9de9f100fee3d6354bb79a8fc3a49d1de931914b6a060e4` |
| `specs/108-harness-pulse/tasks.md` | `6bcff6d90d081bec9bdba831789b3179ddac2ae4b082a58e99fe64fa34d67694` |
| `specs/2026-10-23-harness-pulse-spec.md` | `5fb285a2cf7ad547340dac392ac5a73dfe3b4cc48c239a8e2b99a5154b33d6f8` |

## Disposition

**Pass 1 approved at these exact hashes.** No author revision is required by this pass. A second independent approval is still required before runtime work. Parent retains commit/PR sequencing; no merge, deployment, paid execution or operational activation is authorized here.


---

## RECOVERY — independent pass 1 rereview of revision 1 (2026-10-23)

Reviewer: `/root/astra_pulse_pass1_recovery` (Astra, replacement independent reviewer after the original pass-one thread was lost). **Standards: APPROVED. Spec: APPROVED. D2-01: CLOSED at the ten hashes below.** No blocking or required SDD-revision finding remains in this bounded rereview.

This reviewer did not author D or its correction, spawned no children and did not read the pass-two rereview disposition. The parent reported that another pass had approved; this assessment rests on the documents and actual source paths inspected independently. The original pass-one report above is preserved byte-for-byte; its pre-append SHA-256 was `b8a15cbd5240dddfd4c9ba93becaaec50a6999b6ecfb8e88952219c9104d2937`. Its old hashes remain historical, not approval of the new seven-document revision.

### Evidence and bounded scope

Read the applicable meta/Hub instructions, MINION engineering review and change-safety guidance, technical-writing guidance, parent A17–A20, revised D specification/plan/tasks/research/checklist/stub/validation and unchanged API/shared contracts. Recomputed all ten artifact hashes and all six revision-report source hashes: every value matched. The API contract, D/E shared contract and data model still match the original independently approved manifest. FR-001–FR-009 match the pre-revision committed specification byte-for-byte. Hub source remains clean at `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; artifact checkout `git diff --check` passes. Original approved areas outside this correction were not broadly re-audited.

### Standards

Approved. Ownership now includes both existing notifications files, their actual server-load test, the real shared helper and mounted/browser proof. T012 preserves `users:manage` review and org-kind visibility while adding the shared Pulse owner filter, safe projection and read capability. It explicitly preserves the unrelated inbox and join-request access paths. T013/T014 preserve action-runtime outcomes, semantic primitives and localized copy; T024/T025 retain complete Hub, route, design/token, i18n and browser gates. This is a bounded repair of an omitted existing consumer, with no new endpoint, permission expansion, D/E interface change or unrelated UI redesign.

### Spec

Approved. Independent source inspection confirms the causal paths and test viability:

- `src/routes/(app)/notifications/+page.svelte:111–115` currently sends only an ID through the shared helper, then independently invalidates `app:notifications`. Cards render `data.pulseProposals` at line 281 and pass `p.id` at lines 297/306. T013 explicitly carries the exact rendered revision through both decisions. T014's SSR revision 1 versus shared/server revision 2 case would detect a helper that substitutes the newer revision; both actions must conflict with zero dispatches, and a subsequent decision requires displayed revision 2.
- `src/lib/state/features/pulse.svelte.ts:30–43,52–53` currently returns no authoritative action outcome and refreshes shared state. T013 requires retaining the committed result before page invalidation, fencing stale controls on invalidation failure and read-only recovery. T014/T025 require exactly one write for both committed approve and dismiss, and reconnect/readback of the same decision/receipt. This covers the independent page-invalidation failure as well as shared helper refresh behavior.
- `src/routes/(app)/notifications/+page.server.ts:15–41` is a separate SSR entry: review capability, org-kind visibility, `listPending(ctx)` and independent inbox/join-request data. `pulse.service.ts:43–60` currently reads/counts org-only pending rows. T012 and validation steps 3/4 name the actual load and real owner-filtered reader against disposable PostgreSQL, including same-org other-owner exclusion, allowed legacy rows, safe projection, denied review access and business visibility. Synthetic page data alone cannot satisfy this requirement.
- Source-wide `rg` finds current approve/dismiss callers in the Pulse page, popup and notifications page. All three now appear in ownership and T013/T014/T025. The existing critical-journeys builder mounts real route components and aliases application navigation, so extending it with a new `PulseFixture.svelte`, actual notifications page and controllable invalidation boundary is a viable seam. `PulseFixture.svelte` does not yet exist in the source pin; it is correctly an implementation task, not current evidence. Plan ownership includes fixture build/serve and E2E integration. Existing suite network/provenance checks must be retained when adding modes/cases. Both EN/ES keyboard actions and recovery, current-source screenshots and request counts are explicitly required.

No runtime, database, browser, provider, network or production operation was performed for this SDD review. No source/spec/index/branch/commit was changed. All planned mounted, SQL, browser and full-gate outcomes remain unproven until implementation. Approval covers the implementation contract only; it does not authorize merge, deployment or activation.

### Canonical G2 scores

These scores apply to the original bounded slices packaged into D, with the existing notifications consumer restored to A18 scope.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Four original slices remain substantial; the correction extends existing A18 tasks. |
| dod_verifiability | 9 | Exact displayed revision, response/refresh ordering, readback and write counts are observable. |
| scope_containment | 9 | Existing notifications Pulse section only; unrelated sections and interfaces remain bounded. |
| impact_zones | 9 | Independent SSR loader, shared helper and all three decision surfaces are covered. |
| collisions | 8 | Shared localization/fixtures and D/E files remain explicitly serialized by parent. |
| testability | 9 | Actual server load with PostgreSQL plus mounted page/helper and browser failure injection are feasible. |

Equal-weight mean: **8.5 / 10, pass**.

### Exact revised artifacts approved by recovery pass 1

| Meta-relative file | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `fc0eaeeed22ef1125352665cdf059722bc8d5a0050dfef4bc7c7d8110fc8bcea` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `b34624423c44b063a4b3af36dad451bb5cadd759cd1dfb45993e31c6c13bfd62` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `37965f6d85ffbed2e5f41f981abf67850785577e78c67a818eef59b214cf1e2d` |
| `specs/108-harness-pulse/research.md` | `5af597a077fedd6df921a1388b71a9fa9cba968c2a8f52d48712bc0294996d32` |
| `specs/108-harness-pulse/spec.md` | `127e3dafe1864eed711618c33c74f948573acf022d76f389e80afe8739e13578` |
| `specs/108-harness-pulse/tasks.md` | `1556373679bb78beaa15f18e041bb1fadd53df57db25f107bec46df713187537` |
| `specs/2026-10-23-harness-pulse-spec.md` | `cbcdb67f5f0899455d48909e33eb4905ac2150c5fa2f5ad3882e1546d864c997` |

**Disposition:** Recovery pass 1 approves this exact ten-file revision-1 candidate. Parent must verify both independent reviews refer to these same hashes before code begins. The earlier pass-one omission of `/notifications` is corrected by this appended assessment; the preserved historical text is not reused as proof of that consumer.
