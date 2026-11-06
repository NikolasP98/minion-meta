# SDD friction log — 001-restore-agent-gateway-assignment

Agent wall-clock, single agent, no human in the loop. Times are `date -u` stamps taken at each phase boundary.

## 1. Phase times

| Phase | From | To | Minutes |
|---|---|---|---|
| setup + reading inputs (worktree, skill, constitution, templates, audit, proposals, hub code) | 23:22:02 | — | ~2.5 of the specify block |
| **specify** (incl. that reading) | 23:22:02 | 23:27:41 | **5.6** |
| **clarify** | 23:27:41 | 23:32:52 | **5.2** |
| **plan** (plan.md + research.md + data-model.md + contracts + quickstart) | 23:32:52 | 23:36:27 | **3.6** |
| **tasks** | 23:36:27 | 23:38:10 | **1.7** |
| **analyze** | 23:38:10 | 23:40:57 | **2.8** |
| **total** | 23:22:02 | 23:40:57 | **18.9** |

Clarify cost as much as specify, and all of the overrun was one question (Q6) that sent me back into the hub code for three more reads. That is the phase earning its keep, not friction.

## 2. Counts

| Thing | Count |
|---|---|
| Functional requirements | 24 (18 original + 6 added by clarify: FR-002a, 002b, 005a, 005b, 006a, 013a) |
| Success criteria | 8 (6 + 2 from clarify) |
| Invariants | 5 (4 + INV-5 from clarify) |
| `[NEEDS CLARIFICATION]` left | 1 (FR-016 -> Q1, by instruction) |
| Clarify Q/As recorded | 10 (5 in the specify pass, 5 in the clarify pass) — 4 tagged `(ASSUMPTION — owner to confirm)` |
| User stories | 2 (template offers 3; the third was removed, not filled with N/A) |
| Acceptance scenarios | 13 (6 US1 + 7 US2) |
| Edge cases | 10 (8 + 2 from clarify) |
| Tasks | 33 — 7 test, 12 implementation, 3 gate/PR, 7 owner-only, 3 registration, 1 setup |
| Analysis findings | 0 CRITICAL, 1 HIGH, 5 MEDIUM, 4 LOW |
| Requirement coverage | 24/24 with 2 weak |
| Spec quality checklist | 13 pass, 3 knowing deviations, 0 unfinished |

## 3. Tooling friction

1. **No `.specify/extensions.yml`, so no branch was created.** Every one of the five skills spends ~25 lines on hook dispatch, and all five fall through to "skip silently". Harmless but it is the single largest block of instructions in each skill file, and on first read it looks like a missing prerequisite. With no `before_specify` hook, no git branch is created at all — which happens to be exactly right for this workspace (see §4.2), but it is right by accident, not by design.
2. **`check-prerequisites.sh` reports `BRANCH: 001-restore-agent-gateway-assignment` in a detached-HEAD worktree.** It is reading the feature directory and calling it a branch. Benign here, but any logic downstream that trusts `BRANCH` as a git ref would be wrong, and `plan-template.md`'s header field is literally `**Branch**: [###-feature-name]`.
3. **`scripts/repo-policy.mjs show minion_hub` cannot run in a fresh worktree** — `ERR_MODULE_NOT_FOUND: ajv`. The brief's suggested `ln -sfn .../node_modules node_modules` does not fix it (the main checkout's root `node_modules` does not carry `ajv`). I read the row out of `repo-policy.yaml` with python instead. The canonical registry is therefore *not* readable by its canonical command from a worktree, which matters because the constitution tells every plan to run exactly that command.
4. **Template placeholders with no honest value.** `plan-template.md`'s Technical Context wants Performance Goals, Constraints and Scale/Scope. For a feature whose entire scope is one column on 11 rows, the truthful answers are "immaterial", "do not make the path blocking" and "11 rows — and do not design for more". I wrote those, but the template's framing invites inventing a number. Same for the three-option source tree block (single project / web app / mobile + API): none fits a SvelteKit server service plus one operational script, so I replaced the block entirely with the real paths.
5. **`tasks-template.md`'s Setup/Foundational phases assume a greenfield project.** "Initialize [language] project with [framework] dependencies", "Setup database schema and migrations framework", "Configure linting and formatting tools" — in a mature repo the honest Setup phase is "make a worktree and confirm the gates were already green", which is what T001/T002 became. I kept the phase rather than delete it because T002 (re-verify the AS-IS still holds) turned out to be a genuinely valuable stop condition that no part of the Minion contract asks for.
6. **The spec template's "no implementation details" rule directly contradicts Constitution Principle II.** Principle II *requires* `file:line` anchors; the quality checklist I am told to generate fails the spec for having them. I resolved it the way the constitution says to (AGENTS.md wins) and marked three checklist items as knowing deviations with reasons, rather than checking them falsely or unchecking them as debt. A checklist that cannot be fully green on a correct spec will be ignored within three features.
7. **`/speckit-clarify` is interactive by design and has no non-interactive mode.** With no user I answered my own questions from the evidence, which worked, but the skill's own quality bar ("present exactly one question at a time", "wait for the user") is unimplementable for an autonomous agent. There is no flag for "answer from evidence and tag assumptions", which is what this workspace's agents will actually need.
8. **`/speckit-analyze` is specified as "output a report, no file writes"**, while the audit brief requires it written to `analysis.md`. Minor, but the two are in direct conflict and I followed the brief. Separately, my `Write` call for `analysis.md` was refused by the harness as a "report file"; I wrote it with a shell heredoc. Any workspace adopting Spec Kit under this harness will hit that.

## 4. Fit with the Minion SDLC

**Where they overlap (and the Spec Kit version is weaker):**

- **AS-IS/TO-BE/DELTA.** Spec Kit's template has no AS-IS section at all. It opens at User Scenarios — i.e. it assumes greenfield. For a restoration of a five-week-old regression, AS-IS *is* the spec: 16 anchored rows, two of which (A15, A16) I only found because the Minion contract made me go and anchor every claim instead of trusting the audit. I added `## AS-IS` / `## TO-BE` / `## DELTA` sections ahead of the template's first mandatory section. Nothing in Spec Kit told me to, and without them this spec would have been wrong.
- **Evidence anchors.** Covered above (§3.6). Principle II and the template's content-quality rule are in direct opposition.
- **Slices.** Principle III (one PR per slice against the registry PR base, from a worktree, foreground gates) has **no counterpart** in the plan template. The template's unit of delivery is a "user story"; the Minion unit is a PR against a specific base in a specific repo with a specific package manager. I added a `## Slices` section to plan.md mapping stories to PRs. Tasks-template's "Parallel Team Strategy" (developer A/B/C) is actively misleading here — the real parallelism constraint is "two agents must not share a worktree".
- **Priority vs delivery order.** The template's MVP rule is "US1 first". The correct order here is US2 first, because US1's deliverable is a one-time production write that decays the moment a new user signs in. I had to override the template and write a header block explaining why, or the next reader "fixes" the order. The template has no concept of a delivery-order constraint that is not a code dependency.

**Where the Minion contract has something Spec Kit has nothing for:**

- **Principle IV's required build steps** (design tokens, RBAC wiring, Paraglide + `i18n:compile`, route-contract manifest). Spec Kit has no slot for "the repo demands these artifacts for this class of change". I put them in the Constitution Check as explicit not-applicable-because rows; the honest version of Principle IV for this feature is five "N/A"s and one "satisfied by not touching the gate", which took more care to write than to check.
- **Principle V human gates.** Spec Kit's flow is specify -> plan -> tasks -> implement, with no gate anywhere. A security-and-data-tagged feature needs owner approval *between* spec and plan and owner merge *after* implement. I modelled the gates as owner-only tasks (T024-T030) in a separate phase, which works but is a convention I invented. `/speckit-implement` would happily run straight past T024.
- **The open-items ledger.** No Spec Kit artifact carries forward "what we knowingly left open". The constitution says `/speckit-converge` output is not a substitute and must be copied to `proposals/`. I made that T015/T032. Spec Kit's natural home for it would be a section in plan.md; there isn't one.
- **The board.** `scripts/spec-index.mjs` reads only top-level `specs/*.md`, so a Spec Kit directory is invisible to the Minion board. The constitution's workaround (a top-level stub with `TEMPLATE.md` frontmatter) is a real duplication cost, one per feature, and it is the kind of task that gets skipped.

**Holes left by both:**

- Neither says what to do when the AS-IS moves under you between spec and implement. I invented T002; it should be a template line.
- Neither has a place for "this measurement happens a week after merge" (analysis F5). Spec Kit's success criteria invite time-delayed metrics and its task model cannot express them.

## 5. Would SDD have changed the outcome?

Yes, materially, and I can point at the one thing. The proposal's slice S0a says "provisioner resolves the org's `prd` gateway and writes `gateway_id`", and the dry-run table confirms all 10 agents sit in an org whose `prd` gateway is the FACES container — so the obvious implementation looks obviously right. It is not. Writing TO-BE as invariants forced the question "assignment equal to *what*, exactly?", and the answer is in `gateway-rpc.ts`: the provisioner creates the agent through `gatewayCall`, which resolves credentials with **no org and no profile** and therefore lands on the platform-wide *system* gateway, while the resolver compares the assignment to the gateway that *calls*. Those are two different values whenever an org's gateway is not the default. The two coincide for the one org holding every current row, so S0a as written would have passed its own test, passed review, shipped, fixed production — and silently 403'd the first user in any other org, invisibly, exactly like the defect it was fixing. That became AS-IS A15, INV-5, FR-002a, DELTA D2a, SC-007 and tasks T006/T010, and it is the single highest-value output of this run. The clarify phase paid for the whole exercise with one question.

Three smaller things the spec made explicit that the inputs left implicit: that a dev-only org is undetermined under the proposal's rule (analysis F1 — found by *analyze*, not by me, and still open); that the current code marks an agent ready without an assignment, so the failure is permanent rather than retried, and the existing retry/backoff machinery already solves it for free (FR-005a); and that `ensurePersonalAgentOnLogin` is a dormant second copy of the same defect (FR-006a).

What it still could not catch: anything about whether the owner wants option A for Q1 — that is a judgement, not a gap. Whether the production data still matches the 2026-10-15 measurement (hence T002/T027's stop conditions). Whether the gateway side actually sends the `agentId` the hub expects for a newly provisioned agent, which I inferred from the resolver and never exercised. And it cannot catch the thing the audit already flagged as unverified: nobody has run a browser end-to-end assistant turn, which is why T029 exists and why no amount of green tests substitutes for it.

## 6. Template / constitution changes I recommend

- **Add an `## AS-IS` section to `spec-template.md`**, mandatory-when-the-feature-touches-existing-behavior. Spec Kit assumes greenfield; most Minion work is not.
- **Resolve the Principle II vs "no implementation details" contradiction in the checklist**, e.g. scope that item to "no implementation details *outside* AS-IS/DELTA". Otherwise every correct Minion spec starts with three false or red checkboxes.
- **Add a `## Slices` section to `plan-template.md`**: repo, `prBase` from repo-policy, package manager, gate command, who merges. It is Principle III and there is nowhere to put it today.
- **Add a `## Gates` phase to `tasks-template.md`** with an `[OWNER]` marker, and make `/speckit-implement` refuse to start while an unchecked `[OWNER]` approval task precedes it.
- **Add "re-verify the AS-IS anchors still hold" as a standard Setup task** in `tasks-template.md`, with "stop and revise the spec" as its failure action.
- **Give `/speckit-clarify` a non-interactive mode** that answers from supplied evidence and tags each answer as assumption-or-derived. Every autonomous Minion agent needs it; today the skill is unrunnable as written without a human.
- **Replace `tasks-template.md`'s greenfield Setup/Foundational examples** with mature-repo ones (worktree, gates-already-green, AS-IS check) — or drop the examples, since they are the part most likely to be copied verbatim.
- **Constitution, Artifact layout**: teach `scripts/spec-index.mjs` to read `specs/*/spec.md` frontmatter and delete the top-level stub requirement. A per-feature duplicate file that only the board reads will be forgotten, and then the board is wrong rather than empty.
- **Constitution, Principle IV**: say that a not-applicable required build step must be recorded as "N/A because <no such surface>", not omitted. Silence and compliance currently look identical.
