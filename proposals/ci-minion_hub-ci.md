---
id: ci-minion_hub-ci
title: CI red — CI on minion_hub master
status: draft
created: 2026-08-14
updated: 2026-08-14
repos: []
---

# CI red — CI on NikolasP98/minion_hub@master

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `master` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion_hub/actions/runs/31831374272
- checked: 2026-08-14

```
check-and-build	UNKNOWN STEP	2026-08-14T19:02:34.9424513Z   PUBLIC_POSTHOG_HOST: https://posthog.invalid
check-and-build	UNKNOWN STEP	2026-08-14T19:02:34.9424834Z   PUBLIC_POSTHOG_KEY: ci
check-and-build	UNKNOWN STEP	2026-08-14T19:02:34.9425665Z   BASE_SHA: 132057d37ea937d29f6f49846586ea09d9e073ad
check-and-build	UNKNOWN STEP	2026-08-14T19:02:34.9425995Z ##[endgroup]
check-and-build	UNKNOWN STEP	2026-08-14T19:02:35.1116606Z Checking formatting...
check-and-build	UNKNOWN STEP	2026-08-14T19:02:35.5533075Z [^[[33mwarn^[[39m] scripts/shadow-emit-test.ts
check-and-build	UNKNOWN STEP	2026-08-14T19:02:35.7787801Z [^[[33mwarn^[[39m] src/routes/(app)/pos/settings/+page.svelte
check-and-build	UNKNOWN STEP	2026-08-14T19:02:35.9093251Z [^[[33mwarn^[[39m] src/server/finance/emission/index.ts
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.0113197Z [^[[33mwarn^[[39m] src/server/services/pos-emission.service.ts
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.2203021Z [^[[33mwarn^[[39m] src/server/services/pos.service.ts
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.2549939Z [^[[33mwarn^[[39m] src/server/services/pos.shifts.test.ts
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.2551157Z [^[[33mwarn^[[39m] Code style issues found in 6 files. Run Prettier with --write to fix.
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.3401052Z ##[error]Process completed with exit code 1.
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.3534269Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.3535385Z Post job cleanup.
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4313103Z [command]/usr/bin/git version
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4347304Z git version 2.54.0
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4380680Z Temporarily overriding HOME='/home/runner/work/_temp/2f3b9602-195a-4eda-9394-983a4a3189e6' before making global git config changes
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4381384Z Adding repository directory to the temporary git global config as a safe directory
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4385552Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion_hub/minion_hub
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4416614Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4444500Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4623828Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4644186Z http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4653041Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4680502Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4856080Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.4883239Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.5167218Z Cleaning up orphan processes
check-and-build	UNKNOWN STEP	2026-08-14T19:02:36.5405393Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
