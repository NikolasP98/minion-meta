# Implementation Plan: Gateway k6 load-testing suite

**Spec**: [spec.md](spec.md) | **Date**: 2026-11-14 | **Repo**: `minion` (PR base `DEV`, per `repo-policy.yaml`)

## Summary

Add `test/load/` to the gateway repo: one k6 script with five scenarios selected by
`PROFILE`, one shared protocol helper, one bash runner that boots an isolated gateway (same
recipe as `test/gateway.multi.e2e.test.ts` `spawnGatewayInstance`) and runs k6 against it.

## Technical Context

- **Tool**: k6 ≥ 1.0 (`k6/http`, `k6/websockets`), installed by the developer; not a repo dependency.
- **Target**: `node dist/index.js gateway --port <p> --bind loopback --allow-unconfigured` with
  `HOME`, `MINION_CONFIG_PATH`, `MINION_STATE_DIR` in a `mktemp -d`, `MINION_SKIP_CHANNELS=1`,
  `MINION_SKIP_BROWSER_CONTROL_SERVER=1`, `MINION_SKIP_CANVAS_HOST=1`.
- **Auth**: config `gateway.auth = {mode: "token", token: <random>}` and
  `gateway.controlUi.dangerouslyDisableDeviceAuth = true`; k6 connects as client id
  `minion-control-ui` with `Origin: http://127.0.0.1:<port>` so read scopes survive
  (`message-handler.ts:429-431, 559-563`).
- **RPC under test**: `health` (in `READ_METHODS`; no model, no channel).
- **Memory**: runner reads `VmRSS` from `/proc/<pid>/status` before/after each profile.

## Constitution Check

| Principle | Status |
|---|---|
| I Spec before code | this directory |
| II AS-IS/TO-BE/DELTA with evidence | spec.md, anchors at `533616ce95a` |
| III Slice-scoped | one slice, one PR to `DEV`, worktree `~/.cache/claude-tmp/gw-k6` |
| IV Required build steps | none apply (no UI, route, string) |
| V Security/data gates | not tagged; the device-auth bypass lives only in a temp config the runner writes and deletes |

## Files (gateway repo)

```
test/load/gateway.k6.js   # scenarios + thresholds, PROFILE switch, loopback guard
test/load/run.sh          # boot isolated gateway → k6 per profile → RSS → cleanup (trap)
test/load/README.md       # how to run, knobs, baseline table
package.json              # "test:load": "bash test/load/run.sh"
.gitignore                # test/load/results/
```

## Profiles (defaults; every number overridable by env)

| Profile | Shape | Thresholds |
|---|---|---|
| smoke | 1 VU, 5 iterations: `/health` + connect + `health` RPC | checks 100 % |
| health | 20 VUs, 30 s, `GET /health` | failed < 1 %, p95 < 100 ms |
| churn | constant arrival 20 conn/s, 60 s: connect → hello-ok → 1 RPC → close | handshake fail < 1 %, handshake p95 < 500 ms |
| rpc | 25 VUs, 60 s, long-lived socket, 1 RPC / 200 ms | rpc errors < 1 %, rpc p95 < 250 ms |
| soak | 50 held sockets, 5 min, 1 RPC / 5 s | unexpected closes = 0, rpc p95 < 250 ms |

Thresholds are starting guesses; the first run sets the baseline and they are tightened or
relaxed to it in the same PR.

## Self-check

The smoke profile is the harness's own test (protocol frames, auth, guard). The loopback
guard is proven by one run with `GATEWAY_URL=http://example.invalid` expecting non-zero exit.
