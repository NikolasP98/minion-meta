# Tasks: Stuck sends and unguarded decisions

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md). `[OWNER]` marks a human gate.

## Slice 1 — decisions (US1; D1–D3)
- [ ] T101 Failing tests: deny after approve; stale leave decision; assistant order and ticket actions refused on a disallowed jump, allowed on an open one
- [ ] T102 Deny predicate; leave compare-and-set; workflow actor on both assistant actions
- [ ] T103 Gates; draft PR

## Slice 2 — reapers (US2; D4–D6)
- [ ] T201 Failing tests: stale reminder, stale follow-up, stale emission; fresh rows untouched; late result dropped
- [ ] T202 Reminders reaper; follow-up reaper + guarded final write; emission sweep + guarded result writes
- [ ] T203 Gates; draft PR

## Slice 3 — one live emission per ticket (US3; D7) — `data`
- [ ] T301 Failing test: duplicate trigger leaves one row and rolls the number back
- [ ] T302 Migration, Drizzle index, schema test, catch branch
- [ ] T303 Gates; draft PR with the duplicate-check query
- [ ] T304 [OWNER] Run the check query, apply the migration, merge
