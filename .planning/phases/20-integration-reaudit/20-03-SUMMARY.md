---
phase: 20-integration-reaudit
plan: "03"
requirements: ["QC-03"]
requirements-completed: []
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/20-03-85d16a2f
owned_files:
  - path: .planning/phases/20-integration-reaudit/20-REPEAT-360.md
    before: absent
    after: 088066757240af5e1978646ca93381decbe6305f9c8e9094736e28ccb0948584
  - path: scripts/qc/repeat-audit-coverage.mjs
    before: absent
    after: 8d84ab9028b2a1ec2dad1b97c5ead00f65136fc785d08fe781242189f07adf55
  - path: scripts/qc/repeat-audit-coverage.test.mjs
    before: absent
    after: db4a25ba9a5f5d928d87fb4030eb50d47494bcaa2d06ea1a6e75ec1642379fe2
  - path: .planning/phases/20-integration-reaudit/20-RESIDUAL-DECISIONS.md
    before: absent
    after: 1c55dbe8f9e02f65a47306e37b7dcd0e62a96affb9c54273b44ed36e7d39fb45
  - path: .planning/phases/20-integration-reaudit/20-VERIFICATION.md
    before: absent
    after: 645be44597ec2627fb4e518bc865111e76c2c0189ef4943d48a8e01a78fafd61
---

# 20-03: repeat 360 review with before/after receipts (fourteen answered, zero closed)

All five owned files were created only in the private snapshot `/home/nikolas/.cache/claude-tmp/20-03-85d16a2f/MINION` (detached at the planning checkpoint `3869980944231433f392aa789da3af4c44f4cd91` = `origin/qc/360-checkpoint-20260911`, the same base 20-01/20-02 used, because `origin/dev` (`b3019b73` at fetch time) lacks `.planning/phases/20-*` and the `scripts/qc/release-*` tooling). Nothing was committed, staged, pushed, merged, published, deployed, or run against any host, database, registry, PostHog or Sentry endpoint. Receipts: `checks/before.txt`, `after.txt`, `freeze.json` (node v22.23.2, pnpm 10.15.0, bun 1.3.4, git 2.55.0), `meta-install.log` (exit 0), every gate log with its exit code, `git-diff-check.log`.

## Task 1: reassess every original quality dimension

`20-REPEAT-360.md` answers the fourteen PROGRAM questions in the exact wording, each with Before (8 September baseline section), After (deployed / merged / source-verified / planned-only, with exact counts), Receipts (repo-relative pointers that must exist), Deploy receipts, Verdict, Status, Gap and Owner. Evidence was drawn only from recorded receipts: today's ledger section "Continuation 2026-09-11", Codex's `RELEASE-2026-09-11.md`/`PROGRESS-2026-09-11.md`/`RESUME-2026-09-11.md`/`POSTHOG-READONLY-2026-09-11.md`, every `*-SUMMARY.md`/`*-VERIFICATION.md` under phases 09–20 (three read-only subagent extractions, all counts quoted as written), and the 20-01/20-02 outputs read from their snapshots. Deployment state used: Site prd `0ed4e1b` (Vercel READY); gateway prd `0aafeec7` (host digest receipt), DEV `8b2afc6c` with train #282 pending; hub prd `1df0a921` with PRs #246–#257 open; meta dev carrying the program branches, npm publish blocked (E401).

Result: 14 answered, **0 closed**, 14 pending — pending-deploy 8 (Q1, Q4, Q5, Q7, Q8, Q9, Q10, Q13), pending-decision 3 (Q2, Q12, Q14), pending-credential 1 (Q6), pending-docker 1 (Q11), pending-child-plan 1 (Q3). Every verdict is `changed` (new receipts exist in every dimension); no question closes because the load-bearing change is undeployed or its proof is blocked. Deployed changes that are real: gateway 09-04/09-05/09-06/14-04 (digest-verified), hub 13-01 (#245), Site members UI with reconnect/final-event repairs and 81 cross-engine browser cases. Explicit unknowns kept explicit: LangGraph deployment identity, residual advisory count after hub #257, fresh Factory flags/image, real-service saturation and cross-tenant overload, Sentry receipt. No improvement percentages were invented; no recommendation was restated as done.

`scripts/qc/repeat-audit-coverage.mjs` (137 lines, read-only, no child_process) parses the numbered list under `## Repeat review questions` in PROGRAM.md and the `### Qn. <question>` sections of the document; it rejects a missing/duplicate/paraphrased question, a missing or duplicate field, empty or oversized text, an unknown verdict/status, a receipt pointer that does not exist as a regular non-symlink file under the meta root, unsafe/traversal/absolute pointers, a section whose receipts are all plan-structure files (`*-PLAN.md`, `*-CONTEXT.md`, `index.json`, `plan-allowlist.json`, ROADMAP/REQUIREMENTS/STATE), and `closed` without a `changed` verdict and a non-structural deploy receipt. Exit 0 valid / 2 invalid; the JSON summary carries per-status counts. `repeat-audit-coverage.test.mjs`: 7 tests (synthetic PROGRAM + fixture root; accepted document; 11 incompleteness rejections; 11 unsafe/unverifiable rejections incl. symlink and 2 MiB input; 3 closed-rule rejections; CLI exits; real PROGRAM lists fourteen questions).

Gates (snapshot meta root, empty environment):
- `node --test scripts/qc/repeat-audit-coverage.test.mjs` → 7 tests, 7 pass, 0 fail, 0 skipped, exit 0 (`checks/coverage-unit-3.log`; runs 1–2 identical after the outside-root document fix).
- `node scripts/qc/repeat-audit-coverage.mjs --check .planning/phases/20-integration-reaudit/20-REPEAT-360.md` **inside the checkpoint snapshot** → `missing-receipt:Q1:.planning/phases/15-data-pipelines/15-01-SUMMARY.md`, exit 2 (`checks/coverage-check-snapshot-2.log`): that receipt and ~50 other 2026-09-11 SUMMARY/VERIFICATION files are staged in the meta working tree and absent from checkpoint `38699809`.
- Same check with `--root /home/nikolas/Documents/CODE/MINION` (read-only against the working tree where the receipts live) → `valid: true`, 14 questions, verdicts changed 14, statuses closed 0 / pending-deploy 8 / pending-decision 3 / pending-credential 1 / pending-docker 1 / pending-child-plan 1, exit 0 (`checks/coverage-check-worktree-3.log`).

## Task 2: residual/new requirements and milestone status

`20-RESIDUAL-DECISIONS.md`: 12 residual gates already owned by admitted plans (A-01…A-12: #247 containment, #248 migrations + D360-05 preflight, train #282 with the member-UI client id fix, durable sender/receiver end-to-end, real ACP harness, npm publish + version skew, #246 telemetry + Sentry access, docker/host posture, SLO/fairness decisions, 13-03 authenticated journeys, license option, P1–P5 status patches) and 8 new requirement candidates (R-01 secret-bearing local dump → SEC-10; R-02 first-party client ids in the wire contract → SDK-04; R-03 null-frame rejection on installed identities → SDK-05; R-04 zero public source maps on an armed build → OBS-04; R-05 unified per-run manifest → AGT-07; R-06 executable delete path per retained copy → DATA-04; R-07 untracked install artifacts → DEP-04; R-08 explicit DB-suite timeouts + driver settlement → CAP-04), each with severity, observable risk, exact seam, owner, smallest next plan, proving test and decision/credential prerequisite. Existing proposals were cross-checked (calendar UTC offset, Paraglide adapter, DR-19-02 repairs, 15-01 S1–S6, 20-01 CI repairs) and not duplicated. Root admits; nothing is added to REQUIREMENTS/ROADMAP/STATE here.

`20-VERIFICATION.md` (phase-level, `gaps_found`): QC-01 partial (candidate heads moved after the matrix), QC-02 pending (all 20 actions `authority: null`), QC-03 document holds / requirement open; the phase and milestone stay open; independent root review still required.

`git diff --check` on the snapshot → exit 0 (both runs); snapshot `git status`: only the five owned paths, untracked; 0 unrelated files.

## Deviations

- Base is the planning checkpoint `38699809`, not `origin/dev` (see above).
- The checker's document argument may live outside `--root` (added after the first working-tree run failed with `unsafe-path`); receipts and PROGRAM.md stay confined to the root. Tests rerun 7/7 after the change.
- The plan's own verify command passes only when `--root` points at a tree containing today's staged planning files; inside the checkpoint it fails closed on the first missing receipt. Both results are recorded rather than working around the missing files by copying them into the snapshot.
- PostHog/Sentry "re-sampling" was not performed by this plan (no credentials/network per the brief); Codex's read-only `POSTHOG-READONLY-2026-09-11.md` is the cited sample, Sentry remains unreachable per `16-SENTRY-ACCESS.md`.

## Gaps and blocked items

- QC-03 is not closed: the repeat review cannot flip any question to `closed` until a deploy receipt exists; the checker enforces that rule. Owners per question are named in the document (owner merges/migrations/token rotation, docker/host access, D360-04 credential authority, child plans 13-03 / 18-02 P1–P5 / 15-02 Task 2 / 12-04).
- Root actions required: adopt the five owned files (plus 20-01/20-02 outputs) onto a branch; land today's staged planning files so the coverage check passes from the repository root; admit R-01…R-08 or record their rejection in DECISIONS.md; file the 20-01 CI repair proposals.
- Owner action outside any agent: R-01 (delete the secret-bearing local dump and rotate the exposed credential classes).
