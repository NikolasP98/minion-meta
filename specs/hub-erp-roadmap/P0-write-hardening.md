# P0 — Write-boundary hardening (minion_hub)

**Repo:** `/home/nikolas/Documents/CODE/MINION/minion_hub`, branch `dev`. Bun + SvelteKit 2 + Drizzle. zod `^4.4.3` already installed.
**Goal:** every business API write is schema-validated, audited, and safe against lost updates — because P1 will let agents write through these same endpoints.
**Do NOT:** add dependencies, run `drizzle-kit push`, create migrations, commit (orchestrator commits), touch git config, edit files outside your workstream.

**Verification (each workstream must pass before reporting done):**
```bash
cd /home/nikolas/Documents/CODE/MINION/minion_hub
bun run check        # svelte-check + tsc
bun run test         # vitest (aci-backend flake under full suite is known — rerun that file isolated if it's the only failure)
```

---

## Workstream A — zod validation at business write routes

### A.0 Shared helper (create once, in workstream A1)

Create `src/server/api/validate.ts`:

```ts
import { error } from '@sveltejs/kit';
import type { z } from 'zod';

/** Parse+validate a JSON request body. 400 with readable issues on failure. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw error(400, 'invalid JSON body');
	}
	const result = schema.safeParse(raw);
	if (!result.success) {
		const detail = result.error.issues
			.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('; ');
		throw error(400, `invalid body: ${detail}`);
	}
	return result.data;
}
```

### Rules for every route

1. Colocate schemas in the route file: `const postSchema = z.object({...})` directly above the handler.
2. **Derive the schema from what the handler already accepts** — read the existing destructuring, `as` casts, and the service function signature it calls. The schema must accept every payload the current code accepts (optional stays optional, nullable stays nullable) and reject only genuinely invalid shapes. This is a no-behavior-change refactor for valid inputs.
3. Replace `const body = await request.json(); const { x } = body as {...}` with `const { x } = await parseBody(request, postSchema)`. Delete now-redundant ad-hoc guards (`if (!name || typeof name !== 'string')`) — keep business-rule guards (existence checks, state checks).
4. Unbounded strings that hit the DB get `.max()` sanity caps (names/titles 500, free text 20_000, ids 200). JSON-ish blobs (nodes, edges, config, customFields) → `z.unknown()` or a loose `z.record(z.string(), z.unknown())` — do NOT invent deep structural schemas for them in this pass.
5. Enums: where the service defines allowed values (e.g. `ORDER_STATUSES` in sales.service.ts:11), import and use `z.enum(ORDER_STATUSES)`.
6. Skip: handlers with no JSON body (DELETE without body, formData uploads), pure proxies (`api/workforce/[...path]`), and tick/cron endpoints.
7. Don't change response shapes or status codes other than malformed-body → 400.

### A1 (agent 1): crm + finances + sales + activity + assignment
All `+server.ts` files with POST/PUT/PATCH/DELETE under:
- `src/routes/api/crm/**` (accounts, cleanup/*, contacts, contacts/[id]/*, insights/*, parties/reconcile, tags/*)
- `src/routes/api/finances/**` (products, products/[id]/deactivate, products/import, sources, sync, sync/cancel)
- `src/routes/api/sales/**` (orders/[id], orders/reconcile)
- `src/routes/api/activity/comments`
- `src/routes/api/assignment/rules`, `assignment/rules/[id]`

A1 also creates `src/server/api/validate.ts` (A.0).

### A2 (agent 2): scheduling + support + memberships + projects/work + workflow + notifications
All `+server.ts` files with POST/PUT/PATCH/DELETE under:
- `src/routes/api/scheduling/**` (bookings, bookings/[id], bookings/[id]/order, event-types, links, public/[slug]/book, reminders/config, reminders/preview, resources, resources/[id], resources/[id]/availability)
- `src/routes/api/support/**` (issues, issues/[id], settings)
- `src/routes/api/memberships/**` (root, [id], plans, plans/[id])
- `src/routes/api/projects/**`, `src/routes/api/project-tasks/[id]`, `src/routes/api/project-templates/**`, `src/routes/api/project-timesheets`, `src/routes/api/work/reassign`
- `src/routes/api/workflow/**` (apply, defs, defs/[id])
- `src/routes/api/notifications/rules`, `notifications/rules/[id]`

A2 imports `parseBody` from `$server/api/validate` (A1 creates it — if it doesn't exist yet when you start, create it with EXACTLY the A.0 content; identical duplicate creation is fine, content is deterministic).

**Special case for both:** `public/[slug]/book` is an UNAUTHENTICATED endpoint — validation here is security-relevant; be strict (email format, phone shape, bounded strings), and preserve the uid idempotency field.

---

## Workstream B — audit-log completion (agent 3, services only — do not touch route files)

Existing infrastructure to reuse (do NOT build new):
- `src/server/services/activity.service.ts:88` — `recordAudit(...)` inserts into `docAuditLog`
- `activity.service.ts:41` — `computeChanges(...)` field-diff helper
- Pattern reference: `sales.service.ts:193–201`

### B.1 Finance audit
In `src/server/services/finance.service.ts` `upsertInvoicesBatch` (lines ~38–178): after the batch upsert inside the SAME transaction, insert `docAuditLog` rows for created and updated invoices:
- `refType: 'fin_invoice'`, `refId: <invoice id>`, `op: 'create' | 'update'`, `actorId: null`, `actorName: 'connector:' + provider` (provider/source name is available from the sync context — thread it in as a new optional param on the batch fn, defaulting to `'connector'`).
- For batches, `changes` may be `[]` for creates and `[{field:'total', old, new}]`-style minimal diffs only where trivially computable from the upsert data — do NOT fetch pre-images row-by-row (defeats the batch optimization). Set-based insert of audit rows (one `insert(...).values(rows)`).
- Products import (`upsertProducts` or equivalent) gets the same treatment if it exists in this service.

### B.2 CRM contacts audit
In `src/server/services/crm-contacts.service.ts`: wire `recordAudit` into user-initiated create / update / soft-delete paths (`refType: 'crm_contact'`, real actor from ctx). Use `computeChanges` for updates where old values are already loaded (the update path loads the row — check; if it doesn't, log field names with new values only, no extra SELECT).
- Do NOT audit the bulk ledger harvest (`syncContactsFromLedger`) per-row — one summary audit row per harvest run (`op: 'create'`, `refType: 'crm_harvest'`, `refId: <run timestamp or org>`, changes `[{field:'created', new: count}]`) is enough.
- `reconcileParties` in party.service.ts: leave alone (already has its own reporting).

### B.3 Test
Add ONE vitest file `src/server/services/audit-coverage.test.ts` (or extend an existing service test) asserting: finance batch upsert writes audit rows with `actorName` starting `connector:`, and crm contact update writes a `crm_contact` audit row. Mock/in-memory pattern: follow how existing `*.service.test.ts` files in this directory stub the DB (look at `crm-finance.service.test.ts` first and copy its harness approach).

---

## Workstream C — optimistic locking (agent 4, runs AFTER A+B merge; touches services + routes + minimal UI)

Scope: the human-edited "document" modules only: **sales orders (status), support issues, proj_projects + proj_tasks, crm_contacts detail PATCH**. Not telemetry, not settings, not connector-sourced fin_ rows.

### Pattern (no migrations — use epoch-ms comparison, NOT Date equality)

⚠️ **Trap:** PG `timestamp` has microsecond precision; JS `Date` has milliseconds. Direct `eq(table.updatedAt, expected)` will false-conflict on rows whose updatedAt came from SQL `now()`. Compare at ms precision:

```ts
import { sql } from 'drizzle-orm';
// in the WHERE alongside id+org filters:
expectedUpdatedAt
	? sql`floor(extract(epoch from ${table.updatedAt}) * 1000) = ${expectedUpdatedAt.getTime()}`
	: undefined
```

1. **Services:** update functions accept optional `expectedUpdatedAt?: Date`. Add the condition to the UPDATE's WHERE. If provided and 0 rows updated: first check the row still exists (cheap SELECT by id) — if it exists, throw `new StaleWriteError(current)` (define in `src/server/services/errors.ts`: carries the current row); if not, keep existing not-found behavior.
2. **Routes:** the PATCH schemas from workstream A gain optional `expectedUpdatedAt: z.coerce.date().optional()`. Catch `StaleWriteError` → `return json({ error: 'stale', current: e.current }, { status: 409 })`.
3. **UI (minimal):** only where the page already holds the record with `updatedAt` in loaded data: CRM contact detail save path, support issue detail, sales order status change, project task edit. Send `expectedUpdatedAt`; on 409 show existing toast mechanism with "Record was changed by someone else — refreshed" and `invalidateAll()` (or the page's existing refetch). Find the fetch call sites with `grep -rn "method: 'PATCH'" src/lib src/routes/(app)` scoped to those modules. If a page doesn't have updatedAt in its data, SKIP it (do not rewire loads).
4. i18n: any new user-facing string goes through paraglide (`m.…()`); add keys to both `en` and `es`, then run `bun run i18n:compile`.
5. **Test:** one vitest covering: stale expectedUpdatedAt → StaleWriteError; matching → update succeeds; omitted → update succeeds (backward compat).

---

## Sequencing
Wave 1 (parallel): A1, A2, B — disjoint files.
Wave 2: C (needs A's schemas in place).
Orchestrator: run full verification, fix stragglers, single commit to `dev`.
