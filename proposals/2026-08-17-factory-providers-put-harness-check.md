---
id: 2026-08-17-factory-providers-put-harness-check
title: PUT /providers accepts provider names no harness implements
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [logic]
value: 4
effort: S
source: debt-sweep-2-2026-08-17
---

# PUT /providers accepts provider names no harness implements

## Problem

runner/src/index.ts provider-name regex only; a bogus provider fails deep in-container instead of 400 at config time.

## Definition of done

PUT validates names against the harness set; bogus name returns 400.

## Out of scope

Dynamic harness plugins.
