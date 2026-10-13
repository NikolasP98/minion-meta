---
id: 2026-10-13-gateway-swarm-blue-green-slots
title: Gateway Swarm blue/green slots — follow-ups
status: draft
created: 2026-10-13
updated: 2026-10-13
tags: [infra]
effort: M
repos: [minion]
refs:
  - minion PR #327 (feat/swarm-blue-green-slots)
  - minion deploy/swarm/slot-switch.sh
  - minion deploy/swarm/README.md
---

## AS-IS

`minion` PR #327 adds `deploy/swarm/slot-switch.sh`: per tenant, slot `a` is the
canonical `minion_gateway-<tenant>` service and slot `b` is `minion_gateway-<tenant>-b`,
a live-spec clone parked at 0 replicas on another image. `prepare` / `switch` /
`rollback` flip between them stop-first on the same host-mode port. Open ends as
merged:

1. **The controller/workflow caveat is documentation only.** `update-controller.sh`,
   `deploy.sh` and `.github/workflows` deploy all target the slot-`a` service names.
   While slot `b` serves traffic they would update an idle service, and
   `docker stack deploy --prune` would delete the `-b` service that is carrying
   production, because the clone inherits `com.docker.stack.namespace=minion`.
   Code anchor: `TODO(handoff)` at the top of `deploy/swarm/slot-switch.sh`.
2. **Only shim-tested.** `deploy/swarm/slot-switch.test.sh` drives PATH shims for
   `docker` and `curl`. Clone fidelity, switch order, failure restore and the lock
   refusal are covered; no run against a real Swarm (not even a single-node test
   Swarm) exists.
3. **`OWNER-RUN.sh` sits in the repo root** and is a one-off cutover script for the
   2026-10 DEV release (image revision pinned to
   `79943fd162429c5760edc7afcdd684eccce99dee`). It is not a reusable deploy entry point.
4. **`slots.json` is written but nothing reads it.** The active slot is always derived
   from live replica counts (deliberate); the journal is operator-facing only.
5. **No slot garbage collection.** A `-b` service stays forever once prepared, pinned
   to whatever image it last held.

## TO-BE

- The three slot-`a` entry points refuse to act (or re-target) when any tenant's
  active slot is not `a`, reading the same derived state `slot-switch.sh` uses.
  Invariant: no code path can update or prune a service that is not the live slot.
- A single-node Swarm smoke test proves one real `prepare` + `switch` + `rollback`
  cycle, including that the host-mode port rebinds and `/health` answers.
- Cutover sequences are generated from the tenant list rather than hand-written per
  release; `OWNER-RUN.sh` is deleted or moved under `deploy/swarm/`.
- `slot-switch.sh prune <tenant>` removes a parked slot once its image is retired.

## DELTA

| # | Change | Test proving it |
|---|---|---|
| 1 | Extract active-slot derivation into a sourceable helper; call it from `update-controller.sh`, `deploy.sh` and the deploy workflow, failing closed when the active slot is not `a` | extend `update-controller.test.sh` with a slot-b-active fixture that must refuse |
| 2 | Add an opt-in `docker swarm init` smoke script (not in CI by default) | the script itself, run by hand before the next cutover |
| 3 | Generate the cutover sequence from `MINION_SLOT_TENANTS`; drop root-level `OWNER-RUN.sh` | shim test asserting the generated order |
| 4 | `prune <tenant>` removing the idle service, refusing when it has replicas | shim test |

## Status 2026-10-13

- 14:35Z: both tenants cut over to slot `b` (DEV `79943fd`, pi 1.1.0) via `OWNER-RUN.sh`;
  slot `a` parked on the September image.
- 16:1xZ: the DEV→main promotion (`minion` PR #303 → `3289fc222`) ran
  `deploy-production.yml`, which **failed** while slot `b` was live: the workflow and
  `update-controller.sh` only know the slot-`a` service names (open end 1, now observed
  in production rather than predicted). The release was delivered by hand with
  `slot-switch.sh prepare` + `switch` back onto slot `a` for both tenants.
- Current state: both tenants active on slot `a` = main `:prd` digest `ac914bbb…`
  (rev `3289fc222`); slot `b` parked on `a5e5ad64…` (rev `79943fd`) as the rollback
  target. The controller/workflow path is usable again.
- Open ends 1–5 above are unchanged; DELTA row 1 is the one that would have turned the
  16:1xZ failure into a clear refusal message instead of a silent `bash -e` exit.
