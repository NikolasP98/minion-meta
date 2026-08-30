---
spec: 2026-08-22-factory-dev-staging-daily-production-promotion-spec
pass: 2
verdict: revision-required
reviewer: factory-review
created: 2026-08-29
---

# Pass 2 review — Factory release train (operator disposition)

Verified directly against GitHub REST for `NikolasP98/minion-factory`, Actions run
[33263342842](https://github.com/NikolasP98/minion-factory/actions/runs/33263342842), and repo
tree/blob content at exact SHA `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914` (`main` at review time).
Pass 1 left this spec's frontmatter (`status: review`, `verdict: pending`) and evidence body
byte-identical to blob `5fc674035fa2ecc06dd6f2dd2b3eb964a6190ec8` — no operator decision was ever
recorded. This pass records one.

## Disposition: revision-required

Still in review — not approved, not rejected, not archived. The running promotion workflow is
explicitly **not** an approved implementation of this spec.

The evidence below shows the shipped scripts are valuable, narrower-scope WIP and that the train
cannot be activated as specified today. Approval is not supportable while §7.3's activation
blocker is live and violated; archival is not supportable because the shipped scripts are real
progress worth keeping and re-slicing around. Any remediation of the live activation-gate
violation (see "Activation-gate violation is live" below) is production/runtime work and must go
through its own approved change — it is out of scope for this documentation-only review pass.

## Activation-gate violation is live, not merely unresolved (§7.3, RT-039)

§7.3 and the ship gate (§16) require the train to remain dark — no automated production
admission — while remote branch/ruleset enforcement is unavailable. Current primary evidence
shows the gate is both unavailable **and** actively bypassed:

| Check | Result | Evidence |
|---|---|---|
| `dev` branch protection | `protected: false` | `GET /repos/NikolasP98/minion-factory/branches/dev` |
| `main` branch protection | `protected: false` | `GET /repos/NikolasP98/minion-factory/branches/main` |
| Repository rulesets | HTTP 403 (plan-gated, unavailable) | `GET /repos/NikolasP98/minion-factory/rulesets` |
| `production` environment protection | `protection_rules: []`, no deployment-branch policy | `GET /repos/NikolasP98/minion-factory/environments/production` |
| `FACTORY_AUTODEPLOY` repo variable | `1` | `GET /repos/NikolasP98/minion-factory/actions/variables` |
| Production promotion | Completed successfully 2026-08-29 to exact candidate `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914`, `main` now equals that SHA | Actions run [33263342842](https://github.com/NikolasP98/minion-factory/actions/runs/33263342842) (`conclusion: success`); `GET /repos/NikolasP98/minion-factory/commits/main` |

Without remote-enforced branch/ruleset protection, an authorized direct ref mutation can bypass
the intended PR/release authority and invalidate any `P`, `C`, or post-smoke `main` record. This
is a live, currently-violated release-authority invariant, not a documentation gap. The workflow
that produced the 2026-08-29 production promotion is **not** an approved implementation of this
spec and must not be read as evidence of shippability.

## S1–S7 reconciliation (corrects the 2026-08-28 "only S6/S7 remain" claim)

At `main`/candidate SHA `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914`, the repository tree has none
of §14's expected `release/acceptance-contract*`, `release/acceptance-tests.yaml`,
`release/acceptance-agent-profiles.yaml`, `release/smoke-tests.yaml`,
`.github/workflows/release-candidate.yml`, or `runner/src/release-train/` paths.

| Slice | Requirement | Status at `0315707d` | Evidence |
|---|---|---|---|
| S1 | Branch/range policy, contract schema, `release/acceptance-contracts/*.yaml` | **Open** — not present | No `release/` tree at `0315707d`; `dev`/`main` unprotected (table above) |
| S2 | Build-once artifact/manifest pipeline (`release-candidate.yml`, immutable digest manifest) | **Open** — not present | No `.github/workflows/release-candidate.yml`; live path is `promote-dev-daily.yml`, one workflow that tests, probes, and deploys without a separate immutable-manifest build step |
| S3 | Isolated staging deploy + deterministic tests | **Open** — not present | `promote-dev-daily.yml`'s `candidate_test` job runs one generic `test-candidate.mjs` pass directly against the checked-out candidate (`.github/workflows/promote-dev-daily.yml:262-320`); no separate isolated staging host/environment exists |
| S4 | Per-feature acceptance agents + independent verifier | **Open** — not present | The workflow's `authenticated_probe` job runs one authenticated boundary probe (`.github/workflows/promote-dev-daily.yml:275-320`), not one fresh agent per feature contract plus a separately independent-origin verifier |
| S5 | Production state machine: drain/hold, backup, exact-digest deploy, DB-restoring rollback, post-smoke `main` CAS | **Partially open** — deploy/CAS exist; build-once-digest identity and automatic DB restore do not | `deploy-exact.sh` admits `FACTORY_ACTIVATE_CONTAINMENT_V2=0` (current live value; `GET /repos/.../actions/variables`) and on that path locally rebuilds the agent/runner images on the production host rather than deploying pre-built digests ([`deploy-exact.sh:200-206`](https://github.com/NikolasP98/minion-factory/blob/0315707d8c8ffdfb024d2b97fa2eebf45c3b1914/scripts/promotion/deploy-exact.sh#L200-L206)); `rollback-previous.sh` restores runtime/source and images but explicitly does **not** restore the database automatically — it prints `"database was not restored automatically; inspect .../database-backup before any manual DB restore"` ([`rollback-previous.sh:71-73`](https://github.com/NikolasP98/minion-factory/blob/0315707d8c8ffdfb024d2b97fa2eebf45c3b1914/scripts/promotion/rollback-previous.sh#L71-L73)), contrary to RT-034 |
| S6 | Five-minute updater bridge / dark rollout | Believed subordinated (event-driven `promote-dev-daily.yml` on green `dev` CI; cron demoted to recovery per the 2026-08-28 audit) — not re-verified this pass | 2026-08-28 4-agent sweep; not independently re-checked in pass 2 |
| S7 | Ruleset activation + operator-observed release | **Open, and violated** — see activation-gate table above | Live `protected: false`, 403 rulesets, empty `production` protection rules, `FACTORY_AUTODEPLOY=1` |

**Net correction:** the shipped `promote-dev-daily.yml` + `scripts/promotion/*` pipeline is real,
narrower-scope WIP worth keeping and building on — but S1 (contract registries), S2 (build-once
manifest), S3 (isolated staging), and S4 (per-feature agents + independent verifier) are not
implemented at all, S5 is only partially satisfied (no build-once digest identity, no automatic DB
restore), and S7's activation gate is not just open but actively violated in the live repository.
Re-slice remaining work around these seven rows and the exact paths in §14, not around "S6/S7
only."

## Executable evidence (this review pass)

- `git hash-object` of the pre-pass-2 file equaled the exact requested blob
  `5fc674035fa2ecc06dd6f2dd2b3eb964a6190ec8` — confirms pass 1 recorded no decision.
- `gh api repos/NikolasP98/minion-factory/branches/dev` → `protected: false`.
- `gh api repos/NikolasP98/minion-factory/branches/main` → `protected: false`.
- `gh api repos/NikolasP98/minion-factory/rulesets` → HTTP 403.
- `gh api repos/NikolasP98/minion-factory/environments/production` → `protection_rules: []`,
  `deployment_branch_policy: null`.
- `gh api repos/NikolasP98/minion-factory/actions/variables` → `FACTORY_AUTODEPLOY=1`,
  `FACTORY_ACTIVATE_CONTAINMENT_V2=0`.
- `gh api repos/NikolasP98/minion-factory/actions/runs/33263342842` →
  `conclusion: success`, completed 2026-08-29.
- `gh api repos/NikolasP98/minion-factory/commits/main` → `sha: 0315707d8c8ffdfb024d2b97fa2eebf45c3b1914`.
- `gh api .../git/trees/0315707d...?recursive=1` filtered for `release/acceptance|release-candidate|release-train|smoke-tests` → no matches.
- `deploy-exact.sh` and `rollback-previous.sh` blob content at `0315707d` read directly, quoted
  above.

## Changes made to the spec

- Frontmatter: `pass: 1 → 2`, `verdict: pending → revision-required`, `updated: 2026-08-28 → 2026-08-29`.
  `status` stays `review` — this disposition keeps the spec in review.
- Body: the 2026-08-28 board-audit paragraph keeps its shipped-WIP statement but its
  "only Slice 6/Slice 7 remain" conclusion is marked false and pointed at this sidecar. No other
  spec section was touched — the design content is unchanged and still under review.
- The linked proposal `2026-08-22-factory-dev-staging-daily-production-promotion` had the same
  disproved shipment claim; its board-audit paragraph now defers S1–S7 status to this sidecar.

## Human decisions required

- Whether to re-slice this spec around the seven rows above (recommended) or narrow it to the
  shipped promotion pipeline and file the isolated-staging/acceptance-contract scope separately.
- Deactivating or gating the live `FACTORY_AUTODEPLOY=1` production path while remote ref
  enforcement is unavailable. That is runtime/product work and needs its own approved change.
