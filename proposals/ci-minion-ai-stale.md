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

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33466549359
- checked: 2026-09-02

```
stale	UNKNOWN STEP	2026-09-01T03:31:56.9796581Z Getting action download info
stale	UNKNOWN STEP	2026-09-01T03:31:57.3406695Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
stale	UNKNOWN STEP	2026-09-01T03:31:58.7565980Z Download action repository 'actions/stale@5bef64f19d7facfb25b37b414482c7164d639639' (SHA:5bef64f19d7facfb25b37b414482c7164d639639)
stale	UNKNOWN STEP	2026-09-01T03:31:59.5289250Z Complete job name: stale
stale	UNKNOWN STEP	2026-09-01T03:31:59.6140213Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-09-01T03:31:59.6148723Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	UNKNOWN STEP	2026-09-01T03:31:59.6149454Z with:
stale	UNKNOWN STEP	2026-09-01T03:31:59.6149719Z   app-id: 2729701
stale	UNKNOWN STEP	2026-09-01T03:31:59.6150417Z   github-api-url: https://api.github.com
stale	UNKNOWN STEP	2026-09-01T03:31:59.6151132Z ##[endgroup]
stale	UNKNOWN STEP	2026-09-01T03:31:59.7436992Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	UNKNOWN STEP	2026-09-01T03:31:59.7439060Z   throw new Error("Input required and not supplied: private-key");
stale	UNKNOWN STEP	2026-09-01T03:31:59.7440829Z   ^
stale	UNKNOWN STEP	2026-09-01T03:31:59.7442288Z 
stale	UNKNOWN STEP	2026-09-01T03:31:59.7443293Z Error: Input required and not supplied: private-key
stale	UNKNOWN STEP	2026-09-01T03:31:59.7445892Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7448750Z     at Module._compile (node:internal/modules/cjs/loader:1872:14)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7449663Z     at Object..js (node:internal/modules/cjs/loader:2003:10)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7451449Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7452170Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7452668Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7453237Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	UNKNOWN STEP	2026-09-01T03:31:59.7453764Z     at node:internal/main/run_main_module:33:47
stale	UNKNOWN STEP	2026-09-01T03:31:59.7454044Z 
stale	UNKNOWN STEP	2026-09-01T03:31:59.7454163Z Node.js v24.19.0
stale	UNKNOWN STEP	2026-09-01T03:31:59.7841865Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-09-01T03:31:59.7844674Z Post job cleanup.
stale	UNKNOWN STEP	2026-09-01T03:31:59.9066345Z Token is not set
stale	UNKNOWN STEP	2026-09-01T03:31:59.9163243Z Cleaning up orphan processes
stale	UNKNOWN STEP	2026-09-01T03:31:59.9622178Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
