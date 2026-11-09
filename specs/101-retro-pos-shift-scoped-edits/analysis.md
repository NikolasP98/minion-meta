# Specification Analysis Report — 101-retro-pos-shift-scoped-edits

Artifacts: `spec.md` (23 FR + 6 INV + 6 SC + 4 user stories), `plan.md`, `tasks.md` (53 tasks),
constitution v1.0.0. Read-only pass; nothing was edited to make a finding go away.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|---|---|---|---|---|---|
| D1 | Constitution | **CRITICAL** | constitution "V. Security and data work keeps human gates"; tasks.md Phase 1–7 | Principle V requires **owner approval of the spec before code**. The feature is data-tagged (migration, production money rows, tenant scoping, a write-refusal control), yet no task represents that gate — T049 only covers owner *merge*. An agent following tasks.md would start coding at T001 without it. | Add T000 "owner approves this spec (data-tagged)" as a blocking task before Phase 1, and repeat the gate per PR in the PR body. |
| C1 | Coverage | HIGH | spec.md FR-022, INV-6; tasks.md T048 | FR-022's second half (an unlock leaves a trace) is carried by a single *conditional* task ("if it is not in this slice, it needs the TODO and the proposal entry"). A requirement whose task may legally end in a TODO has no test task at all, and INV-6 has none either. | Either drop the unlock half of FR-022 to the deferred list explicitly (with the owner told), or give it a real task + test. Do not ship a MUST whose task is "or ledger it". |
| C2 | Coverage | HIGH | spec.md FR-020; tasks.md T050 (Phase 7) | FR-020 (open-shift customer/document and note edits) is written as a MUST in the spec but lives only in Polish, after all three PRs, with no test task and no acceptance scenario of its own. That is a requirement in name only. | Move it into S1 or restate it in the spec as deferred scope with its own slice. A MUST parked in Polish is the classic silent omission. |
| A1 | Ambiguity | MEDIUM | spec.md "Deferred" (FR-011a, FR-021a) | Two `[NEEDS CLARIFICATION]` markers survive into plan and tasks. FR-011a (what happens after the authority *rejects* a document) touches INV-5's wording and US3's retry semantics; FR-021a is cosmetic by comparison. | Get FR-011a answered before S2 is coded — the retry rule depends on it. FR-021a can ride along as an owner question. |
| A2 | Underspecification | MEDIUM | spec.md FR-017 ("already reconciled/accounted") | The guard chain names a state the spec never defines. In the AS-IS it maps to an invoice provider reference on the sale, but a reader of the spec alone cannot test "reconciled". | Define the state in Key Entities (one line) or rename the step to the observable condition. |
| E1 | Coverage (SC) | MEDIUM | spec.md SC-001; tasks.md (none) | SC-001 ("under 30 seconds, from the till, without a manager") has no verification task. The quickstart walks the flow but measures nothing. | Add it to T052's quickstart run as a timed step, or demote SC-001 to a qualitative criterion. |
| E2 | Coverage (FR) | MEDIUM | spec.md FR-010 ("MUST NOT block, delay past the close"); tasks.md T025, T028 | The *non-blocking* half is tested (T025); the *not delayed past the close* half is not, and T028 explicitly ships the serializer with no timing test and a `TODO(handoff)`. For a batch that serializes N calls against a rate-limited gateway, that is the one timing property that matters. | Add a fake-timers test asserting the batch's spacing and that it runs after the close's own response path. |
| F1 | Inconsistency | MEDIUM | spec.md vs plan.md / contracts / tasks.md | Terminology drift across artifacts: spec says *sale / receipt / submission record / tendered*; plan, contracts and tasks say *ticket / comprobante / emission row / payment method*. The spec's own glossary is implicit. | Add a 6-line glossary to spec.md mapping each business noun to the code noun. The owner's nouns (*turno*, *comprobante*, *corrección*) must be the UI copy either way. |
| F2 | Inconsistency | LOW | tasks.md T039 (US4 tests) vs T040/T041 (migration, schema) | The hand-built-schema test task precedes the migration and the Drizzle table it mirrors; written literally, T039 is unwritable first. | Note the dependency inline (T039 after T041) or merge them. |
| B1 | Duplication | LOW | spec.md FR-008 vs INV-3; FR-002 vs FR-003 | The audit requirement is stated twice (as an FR and as an invariant) with slightly different wording ("exactly one entry" vs "exactly one audit entry"); the reason rule appears in both FR-002 and FR-003. | Keep the FR as the requirement, let the invariant reference it by id rather than restate it. |
| B2 | Ambiguity | LOW | plan.md "Performance Goals" | "user-perceived instant" for a correction is a vague adjective with no number, while the spec's SC-001 does carry one. | Replace with the SC-001 number or drop the sentence. |

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 open-shift correction | yes | T003, T004, T010, T012, T014 | tested T007–T009 |
| FR-002 reason recorded | yes | T010, T014, T021 | preset vs typed covered in UI tasks |
| FR-003 post-close manager only, detail page only | yes | T020, T021 | |
| FR-004 pair on current shift, closed shift untouched | yes | T004, T020 | tested T018 (INV-1, INV-2) |
| FR-005 no open shift ⇒ refuse with instruction | yes | T004, T020 | tested T019 |
| FR-006 no stacking | yes | T004 | tested T009, T019 |
| FR-007 no-op / refund / correction row refused | yes | T004 | tested T008 |
| FR-008 one audit entry | yes | T005, T010 | no *negative* test (a refused mutation writes nothing) |
| FR-009 close issues all eligible | yes | T026, T027 | tested T024 |
| FR-010 failure never blocks/delays | partial | T027, T028 | see **E2** — delay untested |
| FR-011 idempotent, retry only failures | yes | T027, T030 | tested T023, T024 |
| FR-011a rejected-document handling | **no** | — | `[NEEDS CLARIFICATION]`, see **A1** |
| FR-012 issue one sale now, then frozen | yes | T029 | freeze path tested via the shared chain (T007) |
| FR-013 counts in close dialog + history, retry | yes | T031, T032 | no UI test (hub convention: logic tested, pages not) |
| FR-014 fiscal frozen, tender editable | yes | T003 | tested T007 (order includes `issued ∧ fiscal`) |
| FR-015 lock/unlock/list with finance:manage | yes | T042, T045, T046 | tested T036 |
| FR-016 423 verbatim on every mutation | yes | T044 | tested T038 (one case per mutator) |
| FR-017 shared refusal order | yes | T003 | tested T007 — asserts the order, not just each refusal |
| FR-018 month in accounting timezone | yes | T042, T043 | tested T037 |
| FR-019 lock visible, actions hidden | yes | T047 | known limit ledgered in the task |
| FR-020 customer/document/note edits | weak | T050 (Polish) | see **C2** |
| FR-021 tender visible in till + calendar, links out | yes | T015 | FR-021a deferred |
| FR-022 lock records who/when/note; unlock leaves a trace | partial | T040, T048 | see **C1** |
| FR-023 both locales, owner nouns | yes | T017, T034, T042-adjacent | append-only rule stated |
| INV-1 payments sum to total | yes | T018 | |
| INV-2 closed snapshot never rewritten | yes | T018 | |
| INV-3 one audit entry per mutation | yes | T005, T010 | |
| INV-4 no successful mutation in a locked period | yes | T038 | asserted "before any effect" |
| INV-5 one non-failed submission per sale | yes | T023, T024 | |
| INV-6 lock/unlock attributable | **no** | T048 (conditional) | see **C1** |
| SC-001 under 30 s from the till | **no** | — | see **E1** |
| SC-002 100% attributable | yes | T007–T010 | |
| SC-003 no closed shift's counted figure changes | yes | T018 | |
| SC-004 exactly one submission per sale, no duplicates | yes | T024 | |
| SC-005 zero successful mutations in a locked month | yes | T038 | |
| SC-006 close survives an unreachable gateway | yes | T025 | |

## Constitution Alignment Issues

- **CRITICAL — Principle V**: no spec-approval gate task (finding **D1**).
- **Principle II (test per transition)**: satisfied except FR-010's delay half (**E2**) and INV-6 (**C1**).
- **Principle IV**: satisfied explicitly — route manifest **and its 6 counts** (T013, T034, T045), frozen export inventory in the same commit (T011, T034, T042), Paraglide both locales + compile (T017, T034), design/token lint with a recorded debt baseline (T002). This is the part the template would have left out and the constitution forces in.
- **Open-items ledger**: satisfied in form (T051 names seven items and their sites, and three tasks carry explicit `TODO(handoff)` text). Weakness: T048 lets a MUST *become* a ledger item, which is the ledger being used as an exit rather than a record.

## Unmapped Tasks

T001, T002 (setup/gates), T022, T035, T049 (PR mechanics and the stacked-PR retarget rule),
T052 (quickstart + prod proof), T053 (board stub) map to constitution/process requirements
rather than to an FR. That is expected in this workspace; they are not dead weight.

## Metrics

- Requirements (FR + INV): 29 keys (23 FR + 6 INV); 2 deferred FR-#a markers
- Success criteria: 6
- Tasks: 53
- Coverage (≥1 task): FR 22/23 = 96% (FR-011a uncovered; FR-010, FR-020, FR-022 partial) · INV 5/6 = 83% · SC 5/6 = 83%
- Ambiguity findings: 3 (A1, A2, B2) · Duplication: 2 (B1 counts two pairs) · Inconsistency: 2
- **CRITICAL: 1** · HIGH: 2 · MEDIUM: 5 · LOW: 3

## Next Actions

1. **Resolve D1 before any implementation**: this is a constitution MUST, and it is one line in `tasks.md` plus one message to the owner.
2. Decide C1 and C2 as *scope* (owner), not as implementation detail: either they are in the slices or they are written out of the spec. Both are the shapes an omission takes when it is never decided.
3. Answer FR-011a (A1) before S2 is coded.
4. Add the two missing tests (E2, and a negative audit test for FR-008) to the S2/S1 task lists.
5. Then proceed to implementation. Everything else (F1, F2, B1, B2) is wording and can be fixed in place.

*(The skill's step 8 offers remediation edits; this run is read-only by instruction and none were applied.)*
