# Tasks: A run reports its real outcome

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) (pass 2). One draft PR per slice against gateway `DEV`.

## Slice 1 — in-flight record (US1; D1, D2)
- [ ] T101 Failing tests: no row without the parameter; with it, table empty after an error-reply return and a thrown failover
- [ ] T102 `recordInFlightTurn` parameter passed by the reply runner (not heartbeats) and the follow-up runner; insert moved before proactive compaction; unconditional delete in `finally`
- [ ] T103 Named vitest files, `test/ci`, `pnpm check`, `pnpm tsgo`; draft PR

## Slice 2 — one terminal event per run (US2; D3–D5) — stacked on slice 1
- [ ] T201 Failing tests: helper unit tests; flag-on attempt phases; fail-then-succeed → one `end`; single failed attempt → one `error`; throw before start → one `error`; web chat receives the retry's answer; sub-agent outcome ok
- [ ] T202 `deferRunTerminal` flag; `agent-run-terminal.ts`; five owners wrapped; CLI per-candidate emissions replaced
- [ ] T203 Gates; draft PR naming slice 1 as its base
- [ ] T204 Dev-gateway check (restart after failing turns sends no apology; forced first-attempt failure shows the answer)
