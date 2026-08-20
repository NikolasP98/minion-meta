---
id: ci-minion-meta-ci
title: CI red — CI on minion-meta dev
status: draft
created: 2026-08-20
updated: 2026-08-20
repos: []
---

# CI red — CI on NikolasP98/minion-meta@dev

Filed automatically by the factory CI watch: the most recent completed run of
this workflow on the deploy branch failed. Approving sends it into the spec
pipeline; the fix may be code, CI config, or retiring the workflow (say which).

**Definition of done:** the workflow's latest completed run on `dev` is
green, or the workflow is deliberately removed/disabled with rationale.

## Latest failure

- run: https://github.com/NikolasP98/minion-meta/actions/runs/32384791538
- checked: 2026-08-20

```
verify	Spec index check	﻿2026-08-20T15:13:59.6281412Z ##[group]Run node scripts/spec-index.mjs --check
verify	Spec index check	2026-08-20T15:13:59.6281734Z ^[[36;1mnode scripts/spec-index.mjs --check^[[0m
verify	Spec index check	2026-08-20T15:13:59.6314375Z shell: /usr/bin/bash -e {0}
verify	Spec index check	2026-08-20T15:13:59.6314597Z env:
verify	Spec index check	2026-08-20T15:13:59.6314811Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
verify	Spec index check	2026-08-20T15:13:59.6315128Z   GITHUB_EVENT_BEFORE: 348bb480bd0271e9861deb19e5cd82e627e342cc
verify	Spec index check	2026-08-20T15:13:59.6315393Z ##[endgroup]
verify	Spec index check	2026-08-20T15:14:00.2017137Z 2026-08-20-handoff-minion-factory-1487584490-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2018743Z 2026-08-20-handoff-minion-factory-1487584490-spec.md: missing a verification section (a heading or a **Verification:** label)
verify	Spec index check	2026-08-20T15:14:00.2019899Z 2026-08-20-handoff-minion-hub-1323254565-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2020750Z 2026-08-20-handoff-minion-hub-2131866440-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2021505Z 2026-08-20-handoff-minion-hub-2785164896-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2022299Z 2026-08-20-handoff-minion-hub-3530856808-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2023071Z 2026-08-20-handoff-minion-hub-902723699-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2023904Z 2026-08-20-handoff-minion-meta-3518589653-spec.md: missing "## 0. Product" section
verify	Spec index check	2026-08-20T15:14:00.2024975Z specs/index.json is stale — run `node scripts/spec-index.mjs` and commit the result
verify	Spec index check	2026-08-20T15:14:00.2101106Z ##[error]Process completed with exit code 1.
```

## Diagnosis (auto)

**Root cause:** Spec files missing required sections. Multiple handoff specs lack "## 0. Product" section; one lacks verification section. The `specs/index.json` index file is stale as a result.

**Fix:** Run `node scripts/spec-index.mjs` to regenerate the index, then manually add the missing "## 0. Product" and verification sections to each affected spec file in `specs/`. The affected files match pattern `2026-08-20-handoff-*.md`.

**File:line:** `scripts/spec-index.mjs` is the validator; spec files are `specs/2026-08-20-handoff-*.md`.

**Commit:** After fixing the sections, run the generator once more and commit both updated specs and `specs/index.json`.
