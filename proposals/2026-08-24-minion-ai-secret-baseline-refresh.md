---
id: 2026-08-24-minion-ai-secret-baseline-refresh
title: Audit and refresh the minion-ai secret baseline
status: draft
created: 2026-08-24
updated: 2026-08-24
repos: [minion]
---

# Audit and refresh the minion-ai secret baseline

## Problem

The committed `minion-ai/.secrets.baseline` reports a generation timestamp of
2026-02-17. It has not been refreshed alongside the repository's subsequent
file growth. The former CI command ran `detect-secrets scan --baseline` but did
not compare or stage the rewritten file, so it returned success without
enforcing whether the baseline had changed.

The immediate CI fix scans every added, copied, modified, renamed, type-changed,
or deleted path in the PR or exact `DEV` push delta. It fails closed when the
base commit is unavailable and rejects baseline changes. This protects new
work without accepting a large unaudited allowlist, but it is not a substitute
for reviewing the repository's historical findings.

## Proposed implementation

Refresh the baseline in a dedicated security change:

1. Run detect-secrets 1.5.0 against the real `.secrets.baseline` path in a
   disposable checkout so the baseline-file filter keeps the correct filename.
2. Reconcile `.detect-secrets.cfg` with the baseline's active file and line
   filters; do not add broad exclusions for source or test directories.
3. Classify every newly reported credential-shaped value as a fixture,
   generated or vendored content, documentation example, false positive, or
   possible live secret.
4. Rotate and remove any possible live secret before updating the baseline.
5. Commit the reviewed baseline and filter changes separately from product
   code, with counts by classification and the scanner version in the PR body.
6. Add a periodic full-repository equivalence scan on self-hosted compute or
   the long-lived Factory container. Keep GitHub-hosted CI on commit deltas to
   avoid repeating the prior multi-minute scan on every PR.

The dedicated update must temporarily and explicitly authorize the baseline
change in `.github/scripts/ci-security-scope.sh`; ordinary PRs must continue to
fail when the baseline changes.

## Out of scope

- Treating all existing findings as accepted without review.
- Printing raw candidate values into logs or proposals.
- Restoring the former non-enforcing full scan on every GitHub-hosted run.
- Weakening changed-file scanning while the historical audit is pending.

## Definition of done

- Every newly detected historical finding has a recorded classification.
- No possible live secret remains in Git history without a rotation decision.
- The refreshed baseline and active filter configuration agree.
- A full scan leaves the reviewed baseline canonically unchanged.
- Periodic full scanning runs outside paid GitHub-hosted PR compute.
- PR and exact `DEV` delta tests remain green, including missing-base and
  baseline-tampering cases.
