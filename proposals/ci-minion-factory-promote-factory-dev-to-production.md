---
id: ci-minion-factory-promote-factory-dev-to-production
title: CI red — Promote Factory dev to production on minion-factory main
status: draft
created: 2026-08-24
updated: 2026-08-25
repos: []
---

# CI red — Promote Factory dev to production on NikolasP98/minion-factory@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-factory/actions/runs/32712040185
- checked: 2026-08-25

```
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0176884Z ^[[36;1mfi^[[0m
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0177442Z ^[[36;1mprintf 'ci_sha=%s\n' "$CANDIDATE_SHA" >> "$GITHUB_OUTPUT"^[[0m
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0219199Z shell: /usr/bin/bash -e {0}
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0219527Z env:
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0219863Z   CANDIDATE_SHA: a84c95b7527d38850e3dd41c96b6982e32e40a69
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0223358Z   GH_TOKEN: ***
resolve	UNKNOWN STEP	2026-08-24T09:31:55.0223636Z ##[endgroup]
resolve	UNKNOWN STEP	2026-08-24T09:31:55.7211630Z [promotion] required hosted CI passed for a84c95b7527d38850e3dd41c96b6982e32e40a69 (run 32644259733)
resolve	UNKNOWN STEP	2026-08-24T09:31:56.2373449Z [promotion] required hosted CI passed for a84c95b7527d38850e3dd41c96b6982e32e40a69 (run 32644259758)
resolve	UNKNOWN STEP	2026-08-24T09:31:56.7453266Z required CI refused: missing
resolve	UNKNOWN STEP	2026-08-24T09:31:56.7505716Z ##[error]Process completed with exit code 1.
resolve	UNKNOWN STEP	2026-08-24T09:31:56.7640891Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
resolve	UNKNOWN STEP	2026-08-24T09:31:56.7642416Z Post job cleanup.
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8537135Z [command]/usr/bin/git version
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8585898Z git version 2.55.0
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8625707Z Temporarily overriding HOME='/home/runner/work/_temp/6714f620-6e55-45df-809a-a338d195920d' before making global git config changes
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8627486Z Adding repository directory to the temporary git global config as a safe directory
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8631825Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-factory/minion-factory/control
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8677487Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8719109Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
resolve	UNKNOWN STEP	2026-08-24T09:31:56.8982683Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9023490Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9287251Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9327404Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9732877Z Evaluate and set job outputs
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9741511Z Set output 'advanced'
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9743014Z Set output 'candidate_sha'
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9743848Z Set output 'main_sha'
resolve	UNKNOWN STEP	2026-08-24T09:31:56.9744466Z Cleaning up orphan processes
resolve	UNKNOWN STEP	2026-08-24T09:31:57.0015199Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
