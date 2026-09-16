---
id: 2026-08-28-factory-infra-product-failure-taxonomy
title: Split factory run outcomes into INFRA vs PRODUCT failures
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory, minion-base]
---

# Split factory run outcomes into INFRA vs PRODUCT failures

## Problem (audit 2026-08-28)

The dashboard's 95% failure rate conflated ~15 real product failures with a
mechanical retry storm: push races, 30-minute SIGKILLs, provider 5xx, budget
mechanics. $340 of $486 weekly spend went to failed runs. Standard
flaky-pipeline practice (Datadog/Atlassian) separates infrastructure failures
from product failures — until they are split, the failure rate is not a
signal anyone can steer by. Two adjacent stats bugs (audit findings #8, #9):
canceled runs silently vanish from the pass-rate denominator, and
failure-bucket attribution greps agent-authored `note` strings for ALL
finished runs including passed ones.

## Proposed implementation

- At run finish, classify the outcome into `infra_fail` (push race, wall-clock
  kill, OOM 137, clone/network failure, provider outage note) vs
  `product_fail` (self-test red at cap, review FAIL, no-op develop) vs
  `passed` — the runner already knows how each run died; store it as a column,
  never derived from agent-writable text.
- INFRA failures requeue without consuming the product retry budget
  (LINEAGE_CAP still bounds them) and are excluded from the headline failure
  rate; report both rates side by side on the base dashboard, plus canceled
  count.
- Weekly scoreboard: change-failure-rate (merged PRs later reverted/hotfixed),
  MTTR, and rework rate (DORA), per repo.
- Judge-calibration follow-up: keep a small labeled set of past runs
  (hand-judged) and periodically replay the reviewer against it to measure
  false-PASS / false-FAIL rates before tightening or loosening review
  strictness (LLM reviewers systematically over-reject; arXiv 2603.00539).
