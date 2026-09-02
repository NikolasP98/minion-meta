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
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	﻿2026-09-02T03:30:18.0261344Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.0273637Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.0275771Z with:
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.0276677Z   app-id: 2729701
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.0277712Z   github-api-url: https://api.github.com
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.0279139Z ##[endgroup]
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1554709Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1560235Z   throw new Error("Input required and not supplied: private-key");
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1563516Z   ^
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1565089Z 
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1566380Z Error: Input required and not supplied: private-key
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1571895Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1577545Z     at Module._compile (node:internal/modules/cjs/loader:1872:14)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1580891Z     at Object..js (node:internal/modules/cjs/loader:2003:10)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1584333Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1587695Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1590811Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1595107Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1598132Z     at node:internal/main/run_main_module:33:47
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1599009Z 
stale	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-09-02T03:30:18.1599449Z Node.js v24.19.0
```
