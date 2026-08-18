---
id: 2026-08-18-factory-topic-capability-manifest
title: Topic taxonomy + immutable execution manifest (policy resolver)
status: approved
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory, minion-meta]
tags: [logic, infra]
source: audit-2026-08-18
value: high
---

# Tags are inputs to a versioned policy resolver, never direct grants

Audit 2026-08-18: the pipeline has tags but no topic→capability policy.
Target architecture: declared topics + repo policy + deterministic changed-path
classification → immutable execution manifest → stage-specific skills/tools →
mandatory evidence → merge/deploy policy.

**Definition of done (S1):** `runner/src/topics.ts` canonical taxonomy with
aliases and deterministic path classifiers; manifest resolved at queue time
{policyVersion, declared/derived/effective topics, risk, requiredStages,
requiredEvidence}, persisted with a hash on the run; final-diff reclassification
after every push that is MONOTONIC (may add risk/gates, never remove);
commit trailers (Factory-Run/Spec-SHA/Topics/Profile) + PR labels as
projections of the DB manifest; meta templates/validators require canonical
topics and per-slice topics; regression tests for order-independence,
unknown-topic rejection, and downgrade prevention.

**Out of scope:** browser tooling (separate security-gated proposal);
GitHub App check identities (capability-separation proposal).
