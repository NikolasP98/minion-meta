# Phase 1: Clean Slate — Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Source:** Derived from `specs/2026-04-19-minion-meta-repo-design.md` §M0 (scope fully locked by spec approval)

<domain>
## Phase Boundary

Phase 1 brings every subproject to a **known-clean state** before any meta-repo construction begins. It is read-heavy first (audit/inventory), then mutating only with explicit per-item classification (commit / stash-named / discard-approved for dirty trees; merge / close / rebase / hold for open PRs). It produces one durable artifact — `specs/clean-slate-inventory.md` — that becomes a historical audit record and the input to Plans 01-02, 01-03, 01-04, 01-05.

**In scope (this phase):**
- Audit every subproject: `minion`, `minion_hub`, `minion_site`, `minion-shared`, `minion_plugins`, `paperclip-minion`, `pixel-agents` (7 repos)
- Resolve uncommitted changes and stray worktrees (known targets: `paperclip-pi-fallback/`, `paperclip-meta-repair/`, `docs/` restructure drift per `project_docs_restructure_pending.md`)
- Triage every open PR across the 7 subproject GitHub repos
- Relocate/delete root-level one-time research artifacts (`A3_*.md`, `RETENTION_*.md`, `KPI_*.md`, `00_START_HERE.md`, `VISUAL_SUMMARY_A3.txt`, `README_A3_INVESTIGATION.md`, `RESEARCH_OUTPUT_INDEX.md`, `ASSUMPTION_A3_VERDICT.md`)
- Fix broken branch tracking (known target: `minion_plugins` main → origin/master [gone])

**Out of scope (later phases):**
- Any meta-repo git init, npm scope registration, or shared package scaffolding (Phase 2)
- Adopting shared configs in subprojects (Phase 3)
- `minion-shared` folding (Phase 4)
- DB/auth/WS extraction (Phases 5–7)
- Polish/CI (Phase 8)

</domain>

<decisions>
## Implementation Decisions (Locked)

### Audit scope and method
- Seven subproject repos are audited in parallel using one subagent each (`superpowers:dispatching-parallel-agents` pattern with `Explore` subagent type)
- `omnisearch/` is also present at root but is a Netcup-only deployment concern — **out of scope for this phase** (spec §Out of scope)
- Audit is read-only. No mutations happen in the inventory plan. Mutations are gated on user review of the inventory doc per the workflow's HARD rule: "Produces a single report file (`specs/clean-slate-inventory.md`) reviewed with you before any mutations."
- Inventory captures per-subproject: directory, current branch, upstream tracking state, commits ahead/behind origin, dirty-tree files (modified + staged + untracked counts), stray worktrees (via `git worktree list`), open PRs (via `gh pr list`), broken upstreams (branches tracking `[gone]` remotes)

### Resolution categories (per dirty file / worktree / PR)
- **Dirty files:** commit (with message) / stash (named) / discard (requires explicit user approval via AskUserQuestion per file group) / leave in place if user wants to resume later
- **Worktrees:** merge-back (if branch has unique work) / remove (if abandoned) / keep (with explicit reason)
- **PRs:** merge (if ready, CI green, approved) / close (if dead — kitchen-sink / wrong target / superseded) / rebase (if divergent but valuable) / hold (with reason written to inventory doc)

### No destructive defaults
- The inventory plan (01-01) MUST NOT delete, discard, or force-push anything. Its output is a classified recommendation. Human approval required for mutations.
- Resolution plans (01-02, 01-03) classify each recommendation as "approve to execute" or "hold for human decision." Only approved items mutate.

### Use existing PR sweep foundation
- Two prior PR sweeps already ran (see memory: `project_pr_review_sweep_apr11.md` and `project_pr_review_sweep_apr17.md`). Plan 01-03 builds on their classifications rather than re-triaging from zero — any PR still open that was previously classified as "held" must be re-examined for whether the hold reason is still valid.

### Branch protection assumptions
- Never force-push to `main`, `master`, `DEV`, or `dev` branches. Rebasing divergent PR branches is allowed.
- Never delete the `main`/`master`/`DEV`/`dev` default branches of any subproject.

### Working with the meta-repo's own git
- The meta-repo at `AI/.git` was initialized in the previous `/gsd-new-project` run with 4 commits (`de8b7f0`, `8102170`, `d8fe4ef`, `1670152`). It is NOT yet pushed to a remote — that happens in Phase 2 (FOUND-01). Phase 1 operations on the meta-repo's own git are limited to committing Phase 1 artifacts (CONTEXT, RESEARCH if any, PLANs, inventory doc) per GSD's normal commit flow.

### Claude's Discretion (planner decides)
- Exact wave structure for plans within Phase 1 — ROADMAP suggests 5 plans (01-01 through 01-05) but the planner may split or combine
- Exact subagent prompts for each parallel audit task
- Exact format of `specs/clean-slate-inventory.md` (use template patterns from past PR sweeps memory for consistency)
- Whether to produce per-subproject inventory files that roll up into a single summary, or one monolithic inventory doc from the start
- Specific gh CLI queries for PR enumeration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (authoritative)
- `specs/2026-04-19-minion-meta-repo-design.md` — full design; §M0 is the authoritative scope for this phase; §Subagent plan specifies 7 parallel Explore subagents for inventory and 7 parallel general-purpose for PR triage

### Project context
- `.planning/PROJECT.md` — Core Value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — CLEAN-01 through CLEAN-06 definitions
- `.planning/ROADMAP.md` — Phase 1 goal + success criteria + plan skeleton
- `CLAUDE.md` — root orchestrator doc listing subproject branches/stacks/remotes (treat as truth for which subprojects exist and their current branch names)

### Memory context (persistent, cross-session)
- `project_docs_restructure_pending.md` — `docs/` has ~130 deleted + many untracked files from flat→scoped agent restructure that was never committed; audit must surface this
- `project_minion_plugins_broken_tracking.md` — `minion_plugins` main tracks `origin/master [gone]`, needs upstream repair
- `project_pr_review_sweep_apr11.md` — PR sweep classifications from April 11
- `project_pr_review_sweep_apr17.md` — PR sweep classifications from April 17
- `reference_github_repo_names.md` — Local dir names vs GitHub repo names mapping (e.g., `minion_site` → `minion-site` on GitHub); needed for `gh pr list` calls
- `reference_minion_ai_repo.md` — `NikolasP98/minion-ai` is the canonical gateway repo (replaces archived `NikolasP98/minion`)
- `reference_paperclip_fork.md` — paperclip fork lives at `NikolasP98/paperclip`; PR triage for paperclip targets the fork, not upstream
- `reference_minion_agent_bot_github.md` — bot account with PAT that may have open PRs in scope
- `feedback_bot_pr_patterns.md` — bot PR failure modes to watch for during triage (kitchen-sink bundling, wrong repo targeting, dead feature generation)

</canonical_refs>

<specifics>
## Specific Ideas

- Subproject list to audit (from `CLAUDE.md` Project Map):
  - `minion/` on branch `DEV`, remote `NikolasP98/minion-ai`
  - `minion_hub/` on `dev`, remote likely `NikolasP98/minion-hub`
  - `minion_site/` on `master`, remote likely `NikolasP98/minion-site`
  - `minion-shared/` on unknown branch, its own remote
  - `minion_plugins/` on `main`, remote broken per memory
  - `paperclip-minion/` on `minion-integration`, remote `NikolasP98/paperclip` (fork)
  - `pixel-agents/` on `main`, remote its own

- Known stray worktrees at root (visible in initial `ls`): `paperclip-pi-fallback/`, `paperclip-meta-repair/` (both associated with `paperclip-minion`)

- Root-level research artifacts already enumerated in the design spec §M0.4

- Past PR sweep outcomes live in memory files — Plan 01-03 should read them as inputs, not re-triage from scratch for PRs already classified there

</specifics>

<deferred>
## Deferred Ideas

- Meta-repo `.gitignore` update to explicitly ignore subproject directories — deferred to Phase 2 (FOUND-02) where the meta-repo workspace is set up
- Any changes to the root `CLAUDE.md` content or structure — deferred to Phase 2 (FOUND-12) and finalized in Phase 8 (POLISH-04)
- VAULT/docs/ai-studio restructuring — explicitly out of scope (spec §Out of scope)
- `omnisearch/` repo status — out of scope
- Pushing the meta-repo to a new `NikolasP98/minion-meta` GitHub remote — deferred to Phase 2 (FOUND-01)

</deferred>

---

*Phase: 01-clean-slate*
*Context gathered: 2026-04-19 via spec-derivation (no discuss-phase needed; spec approval provides lock)*
