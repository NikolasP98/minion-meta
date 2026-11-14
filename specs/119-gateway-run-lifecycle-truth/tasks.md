# Tasks: A run reports its real outcome

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md). One draft PR per slice against gateway `DEV`.

## Slice 1 — in-flight record (US1; D1, D2)
- [ ] T101 Failing tests: table empty after an error-reply return, a thrown failover, a cache hit; stale row dropped at drain
- [ ] T102 Move the insert; unconditional delete in `finally`; drain staleness filter
- [ ] T103 Named vitest files, `test/ci`, `pnpm check`, `pnpm tsgo`; draft PR

## Slice 2 — one terminal event per run (US2; D3–D5)
- [ ] T201 Trace every caller of `runEmbeddedPiAgent` / `runCliAgent` and every consumer of lifecycle phases (gateway and hub); stop and report if one cannot be wrapped
- [ ] T202 Failing tests: helper unit test; fail-then-succeed → one `end`; all fail → one `error`; throw before start → one `error`; web chat receives the retry's answer; sub-agent outcome ok
- [ ] T203 Attempt phases renamed; helper; owners wrapped; CLI per-candidate emissions removed
- [ ] T204 Gates; draft PR
- [ ] T205 Dev-gateway check of SC-002 and a forced first-attempt failure in web chat
