---
id: 2026-08-17-factory-providers-put-harness-check
title: PUT /providers accepts provider names no harness implements
status: done
spawned_spec: 2026-08-17-factory-providers-put-harness-check-spec
created: 2026-08-17
updated: 2026-08-28
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

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
ADDRESSED: providers.ts:57-65 rejects unimplemented harness names + coverage check; PUT /providers 400s pre-save; harness-drift.test.ts fails closed against run.sh/spec.sh dispatch arms.
