# 16-02 VERIFICATION — goal-backward check (executor self-check, not the independent review)

Candidate: `/home/nikolas/.cache/claude-tmp/16-02-90a50a72/minion_hub` at hub
`origin/master` `1df0a921` + 4 owned hub files; evidence under `…/16-02-90a50a72/checks/`
and `…/artifacts/`. Independent verifier still owes the phase verification.

## must_haves.truths

| Truth | Verdict | Evidence |
|---|---|---|
| Local source map resolves fixture line and candidate | **HOLDS** | `artifacts/fixture-run.json`: raw frame `bundle.js:1:20` → `telemetry-fixture.source.ts:5:13`, `matched:true`, release `1df0a921…` = candidate HEAD; `checks/02-fixture-test.log` 22/22 exit 0 incl. negatives |
| Access report separates absent tooling from unverified remote state | **HOLDS** | `artifacts/access-report.json` (`remote.status: unverified`, reason names the missing credential); test "separates absent tooling from unverified remote state" + sentinel no-leak test |
| Actual environment receipt matches source map/release/fixture line | **PENDING** | `16-RECEIPT.md` §4 — no Sentry access, no trigger route (R-1, G-5). Not claimed. |
| Source-only integration cannot close OBS-02 | **HONORED** | `requirements-completed: []`; summary status `partial` |

## must_haves.artifacts

| Artifact | Provides | Verdict |
|---|---|---|
| `minion_hub/scripts/qc/telemetry-fixture.ts` | release-map fixture + access evidence | present (sha `3b00df52…`), executable via `bun` (`--report` and full run, exit 0) and via Vitest |
| `minion_hub/vite.config.ts` | release upload wiring + configured-environment receipt gate | present (sha `d492fe9d…`); armed/disarmed behavior proven offline (`checks/05-…`, `checks/03-…`); receipt gate itself pending on access |

## must_haves.key_links

| Link | Verdict | Evidence |
|---|---|---|
| fixture → vite.config.ts (read-first contract) | HOLDS | fixture uses the same bundler (`vite` 8.1.3 `build()`), the same release resolution order and the same sha contract the plugin/SDK use; documented in `16-SENTRY-ACCESS.md` §2–3 |
| vite.config.ts → 16-SENTRY-ACCESS.md | HOLDS | §3 of the access doc is the wiring; §4 is the operator gate the wiring is inert without |

## Task done-criteria

- Task 1 done: **yes** (both clauses hold above).
- Task 2 done: **no** — first clause pending on remote access; second clause honored.

## Threat register

- T-16-02-01 (secret leak / false environment attribution): env values never read into
  reports (tested); environment restricted to a four-value allowlist; release must be a
  commit sha; CI step prints names only; manifests carrying credential-shaped strings
  rejected. Mitigated in source; runtime attribution still unproven (pending R-1).
- T-16-02-02 (evidence/fixture artifacts): synthetic marker, no customer payload, exact
  source identity (`1df0a921…`) and runtime identity (`checks/freeze.json`) recorded.
  Mitigated.

## Negative/behavior evidence that would have been missed by a report-only pass

- Plugin default `filesToDeleteAfterUpload` is dead in this config pipeline → 845 public
  maps (`checks/05a-…negative.log`); fixed with explicit globs → 0 (`checks/05-…`).
- Unreachable Sentry does not fail the build (exit 0) — an operator must read the log,
  not the exit code, for an upload receipt.

## Boundaries check

Owned files only (5 hub paths incl. the deliberately absent `instrumentation.server.ts`,
2 meta docs); `git status` in the snapshot shows exactly `vite.config.ts`, `ci.yml`,
`scripts/qc/`; no STATE/ROADMAP/index/proposal edits; no commit/branch/stash; no
credentials; builds network-isolated.
