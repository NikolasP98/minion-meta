---
id: ci-minion_hub-release-notes
title: CI red — Release notes on minion_hub master
status: closed
created: 2026-10-11
updated: 2026-10-11
repos: []
closed_reason: "workflow green again as of 2026-10-11, run https://github.com/NikolasP98/minion_hub/actions/runs/38110480406"
---

# CI red — Release notes on NikolasP98/minion_hub@master

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `master` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion_hub/actions/runs/38110236555
- checked: 2026-10-11

```
release-notes	Generate release notes	﻿2026-10-11T04:01:17.3315905Z ##[group]Run node scripts/ops/release-notes.mjs
release-notes	Generate release notes	2026-10-11T04:01:17.3316177Z ^[[36;1mnode scripts/ops/release-notes.mjs^[[0m
release-notes	Generate release notes	2026-10-11T04:01:17.3527103Z shell: /usr/bin/bash -e {0}
release-notes	Generate release notes	2026-10-11T04:01:17.3527308Z env:
release-notes	Generate release notes	2026-10-11T04:01:17.3527719Z   RELEASES_SECRET: ***
release-notes	Generate release notes	2026-10-11T04:01:17.3527868Z   RELEASE_NOTES_DRY_RUN: 
release-notes	Generate release notes	2026-10-11T04:01:17.3528060Z   GITHUB_REPOSITORY: NikolasP98/minion_hub
release-notes	Generate release notes	2026-10-11T04:01:17.3528215Z ##[endgroup]
release-notes	Generate release notes	2026-10-11T04:01:17.3890173Z # Release-notes dry-run (base=0b9d66ab6d0c05009f3fb6be84262ebccd859245, prs=5)
release-notes	Generate release notes	2026-10-11T04:01:17.3890505Z 
release-notes	Generate release notes	2026-10-11T04:01:17.3890904Z ## hub-v2026.10.11 — 2026-10-11
release-notes	Generate release notes	2026-10-11T04:01:17.3891012Z 
release-notes	Generate release notes	2026-10-11T04:01:17.3891070Z ### Nuevo
release-notes	Generate release notes	2026-10-11T04:01:17.3891155Z 
release-notes	Generate release notes	2026-10-11T04:01:17.3891458Z - **inbox**: in-app notifications inbox — scope tiers, reminders, daily feed, changelog
release-notes	Generate release notes	2026-10-11T04:01:17.3891826Z - **pos**: right-click context menu on calendar events
release-notes	Generate release notes	2026-10-11T04:01:17.3892119Z - **pos**: unify recent sales + shift history into one activity popover
release-notes	Generate release notes	2026-10-11T04:01:17.3892468Z - **appointments**: one filter across calendar, board and table
release-notes	Generate release notes	2026-10-11T04:01:17.3892750Z - **custom-columns**: Notion date formats + time on date properties
release-notes	Generate release notes	2026-10-11T04:01:17.3892904Z 
release-notes	Generate release notes	2026-10-11T04:01:17.8325448Z Error: POST https://hub.minion-ai.org/api/releases failed: 401 {"error":"Authentication required"}
release-notes	Generate release notes	2026-10-11T04:01:17.8326387Z     at main (file:///home/runner/work/minion_hub/minion_hub/scripts/ops/release-notes.mjs:150:22)
release-notes	Generate release notes	2026-10-11T04:01:17.8327081Z     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
release-notes	Generate release notes	2026-10-11T04:01:17.8371532Z ##[error]Process completed with exit code 1.
```

## Diagnosis (auto)

**Root cause**: POST request to `https://hub.minion-ai.org/api/releases` returns 401 — authentication token not included or invalid in the request.

**File:line**: `scripts/ops/release-notes.mjs:150`

**Fix**: Check how the script passes `RELEASES_SECRET` to the POST request. The env var is set (masked in logs), but the header format or token key may be wrong — verify the API expects it in `Authorization: Bearer <token>` or another format, and that the script uses the correct header name.
