# Hub WS failover: make-before-break cutover + eager reconnect

**Date:** 2026-07-11
**Status:** Spec approved for implementation (sonnet subagents)
**Builds on:** `specs/2026-07-11-fleet-update-orchestration.md` (drain → update → verify live in prod), staged-release layout (`minion/src/infra/update-staged.ts` — install no longer disturbs the running process).

## 1. Problem (user report, verbatim)

> "the connection drain and auto-reroute active connections to a stable/online server is still flakey. The reconnection should be immediate; recon how the hub creates ws connections with the server and find a standard practice to handle this; for example, currently there's a single socket connection, but it might help to have a backup socket for these scenarios:
> - trigger update -> drain
> - drain connects the backup socket to a stable server
> - cutover from from main socket to backup socket (backup socket becomes the new main)
> - once all connections cut-over, proceed with the update's disruptive step; during package install, the server might still be running the prev version so use this step to run and verify the drain step, and cutover before impacting/restarting/killing the server)"

## 2. Recon findings (why it's flakey today)

| # | Finding | Where |
|---|---|---|
| R1 | Single `GatewayClient` per session, `autoReconnect: true`, exponential backoff **800ms × 1.7 capped at 15 s**, reset only on successful connect. After a restart drop the next attempt can lag up to 15 s past the moment the gateway is back listening. Perceived gap = boot time (5–15 s) + backoff overshoot (0–15 s). | `packages/shared/src/gateway/client.ts:61,166,277,288-296` (`scheduleReconnect`) |
| R2 | Deliberate restarts (update.run, config-restart) kill the process without closing operator sockets gracefully → clients see **1006 abnormal closure**, indistinguishable from an outage. The standard WS close code for this is **1012 Service Restart** (RFC 6455 registry) — clients that receive it know to reconnect promptly to the same endpoint. | gateway `src/infra/restart.ts` (SIGUSR1 restart path); no close pass exists |
| R3 | The existing `update.migrating` hop (org assigned to a different healthy instance) is **break-before-make**: `wsDisconnect(); void wsConnect();` — visible disconnected blip even though the old socket was still perfectly serviceable during the drain window. | `minion_hub/src/lib/services/gateway.svelte.ts:638-660` |
| R4 | The drain window is now WIDE: with the staged installer, the old process keeps serving through `resolve version → staged install → activate` and only dies at the restart step. `update.migrating` fires at drain start, `update.progress {phase:"restarting", pct:90}` fires just before the restart. Clients get the whole install duration (typically 5–60 s) to cut over — exactly the user's step-4 insight. Nothing gateway-side needs to move; the events already bracket the window. | gateway `src/gateway/server-methods/update.ts` |
| R5 | Which sessions CAN cut over: only sessions whose org is served by a different healthy instance (stale manual pick, admin browsing). Org-pinned sessions (org data lives only on the updating instance's volume) have nowhere to go — for them "immediate" means reconnect-on-first-listen after the restart. Both paths must be handled. | `specs/2026-07-11-fleet-update-orchestration.md` §2 |
| R6 | `@minion-stack/shared` is a **published npm package** (hub pins `^0.9.0`); changes to it ride the changesets release train (slow). The hub, however, fully owns the client instance lifecycle (`setClient/getClient`, recreates clients freely for JWT fallback) — an eager reconnect driver can live entirely hub-side with zero shared-package changes. | hub `package.json:23`, `gateway.svelte.ts` |

## 3. Design

Standard practices adopted: **make-before-break** (connection draining as done by LBs/HTTP-2 GOAWAY: establish replacement, cut over, then let the old die) and **1012 Service Restart** close semantics + **flat fast retry** during announced restart windows (instead of exponential backoff, which is for unknown outages).

### 3.1 Gateway (repo `minion/`, branch DEV)

**G1 — Close operator sockets with 1012 before a deliberate restart.**
In the SIGUSR1/deliberate-restart path (`src/infra/restart.ts` — `scheduleGatewaySigusr1Restart`, or the shutdown hook it triggers), immediately before process exit/restart, iterate connected operator WS clients and `ws.close(1012, "service restart")`. Best-effort with a ~250 ms flush; never block or fail the restart. This is the client's authoritative "this is a restart, come right back" signal — it covers config-restarts and manual restarts too, not just fleet updates.

Notes for implementer:
- Find where the gateway holds the live operator client set (`clients` — same set `getConnectionCount` reads, wired at `src/gateway/server.impl.ts:993`). Expose a narrow `closeAllForRestart(code, reason)` helper next to it rather than importing the set into infra code.
- 1012 must NOT be sent for crashes (nothing we can do there) — only the deliberate restart path.
- Focused tests only: extend the existing restart/update test files. **NEVER run the full suite (`pnpm test`) — it crashes the machine. Gate = `pnpm vitest run <specific files>` + `pnpm tsgo`.**

### 3.2 Hub (repo `minion_hub/`, branch dev) — all in `src/lib/services/gateway.svelte.ts` + small helpers

**H1 — Eager reconnect driver (hub-side, no shared-pkg change; per R6).**
Add a module-level eager window: `armEagerReconnect(durationMs = 180_000)`. While armed, `onClose` bypasses the shared client's exponential backoff: tear down the closed client (`close()` cancels its internal timer, `setClient(null)`) and schedule a fresh `wsConnect()` after a flat **~750 ms + 0–250 ms jitter**. Each fresh client's first attempt is immediate, so the effective probe cadence is ~1 s including handshake timeouts → reconnection lands within ~1 s of the gateway listening again.
Arm it on: (a) close code **1012**, (b) `update.migrating` non-hop path, (c) `update.progress` phase `restarting`, (d) `beginRestart()` (config-restart). Disarm on successful connect (hello) or window expiry (revert to the client's normal exponential behavior). Guard against stacking timers (single scheduled attempt at a time).

**H2 — Make-before-break cutover (`cutoverToHost`).**
New helper: build a **backup** `GatewayClient` to the target host with the same callbacks/auth flow, await its hello, and only then: swap it in as the main client (`setClient(backup)`), point `conn`/active-host state at the new host, rewire the binary (Yjs) listener onto the new socket, reload per-gateway data (same reset path a manual host switch uses today), and close the old socket last. If the backup fails to connect, keep the old socket — nothing lost; fall back to today's behavior.
Replace the `update.migrating` hop branch (R3's `wsDisconnect(); wsConnect();`) with `void cutoverToHost(assignedHost)`. The UI must never pass through a `connected=false` state on a successful cutover.
Implementation caution: the existing `onClose` handler of the OLD client will fire after the swap — fence it (client generation/identity check: ignore close events from a client that is no longer the current one) so it can't clobber `conn.connected` or trigger a spurious reconnect. This fencing likely also simplifies H1.

**H3 — Wire the triggers.**
- `update.migrating`: if `applyOrgAssignedHost()` indicates a different healthy host → `cutoverToHost` (H2). Else → arm eager (H1) + existing amber/`beginRestart` path (unchanged).
- `onClose(1012, …)`: arm eager, keep amber (this close is by definition an expected restart — also set the expected-restart presentation state so the banner ambers even when no update flow armed it, e.g. manual gateway restart).
- Successful hello: disarm eager, existing reconnect-outcome checks unchanged.

**H4 — Tests.**
- Unit-test the eager scheduler (fake timers: closes during armed window → flat cadence + fresh connects; disarm on hello; expiry reverts).
- Unit-test cutover fencing where practical (old client's onClose after swap is a no-op).
- Gate: `bun run check` (0 errors/warnings) + `bun run vitest run <new/changed test files>`. If any user-facing strings are added, they go through Paraglide (`m.*()` + `bun run i18n:compile`).

### 3.3 Explicitly out of scope

- Shared-package (`@minion-stack/shared`) API changes — revisit only if the hub-side driver proves insufficient (would ride the changesets release train).
- Multi-instance-per-org (true zero-blip for org-pinned sessions) — Phase-2 lease world.
- A permanently-open second socket. The backup socket exists only during a cutover; an always-on spare doubles connection count for no benefit (drain windows are announced).

## 4. Expected behavior after this ships

| Scenario | Today | After |
|---|---|---|
| Fleet update, org-pinned session (e.g. FACES on minion-2) | drop at restart → up to boot+15 s reconnect lag, sometimes red | amber at drain; drop → flat ~1 s probes → reconnected within ~1 s of gateway listening |
| Fleet update, session servable elsewhere | visible disconnect + reconnect to other host | invisible cutover during the install window (connected → connected) |
| Config-save restart / manual restart | 1006 + exponential backoff | 1012 → eager reconnect, amber banner |
| Real outage (crash, network) | exponential backoff, red | unchanged (no 1012, no migrating event → normal path) |

## 5. Verification plan

Gateway: focused vitest for the 1012 close pass; `pnpm tsgo`. Hub: `bun run check` + focused vitest. E2E on prod (next drill): trigger fleet Install; observe (a) org-pinned session ambers at drain and reconnects < ~2 s after the instance is back; (b) an admin session pinned to the updating instance cuts over without ever showing disconnected; (c) `journalctl` shows 1012 closes at restart; (d) a kill -9 (crash simulation) still takes the normal red/backoff path.
