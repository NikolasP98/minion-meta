---
id: ci-minion-ai-stale
title: CI red — Stale on minion-ai main
status: review
created: 2026-08-28
updated: 2026-08-31
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

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33354092822
- checked: 2026-08-31

```
stale	UNKNOWN STEP	2026-08-31T03:31:15.4172432Z Getting action download info
stale	UNKNOWN STEP	2026-08-31T03:31:15.8157245Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
stale	UNKNOWN STEP	2026-08-31T03:31:16.8143776Z Download action repository 'actions/stale@5bef64f19d7facfb25b37b414482c7164d639639' (SHA:5bef64f19d7facfb25b37b414482c7164d639639)
stale	UNKNOWN STEP	2026-08-31T03:31:17.5636844Z Complete job name: stale
stale	UNKNOWN STEP	2026-08-31T03:31:17.6694401Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-08-31T03:31:17.6706638Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	UNKNOWN STEP	2026-08-31T03:31:17.6708543Z with:
stale	UNKNOWN STEP	2026-08-31T03:31:17.6709382Z   app-id: 2729701
stale	UNKNOWN STEP	2026-08-31T03:31:17.6710388Z   github-api-url: https://api.github.com
stale	UNKNOWN STEP	2026-08-31T03:31:17.6711742Z ##[endgroup]
stale	UNKNOWN STEP	2026-08-31T03:31:17.7989988Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	UNKNOWN STEP	2026-08-31T03:31:17.7994355Z   throw new Error("Input required and not supplied: private-key");
stale	UNKNOWN STEP	2026-08-31T03:31:17.7997087Z   ^
stale	UNKNOWN STEP	2026-08-31T03:31:17.7997819Z 
stale	UNKNOWN STEP	2026-08-31T03:31:17.7998820Z Error: Input required and not supplied: private-key
stale	UNKNOWN STEP	2026-08-31T03:31:17.8003383Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8008759Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8011375Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8013870Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8016720Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8019393Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8022619Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	UNKNOWN STEP	2026-08-31T03:31:17.8025992Z     at node:internal/main/run_main_module:33:47
stale	UNKNOWN STEP	2026-08-31T03:31:17.8027358Z 
stale	UNKNOWN STEP	2026-08-31T03:31:17.8027988Z Node.js v24.18.0
stale	UNKNOWN STEP	2026-08-31T03:31:17.8566671Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-08-31T03:31:17.8571908Z Post job cleanup.
stale	UNKNOWN STEP	2026-08-31T03:31:17.9778136Z Token is not set
stale	UNKNOWN STEP	2026-08-31T03:31:17.9905624Z Cleaning up orphan processes
stale	UNKNOWN STEP	2026-08-31T03:31:18.0293601Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
