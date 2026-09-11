---
phase: 18-docs-governance
plan: "03"
status: ledger_shipped_orphans_open_by_design
requirements_completed: []
---

# Two-sided handoff ledger

Branch `feat/qc-migration-authority-handoff-ledger`, private worktree `/home/nikolas/.cache/claude-tmp/meta-15-04-18-03`, base `origin/dev` @ `8be40586a58f2b94dd0fbd954273de150d4cda3c`. Depends on 18-02 (`inventory_verified_semantic_disposition_pending`, already delivered).

## Requirements completed

None. Per `closure_policy`, DOC-03 requires every unresolved implementation to carry both sides of the ledger; this plan verifies and records the current real state — it fixes no other repo's source and closes no orphan by itself.

## What was built

- `scripts/qc/handoff-ledger.mjs` — read-only scan of `TODO(handoff):` markers across the meta repo and every subproject directory that is its own independent `.git` checkout and present on disk. A marker must open with an actual comment token (`//`, `/* … */`, `*`, `#`, `--`, `<!--`) and contain the literal colon `TODO(handoff):` — both requirements came from real false positives found during development (see below), not from speculative hardening. For each marker: extracts `proposals/*.md` references from the marker's own contiguous comment block, flags an `orphan-missing-proposal-link` when none exists, a `missing-target` when the referenced proposal file does not exist, and a `resolved-without-evidence` when the block claims `RESOLVED` but names no `*.test.*` file. A nested independent checkout is scanned exactly once, under its own label, never duplicated by the meta-root walk. Also does a best-effort, advisory-only reverse check: a proposal's own `Sites:` line naming a file with no matching marker — reported, never gated, never used to fabricate a TODO.
- `.planning/phases/18-docs-governance/18-HANDOFF-RESULTS.md` — generated from a real run against the live checkout.
- `proposals/2026-09-08-platform-qc-remediation.md` — appended (not rewritten) with a dated reconciliation section naming every genuine gap, its owner, and its next step.

## Detector precision fixes made during development (not "fixing other people's code" — fixing this tool's own false positives)

Two classes of literal-text false positive were found and excluded, each with a regression test:
1. **Test-fixture / label-format string literals holding the text as data**, not a real site: `minion_factory/runner/src/discovery.test.ts` (9 occurrences inside single-quoted diff-hunk fixtures for that repo's own `scanCompare` scanner tests), `queue.test.ts:792` (a SQL literal), and `discovery.ts:118` (`` `TODO(handoff): ${identity}` `` — the scanner's own label-formatting code, not a comment). Excluded by requiring the match to open a real comment.
2. **Prose about the convention, not an instance of it**, inside an otherwise-genuine `//` comment: `discovery.ts:30` ("TODO(handoff) scanning still applies to…") and `db.ts:877` ("edit above a TODO(handoff) marker must land on the same row…") — neither has the literal colon the convention requires (`TODO(handoff): <what, why, pointer>`, per `AGENTS.md`). Excluded by requiring `TODO(handoff):` verbatim.
3. **Conversely, kept** SQL `--` comments (`minion_hub/supabase/migrations/*.sql`) and Svelte `<!-- -->` comments (`minion_hub/src/routes/(app)/home/+page.svelte`) as genuine sites — an earlier draft heuristic would have wrongly excluded these; both are covered by dedicated tests.

## Real findings (evidence, not simulation)

Run with `--root /home/nikolas/Documents/CODE/MINION`: **109 genuine markers**, scanned across meta + `minion`, `minion_hub`, `minion_factory` (the only present, independently-checked-out subprojects carrying any marker; `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_base`, `drone`, `minion_plugins` present but carry none). **89 already resolve cleanly.** **20 do not**, and this plan does not fix them (boundary: "no concurrent mass comment editing"; each site is owned by its own repo's `CLAUDE.md`/`AGENTS.md`):

- **3 missing-target** — `minion_factory` cites 3 proposal filenames that do not exist anywhere under `proposals/`: `2026-08-23-factory-runner-owned-role-executor.md`, `2026-08-23-factory-containment-effect-ledger-integration.md`, `2026-08-17-factory-chat-session-resume-after-failed-turn.md`.
- **17 orphan** (no proposal reference at all) — spread across `packages/workforce-client` (1), `minion`/nostr (3, cite only a `specs/*.md`, never `proposals/`), `minion_hub` (8, several citing only `.planning/phases/14-sdk-transport/14-PLUGIN-BRIDGE-MATRIX.md` or nothing), `minion_factory` (4, one citing only a `specs/*.md`).
- Full per-site list with exact file:line and owner is in `18-HANDOFF-RESULTS.md` and the proposal's new section — not duplicated verbatim here.
- **3 advisory-only** (never gated): the remediation proposal's own "Sites:" line names `drone/src/define.ts`, `drone/src/run.ts`, `drone/vitest.config.ts` with no matching marker at those files.

## Commands and results

```
node --test scripts/qc/handoff-ledger.test.mjs                     # 11/11 pass
node --test scripts/qc/*.test.mjs                                  # 26/26 pass (all three new suites)
node --test scripts/qc/                                            # FAILS: bare-directory form throws MODULE_NOT_FOUND on
                                                                       Node v22.23.2 — known gotcha, use the file/glob form above.
node scripts/qc/handoff-ledger.mjs --root /home/nikolas/Documents/CODE/MINION
  → {"wrote":".../18-HANDOFF-RESULTS.md","markers":109,"issues":20,"advisory":3,"pass":false}, exit 0 (write mode)
node scripts/qc/handoff-ledger.mjs --check --root /home/nikolas/Documents/CODE/MINION
  → {"pass":false,"markers":109,"issues":20}, exit 1 — fails CLOSED on the 20 real gaps above. By design.
node scripts/qc/handoff-ledger.mjs --check   (no --root, i.e. against this worktree alone: only committed meta-repo
     source, no subproject checkouts present)
  → {"pass":false,"markers":27,"issues":4}, exit 1 — same real orphan (packages/workforce-client/src/client.ts:287)
     reproduces from committed dev content alone.
```

Also ran, read-only, against the **live checkout** (not this worktree, no write): `node scripts/qc/proposal-requirement-map.mjs --check` → `{"documents":678,...,"inventoryIssues":0,...}`, exit 0 — confirms the pre-existing 18-02 baseline currently passes. That script and `18-DISPOSITIONS.md` are owned by 18-01/18-02, not this plan, and were not copied into this worktree or modified.

## Files and hashes (exact, this worktree)

| File | SHA-256 |
|---|---|
| `scripts/qc/handoff-ledger.mjs` | `f152fabfa32eb4310bdaa1afba72d4493b28e4341b275d8fcc72811f556ae95e` |
| `scripts/qc/handoff-ledger.test.mjs` | `ccad75025430b2bb3d202bddefa88c27f57ffcd0ca5481364e2da917611c7480` |
| `proposals/2026-09-08-platform-qc-remediation.md` | `90f78beb471b1d69757d4c2f37af6e8dd1ecbe51f2efaa766b553ee4cf9953ea` |
| `.planning/phases/18-docs-governance/18-HANDOFF-RESULTS.md` | `42cbae97d674acb1d4761636d7eb3e357d424db67f45be9b1c6a566e5b8b931a` |

## Evidence limits / what this plan does NOT establish

- **`--check` genuinely fails (exit 1) and is expected to stay that way** until each of the 20 sites' owning repo either adds the missing pointer or corrects a stale one. This plan does not edit `minion`, `minion_hub`, or `minion_factory` source — that would violate "no concurrent mass comment editing" and the cross-repo ownership boundary.
- **Whether a `specs/*.md` citation (instead of `proposals/*.md`) satisfies the two-sided rule is an open policy question**, not decided here. Several of the 20 orphans cite a spec, not a proposal, and are counted as orphans under the literal `AGENTS.md` text ("a proposal in the meta-repo `proposals/`"). Recorded, not adjudicated.
- **`proposals/2026-09-08-platform-qc-remediation.md`'s SHA-256 changed** by this append. `.planning/phases/18-docs-governance/18-DISPOSITIONS.md` (owned by 18-02, not in this plan's `files_modified`) embeds the pre-append hash for that document and will read as stale until 18-02's owner regenerates it with `node scripts/qc/proposal-requirement-map.mjs`. Not regenerated here — out of ownership scope.
- **`pnpm run lint-all` was not run** — same reason as 15-04 (no `node_modules`, no root-level bare `lint` script, installing one is out of scope for a no-install task).
- **The reverse "declared site with no marker" check is intentionally shallow** (regex over `Sites:` lines) and advisory-only; it does not attempt full semantic proposal↔source matching.

## Open items

- 3 missing-target proposal references and 17 orphan markers, each with an owner named in `18-HANDOFF-RESULTS.md` and the proposal appendix — next step is per-repo, not this lane's.
- `18-DISPOSITIONS.md` regeneration is now a real, pending follow-up for whoever owns 18-02's files, caused by this plan's (in-scope, "append only") edit to the proposal it indexes.
- DOC-03 stays open per `closure_policy` until every orphan/missing-target above is resolved and independently re-verified.
