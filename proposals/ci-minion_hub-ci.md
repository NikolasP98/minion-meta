---
id: ci-minion_hub-ci
title: CI red — CI on minion_hub master
status: draft
created: 2026-08-14
updated: 2026-08-17
repos: []
---

# CI red — CI on NikolasP98/minion_hub@master

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `master` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion_hub/actions/runs/31843974800
- checked: 2026-08-17

```
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.2988823Z   PUBLIC_POSTHOG_HOST: https://posthog.invalid
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.3009172Z   PUBLIC_POSTHOG_KEY: ci
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.3009555Z   BASE_SHA: 2dbcbea3b1487708c3245ccf80b1dca981d471fc
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.3009873Z ##[endgroup]
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.4854437Z Checking formatting...
check-and-build	UNKNOWN STEP	2026-08-14T21:49:11.9649501Z [^[[33mwarn^[[39m] scripts/purchases-rce-dod.ts
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.1428074Z [^[[33mwarn^[[39m] src/lib/components/finance/PurchaseFormDialog.svelte
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.5040246Z [^[[33mwarn^[[39m] src/routes/(app)/finances/purchases/+page.svelte
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.6672828Z [^[[33mwarn^[[39m] src/server/finance/connectors/sunat-sire-client.ts
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.7185871Z [^[[33mwarn^[[39m] src/server/services/purchases.service.test.ts
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.7660945Z [^[[33mwarn^[[39m] src/server/services/purchases.service.ts
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.7742818Z [^[[33mwarn^[[39m] Code style issues found in 6 files. Run Prettier with --write to fix.
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.8734144Z ##[error]Process completed with exit code 1.
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.8873787Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.8874936Z Post job cleanup.
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9735353Z [command]/usr/bin/git version
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9804942Z git version 2.54.0
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9839490Z Temporarily overriding HOME='/home/runner/work/_temp/8d7f48c9-0452-4305-b355-6e5e2d925f83' before making global git config changes
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9840419Z Adding repository directory to the temporary git global config as a safe directory
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9845008Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion_hub/minion_hub
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9881315Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
check-and-build	UNKNOWN STEP	2026-08-14T21:49:12.9914933Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0155301Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0182255Z http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0193033Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0224474Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0460141Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0494211Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.0885019Z Cleaning up orphan processes
check-and-build	UNKNOWN STEP	2026-08-14T21:49:13.1176616Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
