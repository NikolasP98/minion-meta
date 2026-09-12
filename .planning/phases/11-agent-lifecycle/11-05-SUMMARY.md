---
phase: 11-agent-lifecycle
plan: "05"
status: partial
requirements: ["AGT-06"]
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/11-05-g9v2tq/minion-factory
base: minion-factory origin/dev 02900306a1fcc7b182bae726a24260d08467f81e (== origin/main at fetch time)
executed: 2026-09-11
plan_sha256: 9efa1f270a59b02084228575c5c5b72401af9c94b0708433dc7daacabd4e420f
owned_files:
  - path: minion_factory/runner/src/governance-replay.test.ts
    before: (absent at base)
    after: 21c54cef0135ca181fab28bed20a1599cbf5c7b9fd9e7780c4a0099ed2fcda3b
  - path: minion_factory/runner/test/fixtures/governance-replay.json
    before: (absent at base)
    after: e30285cfe1d84d7d1f522806cdceee260bacfa22748b6e339ba3cb9d6a464054
  - path: .planning/phases/11-agent-lifecycle/11-GOVERNANCE-GAPS.md (meta main checkout)
    before: (absent)
    after: 9d8c5972f00c97d51a95655347aba23629874f6cd97641ec726013cd0c8d65ef
  - path: .planning/phases/11-agent-lifecycle/11-VERIFICATION.md (meta main checkout, appended section only)
    before: 5257b3bc1a4274f3121f2377412603925878c238180e2967d0864578f495659b
    after: 4b196f18735f8fad8a047ce29eeb6223d7a671153aef42acc23affd58a12c4ce
decisions: [D360-01, D360-03, D360-04, D360-06, D360-07]
---

# Governance through effects and immutable manifests (AGT-06 evaluation slice)

Status is **partial** by the plan's own closure policy: both tasks executed with passing local evidence, no source seam failed, but AGT-06 stays open until GG-01 executes, the phase 17 external containment gate runs, and an independent reviewer accepts this candidate. Nothing here is a real-harness, container, or remote-effect claim.

## Continuation of the prior attempt

The rate-limited attempt left a detached factory worktree at `02900306` (verified equal to freshly fetched `origin/dev` and `origin/main`, 0 commits behind), installed deps, and untracked drafts of both owned runner files. I inspected the draft, judged it sound, and continued in that snapshot. The draft had never been run; four defects surfaced and were fixed in the fixture/test only (no runner source touched): esbuild rejects `type` specifiers in destructured dynamic imports; `budget_reservations.run_id` has a FK to `runs(id)`, so budget seams now seed a run row; the credential-shape regex matched the substring `sk-proposal…` of a case id (added a left boundary); the tampered-manifest expectation named the hash receipt although `validateStoredSnapshot` rejects the semantic tamper first (case now records semantic, manifest-hash and policy-hash receipts separately). Seam errors are now attributed to their case id.

## Task 1: deterministic admission/effect corpus

`runner/test/fixtures/governance-replay.json`: fixtureVersion 1; identity block = fixed clock, phase-request schema version, the 4-tool boundary contract, sha256-pinned broker/tool-host image references, a 3-topic policy and its `hashTopicPolicy` digest. No prompt bodies, no secrets. 18 cases: spoofed actor (forged token, cross-instance lease), denied tool (out-of-phase write, caller-supplied permissions, allowlist-vs-contract identity), budget exhaustion and admitted replay, model/schema/image identity changes, mutable input metadata, tampered stored manifest, expired lease capability, high-risk auto-approval refusal, retry after commit, bounded retry, cancellation, cancel of completed history.

`runner/src/governance-replay.test.ts`: loads the corpus only with a complete, self-consistent identity (rejects missing identity, missing hash, tampered policy, drifted tool contract); replays every case through the real runner seams (`orchestrator-lease`, `phase-requests`, `budget-reservations`, `manifest`, `codex-broker-policy`, `lifecycle`, `db.ensurePhaseEffect`) on a temp `FACTORY_DATA` SQLite file with injected clocks; asserts verdict + exact receipt + effect counts against the fixture; replays twice more and requires an identical transcript; asserts a forged "admitted" expectation fails. Factory/Drone/Paperclip differences are recorded in the gaps doc (GG-05/GG-06), not forced into one runtime.

## Task 2: gap dispositions

`11-GOVERNANCE-GAPS.md` records every case's seam, effect and receipt, and seven unreached boundaries with the exact seam, reason, smallest follow-up and dependency (GG-01 tool-host runtime denial; GG-02 real remote effects; GG-03 runtime image verification; GG-04 no first-class approval expiry in Factory; GG-05 Drone; GG-06 Paperclip; GG-07 containment activation kept gated). `11-VERIFICATION.md` got an appended AGT-06 evidence section; its frontmatter status was left as `gaps_found`. No source patch is proposed because no seam admitted a prohibited effect; therefore no child plan was generated.

## Gates (logs in `/home/nikolas/.cache/claude-tmp/11-05-g9v2tq/checks/`)

| Gate | Command (from `<snapshot>/runner`, `env -i PATH HOME TMPDIR`) | Result | Log |
|---|---|---|---|
| Draft as inherited | `node --import tsx --test src/governance-replay.test.ts` | exit 1: transform error (type specifier) | `draft-run.log` |
| After syntax fix | same | exit 1: 2 pass / 3 fail (regex false positive; FK) | `draft-run2.log` |
| After attribution + regex | same | exit 1: 3 pass / 2 fail (FK on budget seams) | `draft-run3.log` |
| After run seeding | same | exit 1: 4 pass / 1 fail (tamper receipt order) | `draft-run4.log` |
| **Task 1 verify** | same | **exit 0: 5 pass / 0 fail, 18 corpus cases** | `task1-governance-replay.log` |
| Cross-process determinism | same, twice | exit 0 both; `ok` lines identical | `determinism-run1.log`, `determinism-run2.log` |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit` | exit 0 | `typecheck.log` |
| Runner suite (project's scoped script) | `npm test` | exit 0: **1146 pass / 0 fail / 0 skipped** | `runner-suite.log` |
| Baseline seams (prior attempt, before drafts) | containment/manifest/lease tests | 30/30 | `baseline-seams.log` |
| Whitespace | `git diff --check` (also with intent-to-add on the new files) | exit 0 | `diff-check.log` |
| Working tree | `git status --porcelain` | exactly `?? runner/src/governance-replay.test.ts`, `?? runner/test/` | `git-status.log` |
| **Task 2 verify** | `gsd-tools.cjs verify plan-structure 11-05-PLAN.md` | exit 0: valid, 2 tasks, 0 errors/warnings | `plan-structure.log` |
| Cross-runtime read-only replays | drone `define.test.ts`+`run.test.ts`; paperclip `runtime.test.ts` (main checkouts, vitest already installed) | 29/29 at drone `0cdf5e6c` (WIP checkout); 6/6 at paperclip `2abd5f7d` | `drone-define-run.log`, `paperclip-runtime.log` |

Freeze (`checks/freeze.json`): Node v22.23.2, npm 12.0.2, tsx 4.23.12, typescript 5.9.3, better-sqlite3 12.11.1, esbuild 0.28.2.

## Deviations

1. Repository: `files_modified` names `minion_factory/runner/...`, which is the Factory git repo, not the meta repo; the snapshot is a Factory worktree at `origin/dev` (Factory `AGENTS.md`: features merge to `dev`). Planning files were written in the meta main checkout as the brief instructs for SUMMARY/VERIFICATION.
2. `11-VERIFICATION.md` is phase-wide and the plan says the independent verifier owns the phase verdict; I appended one clearly labelled evidence section and did not change its status.
3. Red evidence is fixture-level (forged expectation, missing identity, tampered policy, drifted contract all fail) rather than source-level, because no runner source changed.
4. The read-only drone/paperclip runs used the main checkouts' existing `node_modules` (no install, no edits); drone has 30 uncommitted WIP paths, so its HEAD alone is not that candidate's identity.

## Gaps / blocked (precise)

- **GG-01 (open, not blocked):** tool-host/broker runtime refusal of a non-allowlisted tool is unproven locally; needs a bounded plan under Factory broker/tool-host ownership (outside this plan's `files_modified`).
- **GG-02/GG-03/GG-07 (blocked):** real GitHub effects, runtime image verification and containment activation need the phase 17 external drill, tokens and D360-03 authority. None used.
- **GG-04 (decision):** Factory has no approval TTL; only a policy owner can introduce one.
- **Independent review (D360-07)** of this candidate has not happened; requirement closure is root's call.
- No commit, stage, push, PR, publish, deploy, branch, stash or main-checkout source change was made.


## 2026-09-12 actual tool-host effect boundary

Factory PR187 (feature21463a7e8b893bff43e025a5769a068b181bea4c; dev merge905b4b10a2553f56625331eefcade4794589a188) adds actual MCP client→tool-host HTTP→runner Express→native SQLite tests. Unknown token/tool/capability requests create no admission effects; accepted phase admission persists; an owned child killed after admission can reopen and replay without duplicate effects; changed payload and revoked capability are rejected. Hosted boundary execution passed184 tests without skips. This is phase admission, not external executor side-effect qualification.

The normal trusted promoter initially stopped before deployment because its feature-test planner installed only tool-host dependencies for a tool-host-only change, while these tests import runner/tsx. This release integration gap is being corrected through a separate bounded PR; consult the priority-delivery report for final status. No flag or production data change was used to pass tests.

Task1 remains partial: budget exhaustion, mutable tool/schema/model/image identity, actual expiry policy and external execution remain outstanding. The exact new test TODO and canonical platform proposal record those limits. No full governance closure is claimed from an admission test corpus.
