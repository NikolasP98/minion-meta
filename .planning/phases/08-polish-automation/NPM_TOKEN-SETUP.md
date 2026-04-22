# Release Workflow — One-Time Manual Setup

The `.github/workflows/release.yml` workflow requires two manual steps that Claude cannot automate. Complete these BEFORE merging the first PR to `main` after plan 08-02 lands, otherwise the release job will fail.

## 1. Generate npm automation token

1. Visit https://www.npmjs.com/settings/NikolasP98/tokens
2. Click **Generate New Token** → **Classic Token**
3. Select type: **Automation** (this is critical — automation tokens bypass 2FA for publish, which is required because the `@minion-stack` scope has 2FA enforced)
4. Scope: leave default (publish to all packages the user owns)
5. Copy the token immediately — you cannot view it again

## 2. Add NPM_TOKEN as a GitHub repo secret

1. Visit https://github.com/NikolasP98/minion-meta/settings/secrets/actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: paste the token from step 1
5. Click **Add secret**

## 3. Enable Actions write permissions

The `changesets/action` needs to open the "Version Packages" PR, which requires write permissions.

1. Visit https://github.com/NikolasP98/minion-meta/settings/actions
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## 4. Verify

After merging plan 08-02 to main with at least one staged changeset in `.changeset/*.md`:

- Within ~1 min, a PR titled `chore: version packages` should appear at https://github.com/NikolasP98/minion-meta/pulls
- Merging that PR should trigger the publish step; verify with `npm view @minion-stack/shared version` showing the bumped version within ~2 min of merge.

## Rollback

If the release workflow fails:
- Check the Actions log for the specific error
- Common failures: `EOTP` (2FA — regenerate as automation token), `401` (token expired or scope wrong), `refusing to allow GitHub App` (Actions permissions not set)
- The Version Packages PR can be closed manually; no cleanup is required beyond that.

## Future: trusted publishing / OIDC

Classic `NPM_TOKEN` is the Phase 8 choice per D-01. npm now supports trusted publishing via OIDC for public packages (all `@minion-stack/*` are public). A future `REL-03` v2 requirement may migrate to `id-token: write` OIDC, eliminating token rotation. Not in Phase 8 scope.
