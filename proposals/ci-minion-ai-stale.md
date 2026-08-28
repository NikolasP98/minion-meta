---
id: ci-minion-ai-stale
title: CI red — Stale on minion-ai main
status: review
created: 2026-08-28
updated: 2026-08-28
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

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33146217963
- checked: 2026-08-28

```
stale	UNKNOWN STEP	2026-08-28T05:55:08.9733673Z Getting action download info
stale	UNKNOWN STEP	2026-08-28T05:55:09.3561562Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
stale	UNKNOWN STEP	2026-08-28T05:55:10.6034498Z Download action repository 'actions/stale@5bef64f19d7facfb25b37b414482c7164d639639' (SHA:5bef64f19d7facfb25b37b414482c7164d639639)
stale	UNKNOWN STEP	2026-08-28T05:55:11.3081964Z Complete job name: stale
stale	UNKNOWN STEP	2026-08-28T05:55:11.3840337Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-08-28T05:55:11.3848640Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	UNKNOWN STEP	2026-08-28T05:55:11.3849314Z with:
stale	UNKNOWN STEP	2026-08-28T05:55:11.3849589Z   app-id: 2729701
stale	UNKNOWN STEP	2026-08-28T05:55:11.3849909Z   github-api-url: https://api.github.com
stale	UNKNOWN STEP	2026-08-28T05:55:11.3850392Z ##[endgroup]
stale	UNKNOWN STEP	2026-08-28T05:55:11.5022725Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	UNKNOWN STEP	2026-08-28T05:55:11.5026169Z   throw new Error("Input required and not supplied: private-key");
stale	UNKNOWN STEP	2026-08-28T05:55:11.5027304Z   ^
stale	UNKNOWN STEP	2026-08-28T05:55:11.5028334Z 
stale	UNKNOWN STEP	2026-08-28T05:55:11.5029027Z Error: Input required and not supplied: private-key
stale	UNKNOWN STEP	2026-08-28T05:55:11.5030950Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5032457Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5033715Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5034748Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5036004Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5037057Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5038623Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	UNKNOWN STEP	2026-08-28T05:55:11.5039734Z     at node:internal/main/run_main_module:33:47
stale	UNKNOWN STEP	2026-08-28T05:55:11.5040673Z 
stale	UNKNOWN STEP	2026-08-28T05:55:11.5041190Z Node.js v24.18.0
stale	UNKNOWN STEP	2026-08-28T05:55:11.5372430Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	UNKNOWN STEP	2026-08-28T05:55:11.5374865Z Post job cleanup.
stale	UNKNOWN STEP	2026-08-28T05:55:11.6444730Z Token is not set
stale	UNKNOWN STEP	2026-08-28T05:55:11.6584902Z Cleaning up orphan processes
stale	UNKNOWN STEP	2026-08-28T05:55:11.6852092Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
