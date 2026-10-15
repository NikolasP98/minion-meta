# SDD adoption audit — Spec Kit on the Minion workspace (2026-10-15)

Owner ask (verbatim): "pass all pending implementations and a sample of the most recently
completed specs (from features/fixes live in prod) and begin a full audit of implementing sdd".

## Scope and method

Eleven features were run through the installed Spec Kit 1.2.0 workflow
(`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-analyze`; no implement/converge), one agent per feature, each in its own detached
worktree of `minion-meta` `origin/dev` with `SPECIFY_FEATURE_DIRECTORY` pinned. Every feature
directory carries `sdd-notes.md`, a friction log with phase times, counts, tooling errors,
and fit against the Minion SDLC contract. The three retrospectives also carry
`retro-scorecard.md`.

| Dir | Kind | Source of the work |
|---|---|---|
| `specs/001-restore-agent-gateway-assignment` | pending, security+data | harness proposal S0a/S0b |
| `specs/002-typed-agent-reads-retire-crm-query` | pending, security | S0d + S4 |
| `specs/003-agent-bridge-rbac-parity` | pending, security | S2 (minus shipped hotfix #541) |
| `specs/004-generic-agent-action-dispatcher` | pending, security | S3 |
| `specs/005-mcp-hub-tools-per-user-identity` | pending, security | S5 |
| `specs/006-jit-tool-selection-on` | pending | S6 |
| `specs/007-jev-router-followups` | pending | B-D3 D5 D7–D10 |
| `specs/008-spec-index-speckit-bridge` | pending | Spec Kit install follow-up |
| `specs/101-retro-pos-shift-scoped-edits` | shipped, live (hub #534–#536) | had a flat spec + review + follow-ups proposal |
| `specs/102-retro-sellable-card-view` | shipped, live (hub #537 + fix #538) | no spec; owner ask in chat |
| `specs/103-retro-assistant-launcher-position` | shipped, live (hub #539) | no spec; one-file fix |

Inputs available to every agent: hub `origin/master` and gateway `origin/DEV` read-only
checkouts, the agent-harness audit (`audits/2026-10-15-agent-harness/`), the restoration
proposal, `AGENTS.md`, `specs/TEMPLATE.md`, and the merged PRs via `gh`.

## Tooling facts established before the run

- Spec Kit 1.2.0 creates **no git branch** on its own; branching is the optional `git`
  extension's `before_specify` hook. The skill only creates `specs/<NNN>-<slug>/` and
  writes `.specify/feature.json` (per-checkout, gitignored). Parallel features therefore
  need either separate checkouts or `SPECIFY_FEATURE_DIRECTORY` on every command.
- `scripts/spec-index.mjs` reads only top-level `specs/*.md`; Spec Kit directories are
  invisible to the board and its CI gate. No conflict, no row. (Feature 008 specs the bridge.)
- The `/speckit-*` skills resolve the project from the nearest `.specify/`; a session started
  inside a subproject directory finds none. Upstream's answer is `SPECIFY_INIT_DIR`
  (`common.sh` `get_repo_root`): strict, must point at a directory containing `.specify/`,
  no fallback.
- `.specify/scripts/bash/update-agent-context.sh` is not shipped in 1.2.0 (the
  `agent-context` extension owns CLAUDE.md edits), so nothing in the core flow touches the
  gated `AGENTS.md`/`CLAUDE.md` pair.

## Upstream guidance vs. our setup

| Upstream (github/spec-kit docs/guides) | Our setup today | Gap |
|---|---|---|
| Bug fixes: opt-in **bug** extension (`specify extension add bug`) → `/speckit-bug-assess` → `-fix` → `-test`, artifacts in `.specify/bugs/<slug>/`; "You do not need to run the SDD feature workflow first." | Constitution I says a hotfix "may compress the cycle but must still produce a `spec.md`". | We force the feature workflow on one-file fixes (see 103). Install `bug`; amend Constitution I to route fixes through it. |
| Monorepo: each member project may hold its own `.specify/`; `SPECIFY_INIT_DIR` targets a project from any cwd. | One `.specify/` at the meta root; subprojects are separate git repos the meta ignores. | Export `SPECIFY_INIT_DIR=<meta root>` for subproject sessions (shell profile / agent-calls), rather than installing per repo and splitting the spec of record. |
| Existing projects: "Choose a bounded first change"; "Decide how specs will age" (immutable record / living spec / flow-back). | Not decided. The flat `specs/*.md` system uses frontmatter `status` as the live state. | Decide the persistence model (recommendation below). |
| Git branching: `git` extension numbers and creates feature branches. | Branch roles come from `repo-policy.yaml` per subproject; the meta repo is docs. | Do not install `git`; branches belong to the code repos, not to the spec directory. |
| Agent context: `agent-context` extension maintains CLAUDE.md markers. | `AGENTS.md` is the gated, generated instruction file. | Do not install; parity gate would fight it. |

## Findings

### 1. Measured cost per feature (artifact writing only, no implementation)

| Feature | Minutes | FR | SC | Tasks | Clarify Q/A | Markers left | Analyze findings (C/H/M/L) |
|---|---|---|---|---|---|---|---|
| 001 gateway assignment | 18.9 | 24 | 8 | 33 | 10 | 1 | 0/1/5/4 |
| 002 typed reads | 18.2 | 15 | 5 | 24 | 3 | 0 | 0/2/2/3 |
| 003 RBAC parity | 17.9 | 29 | 12 | 58 | 10 | 2 | 1/3/4/4 |
| 004 action dispatcher | 17.7 | 25 | 10 | 46 | 5 | 3 | 1/3/7/4 |
| 005 MCP identity | 19.2 | 30 | 10 | 68 | 5 | 3 | 3/3/6/4 |
| 006 JIT selection | 13.0 | 9 | 6 | 24 | 3 | 0 | 1/2/2/1 |
| 007 JEV follow-ups | 17.1 | 11 | 7 | 26 | 3 | 0 | 0/0/3/3 |
| 008 spec-index bridge | 10.4 | 14 | 5 | 19 | 3 | 0 | 0/1/1/2 |
| 101 retro shift edits | 10.3 | 23 | 6 | 53 | 5 | 2 | 1/2/5/3 |
| 102 retro card view | 5.6 | 10 | 4 | 23 | 5 | 1 | 2/3/2/0 |
| 103 retro launcher | 7.6 | 6 | 4 | 15 | 2 | 0 | 1/1/4/0 |

Phase times are agent wall clock stamped at phase boundaries; evidence reading before the
first stamp is excluded in several logs, so the real cost is higher. For scale: the launcher
fix's SDD paperwork (7.6 min) equalled the PR's open-to-merge time (7.5 min); the card view's
(5.6 min) was ~20% of its 27-minute cycle and would have pre-empted the 8-minute follow-up
fix #538 (see §3).

### 2. What SDD found that the inputs did not contain

The point of the exercise. Every pending feature was specified from an audit written hours
earlier by the same model family, and the specify/clarify/analyze passes still disproved or
sharpened the inputs:

| Feature | Finding | Consequence |
|---|---|---|
| 001 | The provisioner creates the agent through `gatewayCall → resolveCredentialsForUser(undefined)`, i.e. on the **platform system gateway**, while the resolver compares the assignment to the **calling** gateway. The proposal's S0a rule "assign the org's prd gateway" coincides with reality only for org `21e0601b…` (all 10 active rows). | S0a as proposed would have passed its tests, fixed FACES, and silently 403'd the next org's first user. Also HIGH: an org with a dev-only gateway has no consistent outcome (`channelFirst()` is ORDER BY, not WHERE). |
| 004 | Only **193 of 364** hub write pairs are capability-mapped by `apiWriteCapability`; 171 are not, including all of harness gap #10 (team/access admin). | A generic dispatcher caps at ~53% of writes, not "anything"; the harness audit's structural claim was half right. Positive: `event.fetch` runs the real route through the whole `hooks.server.ts` pipeline, so module-enabled, owner scope and masking come free. |
| 005 | The hub JWT's agent claim is **empty for every personal agent provisioned by the live path**; `/mcp` never consults the JWT revocation store the WebSocket path checks. Counts: 31 `mcpExport` tools (not 32), 17 writes among 30 (not 12), 27 of 30 declare a permission — `module_action` (a write dispatcher over 17 endpoints) does not. | The harness audit's "smallest design" (`assignedAgentIds[0]`) would not have worked as written; a revoked credential keeps working up to an hour. |
| 003 | `actions/notify-user` **does** enforce `comms:create` (`requireNotificationAdmission`, fresh membership re-check). | The "checks nothing" claim in report C, the synthesis and the proposal is stale; report E's parity table was right. Also: `repo-policy.yaml` names `bun run test` / `pnpm test` as the gates, both of which are unsafe (prod hit 2026-09-03; box crash). |
| 002 | 12 typed endpoints + 1 retired stub, not 13; the number survived four phases unchallenged. Deleting the gateway tool requires regenerating the git-tracked `_registry.generated.ts`, which no task covered. | Counts must be re-derived from source at analyze time; generated-file regeneration is a task class the template lacks. |
| 006 | The envelope-strip regex the plan specified is `^`-anchored and can never match the mid-message case the spec's own edge cases require. | A self-contradiction between a task's goal and its implementation, caught only by the separate analyze pass. |
| 101 | **INV-3 / FR-008 ("every POS mutation leaves an audit row") has no test in any of #534–#536**; the `no_open_shift` refusal is untested; FR-020 (customer/document/note edits in T1) was never delivered; the spec skipped its 2-pass review (`pass: 1`, no `.review.md`). | Live-production gaps in a feature that had the workspace's best flat spec (evidence 5/5, traceability 5/5). |
| 102 | `research.md`'s "shared stock derivation" decision and task T014 state almost verbatim the fix #538 had to ship, tied to SC-002 "zero discrepancies". | The stock-parity defect would very likely have been caught before #537 merged; the alignment defect only plausibly (the scenario existed, nothing forced it to run). |
| 103 | `/speckit-clarify` surfaces the owner's two contradictory sentences ("stored in local/sessionstorage" vs "hard refresh moves it back") as an explicit recorded decision; the PR shipped zero tests for six requirements. | Value is real but the five-document cycle is disproportionate for a one-file fix. |

### 3. Retrospective scorecards (original pre-work artifact, 0–5)

| Axis | 101 (flat spec + review) | 102 (PR body only) | 103 (PR body only) |
|---|---|---|---|
| Evidence anchors in AS-IS | 5 | 2 | 1 |
| Testable requirements | 4 | 1 | 1 |
| Measurable success criteria | 2 | 0 | 0 |
| Task → commit traceability | 5 | 0 | 2 |
| Open-items ledger | 3 | 2 | 1 |

The flat-spec feature beats Spec Kit on traceability (PR numbers, SHAs and merge dates
recorded in the spec itself; Spec Kit has no such slot) and matches it on evidence, but has
no success-criteria concept at all. The two unspec'd changes score near zero on every axis,
and both shipped without tests.

### 4. Tooling friction, ranked by how many of the eleven runs hit it

| # | Friction | Runs | Detail |
|---|---|---|---|
| F1 | **Spec template has no AS-IS/TO-BE/DELTA slot** and its quality checklist says "no implementation details / for non-technical stakeholders", while Constitution II requires `file:line` anchors. | 11/11 | Every agent invented a heading; `/speckit-analyze` rates the mismatch CRITICAL by its own "constitution conflicts are always CRITICAL" rule (103 D1). A checklist that cannot go green on a correct Minion spec will be ignored within three features. |
| F2 | **Cross-repo features have no home.** `**Feature Branch**`, `BRANCH` in script output and the plan's single source tree assume spec and code share a repo; here the spec lives in minion-meta and code in `minion_hub`/`minion` with their own PR bases. | 9/11 | Agents invented "Target repos / PR bases" and "Slices" sections. |
| F3 | **`/speckit-clarify` is interactive-only**; `/speckit-specify` allows ≤3 surviving markers while `/speckit-plan` says "ERROR on unresolved clarifications". | 9/11 | Unattended agents folded clarify into specify and self-answered with `ASSUMPTION` tags. The two skills contradict each other in one chain. |
| F4 | **`/speckit-analyze` is read-only by contract** and the harness's Write tool refused `analysis.md` for subagents. | 6/11 | Agents wrote via shell heredoc; real defects found by analyze (wrong counts in 005, regex in 006) were left in place because the skill forbids fixes. |
| F5 | **Feature numbering collides under fan-out**: `NNN` is derived by scanning `specs/`, so eleven parallel runs would all pick 001. | 11/11 (pre-empted by pinning `SPECIFY_FEATURE_DIRECTORY`) | Sequential numbering needs a reservation step or timestamp mode. |
| F6 | **`node scripts/repo-policy.mjs show` fails in a fresh worktree** (`ERR_MODULE_NOT_FOUND: ajv`), yet the constitution tells every plan to run it. | 5/11 | Agents read `repo-policy.yaml` directly, which `AGENTS.md` forbids. |
| F7 | **Board invisibility**: no run created the top-level stub the constitution demands; all eleven features are invisible to `spec-index.mjs`. | 11/11 | Feature 008 specs the fix. |
| F8 | Template has no slot for the **required build steps** (Principle IV), the **security tag / human gates** (Principle V) or the **open-items ledger**; `/speckit-implement` would run straight past an owner-approval gate. | 7/11 | Present in the artifacts only because the agents knew to add them. |
| F9 | Greenfield assumptions in `tasks-template.md` ("all user stories can start in parallel", Setup examples) do not fit a mature repo; "exact file path" rule is not self-enforcing. | 4/11 | |
| F10 | Hook preambles in every skill (`.specify/extensions.yml` absent) add noise to each run. | 3/11 | |

### 5. Fit with the Minion SDLC contract

Overlap: user scenarios + acceptance scenarios map cleanly onto TO-BE; `/speckit-analyze` is a
genuine cross-artifact review the contract lacks between spec and PR; success criteria are a
concept the flat `TEMPLATE.md` does not have and 101 shows the cost of that absence.

Conflicts: AS-IS evidence (F1); repo/PR-base identity (F2); the 2-pass independent review of
the contract has no Spec Kit equivalent (`/speckit-analyze` is self-review by the same author);
slice→PR→commit traceability exists only in the flat format; human gates are a principle, not
a task (101 and 004 both found `tasks.md` silently dropping the Principle V gate).

Holes: the open-items ledger, the board index, and "N/A" recording for Principle IV
(silence and compliance look identical).

### 6. Corrections to the agent-harness audit (fold back)

- `actions/notify-user` enforces `comms:create` (report C M3, synthesis §3, proposal: stale).
- Typed read endpoints: 12 (+1 retired stub), not 13.
- `mcpExport` tools: 31, with 17 writers and 3 permission-less (incl. `module_action`).
- Hub write pairs: 364 enumerated by 004's script vs 368 by report A; 193 capability-mapped.
- The S0a provisioning rule in the proposal is wrong as written (see §2, 001).
- The MCP "smallest design" relies on a JWT agent claim that is empty for provisioned agents.

## Recommendations

Ordered by leverage; each is small.

1. **Fork the templates for Minion** (`.specify/templates/`): add mandatory `## AS-IS / TO-BE / DELTA (evidence)` to `spec-template.md`; replace `**Feature Branch**` with `**Repos & PR bases**` (values from repo-policy); add `**Tags**` and `**Human gates**` header fields; scope the "no implementation details" checklist item to User Scenarios only; add `## Slices` (repo, PR base, package manager, safe gate command, who merges) and a per-repo source tree to `plan-template.md`; make Phase 1 of `tasks-template.md` "Gates & prerequisites" with `[OWNER]` tasks and a final "Open items" phase that emits `TODO(handoff)` + proposal entry; add a `## Traceability` table (task → PR → SHA) filled at merge. Presets/overrides are the supported mechanism (`docs/guides/customization.md`).
2. **Ship feature 008** so `spec-index.mjs` reads `specs/*/spec.md` with TEMPLATE frontmatter, then delete the stub rule from the constitution and AGENTS.md. Note the heading-lint hazard: Spec Kit emits `## Requirements *(mandatory)*`.
3. **Install the `bug` extension** and amend Constitution I: fixes and one-file changes go through `/speckit-bug-assess → fix → test` (`.specify/bugs/<slug>/`), with the hotfix-minimum 103 identified (AS-IS evidence, the one real ambiguity, one test obligation, ledger entry). Keep the feature cycle for anything that adds a surface or touches security/data.
4. **Unattended clarify mode**: a workspace note in `speckit-clarify`'s skill (or a preset) that, when no user is present, answers from supplied evidence and tags each answer `ASSUMPTION — owner to confirm`; reconcile `plan`'s "ERROR on unresolved clarifications" with `specify`'s ≤3 markers by letting owner-tagged markers through.
5. **Let analyze write and remediate**: write `analysis.md` by default and add a "re-verify load-bearing counts and paths against the live repo" pass; allow applying its own CRITICAL fixes with a changelog line (or a `/speckit-remediate` step).
6. **Make the human gate a task**, not only a principle: `/speckit-implement` must refuse to start while an unchecked `[OWNER]` approval task precedes it.
7. **Fix the worktree gate**: `repo-policy.mjs` must run from a fresh worktree (vendor `ajv` or document `pnpm install --frozen-lockfile --ignore-scripts`), since the constitution mandates it per plan.
8. **Numbering**: switch `feature_numbering` to `timestamp` or add a reservation step; sequential scanning cannot survive parallel sessions.
9. **Subproject sessions**: export `SPECIFY_INIT_DIR=/home/nikolas/Documents/CODE/MINION` in the shell profile / agent-calls config so `/speckit-*` resolves the meta project from any subproject cwd; do not install per-repo `.specify/`.
10. **Decide spec aging** (upstream "Decide How Specs Will Age"): recommend *flow-back* with the Spec Kit directory as the record and `status` in its frontmatter as the live state, matching how the flat specs already work.
11. **Do not install** the `git` (branch roles belong to repo-policy) or `agent-context` (AGENTS.md is gated) extensions.

## Live-code items surfaced that need an owner decision regardless of SDD

- POS audit-row invariant and `no_open_shift` refusal are untested in production code (101).
- The gateway-assignment restoration must bind to the gateway the provisioner actually used, not "the org's prd gateway" (001); and dev-only orgs need a defined outcome.
- `/mcp` ignores JWT revocation (005).

## Not verified

No `/speckit-implement` or `/speckit-converge` was run; no code was changed; the eleven
`tasks.md` files are proposals, not approved work. The pending specs carry owner-tagged
assumptions and up to three open markers each; the security-tagged ones (001–005) are
blocked on Principle V approval by construction. Several agents' phase times exclude their
evidence reading. The 364/193 enumeration (004) is a one-off script, not a CI gate.
