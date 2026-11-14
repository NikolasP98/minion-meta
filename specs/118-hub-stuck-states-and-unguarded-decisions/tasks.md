# Tasks: Stuck sends and unguarded decisions

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) (pass 2). `[OWNER]` marks a human gate.

## Slice 1 — decisions (US1; D1–D3)
- [ ] T101 Failing tests: deny after approve answers 409; stale leave decision; assistant order and ticket actions pass a no-role workflow actor and propagate a 409
- [ ] T102 Deny predicate + conflict error + route mapping; leave compare-and-set; workflow actor on both assistant actions
- [ ] T103 Gates; draft PR (production has no workflow defined, so the assistant change has no effect today)

## Slice 2 — sweep and guarded final writes (US2; D4–D6)
- [ ] T201 Failing tests: sweep SQL per table; tick isolation; trigger accepts the reminders reap; guarded final writes
- [ ] T202 `stale-sends.service.ts`, tick call, three guarded writes
- [ ] T203 Gates; draft PR

## Slice 3 — one live emission per ticket (US3; D6, D7) — `data`, stacked on slice 2
- [ ] T301 Failing SQL integration tests (two concurrent triggers; retry after error; late result)
- [ ] T302 Migration, Drizzle index, duplicate branch in the catch
- [ ] T303 Gates; draft PR with the duplicate-check query and "merge after slice 2"
- [ ] T304 [OWNER] Run the check query, apply the migration, merge
