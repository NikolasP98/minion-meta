# Retro scorecard — SDD vs. the artifact that actually shipped hub #534 / #535 / #536

The work is live. The original artifact is the flat spec
`specs/2026-10-15-hub-pos-shift-scoped-edits-and-emission-on-close-spec.md` (160 lines,
`pass: 1`, **no `.review.md`** — the SDLC contract's 2-pass spec review did not happen) plus
`proposals/2026-10-15-hub-pos-shift-scoped-edits-followups.md` (65 lines, 8 items).
Commits: **#534 `1bb1d817`**, **#535 `397f6b1d`**, **#536 `f35e5391`**, all merged 2026-10-15.

## 1. Requirement → original section → delivering PR → proving test

Test file names are taken from the merged diffs (`gh pr diff`). "none" means no test in those
three PRs asserts the requirement.

| Spec Kit req | Stated in the original at | Delivered by | Proven by |
|---|---|---|---|
| FR-001 open-shift tender change, amount unchanged | TO-BE T1 bullet 1(a) | #534 | `pos/tender-correction.test.ts` ("open shift: corrects the row in place…") |
| FR-002 reason recorded (preset open / typed closed) | TO-BE T1 "Reason: a preset chip … or free text, stored" | #534 | `pos/tender-correction.test.ts` (reason in the plan's metadata; **not** asserted as persisted) |
| FR-003 post-close: manager, detail page only | TO-BE T3 bullet 1 | #534 | `pos/tender-correction.test.ts` (guard routes `closed`); route-level `manage_required`: none |
| FR-004 correction pair on the current shift; closed shift untouched | TO-BE T3 bullet 2 | #534 | `pos/tender-correction.test.ts` ("zero-net pair tagged with the original row (I1, I2)") |
| FR-005 no open shift ⇒ refuse with "open the till" | TO-BE T3 bullet 2 (last sentence) | #534 (`pos.service.ts`, `no_open_shift`) | **none** |
| FR-006 repeated corrections never stack | **implicit** (PR body states it; the spec does not) | #534 | `pos/tender-correction.test.ts` (`effectiveMethod`) |
| FR-007 refuse no-op / refund row / correction row | **implicit** (spec says only "same rule as #516's refund rows") | #534 | `pos/tender-correction.test.ts` ("refuses a no-op and refuses to correct a refund or correction row") |
| FR-008 one audit entry per mutation (= I3) | TO-BE T1 bullet 3 + Invariant I3 | #534 (`recordAuditInTx`) | **none** — no test in any of the three PRs asserts an audit row |
| FR-009 close issues every eligible sale | TO-BE T2 bullet 1 / DELTA S2 | #535 | `pos.service.emission.test.ts` ("hands every live, not-yet-emitted ticket…") |
| FR-010 a failure never blocks the close | TO-BE T2 bullet 1 ("failures do not block the close") | #535 | `pos.service.emission.test.ts`; the *not delayed* half: **none** (serialized gate untested by design) |
| FR-011 idempotent; retry only failures (= I5) | Invariant I5 + DELTA S2 | #535 | `pos.service.emission.test.ts` ("a retry re-sends errors, never duplicates (I5)"), `pos-emission.service.test.ts` (`foldEmissionStatus`) |
| FR-011a what happens after a *rejection* | **implicit** — one sentence in #535's body ("a rejected document is never re-sent unchanged"); absent from the spec | #535 (behaviorally) | `pos-emission.service.test.ts` (fold rule only) |
| FR-012 "Emitir ahora", then frozen | TO-BE T2 bullet 2 | #535 (`emitTicketNow`) | `pos-service-boundaries.test.ts` (export only) — behavior: **none** |
| FR-013 close count + history counts + retry | TO-BE T2 bullet 3 | #535 | `pos-emission.service.test.ts` (`foldEmissionStatus`); UI: none (house convention) |
| FR-014 fiscal frozen, tender still editable | TO-BE T3 bullet 3 | #534 | `pos/tender-correction.test.ts` ("the CPE carries no tender…") |
| FR-015 lock / unlock / list, `finance:manage` | TO-BE T4 bullets 1–2 | #536 | `pos/period-locks.test.ts` (`normalizePeriod`); permission: none |
| FR-016 423, verbatim copy | TO-BE T4 bullet 2 | #536 | `pos/tender-correction.test.ts` ("shows the accountant lock verbatim"), `pos.tickets.test.ts` ("throws period_locked … before any effect") |
| FR-017 one shared guard order | TO-BE T4 bullet 3 ("Guard order, shared by every mutator") | #534 (stub) → #536 (real) | `pos/tender-correction.test.ts` ("refuses in order: void → period locked → reconciled → emitted") |
| FR-018 month in the accounting timezone | **implicit** — the spec says only "the ticket's `submitted_at` month"; the timezone problem was found during S3 | #536 (`lib/time/zoned.ts`) | `pos/period-locks.test.ts` ("the month is read in the org accounting timezone, never UTC") |
| FR-019 lock visible on sale + shift rows | TO-BE T4 bullet 1 (last clause) | #536 | **none** (and the icon's known date skew is ledger item 6) |
| FR-020 open-shift customer/document + note edits | TO-BE T1 bullet 1(b)(c) | **not delivered** | — (ledger item 4) |
| FR-021 tender visible in till + calendar, links out | TO-BE T1 bullet 2 | #534 (partially: popover chip; calendar untouched) | `pos/history/payments-fold.test.ts` (history reading) |
| FR-021a a second edit surface in the till? | **implicit** — decided inside #534's "Not in this PR" | #534 (decided against) | — (ledger item 2) |
| FR-022 lock records who/when/note; unlock leaves a trace | first half: TO-BE T4 bullet 1. **Second half: absent** | #536 (first half only) | `pos-money.sql.integration.test.ts` (schema); unlock trace: **none** (ledger item 1, the one in-code `TODO(handoff)`) |
| FR-023 both locales, owner nouns | "i18n:" paragraph after DELTA | #534/#535/#536 | none (CI prettier/i18n gates, not tests) |
| INV-1 payments sum to total | Invariants I1 | #534 | `pos/tender-correction.test.ts` (net == 0 asserted) |
| INV-2 closed snapshot never rewritten | Invariants I2 | #534 | `pos/tender-correction.test.ts` (pair targets the open shift) |
| INV-3 one audit entry | Invariants I3 | #534 | **none** |
| INV-4 no successful mutation in a locked period | Invariants I4 | #536 | `pos.tickets.test.ts` (void), `pos/tender-correction.test.ts` (order) |
| INV-5 one non-failed submission per sale | Invariants I5 | #535 | `pos.service.emission.test.ts`, `pos-emission.service.test.ts` |
| INV-6 every lock/unlock attributable | **absent** | not delivered | **none** |
| SC-001…SC-006 (measurable outcomes) | **absent** — the original has a "Verification" section (gates + prod proofs) but no success criteria | — | the prod proofs are still owed (proposal's last section) |

Also shipped and in **no** requirement of either artifact: removing the never-read per-method
`documentDefault` setting and its revision-hash consequence (#535). The original spec mentions
the deletion in DELTA S2 as an implementation step; neither artifact states the user-visible
consequence as a requirement — only the PR body and the ledger do (item 7).

Three frozen-inventory files (`pos-service-boundaries.test.ts` in all three PRs,
`pos.shifts.test.ts` / `page-money.test.ts` in #535, `pos.packages.test.ts` /
`pos-money.sql.integration.test.ts` in #536) changed only to keep CI honest about exports,
settings fields and the hand-built integration schema. They prove registration, not behavior.

## 2. Scoring the original artifact (0–5)

| Dimension | Score | Why |
|---|---|---|
| Evidence anchors in AS-IS | **5** | Every AS-IS claim carries a file and approximate line, named as "verified on hub `origin/master` 2026-10-15", including the negative claims ("no lock concept anywhere", "the `documentDefault` setting is never read") that justify the whole feature. |
| Testable requirements | **4** | T1–T4 plus five named invariants, and the DELTA names a test per slice. Loses a point because requirements are prose bullets bundling server + UI (T1 bullet 1 holds three separate capabilities, two of which never shipped) and because "audited" is asserted without an observable test. |
| Measurable success criteria | **2** | There is no success-criteria section. "Verification" lists the gates and three real prod proofs — strong, but process verification, not outcomes: no number for how fast a correction must be, how many closes may fail, or what the baseline cost of today's void+re-sale is. |
| Task → commit traceability | **5** | DELTA slices map 1:1 to PRs; the spec's own "Shipped" block records PR number, commit SHA and merge date for each, each PR body names the spec file and its slice, and `status: shipped` / `stage: deploy` live in frontmatter. Best-in-class, and better than anything Spec Kit's templates ask for. |
| Open-items ledger completeness | **3** | The proposal is genuinely good: 8 items, each naming its file and site, plus the verification still owed. But the constitution requires **both** halves, and the diffs contain exactly **one** `TODO(handoff)` (the unlock trace in #536) — items 2, 3, 5, 6 and 7 exist only in the proposal, so a maintainer reading `pos-emission.service.ts` or the history page sees no marker at all. |

## 3. What SDD would have changed — and what it still would not catch

**Would have changed (present in these artifacts, absent from the original):**

1. **A spec-approval human gate.** This work is data-tagged (migration, production money rows, a write-refusal control). `analysis.md` D1 is CRITICAL precisely because `tasks.md` forgot it, and the original had no such gate either: the three PRs were authored and merged the same morning.
2. **FR-022 / INV-6 — the unlock trace — before the code.** Clarify Q5 asks "must locking and unlocking themselves be auditable?" The real project discovered this *after* shipping, as ledger item 1 and the only `TODO(handoff)` in the diffs.
3. **FR-018 — the month's timezone — as a requirement.** The original said "the ticket's `submitted_at` month", full stop. The implementer found the Lima/UTC boundary during S3 and solved it correctly; a clarify question would have made it a stated requirement with a test, instead of a good catch that depended on the implementer.
4. **FR-011a — rejection handling — as an open question** instead of a sentence inside a PR body ("a rejected document is never re-sent unchanged"), which is where behavior goes to be forgotten.
5. **FR-020 visible as uncovered.** `analysis.md` C2 flags a MUST parked in a Polish phase. In reality T1(b)(c) shipped missing, surfacing only as ledger item 4 after the fact. The coverage table is the mechanism: a requirement with no slice is a row with no task id.
6. **The missing audit test.** Forcing one test name per requirement makes FR-008/INV-3 read "none" in a table before anyone writes code — the original spec asserts the same invariant and nothing tests it today.
7. **Measurable criteria.** SC-001 (30 s, no manager, no second receipt, against the void+re-sale baseline) and SC-006 (closes succeed with the gateway unreachable) are the kind of claim a demo can falsify; the original has no such claim.

**Would still not have caught:**

- **Facts only the code teaches.** That the per-method `documentDefault` was dead config, that removing it moves the payment-policy revision hash and makes in-flight previews re-preview once, that the mock-db test harness needs a lock read inserted into *every* existing `resolveSequence` fixture, that `pos-money.sql.integration.test.ts` hand-builds its own schema. The original's AS-IS recon caught the first of these; no template produces any of them.
- **Over-specification in the other direction.** My `plan.md`/`tasks.md` demand the route-contract manifest and its 6 counts for the new endpoints (T013, T034, T045). The manifest covers *page* routes; these three PRs added only API endpoints and a card on an existing page, so that task is busywork the shipped PRs correctly skipped. SDD adds confident-looking requirements as easily as it adds real ones.
- **Owner-only answers.** FR-021a (does the till want its own picker?) and whether a correction's reason preset list is right. A clarification question that an agent answers from evidence is still an agent's answer; two of my five are tagged `(ASSUMPTION — owner to confirm)` for that reason.
- **The prod proofs.** Both artifact sets end with the same three unperformed proofs on FACES. No document can convert "verification owed" into "verified"; only the owner touching real money does, and the original is honest about that.
- **The 2-pass spec review.** The original skipped it (`pass: 1`, no `.review.md`) and Spec Kit has no equivalent stage either — `/speckit-analyze` is a self-review by the same author. Neither process catches what a second reader would.

## 4. Overhead

| | Original | Spec Kit (this run) |
|---|---|---|
| Artifacts | 1 spec (160 lines) + 1 proposal (65 lines) = **225 lines across 2 files** | `spec.md` 194 · `plan.md` 143 · `research.md` 86 · `data-model.md` 52 · `contracts/pos-mutations.md` 87 · `quickstart.md` 50 · `tasks.md` 191 · `analysis.md` 91 · `checklists/requirements.md` 54 = **948 lines across 9 files** (plus this scorecard, 104) |
| Review passes | 0 (`pass: 1`, no `.review.md`) | 1 self-review (`/speckit-analyze`) + 1 checklist validation |
| Decisions recorded | ~12 prose bullets + 5 invariants | 23 FR + 6 INV + 6 SC + 5 Q/A + 8 research decisions + 53 tasks |
| Authoring wall-clock | not instrumented. Inferable bound: the three PRs merged 07:34 / 07:47 / 08:24 UTC, so spec + all three slices + gates fit inside one session; a 160-line spec with a code-reading recon is plausibly 10–20 min of agent time | **11.5 min measured**: specify 3.5 · clarify 2.5 · plan 2.7 · tasks 1.5 · analyze 1.5 (plus ~2 min reading the inputs) |

Read against the implementation: three PRs' worth of code took ~50 minutes of merge-to-merge
wall clock. SDD's document layer costs roughly a quarter of that again, and produces ~4× the
prose. The honest trade here is narrow: the original scored 5/5/2/5/3, so SDD bought the
success criteria (2→), one real pre-code finding (the unlock trace), one requirement that was
silently dropped made visible (FR-020), and one missing test made visible (INV-3) — at the cost
of ~950 lines, one invented busywork requirement, and five clarification answers that no owner
actually gave.
