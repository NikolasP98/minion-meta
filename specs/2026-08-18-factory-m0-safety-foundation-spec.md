---
id: 2026-08-18-factory-m0-safety-foundation-spec
title: M0 — safety freeze and regression foundation
stage: spec
status: done
pass: 2
created: 2026-08-18
updated: 2026-09-02
repos: [minion-factory]
type: infra
tags: [test, logic]
verdict: approved
relationship: depends-on
related: [2026-08-18-sdlc-transformation-roadmap]
reconcile_ignore: true
reconcile_ignore_reason: "M0 S1 shipped in PR #21 and S2 shipped in PR #155. S3 remains: preserve the live CI workflow and add the missing startup-secret, normalizeStages independence, maxTurns, and corrupt result.json regression coverage before marking this spec done."
---

# M0 — safety freeze and regression foundation

Per [[2026-08-18-sdlc-transformation-roadmap]] (program plan): close immediate
holes before any new behavior. Baseline 46/100; credit only for controls
implemented + tested + enforced + observable + fail-closed.

## 0. Product

The safety foundation turns those M0 security and release invariants into executable, regression-tested controls.

## AS-IS

- S1 shipped in PR #21: `agent/spec.sh` records actual providers, rejects a
  same-provider review as degraded, publishes from exact allowlists, and
  validates the review sidecar.
- S2 shipped in PR #155: automerge re-hashes the queued spec and required
  checks can bind both check name and GitHub App identity.
- First-party CI is live on pull requests and pushes and runs TypeScript,
  shell, and the full runner suite. Existing tests cover lifecycle transitions,
  reason normalization, spec re-hashing, the automerge matrix, and requeue
  idempotency. The remaining M0 gap is narrower: startup-secret validation,
  `normalizeStages` provider independence, `maxTurns` validation, and corrupt
  `result.json` still lack direct regression coverage.

## TO-BE

- Spec passes attest their ACTUAL provider/model; same-provider planner+
  reviewer = degraded, never an approved independent verdict, and pass 2
  re-runs with an independent provider or fails.
- Spec-stage publishes via exact per-pass allowlists; any other changed path
  aborts the stage.
- Review sidecar must exist and carry {spec, pass, verdict, reviewer,
  created} — missing/invalid = stage failure.
- Spec re-hashed before every downstream stage decision (dev queue, readiness).
- Trusted checks are `{name, appId}` pairs; a matching name from an untrusted
  App does not satisfy the requirement.
- A required CI workflow on minion-factory main runs typecheck + shell syntax
  + the full node:test/vitest suite on every PR and push.

## DELTA (numbered; each maps to a slice + proving test)

- D1 spec.sh provider attestation + degradation (→S1, T-PROV)
- D2 spec.sh exact write allowlists per pass (→S1, T-ALLOW)
- D3 sidecar schema validation (→S1, T-SIDECAR)
- D4 spec rehash before queue/readiness (→S2, T-REHASH)
- D5 requiredChecks as {name, appId} verified against check-run App identity
  (→S2, T-APPID)
- D6 CI workflow + regression suites for rounds 2–5 controls (→S3, T-CI)

## Slices

### S1 — spec-stage integrity (agent/spec.sh) — shipped in PR #21

Record `ACTUAL_HARNESS` per pass into the result note; if pass-1 and pass-2
resolved to the SAME provider after fallbacks, write `verdict: degraded` into
the sidecar and exit failed (the sweep must never see approved). Replace both
`git add -A` sites with explicit path lists (pass 1: `specs/${SPEC_ID}.md`,
`${PROPOSAL_FILE}`, `specs/index.json`, `proposals/index.json`; pass 2: the
spec, its `.review.md` sidecar, `specs/index.json`); if `git status
--porcelain` shows anything outside the allowlist, abort with a named note.
Validate the sidecar frontmatter fields after pass 2.
**DoD:** `bash -n` green; a seeded stray file aborts the stage in a dry-run
container; a forced same-provider fallback produces degraded+failed.

### S2 — runner-side verification (runner/src) — shipped in PR #155

`queueDevForSpec` + `/runs` already hash the spec at queue time; add a rehash
in the automerge sweep (fetch spec at `run.spec_id`, compare to
`run.spec_sha`; mismatch = skip + log — the spec changed after queue).
Extend `RepoDef.requiredChecks` to `{name: string, appId?: number}[]`
(string entries stay valid as name-only during migration); automerge verifies
`check_runs[].app.id` when appId is declared. Populate real App IDs for
hub/site/meta (GitHub Actions app id 15368).
**DoD:** tsc green; unit tests T-REHASH + T-APPID pass.

### S3 — complete the CI regression foundation (.github/workflows + runner tests)

Preserve the live `.github/workflows/ci.yml` pull-request and push gates,
including TypeScript, shell syntax, and the full runner suite. Recon the tests
already present and add only the missing direct regressions for: secret
validation (weak/default/pairwise), `normalizeStages` provider independence,
`maxTurns` validation, and `finish()` with a corrupt `result.json`. Do not
duplicate the existing lifecycle transition/reason-normalization, spec-rehash,
automerge eligibility, or requeue-idempotency tests.
**DoD:** the focused new tests and the existing full workflow are green; every
new test fails when its corresponding guard is reverted.

## Out of scope

Worker containment, GitHub App tokens, execution manifest, browser work,
outbox (M2+ milestones — do not start them here). No behavior changes to
develop/review stages in run.sh beyond what S2 touches in the runner.

## End-to-end verification

Open the S3 PR and observe the existing CI workflow green. For each newly
covered guard, verify in a scratch worktree that reverting the guard makes its
focused regression fail.

## Rollback

Each slice is a single revertable commit; no schema migrations; the CI
workflow can be disabled by deleting one file.
