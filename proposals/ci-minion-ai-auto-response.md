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
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	﻿2026-08-28T09:10:15.1033683Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.1045798Z ##[group]Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.1047762Z with:
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.1048625Z   app-id: 2729701
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.1049651Z   github-api-url: https://api.github.com
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.1051026Z ##[endgroup]
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2307550Z /home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2313531Z   throw new Error("Input required and not supplied: private-key");
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2316490Z   ^
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2317868Z 
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2319081Z Error: Input required and not supplied: private-key
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2325126Z     at Object.<anonymous> (/home/runner/work/_actions/actions/create-github-app-token/d72941d797fd3113feb6b93fd0dec494b13a2547/dist/main.cjs:42559:9)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2330339Z     at Module._compile (node:internal/modules/cjs/loader:1871:14)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2334203Z     at Object..js (node:internal/modules/cjs/loader:2002:10)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2337334Z     at Module.load (node:internal/modules/cjs/loader:1594:32)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2341028Z     at Module._load (node:internal/modules/cjs/loader:1396:12)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2345003Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2349414Z     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2353245Z     at node:internal/main/run_main_module:33:47
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2355370Z 
auto-response	Run actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547	2026-08-28T09:10:15.2356047Z Node.js v24.18.0
```

## Diagnosis (auto)

**Root cause:** The `actions/create-github-app-token` action is missing the required `private-key` input. The workflow supplies `app-id` and `github-api-url` but not the private key.

**File:line:** `.github/workflows/` (likely `auto-response.yml` based on the job name) — check the step calling `actions/create-github-app-token@d72941d797fd3113feb6b93fd0dec494b13a2547`.

**Fix:** Add `private-key: ${{ secrets.GITHUB_APP_PRIVATE_KEY }}` (or your secret name) to the action's `with:` block. The secret itself must exist in your GitHub repo settings.
