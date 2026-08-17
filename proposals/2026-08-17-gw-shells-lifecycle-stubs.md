---
id: 2026-08-17-gw-shells-lifecycle-stubs
title: Finish (or explicitly retire) the shells lifecycle stubs: shells.update + wake-from-archive
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, unwired]
value: 5
effort: M
source: debt-sweep-2026-08-17
---

# Finish (or explicitly retire) the shells lifecycle stubs: shells.update + wake-from-archive

## Problem

src/gateway/server-methods/shells.ts:463 shells.update validates params then always returns UNAVAILABLE ('not yet wired', waiting on hub P4 form). src/shells/manager.ts:271 invoke() on an archived shell throws instead of the intended wake (exedev.create + restore) — comment admits the implementation was left out.

## Definition of done

Either both paths implemented (update persists; invoke wakes archived shells or returns a typed wake-required error) with unit tests, or the stubs removed/marked experimental so no client builds against methods that cannot succeed.

## Out of scope

Hub provision form UI (separate item).
