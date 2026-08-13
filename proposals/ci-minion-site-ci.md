---
id: ci-minion-site-ci
title: CI red — CI on minion-site master
status: draft
created: 2026-08-13
updated: 2026-08-13
repos: []
---

# CI red — CI on NikolasP98/minion-site@master

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `master` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-site/actions/runs/30767780401
- checked: 2026-08-13

```
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2870053Z ^[[36mimport { createBrowserClient } from '@supabase/ssr';
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2894480Z import { ^[[35mPUBLIC_SUPABASE_URL^[[36m, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';^[[39m
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2895352Z 
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2906043Z /home/runner/work/minion-site/minion-site/^[[32msrc/lib/supabase/client.ts^[[39m:2:31
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2907535Z ^[[31mError^[[39m: Module '"$env/static/public"' has no exported member 'PUBLIC_SUPABASE_ANON_KEY'. 
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2908754Z ^[[36mimport { createBrowserClient } from '@supabase/ssr';
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2909968Z import { PUBLIC_SUPABASE_URL, ^[[35mPUBLIC_SUPABASE_ANON_KEY^[[36m } from '$env/static/public';^[[39m
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2910779Z 
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2911118Z ====================================
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.2911913Z ^[[31msvelte-check found 4 errors and 0 warnings in 2 files
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.3591772Z error: script "check" exited with code 1
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.3597602Z ^[[39m
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.3612872Z ##[error]Process completed with exit code 1.
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.3761963Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.3763191Z Post job cleanup.
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4676108Z [command]/usr/bin/git version
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4718452Z git version 2.54.0
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4793205Z Temporarily overriding HOME='/home/runner/work/_temp/6b9f31ac-3c93-4580-93bc-3446674b96ce' before making global git config changes
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4800284Z Adding repository directory to the temporary git global config as a safe directory
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4806006Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-site/minion-site
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4848307Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.4889299Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5132482Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5163016Z http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5178311Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5211895Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5447440Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5480933Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.5967895Z Cleaning up orphan processes
check-and-build	UNKNOWN STEP	2026-08-02T21:24:10.6377093Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
