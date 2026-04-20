# Clean Slate Inventory

**Generated:** 2026-04-19
**Phase:** 01-clean-slate
**Status:** Pre-mutation audit — REVIEW BEFORE MUTATIONS
**Plan:** 01-01
**Authority:** `specs/2026-04-19-minion-meta-repo-design.md` §M0

## How to review this doc

Plans 01-02 through 01-05 consume specific sections:
- 01-02 reads: Dirty Trees + Stray Worktrees
- 01-03 reads: Open PRs (populated later by Plan 01-03 itself; this plan leaves a stub)
- 01-04 reads: Root Artifacts
- 01-05 reads: Broken Upstreams

For every recommendation labeled `Recommendation:` below, flag it with one of these dispositions before any Wave-2 plan executes:
- `APPROVED` — executor may proceed
- `HOLD: <reason>` — executor must skip and log
- `MODIFY: <new plan>` — rewrite the recommendation

## Subprojects

### minion

- Path: /home/nikolas/Documents/CODE/AI/minion
- Branch: DEV
- Upstream: origin/DEV
- Ahead/Behind: 1 ahead, 0 behind
- Dirty: modified=12, staged=0, untracked=3
- Worktrees: none extra (self only)
- HEAD: 6449b9801 move docs/ to VAULT/MINION/minion-ai, replace with symlink
- Remote: origin → git@github.com:NikolasP98/minion-ai.git (canonical, correct per memory)
- Notable: 1 unpushed commit on DEV (the docs→symlink move). 12 modified files cluster around voice-call, agent templates, prompt assembly, and session types. Three untracked items: `extensions/paperclip/` (new extension dir), `skills/1password-secrets/` (new skill), `src/gateway/server-methods/prompt.ts` (new gateway method — likely from the prompt-pipeline-traceability work per memory).

Dirty file detail:
```
 M .gitignore
 M extensions/voice-call/src/webhook.ts
 M package.json
 M services/voice-s2s/agents.json
 M services/voice-s2s/ivr.py
 M src/agents/embedded-subagent-templates.generated.ts
 M src/agents/embedded-templates.generated.ts
 M src/agents/sections/assemble.ts
 M src/agents/sections/registry.ts
 M src/agents/system-prompt/system-prompt-report.ts
 M src/config/sessions/types.ts
 M src/gateway/server-core/server-methods.ts
?? extensions/paperclip/
?? skills/1password-secrets/
?? src/gateway/server-methods/prompt.ts
```

Recommendations:
- **Unpushed commit on DEV** (6449b9801 docs→symlink): Recommendation: `push` to origin/DEV after dirty-tree resolution (commit message already clean); alternatively `leave-in-place` if the symlink move is still under review.
- **Generated templates** (`embedded-subagent-templates.generated.ts`, `embedded-templates.generated.ts`): Recommendation: `commit` as part of "chore: rebuild embedded agent templates" — these are byproducts of source changes in `src/agents/sections/` and should ship together.
- **voice-call + voice-s2s changes** (`extensions/voice-call/src/webhook.ts`, `services/voice-s2s/agents.json`, `services/voice-s2s/ivr.py`): Recommendation: `commit` as "feat(voice): [user fills scope]" — these belong to an in-flight voice work thread per memory (`project_twilio_voice_call_secrets.md`, `reference_voice_call_deployment.md`). Group into one logical commit.
- **Prompt pipeline changes** (`src/agents/sections/assemble.ts`, `src/agents/sections/registry.ts`, `src/agents/system-prompt/system-prompt-report.ts`, `src/gateway/server-methods/prompt.ts`, `src/gateway/server-core/server-methods.ts`): Recommendation: `commit` as "feat(prompt-pipeline): per-section traceability + prompt.preview RPC" — maps to `project_prompt_pipeline_traceability.md` memory. Group as single commit.
- **Session type change** (`src/config/sessions/types.ts`): Recommendation: `commit` alongside whichever feature introduced it (likely voice or prompt pipeline — user decides grouping).
- **package.json + .gitignore**: Recommendation: `commit` as "chore: deps + gitignore bumps" (or fold into the largest feature commit above).
- **`extensions/paperclip/` untracked**: Recommendation: `commit` as "feat(extensions/paperclip): initial paperclip integration extension" IF complete; else `stash name="paperclip-extension-wip"` if still under development.
- **`skills/1password-secrets/` untracked**: Recommendation: `commit` as "feat(skills): 1password-secrets skill" IF intentional; else `stash name="1password-skill-wip"`.

### minion_hub

- Path: /home/nikolas/Documents/CODE/AI/minion_hub
- Branch: dev
- Upstream: origin/dev
- Ahead/Behind: 1 ahead, 0 behind
- Dirty: modified=8, staged=0, untracked=0
- Worktrees: none extra (self only)
- HEAD: 725bcae move docs/ to VAULT/MINION/minion_hub, replace with symlink
- Remote: origin → git@github.com:NikolasP98/minion_hub.git (underscore preserved per memory)
- Notable: 1 unpushed commit (docs→symlink, parallels minion's). All modifications cluster around the bug-reporter feature + supporting GH issues service — matches `project_hub_bug_reporter_enhancements.md` memory (service versions, agent label, clipboard image paste).

Dirty file detail:
```
 M .gitignore
 M package.json
 M src/lib/components/layout/BugReporter.svelte
 M src/lib/components/ui/Combobox.svelte
 M src/lib/state/ui/bug-reporter.svelte.ts
 M src/routes/api/bugs/report/+server.ts
 M src/server/services/github-issues.service.ts
 M vite.config.ts
```

Recommendations:
- **Unpushed commit on dev** (725bcae docs→symlink): Recommendation: `push` to origin/dev after dirty-tree resolution.
- **Bug reporter feature group** (BugReporter.svelte, Combobox.svelte, bug-reporter.svelte.ts, api/bugs/report/+server.ts, github-issues.service.ts, vite.config.ts): Recommendation: `commit` as "feat(bug-reporter): service versions + agent label + clipboard paste" (or however user worded the actual scope) — single logical commit per `project_hub_bug_reporter_enhancements.md`.
- **package.json + .gitignore**: Recommendation: `commit` with the bug reporter commit if deps were added for it, else separate "chore: deps/gitignore".

### minion_site

- Path: /home/nikolas/Documents/CODE/AI/minion_site
- Branch: master
- Upstream: origin/master
- Ahead/Behind: 0 ahead, 0 behind
- Dirty: modified=2, staged=0, untracked=1
- Worktrees: none extra (self only)
- HEAD: 758d11f add robots.txt for Google indexing
- Remote: origin → git@github.com:NikolasP98/minion-site.git (hyphen on GitHub per memory)
- Notable: Almost clean. One untracked `docs` entry (likely a dangling symlink or the docs→VAULT migration footprint). `.gitignore` + `package.json` have edits — likely the same `docs/` symlink pattern rolled out across hub+site but uncommitted here.

Dirty file detail:
```
 M .gitignore
 M package.json
?? docs
```

Recommendations:
- **`.gitignore` + `package.json` + `docs` untracked**: Recommendation: `commit` as "chore: move docs/ to VAULT/MINION/minion-site symlink" IF the `docs` entry is the new symlink mirroring the pattern already landed on minion/ and minion_hub/ (both committed HEADs show "move docs/ to VAULT/MINION/..."). Verify `docs` is in fact a symlink (`file /home/nikolas/Documents/CODE/AI/minion_site/docs`) before approving.
- Alternative: `stash name="docs-symlink-migration-wip"` if not ready.

### minion-shared

- Path: /home/nikolas/Documents/CODE/AI/minion-shared
- Branch: N/A — **no `.git/` directory present**
- Upstream: MISSING — not a git repo
- Ahead/Behind: N/A — no git
- Dirty: N/A — not tracked (contents are: `package.json`, `bun.lock`, `src/`, `dist/`, `tsconfig.json`, `docs` symlink, `node_modules/`)
- Worktrees: N/A
- HEAD: N/A — no git
- Remote: N/A
- Notable: **MAJOR DRIFT.** The directory exists with intact source (`src/index.ts`, `src/gateway/`, `src/utils/`) and a built `dist/`, plus a `docs` symlink to `VAULT/MINION/minion-shared`, but it has no local `.git/` directory and is not a submodule of the meta-repo. This contradicts the plan's assumption that `minion-shared` is an independent repo to be folded via `git subtree add` in M3 (SHARE-01). Either (a) `.git/` was deleted at some point, (b) the directory was rehydrated from a build-output snapshot without cloning, or (c) it was never a git repo locally. **This materially affects M3 planning.**

Recommendations:
- **Verify remote repo status**: Recommendation: `investigate` — check whether `NikolasP98/minion-shared` (GitHub) still exists and holds the canonical history. If yes, `fix-upstream` = `rm -rf minion-shared && git clone git@github.com:NikolasP98/minion-shared.git` (preserves M3 SHARE-01 strategy of `git subtree add` later). If no, treat current loose files as the canonical source and plan M3 as a direct copy rather than subtree-add.
- **Do NOT run `git init` in this folder** without user decision — would fabricate a git history that conflicts with whatever lives on the GitHub remote.
- **Flag for explicit decision**: This is not a simple commit/stash/discard case — it's a structural ambiguity that M3 planning must resolve. Recommendation: `hold` the entire folder and surface to user as a Phase 1 decision point.

### minion_plugins

- Path: /home/nikolas/Documents/CODE/AI/minion_plugins
- Branch: main
- Upstream: origin/master **[GONE]** (configured but remote branch no longer exists)
- Ahead/Behind: N/A — no valid upstream
- Dirty: modified=0, staged=0, untracked=1 (`docs`)
- Worktrees: none extra (self only)
- HEAD: 56fa682 feat: initialize minion plugins marketplace
- Remote: origin → git@github.com:NikolasP98/minion_plugins.git
- Notable: **Broken tracking confirmed** — matches memory `project_minion_plugins_broken_tracking.md`. Verified: `origin/main` exists on remote at SHA `56fa682dabf64d958088e70429b9c35255b008fb`, which matches local HEAD exactly. Fix is mechanical: point `main` at `origin/main`.

Recommendations:
- **Broken upstream**: Recommendation: `fix-upstream` via `git branch --set-upstream-to=origin/main main` (verified origin/main exists with matching SHA — safe to execute). This is the canonical fix for CLEAN-02 compliance.
- **`docs` untracked**: Recommendation: `commit` as "chore: add docs symlink to VAULT/MINION/minion_plugins" (verify it is a symlink first) OR `leave-in-place` if the docs VAULT target does not exist yet for this subproject.

### paperclip-minion

- Path: /home/nikolas/Documents/CODE/AI/paperclip-minion
- Branch: minion-integration
- Upstream: fork/minion-integration
- Ahead/Behind: 0 ahead, 0 behind
- Dirty: modified=2, staged=0, untracked=1 (`.serena/`)
- Worktrees: **3 total** — `paperclip-minion/` (self), `paperclip-meta-repair/` (branch `chore/meta-snapshot-repair`), `paperclip-pi-fallback/` (branch `feat/pi-openrouter-fallback`)
- HEAD: 14b95601 Merge: opencode-local envAlias support
- Remotes:
  - `origin` → https://github.com/paperclipai/paperclip (read-only upstream)
  - `fork` → git@github.com:NikolasP98/paperclip.git (canonical push target per memory)
- Notable: Tracking correctly on fork. Merge commit `14b95601` indicates the opencode-local envAlias change (from the meta-repair worktree) has already landed. Modifications are to the github-agent-trigger plugin. `.serena/` is Serena MCP server workspace cache — should be gitignored, not committed.

Dirty file detail:
```
 M packages/plugins/github-agent-trigger/src/prompt.ts
 M packages/plugins/github-agent-trigger/src/worker.ts
?? .serena/
```

Recommendations:
- **github-agent-trigger changes** (prompt.ts, worker.ts): Recommendation: `commit` as "fix(github-agent-trigger): [user describes]" — part of an active plugin iteration per memory `project_github_trigger_plugin.md`. Verify this work is ready to ship before committing.
- **`.serena/` untracked**: Recommendation: `gitignore` (add `.serena/` to `.gitignore`) — this is per-user MCP server cache, should never be committed. Separate commit: "chore: gitignore .serena/ cache".

### pixel-agents

- Path: /home/nikolas/Documents/CODE/AI/pixel-agents
- Branch: main
- Upstream: origin/main
- Ahead/Behind: 0 ahead, 0 behind
- Dirty: modified=0, staged=0, untracked=1 (`docs`)
- Worktrees: none extra (self only)
- HEAD: 1eb308c chore: add feature request template, update community docs (#164)
- Remote: origin → https://github.com/pablodelucca/pixel-agents.git (upstream, NOT a Nikolas fork — Nikolas does not have push access here without setting up a fork)
- Notable: Cleanest of all 7. Only drift is the `docs` untracked entry (same symlink pattern as elsewhere).

Recommendations:
- **`docs` untracked**: Recommendation: `commit` as "chore: add docs symlink to VAULT/MINION/pixel-agents" IF the symlink target exists AND user has push access (currently remote is `pablodelucca/pixel-agents`, so pushing upstream would need PR flow). Alternative: `leave-in-place` since upstream push is not set up — no value in committing locally without a fork remote. User decision required on whether to establish a fork for pixel-agents.

## Stray Worktrees (cross-subproject view)

Both worktrees below are attached to `paperclip-minion/.git/worktrees/` (formal git worktrees, not loose clones). Verified via `.git` file pointers inside each directory.

### paperclip-pi-fallback/

- Path: /home/nikolas/Documents/CODE/AI/paperclip-pi-fallback
- Parent repo: /home/nikolas/Documents/CODE/AI/paperclip-minion
- Branch: feat/pi-openrouter-fallback
- Upstream: fork/feat/pi-openrouter-fallback
- HEAD: 82b89933 docker: swap @mariozechner/pi-ai (OAuth helper, wrong) for pi-coding-agent (the actual agent runner CLI providing 'pi' bin)
- Unique vs fork/minion-integration: **0 commits** (fully merged via `Merge feat/pi-openrouter-fallback` commits visible on minion-integration)
- Dirty: modified=0, staged=0, untracked=0 — clean
- Context: Matches memory `project_paperclip_pi_openrouter_fallback.md` — the pi-local + OpenRouter fallback work. All commits are now present on minion-integration.
- Recommendation: `remove-worktree` via `git -C paperclip-minion worktree remove paperclip-pi-fallback` (feature fully merged; worktree has no unique work and no dirty state — safe to remove). Optionally also `git branch -D feat/pi-openrouter-fallback` locally if user doesn't want to keep the branch reference (remote branch `fork/feat/pi-openrouter-fallback` can remain for history).

### paperclip-meta-repair/

- Path: /home/nikolas/Documents/CODE/AI/paperclip-meta-repair
- Parent repo: /home/nikolas/Documents/CODE/AI/paperclip-minion
- Branch: chore/meta-snapshot-repair
- Upstream: **MISSING** — no upstream configured
- HEAD: 50fe95a0 opencode-local: add envAlias support (mirrors pi-local) + pre-create .cache/opencode in Dockerfile
- Unique vs fork/minion-integration: **0 commits** (merged — the `14b95601 Merge: opencode-local envAlias support` on minion-integration folded in 50fe95a0 and the meta-snapshot/0054 repair commit 96460aae per memory `reference_paperclip_drizzle_snapshot_drift.md`)
- Dirty: modified=0, staged=0, untracked=0 — clean
- Context: Matches memory `reference_paperclip_drizzle_snapshot_drift.md` (missing snapshot 0054 repair). All relevant commits are now on minion-integration.
- Recommendation: `remove-worktree` via `git -C paperclip-minion worktree remove paperclip-meta-repair` (feature fully merged; no unique work, no dirty state, no upstream to preserve). Optionally `git branch -D chore/meta-snapshot-repair` locally — no remote to push it to anyway.

## Root Artifacts

All 10 expected candidates are present at `/home/nikolas/Documents/CODE/AI/` as of 2026-04-19. Dates on all files cluster around 2026-03-24 — one-time research output from the A3 retention benchmark sprint, per memory context (`00_START_HERE.md` is referenced in `CLAUDE.md` as "Entry point for A3 retention research (March 2026)").

Target relocation folder: `ai-studio/retention/` (does not yet exist — Plan 01-04 will create it). `ai-studio` is a symlink to `/home/nikolas/Documents/VAULT/MINION/strategy`, so the real destination is `VAULT/MINION/strategy/retention/`.

- 00_START_HERE.md: Recommendation: relocate to `ai-studio/retention/00_START_HERE.md` (rationale: entry point doc for the A3 research sprint — belongs with the rest of the A3 artifacts, not at meta-repo root)
- A3_ACTION_PLAN_AND_EXPERIMENTS.md: Recommendation: relocate to `ai-studio/retention/A3_ACTION_PLAN_AND_EXPERIMENTS.md` (rationale: A3 research artifact)
- A3_ONE_PAGE_SUMMARY.md: Recommendation: relocate to `ai-studio/retention/A3_ONE_PAGE_SUMMARY.md` (rationale: A3 research artifact)
- A3_RESEARCH_EXECUTIVE_SUMMARY.md: Recommendation: relocate to `ai-studio/retention/A3_RESEARCH_EXECUTIVE_SUMMARY.md` (rationale: A3 research artifact)
- ASSUMPTION_A3_VERDICT.md: Recommendation: relocate to `ai-studio/retention/ASSUMPTION_A3_VERDICT.md` (rationale: A3 research artifact)
- KPI_TRACKING_TEMPLATE.md: Recommendation: relocate to `ai-studio/retention/KPI_TRACKING_TEMPLATE.md` (rationale: A3-era KPI template; keep alongside related research)
- README_A3_INVESTIGATION.md: Recommendation: relocate to `ai-studio/retention/README_A3_INVESTIGATION.md` (rationale: A3 research artifact)
- RESEARCH_OUTPUT_INDEX.md: Recommendation: relocate to `ai-studio/retention/RESEARCH_OUTPUT_INDEX.md` (rationale: index doc for the A3 artifact set — should travel with the set)
- RETENTION_BENCHMARK_RESEARCH.md: Recommendation: relocate to `ai-studio/retention/RETENTION_BENCHMARK_RESEARCH.md` (rationale: A3 core research doc)
- VISUAL_SUMMARY_A3.txt: Recommendation: relocate to `ai-studio/retention/VISUAL_SUMMARY_A3.txt` (rationale: A3 research artifact)

All 10 artifacts go to the same target directory. Plan 01-04 will batch the move. No file is recommended for `delete` — all are source-of-truth research documents that should be preserved in VAULT.

**Note on non-artifact root files** (informational only — not part of the cleanup scope for Plan 01-04):
- `CLAUDE.md` — meta-repo orchestrator doc (stays at root, rewritten in Phase 2 per FOUND-12 / Phase 8 POLISH-04)
- `.env`, `.env` variants — stay at root (Phase 2 absorbs into `@minion/env`)
- `.gitignore` — stays at root
- `infisical-dev.sh` — stays at root until Phase 2 deprecates it (FOUND-10)
- `mempalace.yaml`, `entities.json` — Serena MCP config files (stay at root or gitignore; not A3 scope)
- `mascot.png` — project mascot (keep)
- `.planning/`, `specs/`, `.claude/`, `.playwright-mcp/`, `knowledge/`, `agents/` — directories, not in scope for root-file cleanup

## Broken Upstreams

Pulled from subproject sections above.

- **minion_plugins**: `main` tracks `origin/master [GONE]` — Recommendation: `fix-upstream` via `git -C minion_plugins branch --set-upstream-to=origin/main main` (verified: `origin/main` exists at SHA `56fa682dabf64d958088e70429b9c35255b008fb`, which matches local `main` HEAD exactly — zero-risk retarget).
- **paperclip-meta-repair** (worktree): branch `chore/meta-snapshot-repair` has no upstream configured — Recommendation: N/A (worktree slated for removal per Stray Worktrees section; no upstream fix needed).
- **minion-shared**: not a git repo at all (no `.git/`) — surfaced in Subprojects → minion-shared as an investigate/hold item, not a routine upstream fix.

## Open PRs

STUB — populated by Plan 01-03 (`gh pr list` across 7 repos, with triage classifications).
Plan 01-03 will append a `### Open PRs` section below this line.
