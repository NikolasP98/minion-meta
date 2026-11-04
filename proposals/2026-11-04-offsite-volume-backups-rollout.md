---
id: 2026-11-04-offsite-volume-backups-rollout
title: Roll out off-server gateway volume backups and prove the restore on the real host
status: draft
created: 2026-11-04
updated: 2026-11-04
repos: [minion, minion_hub]
tags: [infra, reliability]
source: paperclip-MIN-12
---

# Roll out off-server gateway volume backups and prove the restore on the real host

## AS-IS

Nothing copies the clinic's gateway state (`minion_default_state`, `minion_faces_state`: WhatsApp credentials, sessions, SQLite memory) off the Netcup host. The board chose an acceptable loss of up to one hour (Paperclip MIN-5 Rec #1, MIN-12).

minion-ai PR #366 adds `deploy/backup/`: a host-side restic job every 30 minutes (SQLite-consistent staging, encrypted, incremental), a restore script that only writes into an empty target, a timed restore drill, systemd units, a runbook and a CI round-trip test. It is **not installed anywhere**. minion_hub PR #633 closes the command-injection hole in the Hub restore route.

## TO-BE

The job runs on the production host, its first-run duration and a real restore drill are measured and recorded, and silence is alerted on. The Hub's own backup feature is retired so there is one mechanism.

## DELTA

Open ends (each also carries an exact-site `TODO(handoff)` where it lives in code):

1. **Install on the host** (`deploy/backup/minion-volume-backup.sh` header): needs the host operator, a B2 bucket and a bucket-scoped key, and a repository password stored off-host as well.
2. **Measure on production**: first-run duration vs the 30 minute interval, volume sizes, and a `minion-backup-drill.sh --check-percent 100` run. Local timings (about 6 s, synthetic ~216 MB) say nothing about Netcup to bucket.
3. **Confirm Supabase PITR** in the dashboard (Database, Backups, Point in Time). Only indirect evidence (WAL archiving settings) was available; PITR is a paid add-on.
4. **Heartbeat alert**: wire `BACKUP_HEARTBEAT_URL` to a monitor that alerts after about 75 minutes of silence.
5. **CI restic version**: CI uses the distro restic (0.16.x); the local run used 0.19.1.
6. **Retire** `minion_hub/src/server/services/backup*.ts` and `src/backup/remote-sync.ts` (`rclone sync` mirrors deletions) once the host job is live.
7. **Hub hardening follow-up**: `runBackup`, `testBackupConnection`, `deleteRemoteSnapshot`, `getSnapshotSize` still interpolate unquoted values into remote shell commands (admin-configured or server-generated, not request input).
8. Enable the monthly drill timer after the first manual drill.
