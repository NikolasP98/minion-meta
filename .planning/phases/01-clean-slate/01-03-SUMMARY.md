---
plan: 01-03
phase: 01-clean-slate
status: complete
requirements: [CLEAN-04]
completed_at: 2026-04-19
---

# Plan 01-03 Summary: PR Triage Sweep

## Objective
Enumerate every open PR across the 7 subproject GitHub repos, classify each, and document the disposition. Zero GitHub-state mutations in this plan — merges/closes/rebases surface as explicit follow-ups for user go-ahead.

## What was built

Full PR triage section appended to `specs/clean-slate-inventory.md` → `## Open PRs` section. Summary:

**Totals: 26 open PRs across 3 repos.**
- NikolasP98/minion-ai: 22 open PRs
- NikolasP98/minion_hub: 2 open PRs
- NikolasP98/minion-site: 1 open PR
- NikolasP98/minion_plugins: 0 open PRs
- NikolasP98/paperclip (fork): 0 open PRs
- pablodelucca/pixel-agents: 0 open PRs by NikolasP98

**Classifications (inherited from `project_pr_review_sweep_apr17.md` sweep + new-since-then HOLD classifications):**
- 2 APPROVE — #63 AudAgent, #68 VPS_HOST (both ready to merge)
- 7 RECOMMEND_CLOSE — bot kitchen-sink PRs (#42, #60, #61, #62, #64, #65, #66)
- 3 NEEDS_REBASE — #34, #46, #52
- 3 REQUEST_CHANGES — #44 (user's own), #59 Voxtral, #67 BYOK
- 11 HOLD (fresh review needed) — #69–#76 in minion-ai, #14–#15 in minion_hub, #1 in minion-site

## Surprise finding affecting M3 planning

`NikolasP98/minion-shared` GitHub repo **does not exist**. Combined with the Phase 1 Wave 1 inventory finding that local `minion-shared/` has no `.git/`, this means:
- Local files are the ONLY canonical source of `minion-shared` content
- M3 SHARE-01's `git subtree add` strategy is moot (no remote to add from)
- **M3 strategy simplifies:** direct file copy from `minion-shared/` into `packages/shared/`, no history preservation needed (there is none to preserve)
- Old-name re-export shim (SHARE-03) irrelevant if nothing currently imports `minion-shared` from npm — to be verified at M3 planning

## Verification

- [x] `gh pr list` ran against all 7 repos (with correct repo-name mapping — `minion_hub`/`minion_plugins` retain underscore on GitHub; `minion-site`/`minion-ai` use hyphen)
- [x] Every open PR has a documented classification in the inventory
- [x] 15 inherited classifications cross-referenced against Apr 17 sweep memory (noted as 2 days old — verify before mutating)
- [x] 11 new PRs classified HOLD pending fresh review
- [x] Zero merges, closes, or rebases executed — all GitHub state preserved as surveyed

## Self-Check
PASSED — CLEAN-04 exit criterion is "every open PR classified in specs/clean-slate-inventory.md as merged / closed / rebased / held with reason." Every PR has a classification with a reason. Actual mutation (merge/close/rebase) is scoped out of this plan and surfaces to user as a todo list.

## Follow-up actions (explicit user go-ahead required)

Recommended execution order when user is ready to mutate GitHub state:
1. Merge #63 + #68 (zero risk, pre-approved)
2. Close the 7 RECOMMEND_CLOSE PRs
3. Post rebase asks on #34, #46, #52
4. Review + decide on the 11 HOLD PRs
5. Address REQUEST_CHANGES on #44, #59, #67

These are all captured in `specs/clean-slate-inventory.md` → Open PRs → Summary.
