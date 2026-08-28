---
id: 2026-08-17-factory-token-budget-governance-spec
title: "Factory token/budget governance — caps, iteration limits, tier laddering without quality loss"
stage: spec
status: implementing
pass: 1
created: 2026-08-17
updated: 2026-08-28
repos: [minion-factory]
verdict: approved
tags: [infra]
type: infra
reconcile_ignore: true
reconcile_ignore_reason: "Denied: the 2026-08-28 audit verified Factory S1-S4, but also verified that S5 is absent: minion-base has no budget endpoint consumer or budget widget. PR #43 is therefore partial completion."
---

# Factory token/budget governance

**User mandate (verbatim, 2026-08-17):** "I want set budgets to avoid overblowing tokens (max budgets, max iterations, etc); while avoiding loss in output quality."

## 0. Observed burn data (what this spec is calibrated against)

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

### S5 — Board surface
- minion-base settings/board widget reading `GET /budget`: today/week spend, per-kind, budget bar when `FACTORY_DAILY_BUDGET_USD` set.

**Out of scope:** per-org billing (that's the hub `ai_usage` ledger's job), codex exact cost accounting (no API for it), batch-API migration (24h-window rearchitecture, separately parked).

## 3. E2E verification
(1) A run's `cost_usd` matches the sum of its stage result JSONs. (2) Set `FACTORY_DAILY_BUDGET_USD=0.01` → new runs stay queued + one monitor event; reset → queue drains. (3) A run exceeding `FACTORY_RUN_BUDGET_USD` lands a draft PR with the budget note instead of burning its remaining turns. (4) A docs-tagged spec auto-queues at low/low with 40 turns. (5) A third review-fix attempt is refused with a monitor event.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Factory surface (S1-S4) shipped: cost_usd ledger, GET /budget + budgetPause, run caps + reviewfix reserve + tiers ladder. Remaining: S5 minion-base budget widget (verified absent — no /budget consumer in base src/).
