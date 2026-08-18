---
id: ci-minion-ai-ci
title: CI red — CI on minion-ai DEV
status: in-spec
created: 2026-08-18
updated: 2026-08-18
spawned_spec: 2026-08-18-ci-minion-ai-ci-spec
repos: [minion-ai]
tags: [test, logic]
---

# CI red — CI on NikolasP98/minion-ai@DEV

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `DEV` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-ai/actions/runs/31999443485
- checked: 2026-08-18

```
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.5447415Z ^[[90m ^[[2m❯^[[22m ChildProcess.emit node:events:^[[2m519:28^[[22m^[[39m
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.5448354Z ^[[90m ^[[2m❯^[[22m Process.ChildProcess._handle.onexit node:internal/child_process:^[[2m293:12^[[22m^[[39m
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.5448912Z 
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.5449200Z ^[[31m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯^[[39m
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.5449375Z 
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:05.9758668Z ##[error]Process completed with exit code 1.
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0354659Z Post job cleanup.
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0382833Z ##[start-action display=Restore pnpm store cache;id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__actions_cache]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0388616Z ##[end-action id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__actions_cache;outcome=skipped;conclusion=skipped;duration_ms=0]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0390630Z ##[start-action display=Setup Bun;id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__oven-sh_setup-bun]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0392823Z ##[end-action id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__oven-sh_setup-bun;outcome=skipped;conclusion=skipped;duration_ms=0]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0396373Z ##[start-action display=Setup Node.js;id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__actions_setup-node]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0398292Z ##[end-action id=__db4054a2-35d6-4113-bca8-4b055818c6f7.__actions_setup-node;outcome=skipped;conclusion=skipped;duration_ms=0]
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0508234Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.0509383Z Post job cleanup.
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2684580Z [command]/usr/bin/git version
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2733054Z git version 2.54.0
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2772335Z Temporarily overriding HOME='/home/runner/work/_temp/9eab58cb-70da-43c2-a18c-64bc99dc9a08' before making global git config changes
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2773874Z Adding repository directory to the temporary git global config as a safe directory
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2779046Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/minion-ai/minion-ai
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2833125Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.2871023Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3231293Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3859109Z http.https://github.com/.extraheader
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3861360Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3864564Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3867181Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.3920510Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.4006816Z Cleaning up orphan processes
checks (bun, test, pnpm baml:generate && pnpm canvas:a2ui:bundle && bunx vitest run --project=unit)	UNKNOWN STEP	2026-08-17T12:49:06.4530159Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830, actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5, actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```

---

**Triage 2026-08-18:** Approved — gateway just joined the factory dev fleet (safe gate: pnpm check + vitest test/ci). Known context: the bun unit job carries ~193 clustered pre-existing failures (see test-suite recon 2026-08-10); the spec should decide whether to fix the cluster roots or quarantine honestly, never blanket-skip. NEVER run the full gw suite.
