---
id: ci-minion-factory-promote-factory-dev-to-production
title: CI red — Promote Factory dev to production on minion-factory main
status: draft
created: 2026-08-24
updated: 2026-08-26
repos: []
---

# CI red — Promote Factory dev to production on NikolasP98/minion-factory@main

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `main` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-factory/actions/runs/32832101648
- checked: 2026-08-26

```
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.1997361Z ^[[36;1mtrap 'ssh "${ssh_args[@]}" "$PRODUCTION_SSH_TARGET" "rm -rf -- $remote_dir"' EXIT^[[0m
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.1999423Z ^[[36;1mscp "${ssh_args[@]}" control/scripts/promotion/lib.sh control/scripts/promotion/host-preflight.sh "$PRODUCTION_SSH_TARGET:$remote_dir/"^[[0m
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2001080Z ^[[36;1m# shellcheck disable=SC2029^[[0m
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2002670Z ^[[36;1mssh "${ssh_args[@]}" "$PRODUCTION_SSH_TARGET" "chmod 0700 '$remote_dir/host-preflight.sh' && '$remote_dir/host-preflight.sh' '$live_sha'"^[[0m
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2004386Z ^[[36;1mprintf 'live_sha=%s\n' "$live_sha" >> "$GITHUB_OUTPUT"^[[0m
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2048095Z shell: /usr/bin/bash -e {0}
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2049074Z env:
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2050061Z   CANDIDATE_SHA: b2ff102fdbe293bf0769da8e96c96b6bc54c064f
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2051251Z   MAIN_SHA: 631a1add4b0d6c0dad6ea87200ad79d60abb07c0
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2052332Z   ACTIVATE_LINEAGE: 0
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2053247Z   ACTIVATE_CONTAINMENT: 0
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2054220Z   PRODUCTION_SSH_TARGET: niko@152.53.91.108
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.2055222Z ##[endgroup]
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.5206835Z [promotion] live SHA 01a39b3fa398582c55d0c03f9c5e1ef87fbbf7df matches neither resolved main 631a1add4b0d6c0dad6ea87200ad79d60abb07c0 nor recovery candidate b2ff102fdbe293bf0769da8e96c96b6bc54c064f
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.5221604Z ##[error]Process completed with exit code 1.
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.5477031Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.5481190Z Post job cleanup.
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6273962Z [command]/usr/bin/git version
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6307474Z git version 2.55.0
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6375667Z Temporarily overriding HOME='/home/runner/work/_temp/a4964878-1fc0-412b-bc27-3fd8b3ff9abc' before making global git config changes
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6379859Z Adding repository directory to the temporary git global config as a safe directory
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6385516Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-factory/minion-factory/control
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6429920Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6469064Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6683758Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6716248Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6930177Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.6964309Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.7386188Z Cleaning up orphan processes
Promote and deploy (trusted controller only)	UNKNOWN STEP	2026-08-25T09:31:07.7699797Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
