---
id: ci-minion-ai-labeler
title: CI red — Labeler on minion-ai main
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: []
---

# CI red — Labeler on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33158249139
- checked: 2026-08-28

```
label-issues	UNKNOWN STEP	2026-08-28T09:10:13.2147363Z Getting action download info
label-issues	UNKNOWN STEP	2026-08-28T09:10:13.5416425Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
label-issues	UNKNOWN STEP	2026-08-28T09:10:14.4019659Z Download action repository 'actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
label-issues	UNKNOWN STEP	2026-08-28T09:10:14.9661293Z Complete job name: label-issues
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0339788Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0349970Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0351551Z with:
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0352202Z   app-id: 2729701
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0352961Z   github-api-url: https://api.github.com
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.0354111Z ##[endgroup]
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1163693Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1166880Z   throw new Error("Input required and not supplied: private-key");
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1169136Z   ^
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1169762Z 
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1170728Z Error: Input required and not supplied: private-key
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1173409Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1176190Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1178042Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1179719Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1181244Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1183017Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1186110Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1187911Z     at node:internal/main/run_main_module:33:47
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1188618Z 
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1188953Z Node.js v24.18.0
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1450843Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.1453806Z Post job cleanup.
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.2246146Z Token is not set
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.2374381Z Cleaning up orphan processes
label-issues	UNKNOWN STEP	2026-08-28T09:10:15.2757708Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
