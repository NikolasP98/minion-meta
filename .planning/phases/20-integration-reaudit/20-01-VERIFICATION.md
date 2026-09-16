---
phase: 20-integration-reaudit
plan: "01"
verified: 2026-09-11
status: partial
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/20-01-6fbd0b8f
---

# 20-01 goal-backward verification

Evidence root: `/home/nikolas/.cache/claude-tmp/20-01-6fbd0b8f/checks/` (`before.txt`, `after.txt`, `freeze.json`, `*.log` with captured exit codes, `matrix-full/`, `matrix-rerun-*/`).

| Must-have | Verdict | Evidence |
|---|---|---|
| Manifest fails missing requirement proof, mismatched identity, unresolved mandatory gate or unrelated patch content | holds (unchanged from admitted Task 1) | `release-evidence.test.mjs` 37/37, 0 skipped, exit 0 — `release-evidence-unit-2.log`; source hash unchanged `4ccdb73e…` |
| Every required integration test actually passes on candidate identity; unrun/skipped tests cannot produce complete status | tooling holds; candidate evidence partial | Runner unit 9/9 (`matrix-unit-4.log`): skipped, zero-count, non-zero exit, missing report/path, unselected, no-checkout, drift → never `complete`. Full run `matrix-full/matrix.json`: verdict `incomplete` (3 failed gates kept as failed); reruns `matrix-rerun-247` 129/129, `matrix-rerun-248` 186/186, `matrix-rerun-252-2` 53/53 recorded separately with fresh identity checks |
| Artifact `scripts/qc/release-evidence.mjs` | present, hash-stable | before = after `4ccdb73e…` |
| Artifact `scripts/qc/integration-matrix.mjs` | present | `2810ce9f…`; `--validate-manifest` on `20-CANDIDATES.md` exit 0 (`validate-manifest-3.log`) |
| Key link release-evidence → REQUIREMENTS.md | holds | inventory reads canonical requirements/allowlist/baseline (unchanged) |
| Key link integration-matrix → 14-COMPATIBILITY.md | partial | read-first honoured; only the 14-04 host/plugin pairing (Hub `d54f503c` + gateway `03239087`) was executed (53/53); no new shared-archive consumer pairing |

Plan verify commands, run from the snapshot meta root: `node --test scripts/qc/release-evidence.test.mjs` → exit 0; `node --test scripts/qc/integration-matrix.test.mjs && node scripts/qc/integration-matrix.mjs --validate-manifest .planning/phases/20-integration-reaudit/20-CANDIDATES.md` → exit 0 / exit 0. `git diff --check` on owned paths: exit 0 (`git-diff-check-3.log`). Snapshot `git status`: only the four Task 2 paths changed; 0 unrelated files.

Not established: browser journeys, real-PostgreSQL race tests, runtime drills, deployed identity, release authority — see the SUMMARY gaps. Requirement QC-01 remains open.
