---
id: 2026-11-16-gateway-backup-drill-negative-restore-ms
title: Backup restore drill can report a negative restore time and fail CI
status: draft
created: 2026-11-16
updated: 2026-11-16
repos: [minion]
---

# Backup restore drill can report a negative restore time and fail CI

## AS-IS

`deploy/backup/minion-backup-drill.sh` times each restore with wall-clock time
(`now_ms() { date +%s%3N; }`, line 35; `restore_ms=$(($(now_ms) - t1))`, line 88).
`deploy/backup/backup.test.sh:87` asserts `restoreMs >= 0`.

On 2026-11-16 the `shellcheck` job of gateway PR #383 failed with
`"restoreMs": -167` for one volume and `FAIL: drill report malformed`; every other field was
healthy (`ok: True`, sqlite ok, 3 files). A re-run of the same commit passed. Assumed cause
(not confirmed): the runner's clock stepped backwards during the restore.

Because `Linux required` depends on that job, one clock step blocks a merge.

## TO-BE

A healthy restore never produces a failing drill report. Invariant: reported durations are
never negative.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | wall-clock timing → monotonic timing (bash `SECONDS`/`EPOCHREALTIME` is still wall-clock; use `/proc/uptime` or clamp at 0) | `backup.test.sh` passes with the clock stepped back during a restore |

Not fixed in PR #383: that PR only merges `main` into `DEV` for the promotion train.
