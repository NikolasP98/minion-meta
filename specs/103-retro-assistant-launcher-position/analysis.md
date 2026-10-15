# Specification Analysis Report: Assistant Launcher Stays in Its Corner

Cross-artifact check of `spec.md`, `plan.md`, `tasks.md` (plus `research.md`/`data-model.md`)
against `.specify/memory/constitution.md`. Read-only — no files modified by this pass.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| D1 | Constitution Alignment | CRITICAL | spec.md (whole file); plan.md "AS-IS evidence"; constitution.md Principle II | Constitution Principle II requires the spec itself to state AS-IS/TO-BE/DELTA with evidence anchors. The Spec Kit `spec.md` template has no such section, so the AS-IS evidence (the diff's removed `localStorage` read and resize re-snap) was placed in `plan.md` instead. The letter of Principle II is not met by `spec.md` alone. | Either (a) amend the constitution to explicitly allow AS-IS evidence to live in `plan.md` when using the Spec Kit template, or (b) add an AS-IS subsection to this workspace's spec-template fork so `/speckit-specify` produces it directly. See `sdd-notes.md` recommendation #1. |
| E1 | Coverage Gap | MEDIUM | spec.md FR-002; tasks.md (no task ID) | FR-002 ("users MUST be able to drag the launcher to any edge; it snaps on release") has zero dedicated task — it's existing, unchanged behavior, assumed safe by omission rather than verified by a regression task. | Add a short regression task under Foundational or Polish: confirm `onLauncherPointerDown/Move/Up` and `snapToEdge`'s edge-choice logic are byte-for-byte unchanged outside the position-storage lines touched by T007. |
| E2 | Coverage Gap | LOW | spec.md SC-002; tasks.md T012 | SC-002 requires checking "each of the four screen edges" across "a representative range of widths/heights"; T012's example only exercises one edge (`fx: 1`). | Parametrize T012 over all four edges (`fx∈{0,1}, fy∈{0,1}` combinations) or add three sibling test cases before claiming SC-002 met. |
| C1 | Underspecification | LOW | spec.md Edge Cases (3rd bullet) | The framework-soft-reload-vs-hard-refresh distinction is resolved by assumption text but has no task verifying it (SvelteKit's own client-side router never fully reloads the module in this app's shell, so this edge case may be unreachable in practice — unverified either way). | Either add a task that forces a SvelteKit "invalidateAll"-style soft navigation and asserts no module re-evaluation occurs, or move this bullet from Edge Cases to Assumptions with an explicit out-of-scope note. |
| B1 | Ambiguity | LOW | spec.md Assumptions (drop-zone bullet); tasks.md (no owner-confirm gate) | Two `(ASSUMPTION — owner to confirm)` items exist (reload-vs-storage conflict resolution; drag-into-home-zone semantics) but no task gates merge on actually obtaining that confirmation — they will silently ship as the author's best guess unless someone follows up. | Make T015's open-items ledger entry name both assumptions explicitly (not just "anything still unverified") so they are not lost. |
| F1 | Inconsistency | LOW | spec.md Edge Cases ("full page reload"); data-model.md Lifecycle ("Reload") | Minor terminology drift between "hard refresh," "full page reload," and "reload" across artifacts — all three are used to mean the same event, but never defined as synonyms in one place. | Add a one-line glossary note in spec.md: "hard refresh, full page reload, and reload are used interchangeably below." |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes | T005, T006 | |
| FR-002 | **No** | — | See E1 |
| FR-003 | Yes | T007, T009 | |
| FR-004 | Yes | T003, T006 | |
| FR-005 | Yes | T010, T011, T012 | |
| FR-006 | Yes | T012 | |
| SC-001 | Yes | T006 | |
| SC-002 | Partial | T012 | See E2 — only one of four edges exercised in the written example |
| SC-003 | Yes | T009 | |
| SC-004 | Weak | T014 | Manual pre/post-merge verification only, no dedicated acceptance task |

**Constitution Alignment Issues:** D1 (above) — all other principles PASS/N/A per plan.md's
Constitution Check table (re-verified here, unchanged since plan.md was written in this same
session).

**Unmapped Tasks:** None — every task (T001-T015) traces to at least one FR, the Foundational
phase, or a Constitution-mandated gate (T013 → Principle IV; T014 → Principle III; T015 →
open-items ledger).

**Metrics:**

- Total Requirements (FR): 6
- Total Success Criteria: 4
- Total Tasks: 15
- Requirement coverage: 5/6 direct (83%); 6/6 if FR-002's implicit "don't break it" coverage counts
- Ambiguity Count: 1 (B1)
- Duplication Count: 0
- Critical Issues Count: 1 (D1)

## Next Actions

D1 is CRITICAL per the constitution-conflict rule, but it is a template-mismatch finding,
not a missing-evidence finding — the evidence exists in `plan.md`. Recommend resolving it by
amending either the constitution or the spec-template fork (see `sdd-notes.md`) **before**
treating this artifact set as a reusable pattern for future hub fixes, but it does not block
proceeding past this one retrospective exercise (`/speckit-implement` is explicitly out of
scope per this audit's brief). E1/E2/C1/B1/F1 are non-blocking; addressing E1 and E2 before
any real `/speckit-implement` run is recommended to avoid shipping an unverified regression
surface a second time.

(Remediation edits were not applied — this is a read-only report per `/speckit-analyze`'s
operating constraints and the audit brief's "DOCUMENTS ONLY" instruction.)
