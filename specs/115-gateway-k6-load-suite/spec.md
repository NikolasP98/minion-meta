# Feature Specification: Gateway k6 load-testing suite

**Feature Branch**: `test/gateway-k6-load-suite` (repo `minion`, PR base `DEV`)

**Created**: 2026-11-14

**Status**: Draft

**Tags**: infra, test — not security/data (no auth, tenancy, or production data change)

**Input**: Owner request: "I need you to create and run a k6 load testing suite for MINION (gw)."

## AS-IS (evidence at `minion` `origin/DEV` `533616ce95a`)

- The gateway repo has no load or performance test. `grep -rIl k6` over the repo (excluding
  `node_modules`) matches nothing relevant; `test/` holds unit, e2e and live suites only.
- Capacity of the surfaces every frontend depends on is unmeasured:
  - Liveness probe `GET /health` — `src/gateway/server-core/server-http.ts:686`.
  - WebSocket handshake: server sends `connect.challenge` on open
    (`src/gateway/server/ws-connection.ts:200`), client answers with a `connect` request
    (`ConnectParamsSchema`, `src/gateway/protocol/schema/frames.ts`), server replies `hello-ok`.
    Handshake deadline 10 s (`server-core/server-constants.ts:23`).
  - RPC request/response over the open socket, gated per method by scope
    (`src/gateway/server-core/server-methods.ts:99` `READ_METHODS`).
- The one known capacity defect was found in production, not by a test: the hub opens one
  WebSocket per RPC, each connection reloaded config and recompiled plugin schemas, and the
  process ran out of memory (meta spec 046, memory note 2026-11-01). Nothing in the repo would
  catch a regression of that shape.
- The full gateway unit suite overloads the owner's workstation (owner instruction
  2026-07-10), so any new test tooling must bound its own load.
- A connection that presents the shared token but no device identity has its scopes cleared
  (`message-handler.ts:559-563`), so it cannot call read methods. The exception is the control-UI
  client id with `gateway.controlUi.dangerouslyDisableDeviceAuth` (`message-handler.ts:429-431`).

## TO-BE

A developer runs one command in the gateway repo and gets pass/fail plus numbers for how the
gateway behaves under connection and request load, measured against a throwaway gateway on
their own machine. Invariants:

- **I1 — never production by accident.** The suite refuses any target that is not loopback
  unless the caller sets an explicit override.
- **I2 — isolated state.** The default run starts its own gateway with a temporary home and
  state directory, a random token, and channels disabled, then removes it. It never reads or
  writes the developer's real gateway config, sessions, or credentials.
- **I3 — bounded load.** Default virtual-user and rate ceilings are low enough to run on a
  22-core / 22 GB workstation alongside normal work; raising them is an explicit opt-in.
- **I4 — no model spend.** No scenario triggers an LLM call or a channel send.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Smoke check that the suite and gateway work (Priority: P1)

A developer runs the suite's smoke profile and, within about a minute, sees that the health
probe, the handshake and one read RPC all succeed against a freshly started local gateway.

**Why this priority**: Proves the harness itself (boot, auth, protocol frames) before any
number it produces can be trusted.

**Independent Test**: Run the smoke profile on a clean checkout with a built gateway; exit
code 0 and every check passing.

**Acceptance Scenarios**:

1. **Given** a built gateway, **When** the smoke profile runs, **Then** it starts an isolated
   gateway, all checks pass, the gateway is stopped, and its temporary directory is removed.
2. **Given** a target URL that is not loopback and no override, **When** any profile runs,
   **Then** it exits non-zero before sending a single request and says why.

---

### User Story 2 - Measure connection churn (Priority: P1)

A developer measures how fast the gateway completes the full connect → handshake → one RPC →
close cycle at a steady arrival rate — the hub's real traffic shape — and whether gateway
memory keeps growing while it does.

**Why this priority**: This is the shape that caused the production out-of-memory incident.

**Independent Test**: Run the churn profile; the summary reports handshake latency
percentiles, failure rate, and gateway resident memory before and after.

**Acceptance Scenarios**:

1. **Given** the isolated gateway, **When** the churn profile runs, **Then** handshake
   failure rate and latency percentiles are reported and compared to thresholds.
2. **Given** the churn profile finished, **When** the summary is written, **Then** it includes
   the gateway's resident memory at start and end of the run.

---

### User Story 3 - Measure steady RPC and probe latency (Priority: P2)

A developer measures read-RPC latency over long-lived connections and the health probe's
latency under concurrent load.

**Independent Test**: Run the RPC and health profiles; each reports latency percentiles and
error rate against thresholds.

**Acceptance Scenarios**:

1. **Given** N long-lived connections, **When** each sends read RPCs at a fixed pace,
   **Then** response latency percentiles and error rate are reported.
2. **Given** concurrent probe requests, **When** the health profile runs, **Then** every
   response is successful and p95 latency is reported.

---

### User Story 4 - Short soak (Priority: P3)

A developer holds a set of idle-ish connections open for several minutes with light RPC
traffic to see whether connections drop or memory climbs.

**Independent Test**: Run the soak profile; no unexpected disconnects, memory delta reported.

**Acceptance Scenarios**:

1. **Given** held connections, **When** the soak window ends, **Then** the number of
   unexpected closes is zero and the memory delta is reported.

### Edge Cases

- Gateway is not built → the runner exits with a clear message naming the build command.
- Gateway fails to listen within the start timeout → runner prints the gateway log tail and
  exits non-zero; no orphan process remains.
- The load tool is not installed → runner exits with the install hint.
- Run is interrupted (Ctrl-C) → the isolated gateway is still stopped and its directory removed.
- A threshold is breached → non-zero exit, summary still written.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The suite MUST provide five profiles: smoke, health, churn, rpc, soak.
- **FR-002**: One runner command MUST start an isolated gateway (I2), wait for it to listen,
  run the chosen profile(s), stop the gateway, and clean up — including on failure or interrupt.
- **FR-003**: The suite MUST refuse non-loopback targets unless an explicit override is set (I1).
- **FR-004**: Each profile MUST declare pass/fail thresholds and exit non-zero when one is breached.
- **FR-005**: Default load MUST stay within the ceilings in I3; ceilings are overridable by
  environment variables.
- **FR-006**: Each run MUST write a machine-readable summary per profile, and the runner MUST
  record the gateway's resident memory before and after each profile.
- **FR-007**: No profile may call a method that reaches a model provider or a channel (I4).
- **FR-008**: The suite MUST exercise the real protocol: wait for the challenge, send
  `connect`, require `hello-ok`, then send `req` frames and match `res` frames by id.
- **FR-009**: The repo MUST document how to run the suite and record the first baseline
  (date, commit, machine, numbers).
- **FR-010**: The suite MUST NOT be wired into the default unit-test command or CI in this slice.

### Key Entities

- **Profile**: a named load shape (who connects, how fast, for how long) with thresholds.
- **Run summary**: per-profile metrics file plus gateway memory before/after.
- **Baseline**: the first recorded run, the reference for later comparisons.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | no load tests → five profiles exist under the gateway repo's test tree | smoke profile exits 0 (US1.1) |
| D2 | unmeasured → baseline numbers recorded for health, handshake, RPC, churn, soak | committed baseline file with commit + date |
| D3 | no guard → non-loopback target refused | run with a non-loopback URL exits non-zero before any request (US1.2) |
| D4 | no cleanup contract → isolated gateway always removed | after a run, no gateway process on the test port and no temp dir |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer goes from a built checkout to a pass/fail smoke result with one
  command in under 90 seconds.
- **SC-002**: The full default suite completes in under 10 minutes and the workstation stays
  usable throughout (no swap storm, no crashed sessions).
- **SC-003**: A baseline with latency percentiles, failure rates and memory deltas for all
  five profiles exists in the repo.
- **SC-004**: Zero requests leave the machine during a default run.

## Assumptions

- The measured target is a local build of the gateway with channels, browser control and
  canvas host disabled; numbers are a regression reference for this machine, not a production
  capacity claim.
- Read RPCs are exercised through the control-UI client id with device auth disabled in the
  throwaway gateway's config only — the same shared-token path the hub uses; device-signed
  connects are out of scope.
- Out of scope: production or staging load, model-backed chat, channel delivery, CI wiring,
  multi-tenant JWT connects, dashboards.
- Not on the meta board: no top-level stub spec is added (test infrastructure, single slice).

## Results (2026-11-14)

Gateway commit `ebb4c6f37d6` (branch `test/gateway-k6-load-suite`). Numbers and the full
baseline table: `test/load/README.md` in the gateway repo.

- **Scope change during the run (owner):** the stress test was moved to the netcup host. That
  host runs only the two live gateways, so the owner chose a throwaway replica (same image as
  `minion_gateway-default`, no network, 2 CPUs / 2.5 GB) over loading production. FR-002/I2
  hold for both runners; the replica runner lives in `test/load/replica/`.
- **All five profiles passed on both targets**: zero failed requests, handshakes or RPCs, zero
  dropped connections. Live gateways answered `/health` 200 before every profile and at the end.
- **`/health` memory growth (owner-flagged):** on the workstation, RSS rose 511 → 645 MB
  during a 30 s probe flood and was 439 MB after the soak. On the netcup replica, heap used
  after a forced GC was 320 MB idle, 321 MB after two floods (764,591 requests) and 322 MB
  after the whole suite; RSS 453 → 468 MB. Retained memory did not grow, so the workstation
  rise is uncollected garbage, not a leak. No code change was made for it.
- **Finding:** handshake time scales with simultaneous connects (25 at once → p95 89 ms; 50 at
  once → p95 248 ms on 2 CPUs).
- **Finding, not fixed here:** the built gateway logs `free-tier API unavailable: ENOENT …
  /db/migrations/004_free_tier_users.sql`, in the prod image too —
  `src/gateway/free-tier/db.ts:17` resolves the SQL relative to the source tree and the build
  does not ship it. Ledger: `proposals/2026-11-14-gateway-free-tier-migration-not-shipped.md`.
