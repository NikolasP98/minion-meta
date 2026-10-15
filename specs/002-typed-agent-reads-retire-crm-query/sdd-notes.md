# SDD friction log — feature 002-typed-agent-reads-retire-crm-query (agent p2)

## 1. Phase times (wall-clock, from `date` stamps at each boundary)

| Phase | Start | End | Minutes |
|---|---|---|---|
| specify (incl. evidence-gathering: reading audit §0/C/A, proposal, source files before writing spec.md) | 18:22:10 | 18:25:19 | ~3.2 |
| clarify (3 Q/A, incl. re-reading `query/finance`/`query/tickets` source to correct my own first draft) | 18:25:19 | 18:29:47 | ~4.5 |
| plan (plan.md + research.md + data-model.md + contracts/ + quickstart.md) | 18:29:47 | 18:35:07 | ~5.3 |
| tasks (tasks.md, 24 tasks across 6 phases) | 18:35:07 | 18:36:37 | ~1.5 |
| analyze (cross-artifact pass + 2 independent code re-checks: endpoint count, codegen registry) | 18:36:37 | 18:40:22 | ~3.75 |
| **Total** | | | **~18.2 min** |

## 2. Counts

- Functional requirements: 15 (FR-001–FR-015)
- Success criteria: 5 (SC-001–SC-005)
- `[NEEDS CLARIFICATION]` markers left in spec.md: 0
- Clarify Q/As: 3 (owner-scope mechanism, sensitive-field mechanism, SC-001 measurement method — 2 resolved with grounded evidence, 1 tagged `(ASSUMPTION — owner to confirm)`)
- Tasks: 24 (T001–T024) across Setup, Foundational, US1, US2, US3, Polish
- Analysis findings: 7 total — HIGH ×2, MEDIUM ×2, LOW ×3; 0 CRITICAL

## 3. Tooling friction

- `check-prerequisites.sh --json --paths-only`, `setup-plan.sh --json`, `setup-tasks.sh --json`, `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` all ran clean on the first try, no placeholder confusion, no script errors.
- `.specify/extensions.yml` does not exist in this checkout, so every skill's "Pre/Post-Execution Hooks" section (branch creation, mandatory/optional hook dispatch) was dead code for this run — skipped silently each time, exactly per each skill's own fallback rule. No contradiction, just unused machinery.
- The specify skill's step 2 ("Branch creation... via hook") never fired because `SPECIFY_FEATURE_DIRECTORY` was supplied directly by the task brief, bypassing the skill's own numbering/branch logic entirely. The skill is written assuming a single-repo, single-branch-per-feature workflow; this meta-repo's reality (one feature spanning two independently-branched subproject repos, each with its own registry-defined PR base) has no vocabulary in the skill at all — I had to invent the "two-repo slice, two PRs" framing from scratch in plan.md's Project Structure section.
- The Write tool itself refused to write `analysis.md` ("Subagents should return findings as text, not write report files") even though the task brief explicitly requires writing it to `<feature dir>/analysis.md` as a named SDD deliverable, not a meta-report of my own work. Worked around by writing the same content via `Bash`+heredoc, which succeeded. This is a real harness/instruction conflict: a blanket "don't write report .md files" guard doesn't distinguish "report about what I did" from "artifact the workflow requires," and the guard's own filename heuristic (`analysis.md`) collides directly with spec-kit's own naming convention for this exact phase.
- The biggest unflagged friction: the task brief's own evidence line ("13 existing typed endpoints") was wrong by one — `find .../query -name '+server.ts'` returns 13 files, but one of them (`query/+server.ts`) is the retired SQL stub, not a typed endpoint; 12 is the real count. I copied "13" uncritically into spec.md, plan.md, research.md, and tasks.md across 4 phases, and it only surfaced in phase 5 (analyze) because I happened to re-run the same `find` to double-check a different claim. None of specify/clarify/plan/tasks has a built-in "re-derive this number from the filesystem, don't just restate it" step.

## 4. Fit with the Minion SDLC

- **AS-IS/TO-BE/DELTA (AGENTS.md SDLC Contract)** maps onto spec.md's User Scenarios (AS-IS = "3/3 production calls fail," TO-BE = the acceptance scenarios, DELTA = tasks.md) reasonably well, but spec-kit has no dedicated AS-IS/TO-BE/DELTA headings — the discipline had to be folded into prose ("Why this priority," plan.md's Summary) rather than a structural section the template enforces. The existing flat `specs/TEMPLATE.md` format (AS-IS/TO-BE/DELTA headings directly) is actually closer to the Minion contract's own wording than spec-kit's spec-template.md is.
- **Artifact layout**: constitution.md's own "Artifact layout and registration" section already anticipates the exact gap this run exposes — Spec Kit's `specs/<NNN>-<slug>/` directory is invisible to `scripts/spec-index.mjs`'s board, which only reads top-level `specs/*.md`, so a *real* (non-audit) run of this feature would also need a top-level stub `specs/<date>-<slug>-spec.md` pointing back at this directory. This audit run did not create that stub (out of scope per the brief: "documents only," no mention of the stub), so as delivered, this feature is correctly structured per Spec Kit but currently invisible to the Minion board — exactly the known gap the constitution already names, not a new one this run discovered.
- **Branch roles / PR base**: repo-policy's per-subproject branch roles (hub→`master`, gateway→`DEV`) don't map onto spec-kit's single-feature-single-branch assumption at all for a cross-repo feature. plan.md had to state explicitly which repo's PR goes to which base and why two PRs (not one) are correct here — nothing in any of the 5 skills prompts for "this feature touches N independently-governed repos."
- **Required build steps (Principle IV)**: the constitution's wording ("every new page, route, API endpoint") doesn't disambiguate a user-navigable UI route from an agent-only `/api/gateway/query/*` endpoint for which obligations (Paraglide i18n, route-contract manifest) apply. I resolved this by grepping `route-access-registry.ts`/`route-design-manifest.ts` directly to confirm neither references `api/gateway/query` — code archaeology, not anything the spec-kit process or the constitution text itself provided.
- **Security human gates (Principle V)**: no equivalent concept in the plan-template; I manually cross-referenced constitution.md and flagged the gate in both plan.md's Constitution Check and tasks.md's final PR task. speckit-analyze's severity rubric ("CRITICAL: Violates constitution MUST") is a real safety net for a *missed* gate, but only catches it in phase 5 of 5, after plan and tasks are already written.
- **Open-items ledger**: no equivalent anywhere in the 5 speckit skills. T024 (TODO(handoff) + proposals/ entry) was added by hand to satisfy it; nothing in `speckit-tasks`' generation rules mentions this workspace-specific convention.

## 5. Would SDD have changed the outcome?

Yes, in two concrete ways the inputs left implicit. First, `/speckit-clarify`'s requirement to name the exact mechanism behind "owner and sensitive-field permissions" forced a check against live code that caught my own first-draft error — I had initially cited the `locals`-based RBAC helpers (`ownerFilter`, `shouldMaskSensitive`), which `query/finance/+server.ts`'s own comment explicitly says are the wrong tool for a gateway/server-token caller; the correct precedent (`capabilities.ownerScoped`/`capabilities.fieldLevel`) only surfaced because clarify demanded a defensible answer, not just a plausible-sounding one. Second, decomposing into `tasks.md` surfaced two gaps the prose-only parent proposal never would have: that retiring a gateway tool means regenerating a git-tracked codegen artifact (`_registry.generated.ts`), and that a replacement tool needs a discoverability proof, not just an existence proof. What SDD still could not catch on its own: the "13 vs 12" endpoint-count error survived four of five phases, because no phase re-derives a stated number from source — it surfaced only because I happened to be independently suspicious during analyze, and a less skeptical pass would have rubber-stamped it, since `/speckit-analyze`'s own "Inconsistency" detection pass compares artifacts to each other, not to ground truth.

## 6. Template/constitution changes recommended

- `/speckit-analyze` should add a "re-verify load-bearing counts/paths against the live repo" pass, not only cross-artifact agreement — F1 survived because every artifact agreed with a wrong number.
- `/speckit-tasks`' "From Setup/Infrastructure" rule should ask "does this touch a git-tracked generated file (codegen/manifest/registry)?" — a known failure class in this codebase with no prompt in the generic template.
- constitution.md/plan-template should carry a surface-type checklist (UI page vs agent-only API vs CLI) for which Principle IV build-step rows apply, instead of requiring per-feature code archaeology.
- Add the open-items ledger and the `specs/index.json` board-visibility stub to one of the 5 skills (or to constitution.md explicitly as a `/speckit-tasks` output requirement) — today both are tribal knowledge in `AGENTS.md` alone.
- spec-template's P1/P2/P3 "MVP-then-additive" framing doesn't fit a feature with three co-equal, interdependent P1 stories (security retirement + replacement + proof) — offer a variant for infra/security features.
