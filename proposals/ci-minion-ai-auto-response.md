---
id: ci-minion-ai-auto-response
title: CI red — Auto response on minion-ai main
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: []
---

# CI red — Auto response on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33158249730
- checked: 2026-08-28

```
auto-response	UNKNOWN STEP	2026-08-28T09:10:13.4586462Z Getting action download info
auto-response	UNKNOWN STEP	2026-08-28T09:10:13.7165005Z Download action repository 'actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547' (SHA:d72941d797fd3113feb6b93fd0dec494b13a2547)
auto-response	UNKNOWN STEP	2026-08-28T09:10:14.5680414Z Download action repository 'actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
auto-response	UNKNOWN STEP	2026-08-28T09:10:14.9932494Z Complete job name: auto-response
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1033727Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1045827Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1047773Z with:
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1048629Z   app-id: 2729701
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1049655Z   github-api-url: https://api.github.com
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.1051036Z ##[endgroup]
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2307606Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2313566Z   throw new Error("Input required and not supplied: private-key");
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2316504Z   ^
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2317880Z 
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2319179Z Error: Input required and not supplied: private-key
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2325151Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2330362Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2334225Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2337360Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2341054Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2345031Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2349442Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2353272Z     at node:internal/main/run_main_module:33:47
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2355392Z 
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2356058Z Node.js v24.18.0
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2828067Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.2834165Z Post job cleanup.
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.4284362Z Token is not set
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.4390577Z Cleaning up orphan processes
auto-response	UNKNOWN STEP	2026-08-28T09:10:15.4925098Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
