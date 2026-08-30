---
id: 2026-08-17-factory-chat-restart-drops-pending
title: Runner restart marks never-dispatched chat messages as errored
status: done
spawned_spec: 2026-08-17-factory-chat-restart-drops-pending-spec
created: 2026-08-17
updated: 2026-08-28
repos: [minion-factory]
tags: [logic, data]
value: 4
effort: S
source: debt-sweep-2-2026-08-17
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# Runner restart marks never-dispatched chat messages as errored

## Problem

runner/src/index.ts restart recovery errors ALL pending messages; backlogged-but-never-started user input is dropped.

## Definition of done

Distinct dispatched state; restart only errors in-flight turns; backlogged messages survive and process.

## Out of scope

Chat UX.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Spec shipped incl. minion-base S1 (factory-chat.ts:2).
