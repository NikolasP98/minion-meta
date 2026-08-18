---
id: 2026-08-18-site-vendored-tgz-untracked-spec
title: Vendored design-tokens tgz untracked — verify the shipped fix and close
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-site-vendored-tgz-untracked
verdict: approved
repos: [minion_site]
tags: [deps, infra]
type: infra
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# Vendored design-tokens tgz untracked

**Owner surface:** `minion_site` — verification only; no source file changes.

**Target repo:** `NikolasP98/minion-site` (private, default branch `master`, work branch
`dev`). The meta-repo `.gitignore` excludes subprojects, so the evidence below was obtained
from the GitHub API rather than a local `minion_site/` checkout.

**Disposition:** shipped by another commit. Do not route this spec to a development run.

**Related spec:**
[`2026-08-13-ci-minion-site-ci-spec`](2026-08-13-ci-minion-site-ci-spec.md) owns
`minion_site` CI triggers, `ci:local`, and the pre-push gate. This spec does not alter those
surfaces.

---

## 0. Product

From the approved proposal `2026-08-17-site-vendored-tgz-untracked`, verbatim:

> # Vendored design-tokens tgz untracked — fresh clone bun install fails on dev
>
> ## Problem
>
> package.json file: dep points at deps/…concourse-r2.tgz which git status shows untracked
> (prior tgz deleted). Fresh CI/clone cannot install.
>
> ## Definition of done
>
> tgz committed alongside package.json/bun.lock when the redesign lands (owner's call on timing).
>
> ## Out of scope
>
> The redesign content itself (owner's active lane).

The proposal authorizes committing the referenced tarball with the redesign. It does not
authorize a new dependency-lint framework, provenance registry, cross-repo parity test, or
documentation program.

## 1. Verified state

The proposal's definition of done was satisfied on `minion_site@dev` on 2026-08-17:

| Requirement | Evidence verified 2026-08-18 |
|---|---|
| The redesign landed | `dev` points at `7f4c3b25`; operator memory records the redesign push as `f05bfa2..7f4c3b2`. |
| The required tarball is committed | GitHub Contents API for `deps?ref=dev` returns `minion-stack-design-tokens-0.1.0-concourse-r2.tgz` as blob `37fae618` (12,700 bytes). The Contents API lists committed tree entries, not untracked working-tree files. |
| `package.json` references that tarball | `package.json@dev` declares `"@minion-stack/design-tokens": "file:deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz"`. |
| `bun.lock` agrees | `bun.lock@dev` records the same `file:deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz` path in its dependency and resolution records. |
| The superseded tarball is absent | `deps@dev` does not contain `minion-stack-design-tokens-0.1.0-onaccent-3344a63.tgz`. |

This disposition is also recorded in operator memory:
`/memory/MINION/minion-site-impeccable-redesign.md` says the redesign and vendored
`concourse-r2.tgz` were committed and pushed on 2026-08-17, and
`/memory/MINION/MEMORY.md` records the hard constraint that a `file:deps/` tarball must be
committed. Those memories shape the verification requirements here; they do not expand the
proposal's scope.

## 2. Required work

No implementation work remains. The operator or closure automation must:

1. Re-run the read-only checks in §3 against `dev` so closure does not rely solely on the
   2026-08-18 snapshot.
2. If all checks pass, mark the proposal/spec shipped by the existing site commit and do not
   create a development branch or PR.
3. If any check fails, stop closure and return the card for re-specification. Do not silently
   broaden this spec into CI or meta-repo work.

## 3. Definition of done

Run these read-only checks from any environment with authenticated `gh` access:

```bash
artifact='minion-stack-design-tokens-0.1.0-concourse-r2.tgz'
repo='NikolasP98/minion-site'

gh api "repos/$repo/contents/deps/$artifact?ref=dev" --jq \
  'select(.type == "file" and .size > 0) | .sha' | grep -q .

gh api "repos/$repo/contents/package.json?ref=dev" --jq .content \
  | base64 -d \
  | grep -Fq "file:deps/$artifact"

gh api "repos/$repo/contents/bun.lock?ref=dev" --jq .content \
  | base64 -d \
  | grep -Fq "file:deps/$artifact"

test "$(gh api "repos/$repo/contents/deps?ref=dev" \
  --jq "[.[].name | select(. == \"$artifact\")] | length")" -eq 1
```

**Pass condition:** all four commands exit 0. This proves the artifact is a non-empty committed
blob on `dev`, and both dependency manifests name it. The proposal can then be closed as
shipped by commit `7f4c3b25` (or by the current descendant of that commit if `dev` has advanced).

The exact commit ancestry is a closure-system concern; these checks deliberately verify the
current `dev` tree rather than assuming the branch still points at the 2026-08-18 SHA.

## 4. Files touched

None. This is a verification-and-closure spec.

## 5. Impact zones and follow-ups

- `minion_site` install integrity is the only impact zone authorized by the proposal. The checks
  cover the committed tarball plus its `package.json` and `bun.lock` references.
- The related CI spec owns branch triggers, `ci:local`, and pre-push composition. Changing them
  here would create overlapping requirements.
- Operator memory `/memory/MINION/minion-site-impeccable-redesign.md` records a separate incident:
  the vendored tarball masked a revert of the source design-token contract. A source/snapshot
  parity gate may be worthwhile, but it affects the meta-repo and was not requested by this
  proposal. It requires its own proposal and impact review.
- A reusable `deps/*.tgz` tracking/provenance lint may also be worthwhile for both `minion_site`
  and `minion_hub`. That is a multi-repo policy change, not completion work for this already-fixed
  site incident.

These follow-ups are observations only. They are not hidden requirements or definitions of done.

## 6. Out of scope

- Repacking, recommitting, renaming, or deleting any tarball.
- Editing the redesign.
- Adding dependency lint scripts, self-tests, provenance ledgers, or snapshot registries.
- Editing `minion_site` CI, hooks, package scripts, or dependency documentation.
- Editing the meta-repo design-token package or its tests.
- Extending the fix to `minion_hub`.
- Publishing or de-vendoring `@minion-stack/*` packages.
