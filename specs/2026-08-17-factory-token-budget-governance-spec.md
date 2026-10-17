---
id: 2026-08-17-factory-token-budget-governance-spec
title: "Factory token/budget governance — caps, iteration limits, tier laddering without quality loss"
stage: spec
status: review
pass: 2
next_slice: 5
created: 2026-08-17
updated: 2026-10-17
repos: [minion-factory, minion-base]
verdict: pending
tags: [infra]
type: infra
reconcile_ignore: true
reconcile_ignore_reason: "Qualification hold: Base S5 source and focused tests now exist at 3c4d5bef; the August missing-widget reason is obsolete. Authenticated deployed-widget and final all-slice acceptance evidence remain unproven. Do not replay shipped S1-S4 or rebuild S5."
---

# Factory token/budget governance

**User mandate (verbatim, 2026-08-17):** "I want set budgets to avoid overblowing tokens (max budgets, max iterations, etc); while avoiding loss in output quality."

## Current reconciliation — 2026-10-17

### AS-IS

The August audit's S1-S4 completion record remains historical evidence, not a new
runtime qualification. Its claim that S5 is absent is no longer true:

- Base `main` at `3c4d5befb390dddf17a64be3c502be466cc3cbe4` contains
  `src/lib/server/factory.ts:loadBudget`, which validates the live `/budget`
  response, and `src/routes/settings/+page.server.ts`, which calls it.
- `src/routes/settings/+page.svelte` renders today/week spend, per-kind totals,
  the configured-cap bar and the explicit unlimited-cap state. Existing tests
  cover zero/over-cap rendering and malformed/unavailable API responses.
- Base production deployment `6216990278` records successful deployment of that
  exact SHA. This receipt proves deployment identity, not authenticated page use.
- At that SHA, `bun test src/routes/settings/page.test.ts
  src/lib/server/factory.test.ts` passes 41 tests; `bun run check` reports zero
  errors and warnings.
- At the source tree deployed as Factory
  `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`, the focused executable command
  `node --import tsx --test --test-name-pattern='budget|cost|tier|capability|escalat'
  src/queue.test.ts src/index.test.ts src/tiers.test.ts` passes 24 tests from
  `runner/`. It covers the budget/API and tier/retry seams selected by that
  filter, not every original end-to-end requirement.
- The production browser check for `/settings` reaches
  `/login?to=%2Fsettings`. No password was submitted or authentication changed.
  Authenticated widget rendering and the complete S1-S5 acceptance remain
  unproven; this spec is not being marked shipped.

### TO-BE

Keep the complete governance goal, qualify the existing S5 implementation, and
retain every unresolved end-to-end requirement below. Current manifest/topic
policy and deployed budget gates remain authoritative; the original August
defaults and literal tier table below are historical design context, not
permission to restore obsolete defaults or bypass current policy.

### DELTA

This reconciliation changes documentation and execution authority only: replace
the stale missing-widget reason, return the inconsistent pass-1 approval to
review, identify the already-existing S5 files, and retain a qualification hold.
Do not schedule new implementation for S1-S4 or rebuild the S5 widget. Complete
authenticated read-only S5 verification and the remaining all-slice acceptance
with isolated fixtures, then obtain a fresh completion decision. Never toggle
production budgets or launch a paid canary merely to manufacture proof.

The phase-attributable telemetry and benchmark extensions remain in
[`2026-08-31-ci-compute-savings-bun-test-roadmap-spec`](2026-08-31-ci-compute-savings-bun-test-roadmap-spec.md);
they are not prerequisites retroactively added to this goal and are not
satisfied by the existing aggregate budget widget.

## 0. Product

The governance design is calibrated against the following observed burn data.

| Incident (2026-08-16/17) | Cost | Existing mitigation |
|---|---|---|
| 2× monolith dev runs exhausted 101 turns, work discarded | ~$10 each | Slice-scoped tasks now mandatory; salvage path added |
| Review churn: 3 review-fix runs on a v5 logging sink | ~$3-5 | Manually stopped; no structural cap yet |
| OOM'd runs left empty PRs, then re-ran | 2× full run cost | Husk janitor + maxWorkers cap (2026-08-17) |
| Spec queue: 17 runs × ~$1-2 each | ~$25/day burst | Acceptable — this is the product |

Existing caps: maxTurns ≤100 (default 40), selfTest loop ≤5 with early-escalate at 2 identical failures, wall-clock 75m, concurrency 2, requeue-once idempotency, review auto-pairs same-LEVEL (never higher).

## 1. Design principles (quality preservation)

1. **Degrade turns before tiers.** A sonnet with 60 turns beats a haiku with 100 on code tasks; cut the turn budget first, drop the model tier only by explicit tag policy.
2. **Never degrade the reviewer below `med` for logic/security/data tags.** The reviewer is the quality backstop; savings come from the develop stage and from NOT re-running, not from blind review.
3. **Escalate on signal, not by default.** Start at the tag-appropriate tier; retry ONCE at the next tier up only when the failure signature is capability-shaped (selfTest loop exhausted with progress, not infra errors). Never start at `hi` speculatively.
4. **Caps end runs early and cleanly** (salvage → draft PR + note), never mid-write.

## 2. Slices

### S1 — Cost capture (measurement before governance)
- `run.sh`/`spec.sh`: claude stages already emit `total_cost_usd` in result JSON; sum all stage costs (develop + loop iterations + review + fallbacks) and write `costUsd` into `/out/result.json`. Codex stages: no cost figure — record `codexTurns` and estimate later; do not block on it.
- Runner `finish()`: persist `cost_usd REAL` column on runs (ALTER TABLE, nullable).
- `GET /budget`: `{today: {usd, runs}, week: {...}, byKind: {...}}` from the runs table.

### S2 — Budget gates
- `FACTORY_DAILY_BUDGET_USD` (default unset = unlimited): `pump()` refuses to start new runs when today's summed `cost_usd` exceeds it — runs stay `queued`, a single monitor event fires (`fingerprint: budget-exhausted-<date>`), and the queue resumes at UTC midnight. The unstick cron must treat a budget-paused queue as healthy (check the flag via `/budget`).
- `FACTORY_RUN_BUDGET_USD` (default 6): `run.sh` checks cumulative stage cost after each harness call; over budget → salvage path (commit what exists, draft PR, note `budget cap`), never a hard kill.

### S3 — Iteration caps (the churn lesson)
- Review-fix loop: at most **2** review-triggered fix attempts per PR; the 2nd failure files a monitor event and stays draft. (The v5-sink churn would have stopped $3 earlier.)
- Tag-proportional review strictness in the review prompt: for `docs/test/deps` the reviewer is told "block only on correctness, not hardening"; for `security/data` full strictness.

### S4 — Tag-tiered defaults (auto-queue path)
| Spec tags | develop | review | maxTurns |
|---|---|---|---|
| only docs/test/deps | claude low | codex low | 40 |
| default (logic/ui/infra/perf) | claude med | codex med | 80 |
| any security/data | claude med | codex **hi** | 80 |
- One-step escalation: capability-shaped selfTest exhaustion ⇒ requeue once at next develop tier (low→med→hi), same reviewer level.

### Slice 5 — Board surface

**Topics:** `infra`, `test`

- minion-base settings/board widget reading `GET /budget`: today/week spend, per-kind, budget bar when `FACTORY_DAILY_BUDGET_USD` set.
- Implementation now exists in the files recorded above. Remaining work is
  qualification, not a new widget or duplicate API consumer.

**Out of scope:** per-org billing (that's the hub `ai_usage` ledger's job), codex exact cost accounting (no API for it), batch-API migration (24h-window rearchitecture, separately parked).

## 3. E2E verification
<!-- TODO(handoff): Complete authenticated S5 and original all-slice acceptance before a shipped disposition; source/tests/deployment receipt are insufficient. See proposals/2026-08-22-ci-compute-savings-bun-test-roadmap.md, budget-governance reconciliation note. -->
(1) A run's `cost_usd` matches the sum of its stage result JSONs. (2) Set `FACTORY_DAILY_BUDGET_USD=0.01` → new runs stay queued + one monitor event; reset → queue drains. (3) A run exceeding `FACTORY_RUN_BUDGET_USD` lands a draft PR with the budget note instead of burning its remaining turns. (4) A docs-tagged spec auto-queues at low/low with 40 turns. (5) A third review-fix attempt is refused with a monitor event.

Run budget-changing and paid-harness scenarios only in isolated controlled
fixtures. Preserve current topic/manifest policy and record any historical
acceptance assumption that no longer matches it before making a completion
claim. The current production cap and queue must remain unchanged.

## 4. Out of scope

Reimplementing shipped S1-S4, duplicating the existing S5 widget, changing
production budget limits or authentication, and claiming the separate telemetry
or Bun roadmap complete are outside this reconciliation.
