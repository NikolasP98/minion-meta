---
id: ci-minion-ai-stale
title: CI red — Stale on minion-ai main
status: review
created: 2026-08-28
updated: 2026-08-30
repos: []
duplicate_candidate: ci-minion-ai-auto-response
source: ci-watch
source_trust: trusted-automation
risk_class: unclassified
priority: medium
owner: factory
---

# CI red — Stale on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/33290338944
- checked: 2026-08-30

```
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	﻿2026-08-30T03:28:24.6867459Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.6876621Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.6877694Z with:
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.6878117Z   app-id: 2729701
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.6878610Z   github-api-url: https://api.github.com
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.6879489Z ##[endgroup]
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8612968Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8615165Z   throw new Error("Input required and not supplied: private-key");
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8616299Z   ^
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8616640Z
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8617080Z Error: Input required and not supplied: private-key
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8619343Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8621873Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8623172Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8624407Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8625647Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8626921Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8628487Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8629842Z     at node:internal/main/run_main_module:33:47
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8630242Z
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-30T03:28:24.8630431Z Node.js v24.18.0
```
