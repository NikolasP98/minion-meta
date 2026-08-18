---
id: ci-minion-meta-thermonuclear-code-review
title: CI red — Thermonuclear Code Review on minion-meta dev
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: []
---

# CI red — Thermonuclear Code Review on NikolasP98/minion-meta@dev

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `dev` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-meta/actions/runs/29301405046
- checked: 2026-08-18

```
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4707385Z ^[[36;1m  --connect-timeout 5 \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4707666Z ^[[36;1m  --max-time 10 \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4707921Z ^[[36;1m  -X DELETE \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4708213Z ^[[36;1m  -H "Accept: application/vnd.github+json" \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4708796Z ^[[36;1m  -H "Authorization: ***" \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4709124Z ^[[36;1m  -H "X-GitHub-Api-Version: 2022-11-28" \^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4709565Z ^[[36;1m  ${GITHUB_API_URL:-https://api.github.com}/installation/token || true^[[0m
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4744142Z shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4744506Z ##[endgroup]
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4854718Z   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4855615Z                                  Dload  Upload   Total   Spent    Left  Speed
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.4856661Z 
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.5946622Z   0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.5947307Z   0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.6521784Z Post job cleanup.
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.6605600Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.6606802Z Post job cleanup.
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7496758Z [command]/usr/bin/git version
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7536469Z git version 2.54.0
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7572500Z Temporarily overriding HOME='/home/runner/work/_temp/0ab3e75e-90f8-4d06-85e8-ea762947733c' before making global git config changes
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7573741Z Adding repository directory to the temporary git global config as a safe directory
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7578163Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-meta/minion-meta
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7617636Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7653022Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7893964Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.7928269Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.8192316Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.8212406Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.8655229Z Cleaning up orphan processes
thermonuclear-review	UNKNOWN STEP	2026-07-14T02:34:57.8928893Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```

## Diagnosis (auto)

**Root cause:** GitHub App token deletion failing silently. The curl DELETE request to revoke the installation token (shown with 0% progress) is being suppressed by `|| true`, masking the actual failure.

**Likely issue:** Invalid, expired, or incorrectly formatted GitHub App token being passed to the DELETE endpoint. The `GITHUB_API_URL` or authorization header may be malformed.

**Fix direction:** Check the workflow step that populates the token before the curl command—verify the GitHub App credentials are valid, the token endpoint is reachable, and the curl headers are correctly formatted. Remove `|| true` temporarily to expose the real error.

**File:** The workflow definition for `thermonuclear-review` (likely `.github/workflows/thermonuclear-code-review.yml` or similar, matching the untracked proposal file).
