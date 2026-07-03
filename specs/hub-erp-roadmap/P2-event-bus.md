# P2 — PG event bus (LISTEN/NOTIFY)

**Repos:** minion_hub (`dev`) + `langgraph-server/` (meta-repo root — the netcup flows-runner, systemd `minion-flows-runner.service`, run via `tsx src/flow/server.ts`).
**Goal:** transactional domain events (`pg_notify` on commit) with a long-lived listener in the flows-runner that calls back into hub HTTP handlers. Cron ticks remain the durability fallback — NOTIFY is fire-and-forget by design; do NOT build an outbox table in v1.

## Facts (verified)
- Hub PG client: postgres-js, `SUPABASE_DB_URL` (pooled, `prepare:false`, max 20) — `src/server/db/pg-client.ts`.
- ⚠️ **LISTEN does not work through Supabase's transaction-mode pooler (pgbouncer, port 6543).** The listener needs a NEW env var `SUPABASE_DB_DIRECT_URL` (direct 5432 / session-mode connection). Fail fast with a clear error if unset.
- `pg_notify` fired inside a transaction is delivered only on COMMIT — so emitting inside `withOrgCore` is correct and gives exactly-on-commit semantics.
- Runner already auths to hub: `HUB_URL` + `HUB_API_TOKEN` bearer → `/api/internal/flows/[id]` (`langgraph-server/src/flow/server.ts:63–67`). Reuse this exact mechanism for the callback endpoint; replicate however `/api/internal/*` routes are allowlisted/authed in `hooks.server.ts`.
- NOTIFY payload limit is 8000 bytes — send ids + counts, never full rows.

## W1 — hub side (minion_hub)

1. **Emitter** `src/server/events/emit.ts`:
```ts
export type HubEvent =
	| { type: 'finance.invoices_upserted'; orgId: string; created: number; updated: number }
	| { type: 'booking.created'; orgId: string; bookingId: string }
	| { type: 'ticket.status_changed'; orgId: string; issueId: string; old: string; new: string };

/** Emit inside an open tx — PG delivers on commit. Payload must stay small (<8KB). */
export async function emitHubEvent(tx: TxLike, event: HubEvent) {
	await tx.execute(sql`select pg_notify('hub_events', ${JSON.stringify(event)})`);
}
```
Call sites (inside the existing transactions, after the writes):
- `finance.service.ts` `upsertInvoicesBatch` → `finance.invoices_upserted` (one per batch)
- `scheduling-bookings.service.ts` `createBooking` → `booking.created` (only when a row was actually inserted — respect the onConflictDoNothing idempotency)
- `support.service.ts` status-change path → `ticket.status_changed`

2. **Handler endpoint** `src/routes/api/internal/events/handle/+server.ts` (POST, bearer `HUB_API_TOKEN`, same auth pattern as the other `/api/internal/*` routes; body = HubEvent, validated with zod via `parseBody`):
- `finance.invoices_upserted` → `bustFinanceCache(ctx)` (keep the existing direct call in finance-sync too — belt and braces).
- `booking.created` → run the notification-rules path for booking notifications if a matching org rule exists (reuse notifications service; do NOT invent a new rules engine — if the current service only supports its cron shapes, enqueue into the same table the tick drains, so delivery is instant-enqueued + cron-delivered).
- `ticket.status_changed` → same treatment (notify assignee if a rule exists).
- Unknown type → 200 with `{ignored:true}` (forward compat).
Handler must be idempotent — the runner may redeliver on reconnect.

3. Tests: emitter serializes + fires pg_notify (mock tx); handler rejects bad bearer, ignores unknown types, routes a known type to the right service (spy).

## W2 — listener (langgraph-server)

1. Add dependency `postgres` (postgres-js — same lib the hub uses; runner is private, one dep is fine).
2. `src/flow/hub-events.ts`:
- Connect with `postgres(process.env.SUPABASE_DB_DIRECT_URL, { max: 1 })`; `sql.listen('hub_events', onEvent, onListenReady)`.
- `onEvent`: parse JSON (try/catch — never crash the listener), POST to `${HUB_URL}/api/internal/events/handle` with the `HUB_API_TOKEN` bearer; log failures, no retry loop (cron is the fallback).
- Reconnect with exponential backoff (1s→30s cap) on connection error; log state transitions.
- If `SUPABASE_DB_DIRECT_URL` is unset: log one warning and return (runner still works without the bus).
3. Wire `startHubEventListener()` from `src/flow/server.ts` startup.
4. Test: parse/dispatch unit test with a stubbed fetch; no live-PG test.

## Explicitly deferred
- Flow trigger types `hub:*` (lands with agentic flows in P1-follow-up/P5-adjacent work — the listener's `onEvent` is the hook point, leave a `// hub:* flow triggers hook here` comment).
- Outbox/durable delivery, event replay, CRM revenue rollups.

## Ops note (orchestrator/user, not agents)
Netcup needs `SUPABASE_DB_DIRECT_URL` added to the runner's `.env` + `systemctl restart minion-flows-runner` after deploy (scp). Orchestrator asks the user before touching the server.
