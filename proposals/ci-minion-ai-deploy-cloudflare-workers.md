---
id: ci-minion-ai-deploy-cloudflare-workers
title: CI red — Deploy Cloudflare Workers on minion-ai main
status: draft
created: 2026-11-14
updated: 2026-11-14
repos: []
---

# CI red — Deploy Cloudflare Workers on NikolasP98/minion-ai@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/43524329080
- checked: 2026-11-14

```
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6167002Z ^[[36;1m  --config wrangler.toml \^[[0m
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6167230Z ^[[36;1m  --env intent-classifier \^[[0m
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6167477Z ^[[36;1m  --name minion-intent-classifier \^[[0m
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6167734Z ^[[36;1m  --compatibility-date 2024-09-23 \^[[0m
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6167973Z ^[[36;1m  intent-classifier.ts^[[0m
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6212739Z shell: /usr/bin/bash -e {0}
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6212942Z env:
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6213109Z   CLOUDFLARE_ACCOUNT_ID: 
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6213391Z   CLOUDFLARE_API_TOKEN: 
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.6213611Z ##[endgroup]
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.8925392Z Wrangler requires at least Node.js v22.12.0. You are using v20.20.2. Please update your version of Node.js.
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.8926173Z 
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.8927123Z Consider using a Node.js version manager such as https://volta.sh/ or https://github.com/nvm-sh/nvm.
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.8963523Z ##[error]Process completed with exit code 1.
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9085765Z Post job cleanup.
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9823407Z [command]/usr/bin/git version
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9862065Z git version 2.56.1
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9895668Z Temporarily overriding HOME='/home/runner/work/_temp/b790c44c-6ab9-477a-a7b6-4cc897d77d19' before making global git config changes
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9897461Z Adding repository directory to the temporary git global config as a safe directory
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9900509Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-ai/minion-ai
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9940572Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:16.9975158Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0260413Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0288338Z http.https://github.com/.extraheader
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0295467Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0331326Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0593811Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.0635988Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.1065493Z Cleaning up orphan processes
Deploy Workers	UNKNOWN STEP	2026-11-13T23:05:17.1384957Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
