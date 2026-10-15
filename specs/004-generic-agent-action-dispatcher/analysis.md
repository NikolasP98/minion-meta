# Specification Analysis Report — Generic Agent Action Dispatcher

**Date**: 2026-10-15 · Artifacts analysed: `spec.md`, `plan.md`, `tasks.md` (+ `research.md`, `data-model.md`, `contracts/`, `quickstart.md` for cross-checks). Read-only pass; nothing was edited.

> Procedural note: `/speckit-analyze` declares itself "STRICTLY READ-ONLY … Output a structured analysis report (no file writes)". This file exists because the task brief required the report to be written to `analysis.md`. No other file was touched.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| E1 | Coverage gap | **CRITICAL** | `spec.md` SC-002; `tasks.md` T019, T022, T026 | SC-002 promises "at least 150 of the 193" capability-mapped write pairs become agent-reachable. The task list adds roughly **15 manifest rows** (POS shifts, void/refund/emit, CRM party/contact, POS appointments) plus the 17 inherited `module_action` endpoints — about **32**, a fifth of the promise. No task bulk-populates the manifest. The spec and the plan disagree about what ships. | Either add a task that authors the remaining ~120 rows (and budget it — each needs a hand-written `effect` and `fields`), or lower SC-002 to what the slices deliver (e.g. "the top-10 gaps #1–#7 plus the 17 endpoints `module_action` reached"). Do not leave both numbers in the artifacts. |
| E2 | Coverage gap | **HIGH** | `spec.md` SC-001; `tasks.md` Phases 3–5 | SC-001 names **seven** operations as the acceptance bar. Tasks add manifest rows for four of them (POS shift open/close, void/refund/tender-correct, customer create, POS appointments). **Finance writes, stock entry submit/cancel, and catalog item creation have no manifest-row task at all.** | Add three `[P]` manifest-row tasks mirroring T019/T022/T026 for `/api/finances/purchases` + `/statement-imports`, `/api/stock/entries/[id]/submit` + `/cancel`, and `/api/pos/sellables` + `/api/stock/items` + `/api/pos/categories`, each with its acceptance test. |
| E3 | Coverage gap | **HIGH** | `spec.md` FR-011; `spec.md` DELTA D4; `tasks.md` (absent) | FR-011 requires the org-configured approval workflow (`statusChangeBlocked`) to bind dispatched writes, and DELTA D4 names the proof ("test that a configured blocking workflow refuses a dispatched status change"). **No task writes that test**, and no manifest row covers a status-change route (`/api/sales/orders/[id]`, `/api/support/issues/[id]`), so the requirement is neither exercised nor exercisable as the task list stands. | Add a manifest row for one status-change route and the D4 test. Alternatively move FR-011 out of scope explicitly — but then `E-S9`'s workflow bypass stays open and must go in the ledger. |
| E4 | Coverage gap | MEDIUM | `spec.md` FR-017; `tasks.md` (absent) | FR-017 ("MUST NOT log request bodies that can carry personal data or secrets at a level the owner has not opted into") has zero tasks. Dispatch bodies carry exactly that — customer PII, payment amounts, supplier invoices. | Add a task that states the logging rule for the dispatch handler (route + method + outcome status, never `body`) and a test asserting a dispatched body does not appear in the handler's log calls. |
| E5 | Underspecification | MEDIUM | `tasks.md` T005, T006; `data-model.md` §1 | T006 populates **exclusions** for everything non-manifest, and T019/T022/T026 add rows for the new capabilities — but **nothing authors the `effect` and `fields` for the 17 endpoints inherited from `module_action`**, which T041 then deletes. The gateway tool would be deleted before its replacement rows exist. | Add a task before T041: port all 17 `module_action` endpoints to manifest rows with `effect`/`fields`, and make T041 depend on it explicitly. |
| E6 | Coverage gap | MEDIUM | `spec.md` FR-021; `research.md` R6; `tasks.md` T015, T039 | FR-021 requires the agent to **find** a dispatchable write without the whole manifest in each turn's context. T015 serves the catalog and T039 builds the call tool, but no task makes the catalog *searchable* or wires `sdk_inspect`'s description to point the model at it. With ~193 rows this is the difference between a usable tool and an unusable one. | Add a task extending the `sdk_inspect` tool description and the `writes` catalog with a text filter (`?q=`), and a test that a plain-language query returns the right row. |
| E7 | Constitution alignment | **HIGH** | `.specify/memory/constitution.md` II; `spec.md` "Deliberately unresolved"; `plan.md` Constitution Check | Principle II says "a spec with unverified claims is not ready for `/speckit-plan`". Three `[NEEDS CLARIFICATION]` markers remain and the plan ran anyway, justified in the Constitution Check as "unanswered owner decisions, not unverified claims". **That reading is the plan author's, not the constitution's** — the constitution does not distinguish the two. | Either amend the constitution to distinguish "unverified claim" (blocks planning) from "open owner decision" (blocks implementation only), or treat the plan as provisional until T002 closes the three markers. The current state is a self-granted exemption. |
| E8 | Constitution alignment | MEDIUM | `.specify/memory/constitution.md` "Artifact layout"; `plan.md` (PARTIAL); `tasks.md` T001 | The constitution requires a top-level `specs/<date>-<slug>-spec.md` board stub for any feature that must appear on the meta board. This run produced none (documents-only scope), so the feature is invisible to `scripts/spec-index.mjs`. T001 covers it, but T001 sits behind nothing and could have been done now. | Write the stub as part of the documentation run, not as task 1 of implementation. |
| F1 | Inconsistency | MEDIUM | `spec.md` A2 (364) vs `audits/.../A-coverage-matrix.md` (368); `research.md` R2 | Two different totals for the hub write surface are in play, 364 (measured here) and 368 (the audit). R2 declares and explains the gap, which is the right handling, but SC-002's "193 of 364" now reads as authoritative when it rests on one script run that nobody else has reproduced. | Commit the enumeration script with the gate (T007 already enumerates) so the number is derived at test time instead of quoted. A count asserted by CI cannot drift. |
| F2 | Inconsistency | MEDIUM | feature description ("route manifest"); `data-model.md` ("DispatchManifestEntry"); `contracts/dispatch-manifest.md` ("the `writes` catalog"); `plan.md` ("agent-dispatch-manifest.ts") | Four names for one thing: *route manifest*, *dispatch manifest*, *writes catalog*, *agent-dispatch-manifest*. The hub already has a different "route manifest" (`route-design-manifest.ts`, about **pages**), so the collision is not merely cosmetic — a reader will go to the wrong file. | Fix one term: **dispatch manifest** for the code artifact, **writes catalog** only for its serialised, capability-filtered projection. Never "route manifest". |
| C1 | Ambiguity | MEDIUM | `data-model.md` §1 `destructive` | `destructive` is defined as "anything that voids, refunds, deletes or moves money" — a judgement call per row, with no rule for the borderline cases that actually matter: closing a shift, emitting to SUNAT (irreversible, moves no money), submitting a stock entry. If the owner picks the destructive-scoped write ceiling (research R4), this flag becomes load-bearing. | Define it mechanically: `destructive: true` iff the method is DELETE, or the route's effect cannot be undone by another dispatchable write. List the borderline rows explicitly in the manifest with a one-line reason. |
| C2 | Ambiguity | MEDIUM | `spec.md` FR-017 | "at a level the owner has not opted into" names no level and no opt-in mechanism, so the requirement cannot fail a test. | Restate as a prohibition with a named exception: "the handler logs route, method and outcome status only; bodies are logged only when `<explicit env flag>` is set". |
| C3 | Ambiguity | LOW | `spec.md` SC-009 | "within the same order … (target: no more than ~1.5×…)" hedges twice ("target", "~") and is measured on one route (T021). | Drop the hedges: a fixed multiple on a named route, or delete the criterion. A soft target is not a success criterion. |
| D1 | Duplication | LOW | `spec.md` FR-002 vs FR-003; FR-023 vs FR-025 | FR-002 (not in manifest) and FR-003 (no resolvable capability) are two refusals with one observable outcome; FR-025 restates the invariant FR-023 implies. Not harmful — `data-model.md` §4 keeps them distinguishable — but it inflates the requirement count. | Keep FR-002/FR-003 (they differ in cause and in the message the user gets). Fold FR-025 into FR-023 as its invariant. |
| F3 | Inconsistency | LOW | `plan.md` "Slices" (A→B→D, C parallel) vs `tasks.md` "Incremental delivery" (meta → A → US4 → B+US1 → …) | The plan's slice order and the task list's delivery order are compatible but stated differently, with slice C appearing as Phase 6 and as "hub PR 3". | State the order once, in `plan.md`, and have `tasks.md` reference it. |
| B1 | Unmapped task | LOW | `tasks.md` T043 | T043 (refresh `HUB_ROUTE_MAP`'s stale `/bookings`, `/crm/customers` entries) maps to no FR or SC. It is a real audit finding (`A-coverage-matrix.md` §5.5) but belongs to a different slice. | Move it to the proposal ledger, or add the FR it serves. Scope creep in a security-tagged PR costs review attention. |

No findings of the "requirement conflicts with another requirement" kind were detected, and no
task references a file that the plan does not name.

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 dispatch entry point | ✅ | T012 | |
| FR-002 refuse unlisted | ✅ | T012, T016 | |
| FR-003 refuse unmapped capability | ✅ | T007, T012, T016 | |
| FR-004 one authorization source | ✅ | T012, T029 | |
| FR-005 refuse read methods | ✅ | T012, T016 | |
| FR-006 reject malformed route strings | ✅ | T012, T016 | |
| FR-007 module-enabled | ✅ | T011, T020 | enforced by the pipeline, tested on POS only |
| FR-008 owner scope | ✅ | T011, T028 | |
| FR-009 field masking | ✅ | T011, T028 | |
| FR-010 alternative capability | ✅ | T027 | |
| FR-011 approval workflow | ❌ | — | **E3** |
| FR-012 active org | ✅ | T013 | |
| FR-013 principal required | ✅ | T016 | |
| FR-014 audit actor | ✅ | T013, T020 | sampled on POS only (SC-006 asks for every module) |
| FR-015 preview | ✅ | T012, T023 | |
| FR-016 relay the real reason | ✅ | T012, T016, T023 | |
| FR-017 body logging | ❌ | — | **E4** |
| FR-018 manifest served at runtime | ✅ | T015 | |
| FR-019 entry fields | ✅ | T005 | `effect`/`fields` unauthored for 17 rows — **E5** |
| FR-020 partition gate | ✅ | T007, T037 | |
| FR-021 findable without full context | 🟡 | T015 | no search — **E6** |
| FR-022 retire the allowlist | ✅ | T041 | depends on E5 |
| FR-023 FormBinding.submit | ✅ | T030, T034 | |
| FR-024 capability-gated form tools | ✅ | T031, T032, T033 | |
| FR-025 no privileged channel | ✅ | T035 | |
| SC-001 seven operations | 🟡 | T019, T022, T026 | 4 of 7 — **E2** |
| SC-002 ≥150 pairs | ❌ | — | ~32 planned — **E1** |
| SC-003 one repo, no gateway release | 🟡 | T015, T039 | asserted by design, no test |
| SC-004 parity matrix | ✅ | T029 | |
| SC-005 gate fails on a new route | ✅ | T037 | |
| SC-006 100% attribution per module | 🟡 | T013, T020 | POS only |
| SC-007 never 5xx on unmapped | ✅ | T016 | |
| SC-008 8 forms | ✅ | T035 | |
| SC-009 latency | 🟡 | T021 | one route; criterion itself hedged (**C3**) |
| SC-010 owner sign-off | ✅ | T002, T038 | |

## Constitution Alignment Issues

1. **Principle II** — three `[NEEDS CLARIFICATION]` markers survived into `/speckit-plan` under a self-granted reading of "unverified claims" (**E7**). Highest-severity alignment issue in this feature.
2. **Artifact layout** — the board stub does not exist yet (**E8**); the feature is invisible to the meta board as of this run.
3. **Principle V** — satisfied *as a gate*, not as a done thing: `tasks.md` T002 blocks all code on owner approval and the plan marks implementation BLOCKED. No violation, but nothing below T004 may start.
4. **Principle IV** — correctly identified: the new endpoint triggers the hub route-contract manifest and its six counts (T008), with the warning that two of the six live outside `src/lib/routes/`. Design-token and i18n obligations are attached to the slices that touch `.svelte` and user-visible strings (T014, T036).
5. **Principle III** — satisfied: four slices, each one PR against the registry PR base, gates in the foreground.
6. **Open-items ledger** — satisfied in plan and tasks (T003, T044), with the three open ends named rather than discovered later.

## Unmapped Tasks

- T008 (route-contract counts), T014 (i18n), T036 (design lint), T044 (TODO handoffs), T046 (board status) → map to constitution obligations, not to an FR. Expected.
- T043 (`HUB_ROUTE_MAP` refresh) → maps to nothing in this spec (**B1**).

## Metrics

- Total functional requirements: **25**
- Total success criteria: **10**
- Total tasks: **46**
- Requirement coverage (FR with ≥1 task): **23/25 = 92%**; fully covered **22/25 = 88%** (FR-021 partial)
- Success-criteria coverage (SC with ≥1 task): **9/10 = 90%**; fully covered **6/10 = 60%**
- Ambiguity findings: **3** (C1, C2, C3)
- Duplication findings: **1** (D1, two instances)
- Inconsistency findings: **3** (F1, F2, F3)
- Constitution findings: **2** (E7, E8)
- CRITICAL: **1** · HIGH: **3** · MEDIUM: **7** · LOW: **4** — 15 findings total, none aggregated away.

## Next Actions

1. **Resolve E1 before anything else.** The spec promises ~150 operations and the plan delivers ~32. Pick one number and make both artifacts say it. This is not a wording problem: it decides whether the feature is a week or a month.
2. **E2, E3, E5** — add the missing manifest-row and test tasks (finance / stock submit / catalog; one status-change route for FR-011; the 17 ported endpoints before T041 deletes their tool). Editing `tasks.md` by hand is enough; no re-plan needed.
3. **E7** — ask the owner the three open questions (T002) and close the markers, or accept the plan as provisional in writing. Do not leave the exemption implicit.
4. **E4, C2** — write FR-017 so it can fail a test, then give it a task.
5. **F2** — rename to "dispatch manifest" everywhere before code starts; the hub already has a different "route manifest".
6. Then, and only after the owner's approval: `/speckit-implement` is permitted for T001–T046 in the stated order. **Not before.**

Remediation edits for E1–E5 and F2 can be drafted on request; nothing was applied.

---

## Evidence appendix (to be filled during implementation)

Reserved by `tasks.md` T021, T038 and T045 for: the quickstart Scenario 1 result and its latency
measurement (SC-009), the generated owner-facing list of dispatchable writes (SC-010), and the
full quickstart run (T045). Empty at the end of the documentation run — nothing was executed
against any hub instance.
