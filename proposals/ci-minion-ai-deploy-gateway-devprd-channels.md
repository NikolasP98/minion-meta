---
id: ci-minion-ai-deploy-gateway-devprd-channels
title: CI red — Deploy Gateway (DEV/PRD channels) on minion-ai main
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: []
---

# CI red — Deploy Gateway (DEV/PRD channels) on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/32089416217
- checked: 2026-08-18

```
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	﻿2026-08-18T01:47:13.6000449Z ##[group]Run ssh -o LogLevel=ERROR -p 22 \
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6000966Z ^[[36;1mssh -o LogLevel=ERROR -p 22 \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6001348Z ^[[36;1m  niko@152.53.91.108 \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6001683Z ^[[36;1m  sudo env \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6002054Z ^[[36;1m    MINION_SWARM_STATE_DIR="/opt/minion-swarm" \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6002595Z ^[[36;1m    MINION_SWARM_SOURCE_IMAGE="ghcr.io/nikolasp98/minion-ai:prd" \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6003149Z ^[[36;1m    "/opt/minion-swarm/update-controller.sh" update \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6003597Z ^[[36;1m  | tee swarm-update-status.json^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6004125Z ^[[36;1mjq -e '.lastUpdate.state == "completed" or .lastUpdate.state == "current"' \^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6004677Z ^[[36;1m  swarm-update-status.json >/dev/null^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6005847Z ^[[36;1m{^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6006168Z ^[[36;1m  echo "### Swarm artifact identity"^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6006547Z ^[[36;1m  echo '```json'^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6007340Z ^[[36;1m  jq '{state:.lastUpdate.state,target:.lastUpdate.target,revision:.lastUpdate.revision,version:.lastUpdate.version,services:.services}' swarm-update-status.json^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6008195Z ^[[36;1m  echo '```'^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6008513Z ^[[36;1m} >> "$GITHUB_STEP_SUMMARY"^[[0m
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6048143Z shell: /usr/bin/bash -e {0}
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6048493Z env:
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6048783Z   REGISTRY: ghcr.io
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6049116Z   IMAGE_NAME: NikolasP98/minion-ai
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6049509Z   SSH_AUTH_SOCK: /tmp/ssh-0MR2jqPH8ArM/agent.2124
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6050119Z   SSH_AGENT_PID: 2128
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.6050428Z ##[endgroup]
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.9330887Z update-controller: another fleet update is already running
Deploy to prd-netcup	Update Swarm fleet to immutable prd digest	2026-08-18T01:47:13.9404357Z ##[error]Process completed with exit code 4.
```

## Diagnosis (auto)

**Root cause:** Another Swarm fleet update is already running; `update-controller.sh` enforces mutual exclusion and exits with code 4.

**The problem:** Concurrent deployment triggered while a prior `update-controller.sh update` call hasn't finished on prd-netcup. This is a race condition in the CI scheduling, not a code defect.

**Fix direction:** Add a wait-with-timeout loop in the GitHub Actions workflow before invoking `update-controller.sh` to check if an update is already in flight and defer/retry, or implement a lock-check in the remote script to report blocking state earlier.

No file:line fix needed — this is an orchestration issue in `.github/workflows/` (the deploy-to-prd job).
