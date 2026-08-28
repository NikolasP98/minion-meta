---
id: 2026-08-18-factory-m0-safety-foundation-spec
title: M0 — safety freeze and regression foundation
stage: spec
status: implementing
pass: 1
created: 2026-08-18
updated: 2026-08-28
repos: [minion-factory]
type: infra
tags: [test, logic]
verdict: approved
relationship: depends-on
related: [2026-08-18-sdlc-transformation-roadmap]
reconcile_ignore: true
reconcile_ignore_reason: "Denied: PR #21 implemented only M0 S1. Current dev still lacks the D5 trusted GitHub App/check identity binding; that separate provenance change has not landed, so the safety foundation is not complete."
---

# M0 — safety freeze and regression foundation

Per [[2026-08-18-sdlc-transformation-roadmap]] (program plan): close immediate
holes before any new behavior. Baseline 46/100; credit only for controls
implemented + tested + enforced + observable + fail-closed.

## 0. Product

The safety foundation turns those M0 security and release invariants into executable, regression-tested controls.

## AS-IS

- `agent/spec.sh` publishes with `git add -A` (any stray file the planner
  writes gets committed); spec-pass providers are NOT recorded, so a fallback
  that makes planner and reviewer the same provider still yields an
  "independent" approved verdict; the review sidecar's existence/schema is
  unvalidated; spec content is hashed once at dev-queue time only.
- Merge safety: automerge now requires non-empty `requiredChecks` and
  same-repo PRs (shipped ahead as commit "M0 merge safety"), but checks are
  matched by NAME only (no App identity), and none of the Round-2..5 controls
  have regression tests.
- The factory has NO first-party CI: `runner/src/queue.test.ts` (PR #17) and
  the S2 port exist as PRs but no workflow runs them.

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

### S1 — spec-stage integrity (agent/spec.sh)

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

### S2 — runner-side verification (runner/src)

`queueDevForSpec` + `/runs` already hash the spec at queue time; add a rehash
in the automerge sweep (fetch spec at `run.spec_id`, compare to
`run.spec_sha`; mismatch = skip + log — the spec changed after queue).
Extend `RepoDef.requiredChecks` to `{name: string, appId?: number}[]`
(string entries stay valid as name-only during migration); automerge verifies
`check_runs[].app.id` when appId is declared. Populate real App IDs for
hub/site/meta (GitHub Actions app id 15368).
**DoD:** tsc green; unit tests T-REHASH + T-APPID pass.

### S3 — CI + regression suites (.github/workflows + runner tests)

Add `.github/workflows/ci.yml`: on PR + push to main — `npx tsc --noEmit`,
`bash -n` all agent/ + scripts/ files, `node --test runner/src` (or vitest).
Write regression tests for: secret validation (weak/default/pairwise),
normalizeStages provider independence, lifecycle transition table + reason
whitespace collapse, spec-hash spawn invariant, automerge eligibility matrix
(empty checks, foreign PR, sha mismatch, degraded note, snapshot tags,
high-stakes, appId mismatch), requeue idempotency (requeue_of guard),
maxTurns validation, finish() status matrix incl. corrupt result.json.
**DoD:** workflow green on a no-op PR; every listed control has ≥1 test that
FAILS when the control is reverted.

## Out of scope

Worker containment, GitHub App tokens, execution manifest, browser work,
outbox (M2+ milestones — do not start them here). No behavior changes to
develop/review stages in run.sh beyond what S2 touches in the runner.

## End-to-end verification

Open a PR with the S3 workflow; observe CI green; revert one control (e.g.
re-add `git add -A`) in a scratch branch and observe the matching test fail.

## Rollback

Each slice is a single revertable commit; no schema migrations; the CI
workflow can be disabled by deleting one file.
