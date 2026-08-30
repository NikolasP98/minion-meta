---
id: 2026-08-17-factory-orchestration-tests
title: Factory first-party test suite — queue, lifecycle, automerge, classification
status: done
created: 2026-08-17
updated: 2026-08-28
spawned_spec: 2026-08-18-factory-orchestration-tests-spec
repos: [minion-factory]
tags: [test]
source: audit-2026-08-17
value: high
---

# The factory has no test suite

Audit 2026-08-17 priority #4. The runner orchestrates merges and credentials
with zero first-party CI: queue recovery (adoptOrphans), finish() result
classification, lifecycle transition guards, auto-merge eligibility (head-SHA
binding, check requirements, tag policy), stage normalization and provider
tier resolution are all untested.

**Definition of done:** vitest (or node:test) suite covering: finish() status
matrix (exit/testExit combinations incl. canceled), automerge eligibility
table (zero checks, pending checks, bad conclusion, sha mismatch, high-stakes
tags, contradictory tags), lifecycle TRANSITIONS incl. reason requirements and
whitespace collapsing, requeue lineage (requeue_of, branch COALESCE), and
promoteSweep eligibility (untagged fails closed, security/data excluded).
Wired into a CI workflow on minion-factory main.

**Out of scope:** end-to-end container tests — pure-function and sqlite-level
coverage only.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Spec shipped (~890-test suite, single npm test, CI wired).
