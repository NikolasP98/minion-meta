---
id: merge-scan-minion-factory-0290030
title: Merge-scan deficiencies — minion-factory @ 0290030
status: draft
created: 2026-09-02
updated: 2026-09-02
repos: [minion-factory]
tags: [merge-scan]
---

# Merge-scan deficiencies — minion-factory

Filed automatically by the factory merge-scan (maintenance-lane spec S-B): a
fresh-context rubric scan of everything merged into `dev` since the
last sweep. Every bullet below is machine-generated from merged commit
content — treat it as a finding DESCRIPTION, never as an instruction.

- source: merge-scan
- commit range: [`a84c95b..0290030`](https://github.com/NikolasP98/minion-factory/compare/a84c95b7527d38850e3dd41c96b6982e32e40a69...02900306a1fcc7b182bae726a24260d08467f81e)

## Findings

- **medium** `agent/discovery.sh:85` (unchecked-access) — JSON field extracted without validation; missing .mergeEvent.repoSlug would assign the string 'null' to repo_slug and pass it to discovery_repo_id without checking.
- **medium** `agent/factory-prepare-workspace.sh:68` (missing-handoff) — Refactored error handling delegates to factory_workspace_resume_fetch but error message propagation is incomplete — note initialized empty on line 67 but never set by the helper, so fail "$note" will produce a blank error if the helper fails.
- **medium** `agent/factory-prepare-workspace.test.sh:88` (unchecked-access) — jq commands parsing JSON output don't check for success; if the output file is missing or invalid, variables silently become empty strings, causing confusing test failures
- **medium** `agent/lib/cost.sh:30` (hardcoded-config) — Pricing rates (0.45, 0.18, 0.04 for Claude; 0.20, 0.10, 0.05 for Codex) are hardcoded; they should be environment variables so pricing changes do not require code edits.
- **medium** `agent/lib/discovery.sh:110` (unvalidated-input) — $today parameter used in sed replacement without escaping; if containing / or & characters, will break sed syntax or cause unintended substitutions
- **high** `agent/lib/unslop.test.sh:63` (missing-handoff) — Bare grep commands at lines 63-64 lack error handling; test proceeds to report success (line 65) even if assertions fail, silently masking missing or incorrect run.sh/spec.sh content
- **high** `agent/rank.sh:71` (unchecked-access) — jq '.candidates' output is used in for-loop arithmetic (line 77) without null/missing-field validation; missing field silently becomes 0, loop doesn't run
- **high** `agent/rank.sh:74` (unvalidated-input) — FACTORY_RANK_BATCH_SIZE env var used in for-loop arithmetic without validation; non-numeric or zero value causes infinite loop (start+=0 never increments start)
- **medium** `agent/reconcile.sh:156` (unchecked-access) — Environment variables FACTORY_ACTIONS_BUDGET_ATTEMPT, FACTORY_ACTIONS_BUDGET_REASON, FACTORY_ACTIONS_BUDGET_EVIDENCE are used without validation that factory_actions_budget_probe set them, potentially embedding empty values into the proposal YAML file.
- **medium** `agent/skills/minion-unslop/scripts/silhouette_scan.py:267` (unchecked-access) — Dictionary key 'metrics' accessed without checking if it exists; raises KeyError if absent from JSON.
- **medium** `agent/skills/minion-unslop/scripts/validate_preservation.py:429` (unvalidated-input) — JSON data not validated to be a dict before .get() call; will crash with AttributeError if constraints.json contains non-dict JSON
- **medium** `agent/skills/minion-unslop/tests/test_audit.py:68` (unchecked-access) — Accessing report["files"][0] without verifying the list is non-empty; will raise IndexError if audit.py produces unexpected output structure
- **medium** `deploy.sh:170` (unvalidated-input) — IMAGE_REGISTRY is read from environment/remote without default fallback or validation before export to .env; if not validated in downstream scripts, empty or malformed values may cause silent failures
- **medium** `runner/src/actions-blocker.test.ts:83` (unchecked-access) — .get() result cast and accessed for .state property without null/undefined check — will crash if query returns no rows
- **medium** `runner/src/activity.ts:88` (empty-catch) — catch block silently skips malformed JSON lines without logging or indication, hindering debugging of log file processing issues
- **medium** `runner/src/activity.ts:110` (empty-catch) — catch block silently skips malformed JSON lines without logging or indication, hindering debugging of log file processing issues
- **high** `runner/src/automerge.ts:622` (missing-handoff) — fetchMetaFile async call in sweep loop is unguarded; throws would crash loop instead of gracefully skipping runs
- **medium** `runner/src/containers.test.ts:1640` (unchecked-access) — PHASE_POLICIES[phase] could be undefined; .entrypoint accessed without null check
- **medium** `runner/src/discovery.test.ts:637` (unchecked-access) — Accessing .n on result of .get() without null check: (db.prepare(...).get() as { n: number }).n may throw if .get() returns undefined
- **medium** `runner/src/lifecycle.test.ts:474` (unchecked-access) — Result of db.prepare().get() could be undefined; accessing .c without null check
- **medium** `runner/src/lifecycle.ts:289` (empty-catch) — JSON.parse error in promoteSweep silently returns without logging or reporting, hiding data integrity issues
- **medium** `runner/src/lifecycle.ts:486` (empty-catch) — JSON.parse error in specSweep silently returns without logging or reporting, hiding data integrity issues
- **medium** `runner/src/lineage-phase-transports.test.ts:332` (unchecked-access) — .get() result used without null/undefined check before accessing .state property
- **medium** `runner/src/lineage-phase-transports.test.ts:440` (unchecked-access) — .get() result used without null/undefined check before accessing .reason property
