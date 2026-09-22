---
id: 2026-09-21-hub-jev-shadow-week-review
title: Seven-day JEV shadow deployment and review
status: approved
created: 2026-09-21
updated: 2026-09-21
repos: [minion_hub, minion-meta]
tags: [crm, data, security]
effort: S
source: user-authorized-prd-shadow
review_due: 2026-09-29T03:45:46.298Z
---

# Seven-day JEV shadow deployment and review

## AS-IS

The user explicitly requested production shadow deployment, durable tracking, and a review one week later. They subsequently approved a bounded empirical experiment because the provider's tokenizer/output-cap contract is not verified. The isolated observer is deployed and running on Netcup from Hub source `0375db344fce48b48fc48eb06d3d0f2a50aa763e`, tracked by [Hub PR358](https://github.com/NikolasP98/minion_hub/pull/358). This is separate from the unreleased Hub tagging UI foundation.

The first customer inference succeeded: eight tag decisions, 1,667 input tokens, 143 output tokens, 509ms and USD 0.000071 accounted cost. Receipt, context snapshot, model version and output are stored privately. No customer-visible tags or mechanical scores changed. A read-only FACES source role cannot insert memberships, update definitions or read CRM tables directly. The existing Hub worker remains untouched.

Sampling and independent reporting run every 15 minutes; private audit backups run daily. The seven-day expiry/review checkpoint is September 28, 2026 at 22:45 Lima. The report marks review due and evaluation stops automatically. This does not schedule an autonomous agent conversation or external notification.

[Deployment evidence](../audits/2026-09-21-jev-crm-tags/shadow-deployment/README.md) records hashes, operating commands and sanitized receipts. Customer messages, identifiers, snapshots, API keys and database credentials are not in these public artifacts.

## TO-BE

At the review checkpoint, assess whether this shadow classifier merits another iteration. Report operational reliability separately from labeling quality. Never present model probabilities as ground truth. Draw an independently reviewed sample across all tags and outcome buckets, including abstentions and low probabilities; preserve the frozen snapshots and rubric used for each decision.

The pilot is capped at 100 attempts/day, USD 1/day and USD 5 total accounted exposure, 12KB requests and eight questions. Usage over 30k input/2k output, unknown spend, model drift and invalid responses halt admission. These are an authorized empirical experiment's controls, not a certified tokenizer guarantee or provider billing cap.

## DELTA and review procedure

1. Inspect the private report and ledger for source/worker uptime, no-call days, incomplete coverage, failures, unknown charges, version drift, cost and latency. Confirm customer-visible writes remain impossible at the source role and absent from worker code.
2. Label a stratified sample against frozen context. Produce expected-versus-observed matrices per tag, coverage/abstention rates, precision and recall with denominators and uncertainty. If labels or samples are insufficient, report that limitation rather than calling the model accurate.
3. Turn observed bugs into reproducible fixtures. Fix and re-run regression tests. Keep prompt revisions and thresholds versioned; this week's exposed cases become development data, not an independent holdout.
4. Decide whether to extend the shadow window, revise descriptions, or stop. Do not enable automatic labeling from this proposal. Full CRM integration and held-out threshold certification remain a separate scope.

## Lifecycle and handoff

The user's explicit PRD instruction authorized a separately identifiable shadow artifact, bypassing the usual application merge/Vercel deployment stage for this experiment only. No protected branch was merged. Source has its own draft PR and dedicated PostgreSQL/runtime CI; full app merge gates and independent review remain separate.

Open operational work: complete the seven-day review, off-host encrypted audit backup and erasure propagation. Same-host SQLite backups do not cover host loss. Matching TODO(handoff) comments live in `scripts/jev-shadow/shadow.mjs` and `worker.mjs`. Credentials and snapshots stay private on the production host; aggregate deployment receipts are safe to retain here.
