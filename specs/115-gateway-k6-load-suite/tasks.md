# Tasks: Gateway k6 load-testing suite

- [x] T001 Worktree `~/.cache/claude-tmp/gw-k6` from `origin/DEV`; build gateway (`pnpm build`)
- [x] T002 [US1] `test/load/gateway.k6.js`: loopback guard, connect helper (challenge → connect → hello-ok), smoke scenario
- [x] T003 [US1] `test/load/run.sh`: isolated gateway boot, wait-for-listen, trap cleanup, RSS capture, per-profile summary export
- [x] T004 [US1] Run smoke; prove guard refuses a non-loopback URL (D1, D3, D4)
- [x] T005 [US2] churn scenario + thresholds; run
- [x] T006 [US3] health + rpc scenarios + thresholds; run
- [x] T007 [US4] soak scenario; run
- [x] T008 README with knobs + baseline table from the real run (D2); `test:load` script; gitignore results
- [x] T009 Gates: `pnpm format:check` on touched files; no full test suite (owner rule)
- [ ] T010 Draft PR to `DEV`; open-items ledger for anything left
- [x] T011 [owner redirect 2026-11-14: "The stress test should be on netcup"] `test/load/replica/`: run the suite on the swarm host against a capped, network-less replica of the prod image (owner chose "Throwaway replica" over loading the live gateways); guards on live `/health` + host memory; cleanup script
- [x] T012 [owner: "/health memory growth"] Measure retained heap (forced GC over the inspector) across two `/health` floods on the replica — see spec §Results
