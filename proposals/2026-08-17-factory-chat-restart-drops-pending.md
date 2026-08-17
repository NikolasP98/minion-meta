---
id: 2026-08-17-factory-chat-restart-drops-pending
title: Runner restart marks never-dispatched chat messages as errored
status: in-spec
spawned_spec: 2026-08-17-factory-chat-restart-drops-pending-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [logic, data]
value: 4
effort: S
source: debt-sweep-2-2026-08-17
---

# Runner restart marks never-dispatched chat messages as errored

## Problem

runner/src/index.ts restart recovery errors ALL pending messages; backlogged-but-never-started user input is dropped.

## Definition of done

Distinct dispatched state; restart only errors in-flight turns; backlogged messages survive and process.

## Out of scope

Chat UX.
