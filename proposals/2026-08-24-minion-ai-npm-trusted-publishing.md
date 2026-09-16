---
id: 2026-08-24-minion-ai-npm-trusted-publishing
title: Replace minion-ai npm write token with trusted publishing
status: review
created: 2026-08-24
updated: 2026-08-24
repos: [minion]
---

# Replace minion-ai npm write token with trusted publishing

## Problem

The unchanged `NPM_TOKEN` published `@nikolasp98/minion` successfully in GitHub
Actions run `32647995785` at 2026-08-23 15:18 UTC. It began returning npm's
masked `E404` publish response in run `32699116273` at 2026-08-24 06:56 UTC and
failed identically again in run `32710323842`. The package still exists and the
workflow still targets the correct public scope. Rerunning the same expired,
revoked, or permission-reduced credential is not a recovery strategy.

## Proposed implementation

Migrate `.github/workflows/npm-publish.yml` to npm trusted publishing:

- grant only `contents: read` and `id-token: write`;
- pin an npm CLI release that supports the OIDC exchange;
- remove the long-lived `NPM_TOKEN` injection;
- run `npm publish` directly for the root package and the workspace bridge;
- retain the existing branch, dist-tag, version, and notification behavior.

Register the same GitHub publisher on both npm packages before merging the
workflow change:

| npm package | GitHub owner/repository | Workflow | Allowed action |
|---|---|---|---|
| `@nikolasp98/minion` | `NikolasP98/minion-ai` | `npm-publish.yml` | `npm publish` |
| `@nikolasp98/plugin-ui-bridge` | `NikolasP98/minion-ai` | `npm-publish.yml` | `npm publish` |

The workflow must continue to use a GitHub-hosted runner. No npm environment is
required by the current release topology.

## Activation order

1. Configure both package-side trusted publishers in npm.
2. Remove the temporary `TODO(handoff)` from the workflow patch.
3. Merge the workflow-only PR to `DEV`. Its `.github/**`-only merge must not
   trigger an npm publish.
4. Merge the already-focused gateway runtime fix. That first eligible `DEV`
   publish is the OIDC acceptance test; do not manually rerun an older failed
   token-based workflow.
5. Verify the exact new version and `dev` dist-tag from the public registry,
   then revoke or delete the obsolete GitHub `NPM_TOKEN` secret.

## Out of scope

- Publishing a new package version before both trust relationships exist.
- Reusing, exposing, or copying npm passwords, OTPs, or access tokens.
- Changing package names, dist-tags, versions, or release branches.
- Migrating the independent `@minion-stack/*` meta-repo release workflow.

## Definition of done

- Both npm packages show the exact trusted GitHub publisher above.
- The workflow contract test passes and the workflow contains no `NPM_TOKEN`
  or `_authToken` reference.
- The first eligible `DEV` run publishes successfully through OIDC.
- `npm view @nikolasp98/minion dist-tags.dev version` resolves to that new
  prerelease.
- The old GitHub Actions write token is removed only after successful OIDC
  publication.

## Current status (2026-08-24)

- PR `minion-ai#248` merged the OIDC workflow to `DEV`; its CI and Workflow
  Sanity checks passed, and the live `DEV` workflow has `id-token: write` with
  no `NPM_TOKEN` or `_authToken` reference.
- The public `dev` dist-tag is still
  `2026.8.7-dev.20260823151653`, which predates the workflow merge. No eligible
  runtime-changing `DEV` push has exercised OIDC yet, so publication remains
  unverified.
- Package-side trusted-publisher configuration could not be verified from the
  unauthenticated npm CLI session. Do not infer it from the merged workflow.
- Keep this proposal open until an eligible `DEV` publish succeeds and the old
  GitHub write token is then removed. Do not merge a draft product PR merely to
  manufacture the acceptance event.
