---
id: ci-minion-ai-stale
title: CI red — Stale on minion-ai main
status: review
created: 2026-08-28
updated: 2026-09-02
repos: []
duplicate_candidate: ci-minion-ai-auto-response
---

# CI red — Stale on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33587275096
- checked: 2026-09-02

```
stale	UNKNOWN STEP	2026-09-02T03:30:16.6643687Z Getting action download info
stale	UNKNOWN STEP	2026-09-02T03:30:17.0472053Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
stale	UNKNOWN STEP	2026-09-02T03:30:17.4426827Z Download action repository 'actions/stale@5bef64f19d7facfb25b37b414482c7164d639639' (SHA:5bef64f19d7facfb25b37b414482c7164d639639)
stale	UNKNOWN STEP	2026-09-02T03:30:17.9216954Z Complete job name: stale
stale	UNKNOWN STEP	2026-09-02T03:30:18.0261387Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-09-02T03:30:18.0273668Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	UNKNOWN STEP	2026-09-02T03:30:18.0275782Z with:
stale	UNKNOWN STEP	2026-09-02T03:30:18.0276681Z   app-id: 2729701
stale	UNKNOWN STEP	2026-09-02T03:30:18.0277716Z   github-api-url: https://api.github.com
stale	UNKNOWN STEP	2026-09-02T03:30:18.0279149Z ##[endgroup]
stale	UNKNOWN STEP	2026-09-02T03:30:18.1554807Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	UNKNOWN STEP	2026-09-02T03:30:18.1560255Z   throw new Error("Input required and not supplied: private-key");
stale	UNKNOWN STEP	2026-09-02T03:30:18.1563535Z   ^
stale	UNKNOWN STEP	2026-09-02T03:30:18.1565105Z 
stale	UNKNOWN STEP	2026-09-02T03:30:18.1566573Z Error: Input required and not supplied: private-key
stale	UNKNOWN STEP	2026-09-02T03:30:18.1571913Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1577567Z     at Module._compile (node:internal/modules/cjs/loader:1872:14)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1580930Z     at Object..js (node:internal/modules/cjs/loader:2003:10)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1584351Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1587708Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1590822Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1595291Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	UNKNOWN STEP	2026-09-02T03:30:18.1598147Z     at node:internal/main/run_main_module:33:47
stale	UNKNOWN STEP	2026-09-02T03:30:18.1599014Z 
stale	UNKNOWN STEP	2026-09-02T03:30:18.1599453Z Node.js v24.19.0
stale	UNKNOWN STEP	2026-09-02T03:30:18.2128204Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-09-02T03:30:18.2133967Z Post job cleanup.
stale	UNKNOWN STEP	2026-09-02T03:30:18.3310097Z Token is not set
stale	UNKNOWN STEP	2026-09-02T03:30:18.3429639Z Cleaning up orphan processes
stale	UNKNOWN STEP	2026-09-02T03:30:18.3789196Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
