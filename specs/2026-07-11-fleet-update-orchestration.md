# Fleet Update Orchestration — drain-aware sequential rollout

**Date:** 2026-07-11
**Status:** Spec (approved pattern: drain → update → verify, least-connections first)
**Builds on:** `specs/2026-07-10-per-org-volume-tenancy.md` (per-org instances live in prod: minion-1/minion-2), `specs/2026-07-10-gateway-update-system.md` (per-instance update.run + watchdog + hub progress bar — all proven).

## 1. User story

> "update triggered → accepted: choose a target gw, relocate all active connections to a stable gw instance; optimally update all gw instances without active connections first → sequential updates → complete: active hub connections migrate."

## 2. Best-practice mapping (and where the proposal is adjusted)

Standard rolling-deploy pattern (nginx/HAProxy/k8s): **drain → update → health-gate → next**, canary first, connections told to reconnect via GOAWAY/close-1001; session state external so any healthy backend can serve the reconnect.

Adjustments forced by MINION's architecture:

| Proposal element | Verdict | Reality |
|---|---|---|
| Relocate active connections | **Partial** | Only the hub WS surface is relocatable. Channel connections (Baileys/Telegram) are single-owner per org-volume — never movable. And org data lives only on its org's instance, so an org-pinned browser session cannot be served by another instance; it gets the graceful amber reconnect (seconds, already shipped). Org-agnostic/admin sessions CAN hop. |
| Update no-connection instances first | **Adopt** | Least-connections-first ordering. Gateway reports live WS count in `update.status`. |
| LB prefers newer versions | **Invert** | Canary-correct rollout wants FEW users on new code until verified. Completion = whole fleet on target; hub routing (our effective LB) then reconnects everyone naturally. Version-aware placement = Phase-2 paperclip scheduler. |
| Spare instances for juggling | **Defer** | A standby can't own channels (single-owner). Useful later for cross-node lease handoff (Phase 2). |

## 3. Design

### 3.1 Gateway additions (small)

1. `update.status` payload gains `connections: <live operator WS count>` and `draining: boolean`.
2. New broadcast event **`update.migrating`** `{ version, reason: "fleet-update" }` — emitted when an instance is told to drain: connected hub clients get an explicit early warning BEFORE the restart (today they only learn at the WS drop).
3. `update.run` gains optional `drain: { graceMs?: number }`: broadcast `update.migrating`, wait `graceMs` (default 3000, cap 30000) so clients can hop/settle, then proceed with the existing install→watchdog→restart flow. No new RPC; drain is a step of run.

### 3.2 Hub orchestrator (the real new piece)

**Step-wise state machine, client-advanced** — no long-running function (Vercel 300s ceiling), no new infra:

- State row in the existing `bg_jobs` table (kind `fleet_update`): `{ target_version, instances: [{gatewayId, url, name, state: pending|draining|updating|verifying|done|failed, connections, fromVersion, toVersion, error?}], current_index, phase, started_by, updated_at }`.
- `POST /api/gateway/fleet-update` (admin-only):
  - `{action:"start"}` → snapshot fleet from `gateway` rows, query each instance's `update.status` (version, pending, connections), order **least-connections first, ties by created_at** (canary = first), persist job. Refuses if a fleet job is already active.
  - `{action:"advance"}` → execute exactly ONE step of the current instance (drain+run with `drain.graceMs`, then poll-verify up to ~240s: `current === target` and reachable) and persist. Returns the job.
  - `{action:"status"}` / `{action:"abort"}` → read / mark aborted (abort stops BEFORE the next instance; an in-flight instance finishes its own watchdog-guarded update).
- Per-instance failure policy: **stop the rollout** (watchdog already rolled the instance back); job marked failed with the error. No auto-retry — a failed canary must be a human decision, that's the point of canary.

### 3.3 Hub UI (Servers page, admin)

- "Update fleet" button when ≥1 instance has pending: shows plan (ordered list w/ connection counts), starts the job, then drives `advance` sequentially while the page is open (each advance ≤ one instance; page close = job pauses safely, resumable).
- Fleet progress: `k/N instances` bar + per-instance stage chips reusing the existing per-instance progress states. Complete = all on target.

### 3.4 Connection migration on the client

On `update.migrating` received by a hub session:
- If the session's active org is assigned to a DIFFERENT healthy instance (stale manual pick, admin browsing) → switch host immediately (reuse `applyOrgAssignedHost` / session-pick logic from round 3).
- Else (org lives on the updating instance) → arm the expected-restart state NOW (amber banner + bar at `restarting` when the drop comes) — no red, no surprise.

### 3.5 Out of scope (recorded)

- True zero-blip for org-pinned sessions (needs multi-instance-per-org = Phase-2 lease world).
- Version-aware LB placement, spare instances, paperclip-driven scheduling (Phase 2; `environments`/`environment_leases` are the landing zone).
- Channel-connection relocation (protocol-impossible).

## 4. Verification plan

Gateway: focused vitest (drain param ordering: migrating → grace → install; connections count in status). Hub: service tests for ordering + step transitions + failure-stops-rollout; `bun run check`. E2E on prod: publish → fleet-update from hub → observe order (fewest-connections canary first), migrating events, per-instance watchdog ok, fleet completes; failure path exercised by aborting after canary.
