---
id: 2026-10-22-agent-decision-and-proactivity-experiments
title: Qualify agent decision filters and durable proactive work
status: draft
created: 2026-10-22
updated: 2026-10-22
repos: [minion, minion_hub, minion-factory]
tags: [logic, test]
value: 8
effort: L
source: audits/2026-10-22-agent-use-transcripts/README.md
---

# Qualify agent decision filters and durable proactive work

The owner asked to extract practical value from the LangChain Jev harness and IndyDevDan durable news-agent transcripts. [Research and pinned source evidence](../README.md) distinguish reusable ideas, existing Minion capabilities and claims requiring experiments.

## AS-IS

Hub already batches Jev mode/manifest decisions and has mode-forced context fallback. Factory already has Jev shadow scoring and conditional guard-hook wiring. Gateway persists cron jobs and performs heartbeat preflight. Several candidate drones require summaries, rationales or evidence in addition to classifications, so a typed decision model cannot replace their entire output contract. Exact source SHAs, file anchors and snapshots are in the research evidence ledger. Production identity, live flags, prior shadow-review completion and Minion-specific accuracy/economics are not established here.

## TO-BE

Use cheaper decisions where measured task quality and total cost improve. Accepted background tasks survive client disconnects and restarts, produce one reviewable artifact per logical task and preserve current authorization. Every promotion from shadow to acting behavior requires a qualified rubric/model version and held-out evidence. Classifier outputs never grant capabilities or replace required human approval.

## DELTA

| Experiment | Proposed change | Required evidence |
|---|---|---|
| Router qualification | Extend existing task corpus with bilingual, continuation, mixed-intent and scope-change cases; prototype bounded task-state context | Baseline correctness preserved; required-context recall, p95 latency and total cost per successful task reported on holdout |
| Complaint filtering | Shadow a narrow complaint decision before the existing summary-generating drone | Severity-stratified false negatives, abstention, provider failures, fraction forwarded and full cost comparison |
| Trace screening | Deterministic checks first, asynchronous typed semantic checks second; targeted review plus random control sample | Confirmed-failure yield and missed-failure estimate; no billing or release authority |
| Feedback | Record reasoned feedback against artifact and policy revisions | Held-out utility improvement, factual-error checks, bounded weight changes and rollback |
| Proactive digest | Reuse scheduler/gateway; checkpoint collect/filter/dedupe/research/artifact phases | Crash/replay/lease/revocation tests; one visible artifact; unknown paid-call outcomes reconciled or explicitly fenced |

## Existing work and lifecycle

Router and agent-quality work belongs with `2026-10-12-hub-assistant-jev-context-router` and `2026-10-17-agent-experience-lifecycle`. Factory decision cut-overs remain with `2026-09-29-factory-jev-decision-layer`; the existing CRM shadow review remains with `2026-09-21-hub-jev-shadow-week-review`. This proposal coordinates experiments and does not replace those ledgers.

This turn completed research only. Product implementation, source TODO changes, live inference, runtime replacement, automatic labeling, billing changes, model configuration, merges and deployment are outside this completed research scope. No lifecycle stage was bypassed. Any implementation requires a spec and its reviews; security/data slices retain human approval and merge gates. Proposed experiments are unstarted, not partially wired product features.

## Definition of done

Each selected experiment publishes its exact source/model/rubric versions, labeled development and holdout sets, baseline, cost and latency denominators, failures and promotion/stop decision. A rejected experiment is a valid result. No universal autonomy percentage or vendor speed multiplier counts as a Minion acceptance criterion.
