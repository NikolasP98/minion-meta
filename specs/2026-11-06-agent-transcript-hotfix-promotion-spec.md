---
id: 2026-11-06-agent-transcript-hotfix-promotion-spec
title: Promote only the approved transcript fixes through a one-time hotfix gate
stage: spec
status: approved
verdict: approved
pass: 2
created: 2026-11-06
updated: 2026-11-06
repos: [minion]
tags: [security, infra, test]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
---

# Scoped transcript hotfix promotion

## 0. Product

Release the owner-approved transcript corrections to production without activating unrelated unreleased JWT or backup features. Preserve complete validation and immutable deployment proof for the exact production candidate.

## Authorization and review

The owner selected “Prepare a scoped hotfix promotion exception for these fixes only (recommended)” after being shown that ordinary DEV promotion includes JWT PR363 and backup PR366. This explicitly permits a single scoped production PR and its necessary CI admission exception. It does not approve those unrelated features or weaken runtime authentication.

Design pass 1 (orchestrator, standards): inspected the real CI entry conditions, the named Linux gate, registry branch roles and immutable Docker deployment workflow. Preserve the normal DEV promotion and all normal validation prerequisites. No version, publish flag, artifact identity or server registry change is required.

Design pass 2 (orchestrator, spec): challenged wrong branch/repository/base, a reused branch after merge, missing/failed validation and parser edge cases. A one-time exact-base binding closes reuse after the promotion changes main. These two design passes are self-review; independent code review and complete exact-source qualification remain required before merge. The separate original transcript behavior contract is unchanged.

## AS-IS

Production main and both running Gateway images are at `50a3036ad7fac23710943e7eeadfe66b38d96fcd`. Current DEV additionally contains `3de77b1a` (JWT PR363) and `d3e0fbf5` (backups PR366). Gateway `.github/workflows/ci.yml` admits main promotion only when the head branch is DEV; the Docker-security, shellcheck and secrets entry jobs skip main promotions, so their dependent validation jobs do not run. A direct scoped branch therefore fails the named gate and lacks full validation. A normal DEV promotion would include the excluded features.

## TO-BE

- One branch, `hotfix/agent-transcript-guardrails-20261106`, may target main in this repository only while the PR base SHA is exactly `50a3036ad7fac23710943e7eeadfe66b38d96fcd`.
- That branch runs the ordinary complete applicable validation path, including Docker security, format/types/lint and tests. It never uses DEV promotion's early-success shortcut.
- The authoritative named gate rejects a wrong branch, repository or base, requires runtime/full-Node scope and successful check/test jobs, and rejects missing/failed prerequisites. Normal DEV-to-main and ordinary feature PR behavior remain intact.
- After this promotion changes main, the exception is inert even if the branch name is reused. No mutable label, secret, variable or operator flag grants admission.
- Production source is based on current main and contains only the approved transcript changes and this admission exception. JWT-only feature code and backup changes remain excluded. The F1 restriction is inapplicable where production has no JWT-only admission path; preserve the existing production admission behavior.
- Source changes first receive feature qualification through DEV. The scoped production candidate is independently qualified against main before its own merge. Merge uses the tested immutable head. Docker release/deployment retains its existing immutable source/digest and fleet checks.

## DELTA and verification

1. Add the exact branch/base/repository exception to the three applicable security/validation-entry job admission conditions (Docker security, shellcheck and secrets).
2. Extend the named Linux gate to distinguish normal DEV promotion from the single hotfix. Only normal DEV promotion exits early; the hotfix must pass all existing applicable prerequisites.
3. Execute the real parsed workflow gate script in tests with synthetic event/status environments. Cover valid DEV promotion, valid fully checked hotfix, missing and failed lanes, wrong branch/repository/base, ordinary feature PRs and post-merge branch reuse. Parse job admission into a semantic model; avoid raw substring assertions.
4. Run the existing CI workflow contracts, changed boundary tests and complete candidate checks/build/tests. Record independent Standards and Spec review separately, actual PR CI, production merge/deployment identities and safe runtime checks.

## Out of scope

No unrelated runtime feature, production-data fixture, credential rotation, real outbound business message, paid model evaluation or global CI configuration is included.
