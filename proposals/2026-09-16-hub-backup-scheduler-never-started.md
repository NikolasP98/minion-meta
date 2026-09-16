---
id: 2026-09-16-hub-backup-scheduler-never-started
title: Hub backup scheduler is never started — backups and retention pruning never run
status: draft
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub]
tags: [data, unwired, infra]
---

# Hub backup scheduler is never started

Found by the 2026-09-16 cron audit (hub PR #282 carries the
`TODO(handoff)` at the call site).

## AS-IS

`src/server/services/backup-scheduler.ts` exports `startBackupScheduler()`,
which is the only place backups and the `unified_events`/chat retention
pruning jobs get scheduled. **It has zero call sites** anywhere in the repo —
nothing in the worker entrypoint, nothing in the app server bootstrap, no
cron tick invokes it. The function is fully implemented but dead code from
a runtime perspective: as long as nothing calls it, no backup is ever taken
and `unified_events`/chat retention pruning never runs, silently, with no
error or log to say so.

## TO-BE

Either:
1. **Wire it** — call `startBackupScheduler()` from the worker entrypoint
   (the same process that owns the other adopted background jobs per
   `scripts/ops/hub-worker-release.md`), so backups and retention pruning
   run on their intended schedule, or
2. **Delete it** — if backups/retention are now handled by an external
   mechanism (e.g. a Postgres/Supabase-level backup policy) and this
   in-process path is redundant, remove the dead module rather than leave
   an unwired implementation that looks live.

## DELTA

- If wired: one call added at the worker entrypoint, plus a health check /
  log line confirming the scheduler actually started (so a future audit
  doesn't have to grep call sites again).
- If deleted: remove `src/server/services/backup-scheduler.ts` and any
  tests/config referencing it; document in its place what actually performs
  backups and retention pruning today.

## Out of scope

Deciding the *backup strategy* itself (frequency, retention window, storage
target) — this proposal is only about the fact that the existing
implementation, whatever its policy, currently never executes.
