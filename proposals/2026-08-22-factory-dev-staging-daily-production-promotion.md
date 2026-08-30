---
id: 2026-08-22-factory-dev-staging-daily-production-promotion
title: Factory release train — dev staging candidates and daily production promotion
status: in-spec
created: 2026-08-22
updated: 2026-08-29
repos: [minion-factory]
spawned_spec: 2026-08-22-factory-dev-staging-daily-production-promotion-spec
tags: [data, infra, logic, security, test]
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Factory release train — dev staging candidates and daily production promotion

## Problem in the user's words

Factory feature work needs a development branch and an isolated staging gate before production.
Production should receive one reviewed snapshot of `dev` each day, using the exact images already
tested in staging. `main` should record only a candidate that has passed production smoke, not act as
the source for an automatic five-minute rebuild.

If its spec is approved, this proposal will supersede the staging/canary exclusion in
[`2026-08-17-factory-release-rollback`](2026-08-17-factory-release-rollback.md) and its
[`2026-08-18-factory-release-rollback-spec`](../specs/2026-08-18-factory-release-rollback-spec.md).
It preserves their fail-closed CI, backup, health, and rollback goals inside a larger build-once
promotion train.

## AS-IS — observable behavior and evidence

1. The prior approved spec records a host cron that fetches `main` every five minutes, hard-resets
   `/opt/factory`, builds floating runner and agent images, and restarts the production runner.
2. That spec explicitly excludes staging/canary, snapshots SQLite without automatic restore, and
   treats `main` as development, release, and production source.
3. The repository-policy baseline records `minion-factory` with only `main`, no required checks, and
   private-repository REST policy surfaces returning plan-related `403`; the owner-authenticated
   GraphQL snapshot showed no branch protection or rulesets at that time.
4. The durable-lineage spec already requires scoped workers, provider-origin independence, durable
   effects, exact candidate SHAs, hibernation, and controller-observed deployment evidence. A release
   train should consume those contracts instead of adding a second authority model.

## TO-BE — product behavior and invariants

- Feature PRs target `dev`. A daily scheduler snapshots one immutable candidate SHA `C` from `dev`.
- If the production receipt already names `C`, the train does not deploy it again. Otherwise the
  recorded production SHA `P` must be an ancestor of `C`.
- CI builds the runner and agent once for `C`, stores their content-addressed digests, and binds them
  to an immutable candidate manifest. Staging and production pull those exact digests; neither host
  rebuilds or accepts floating tags.
- Every feature represented by the complete `P..C` range has an acceptance contract. Contracts may
  select only registered test IDs and acceptance-agent profiles; they contain no inline shell.
- Isolated staging runs deterministic tests, one acceptance-agent run per feature, and an
  independent verifier. Missing, stale, red, or provider-non-independent evidence blocks production.
- Production drains intake, enters startup hold, makes and verifies a SQLite backup, deploys the same
  artifacts, runs post-deploy smoke, and rolls back the exact prior image digests plus the database
  when candidate DB mutation makes restoration necessary.
- Only after production smoke passes does the promotion principal compare-and-swap `main` from `P`
  to exact `C`. A concurrent `dev` advance does not change the in-flight candidate.
- After one human-approved activation, every eligible daily candidate advances automatically from
  complete staging verification into production. Human approval remains required for high-risk
  changes before they enter `dev`, initial cutover, break-glass, cancellation, and recovery states—not
  for each routine eligible candidate.
- Staging has separate compute, Docker authority, network, volumes, data, and secrets. No production
  or staging workload shares a Docker socket with the other environment or with an acceptance agent.
  It runs on a separate host or VM/kernel; another daemon on the production host is insufficient.
- Release leases, effects, manifests, and receipts use a separately mounted control database that an
  application-database rollback cannot rewind.
- Every legacy deployment entry point is governed after cutover, and retention protects every
  artifact/backup referenced by live, rollback, nonterminal, or attention state.

## DELTA — required transitions

1. Add and govern `dev`; move feature PRs off `main`.
2. Replace host builds with one CI-authored, digest-pinned candidate manifest.
3. Add the immutable acceptance-contract and allowlisted-test registries.
4. Add isolated staging deployment, deterministic tests, per-feature acceptance agents, and an
   independent verifier.
5. Add a restart-safe promotion state machine with drain, startup hold, SQLite backup/restore,
   exact-image rollback, smoke evidence, and post-smoke `main` fast-forward.
6. Bridge safely from the five-minute updater, `deploy.sh`, `setup.sh`, Compose, and floating queue
   image defaults, then disable all legacy build/deploy authority permanently.

## Open decisions and activation blockers

These are deliberate decision records, not values for an implementer to guess:

| Decision or blocker | Required resolution before activation |
|---|---|
| Daily Lima time | The operator chooses one wall-clock time in `America/Lima`; the scheduler records both the timezone and resolved UTC instant. |
| Staging host | The operator selects a separate host or VM/kernel that cannot reach production data, secrets, network, volumes, or Docker socket. |
| Drain deadline | The operator sets the maximum wait and the disposition for work still active at that deadline; timeout must fail closed. |
| Provider independence | A reviewed mapping assigns each resolved upstream provider origin to an `independence_group`; aggregator labels alone are insufficient. |
| Branch/ruleset enforcement | Activation is blocked while the private personal repository's ruleset API returns `403` without an eligible plan. Do not emulate enforceable protection with documentation alone; obtain an eligible plan or approve another remotely enforceable control, then verify it read-only. |

No in-code handoff marker belongs in this documentation-only change because there is no implementation
code site. This proposal is the open-items ledger for the undecided activation values above.

## Definition of done

1. The superseding spec is approved and the old release spec is marked `superseded` with reciprocal
   links.
2. `dev` and `main` have verified remote enforcement matching the spec; a feature PR cannot merge
   into or update `main`. A mis-targeted PR is closed/quarantined and recorded without moving the ref.
3. One candidate proves build-once digest identity across CI, staging, and production.
4. The complete `P..C` range has valid contracts, allowlisted deterministic tests, per-feature
   acceptance evidence, and an independent-verifier verdict.
5. Crash/retry fixtures prove every release effect is idempotent and a moving `dev` head cannot alter
   `C`; application-DB rollback plus controller restart cannot rewind the control ledger.
6. Production drain, hold, backup, deployment, smoke, image rollback, conditional DB restore, and
   post-smoke `main` fast-forward all pass the spec's acceptance matrix.
7. The five-minute updater can no longer build or deploy after train activation, and it cannot race
   the promoter during the bridge. Direct deploy/setup/Compose invocation and floating queue images
   cannot bypass the train.
8. A second eligible scheduled candidate promotes automatically after the one-time activation, and
   GC refuses every currently referenced manifest, digest, evidence object, and backup.

## Out of scope

- Choosing the five open activation values in this proposal.
- Weakening deterministic, independent-review, human, security, or data gates to meet a schedule.
- Rebuilding artifacts on staging or production.
- Sharing production data, credentials, writable volumes, networks, or Docker authority with staging.
- Treating a green staging UI, a webhook, a tag, or `main` alone as production evidence.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
The narrower promotion pipeline is shipped and running (`promote-dev-daily.yml` +
`scripts/promotion/*`) and is preserved as unique WIP.

**Correction (2026-08-29):** the closing claim above originally read "promotion train shipped and
running; residual §9 S6/S7 tracked on the spec". That is disproved. The superseding spec
`2026-08-22-factory-dev-staging-daily-production-promotion-spec` is `revision-required` at pass 2:
at minion-factory `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914` slices S1–S4 are absent, S5 is only
partial, and S7's activation gate is actively violated in the live repository. Per-slice S1–S7
status is delegated to that spec's pass-2 review sidecar,
`specs/2026-08-22-factory-dev-staging-daily-production-promotion-spec.review.md`. Status is
`in-spec`, the documented state for a proposal whose spawned spec has been picked up by the spec
pipeline but has not yet shipped end to end (see `scripts/proposal-index.mjs`'s `P_STATUSES`);
this proposal moves to `done` only once this proposal's own "Definition of done" section below is
met.
