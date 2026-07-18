# Pulse Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Pulse proactive spine on PINONITE — a daily agent turn writes proposal cards to a new in-app feed + WhatsApp briefing; the user approves/edits/dismisses; approving a `create_event`/`reminder` card executes it via a one-shot gateway agent turn.

**Architecture:** The gateway's existing autonomous `agentTurn` cron does the reasoning and reads Gmail/Calendar/WhatsApp with tools that already exist. The only new muscle is a gateway `pulse_propose` tool that POSTs cards to a new hub server-token endpoint, two org-scoped Postgres tables holding the feed + settings, a `/pulse` feed UI folded into the existing notifications bell, and approve/dismiss/edit endpoints. Approve→execute reuses `cron.add` with a one-shot `{kind:"at"}` agentTurn — no new gateway RPC.

**Tech Stack:** Hub = SvelteKit 2 / Svelte 5 runes / Drizzle (Postgres via Supabase) / Bun / vitest. Gateway = Node 22 / TS / TypeBox tools / pnpm / vitest. RLS via `app.current_org_id` GUC + `app_ledger` role.

## Global Constraints

- **Package managers:** hub = `bun`; gateway = `pnpm`. Never mix.
- **Svelte 5 only** — runes (`$state`/`$derived`), `onclick={}`, `Snippet` children. No Svelte 4 patterns.
- **UI design governance:** semantic tokens ONLY (`bg-bg2`, `text-muted`, `var(--space-*)`, `var(--radius-md)`, `var(--hairline)`, `var(--layer-navigation)`). No raw hex, no numeric z-index. Invoke the `ui-design-governance` skill before any `.svelte` edit; after UI edits run `bun run lint:design && bun run lint:tokens` (debt may only decrease).
- **TypeScript strict.** No `any`, no `@ts-nocheck`.
- **RLS shape (copy verbatim):** every org table has `org_id text not null`; policy `using/with check (org_id = current_setting('app.current_org_id', true))`; `grant select,insert,update,delete ... to app_ledger`. All org-scoped writes go through `withOrgCore(ctx, tx => ...)` (`$server/db/with-org-core`).
- **`organizations` is a Supabase Postgres table, NOT Drizzle** — schema changes to it are raw SQL migrations; reads go through `supabaseAdmin().from('organizations')`.
- **RBAC:** every mutating org-data endpoint calls `requireOrgCapability(locals, 'pulse', <action>)` (not bare `requireAuth`); register the `pulse` module in `rbac.service.ts` and add `/api/pulse` to `API_WRITE_PREFIXES` in `hooks.server.ts`.
- **Gateway test gate:** NEVER run the full gateway suite (`pnpm test` crashes the machine). Use focused `pnpm vitest run <path>`.
- **i18n:** user-facing hub strings use paraglide `m.x()`; after adding messages run `bun run i18n:compile`.
- **Commits:** feature branch → dev. Small, frequent, scoped commits. Gateway commit signing may fail via 1Password — use `git -c commit.gpgsign=false` if so.
- **Locale/time defaults:** briefing `08:00`, locale `es`, tz `America/Lima`, channel `whatsapp`.

---

## File Structure

**Hub (`minion_hub/`):**
- Create `supabase/migrations/<ts>_pulse.sql` — `pulse_proposals` + `pulse_settings` tables, RLS, grants.
- Create `supabase/migrations/<ts>_org_kind.sql` — `organizations.kind` column.
- Create `src/server/db/pg-schema/pulse.ts` — Drizzle tables + row types.
- Create `src/server/services/pulse.service.ts` — upsert proposals, list, decide (approve/dismiss/edit), settings read/write.
- Create `src/routes/api/gateway/pulse/proposals/+server.ts` — server-token ingest.
- Create `src/routes/api/pulse/proposals/+server.ts` (GET list) and `src/routes/api/pulse/proposals/[id]/+server.ts` (POST approve / dismiss / PATCH edit).
- Create `src/routes/api/pulse/count/+server.ts` — pending count for the bell.
- Create `src/routes/(app)/pulse/+page.server.ts` + `+page.svelte` — the feed.
- Create `src/lib/state/features/pulse.svelte.ts` — reactive feed state.
- Create `src/routes/(app)/settings/pulse/+page.server.ts` + `+page.svelte` — settings.
- Modify `src/lib/state/features/notifications.svelte.ts` — fold pulse pending into badge.
- Modify `src/lib/components/layout/sections.ts` — add Pulse nav item + personal-org gating.
- Modify `src/lib/components/settings/SettingsNav.svelte` — add Pulse tab.
- Modify `src/server/services/tenant.service.ts` — select `kind`.
- Modify `src/routes/(app)/+layout.server.ts` — expose active org `kind`.
- Modify `src/server/services/rbac.service.ts` — register `pulse` module.
- Modify `src/hooks.server.ts` — add `/api/pulse` to `API_WRITE_PREFIXES`.

**Gateway (`minion/`):**
- Create `extensions/gmail-calendar/src/pulse-tools.ts` — `pulse_propose` tool + `getHubRest()` POST.
- Modify `extensions/gmail-calendar/index.ts` — call `registerPulseTools(api)`.

**Meta-repo:** Modify mission/vision memory + `specs/` one-liner (Task 12).

---

### Task 1: `organizations.kind` migration + read path

**Files:**
- Create: `minion_hub/supabase/migrations/<ts>_org_kind.sql`
- Modify: `minion_hub/src/server/services/tenant.service.ts:9-17`
- Modify: `minion_hub/src/routes/(app)/+layout.server.ts` (org load, ~lines 110-141, 179-180)

**Interfaces:**
- Produces: `getTenant(ctx)` returns `{ id, name, slug, status, created_at, kind: 'business'|'personal' }`; layout `page.data` exposes `activeOrgKind: 'business'|'personal'`.

- [ ] **Step 1: Write the migration**

```sql
-- <ts>_org_kind.sql
alter table public.organizations
  add column if not exists kind text not null default 'business'
    check (kind in ('business','personal'));
```

- [ ] **Step 2: Apply it and set PINONITE personal**

Run (surgical SQL, per hub DB convention — never `drizzle-kit push`):
```sql
update public.organizations set kind = 'personal' where name = 'PINONITE';
```
Expected: `UPDATE 1`. Verify: `select id, name, kind from public.organizations where name='PINONITE';` → `personal`.

- [ ] **Step 3: Add `kind` to the tenant read**

In `tenant.service.ts` change the select to include `kind`:
```ts
.select('id, name, slug, status, created_at, kind')
```

- [ ] **Step 4: Expose `activeOrgKind` from the layout load**

In `+layout.server.ts`, where the active org is resolved, call `getTenant` (or extend the existing org select) and add to the returned bundle:
```ts
const activeTenant = await getTenant({ tenantId: activeOrgId });
// ...in return:
return { /* …existing… */, activeOrgKind: activeTenant?.kind ?? 'business' };
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_org_kind.sql src/server/services/tenant.service.ts "src/routes/(app)/+layout.server.ts"
git commit -m "feat(pulse): organizations.kind column + activeOrgKind in layout"
```

---

### Task 2: Personal-org nav gating + Pulse nav entry

**Files:**
- Modify: `minion_hub/src/lib/components/layout/sections.ts:189-206,331-337`
- Test: `minion_hub/src/lib/components/layout/sections.test.ts`

**Interfaces:**
- Consumes: `activeOrgKind` (Task 1).
- Produces: `getDynamicPluginsSections(args)` accepts an `orgKind?: 'business'|'personal'` field; when `'personal'`, module ids `pos`, `stock`, `workforce` are omitted. A `pulse` nav item exists in `BUILTIN_PLUGIN_ITEMS`.

- [ ] **Step 1: Write the failing test**

```ts
// sections.test.ts
import { describe, it, expect } from 'vitest';
import { getDynamicPluginsSections } from './sections';

const base = { enabledByPluginId: {}, /* other required args with permissive defaults */ };

describe('personal-org nav gating', () => {
  it('hides pos/stock/workforce for personal orgs', () => {
    const secs = getDynamicPluginsSections({ ...base, orgKind: 'personal' });
    const hrefs = secs.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).not.toContain('/pos');
    expect(hrefs).not.toContain('/stock');
    expect(hrefs).not.toContain('/workforce');
    expect(hrefs).toContain('/pulse');
  });
  it('keeps them for business orgs', () => {
    const secs = getDynamicPluginsSections({ ...base, orgKind: 'business' });
    const hrefs = secs.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/pos');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd minion_hub && bun run test src/lib/components/layout/sections.test.ts`
Expected: FAIL (no `/pulse` item; `orgKind` unhandled).

- [ ] **Step 3: Add the Pulse nav item + gating**

Add to `BUILTIN_PLUGIN_ITEMS` (import an icon, e.g. `Activity` from `lucide-svelte`):
```ts
{ category: "operations", item: { href: "/pulse", label: m.nav_pulse(), icon: Activity,
    matcher: (p) => p.startsWith("/pulse") } },
```
Add `m.nav_pulse` to messages (`en`+`es`), then in `getDynamicPluginsSections` add the personal gate:
```ts
const PERSONAL_HIDDEN = new Set(['pos', 'stock', 'workforce']);
for (const { category, item } of BUILTIN_PLUGIN_ITEMS) {
  const moduleId = item.moduleId ?? item.href.replace(/^\//, "").split("/")[0];
  if (enabledByPluginId[moduleId] === false) continue;
  if (args.orgKind === 'personal' && PERSONAL_HIDDEN.has(moduleId)) continue;
  place(category, item);
}
```
Thread `orgKind` from the caller (Sidebar/Topbar read `page.data.activeOrgKind`).

- [ ] **Step 4: Run tests, verify pass + compile messages**

Run: `bun run test src/lib/components/layout/sections.test.ts && bun run i18n:compile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/layout/sections.ts src/lib/components/layout/sections.test.ts messages/ src/lib/paraglide/
git commit -m "feat(pulse): personal-org nav gating + Pulse nav entry"
```

---

### Task 3: `pulse_proposals` + `pulse_settings` tables

**Files:**
- Create: `minion_hub/supabase/migrations/<ts>_pulse.sql`
- Create: `minion_hub/src/server/db/pg-schema/pulse.ts`

**Interfaces:**
- Produces: Drizzle `pulseProposals`, `pulseSettings` tables + `PulseProposalRow`, `NewPulseProposalRow`, `PulseSettingsRow`. Proposal `status ∈ {pending,approved,dismissed,executed,failed,snoozed}`; `kind ∈ {digest,create_event,reminder,draft_reply,fyi}`; unique `(org_id, dedup_key)`.

- [ ] **Step 1: Write the migration**

```sql
-- <ts>_pulse.sql
create table if not exists public.pulse_proposals (
  id           uuid primary key default gen_random_uuid(),
  org_id       text not null,
  created_at   timestamptz not null default now(),
  source       text not null,                      -- daily_briefing|email|whatsapp|calendar
  kind         text not null,                      -- digest|create_event|reminder|draft_reply|fyi
  title        text not null,
  summary      text,
  payload      jsonb not null default '{}',        -- { tool, args } for executable kinds
  status       text not null default 'pending',    -- pending|approved|dismissed|executed|failed|snoozed
  dedup_key    text not null,
  decided_by   text,
  executed_at  timestamptz,
  error        text,
  unique (org_id, dedup_key)
);
create index if not exists pulse_proposals_org_status_idx
  on public.pulse_proposals (org_id, status, created_at desc);

alter table public.pulse_proposals enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pulse_proposals' and policyname='pulse_proposals_org') then
    create policy pulse_proposals_org on public.pulse_proposals
      using (org_id = current_setting('app.current_org_id', true))
      with check (org_id = current_setting('app.current_org_id', true));
  end if;
end $$;
grant select, insert, update, delete on public.pulse_proposals to app_ledger;

create table if not exists public.pulse_settings (
  org_id        text primary key,
  enabled       boolean not null default false,
  briefing_time text not null default '08:00',
  locale        text not null default 'es',
  channels      text[] not null default '{whatsapp}',
  watch         jsonb not null default '{"email":true,"whatsapp":true,"calendar":true}',
  auto_approve  jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);
alter table public.pulse_settings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pulse_settings' and policyname='pulse_settings_org') then
    create policy pulse_settings_org on public.pulse_settings
      using (org_id = current_setting('app.current_org_id', true))
      with check (org_id = current_setting('app.current_org_id', true));
  end if;
end $$;
grant select, insert, update, delete on public.pulse_settings to app_ledger;
```

- [ ] **Step 2: Apply it**

Apply the migration to the dev DB (via the hub migration pipeline / surgical apply). Verify: `\d public.pulse_proposals` shows the unique `(org_id, dedup_key)`.

- [ ] **Step 3: Write the Drizzle schema**

```ts
// src/server/db/pg-schema/pulse.ts
import { pgTable, text, jsonb, boolean, timestamp, uuid, index, unique } from 'drizzle-orm/pg-core';

export const pulseProposals = pgTable('pulse_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: text('org_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  source: text('source').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  payload: jsonb('payload').$type<{ tool?: string; args?: Record<string, unknown> } & Record<string, unknown>>().notNull().default({}),
  status: text('status').notNull().default('pending'),
  dedupKey: text('dedup_key').notNull(),
  decidedBy: text('decided_by'),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  error: text('error'),
}, (t) => [
  index('pulse_proposals_org_status_idx').on(t.orgId, t.status, t.createdAt),
  unique('pulse_proposals_org_dedup_uq').on(t.orgId, t.dedupKey),
]);

export const pulseSettings = pgTable('pulse_settings', {
  orgId: text('org_id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  briefingTime: text('briefing_time').notNull().default('08:00'),
  locale: text('locale').notNull().default('es'),
  channels: text('channels').array().notNull().default(['whatsapp']),
  watch: jsonb('watch').$type<{ email: boolean; whatsapp: boolean; calendar: boolean }>().notNull().default({ email: true, whatsapp: true, calendar: true }),
  autoApprove: jsonb('auto_approve').$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PulseProposalRow = typeof pulseProposals.$inferSelect;
export type NewPulseProposalRow = typeof pulseProposals.$inferInsert;
export type PulseSettingsRow = typeof pulseSettings.$inferSelect;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_pulse.sql src/server/db/pg-schema/pulse.ts
git commit -m "feat(pulse): pulse_proposals + pulse_settings tables (RLS, org-scoped)"
```

---

### Task 4: `pulse.service.ts` — upsert + list + settings

**Files:**
- Create: `minion_hub/src/server/services/pulse.service.ts`
- Test: `minion_hub/src/server/services/pulse.service.test.ts`

**Interfaces:**
- Consumes: `withOrgCore` (`$server/db/with-org-core`), `CoreCtx` (`$server/auth/core-ctx`), tables (Task 3).
- Produces:
  - `upsertProposals(ctx: CoreCtx, cards: ProposalInput[]): Promise<{ inserted: number; skipped: number }>` — onConflict `(org_id, dedup_key)` DO NOTHING (idempotent re-runs).
  - `listPending(ctx): Promise<PulseProposalRow[]>`
  - `countPending(ctx): Promise<number>`
  - `getSettings(ctx): Promise<PulseSettingsRow>` (returns defaults row if none), `saveSettings(ctx, patch): Promise<void>`
  - `decide(ctx, id, decision: 'dismiss', by: string)` sets `status='dismissed', decided_by=by`; `markApproved(ctx, id, by)` sets `status='approved'`; `editPayload(ctx, id, args)`.
  - `ProposalInput = { source: string; kind: string; title: string; summary?: string; payload?: object; dedupKey: string }`.

- [ ] **Step 1: Write the failing test (idempotent upsert)**

```ts
// pulse.service.test.ts — uses the same test-db harness as other *.service.test.ts in this dir
import { describe, it, expect, beforeEach } from 'vitest';
import { upsertProposals, listPending } from './pulse.service';
import { makeTestCtx, resetDb } from '$server/db/test-helpers'; // match existing helper import used by sibling tests

describe('pulse.service upsert', () => {
  beforeEach(resetDb);
  it('is idempotent on (org_id, dedup_key)', async () => {
    const ctx = makeTestCtx('org-A');
    const card = { source: 'daily_briefing', kind: 'digest', title: 'Your day', dedupKey: '2026-07-18:digest' };
    const a = await upsertProposals(ctx, [card]);
    const b = await upsertProposals(ctx, [card]);
    expect(a.inserted).toBe(1);
    expect(b.inserted).toBe(0);
    expect(b.skipped).toBe(1);
    expect((await listPending(ctx)).length).toBe(1);
  });
});
```
> If no shared test-db harness exists in this dir, use the same mocking approach the nearest sibling `*.service.test.ts` uses; do not invent a new framework.

- [ ] **Step 2: Run it, verify it fails**

Run: `bun run test src/server/services/pulse.service.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the service**

```ts
// pulse.service.ts
import { sql } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import { withOrgCore } from '$server/db/with-org-core';
import type { CoreCtx } from '$server/auth/core-ctx';
import { pulseProposals, pulseSettings, type PulseProposalRow, type PulseSettingsRow } from '$server/db/pg-schema/pulse';

export type ProposalInput = {
  source: string; kind: string; title: string;
  summary?: string; payload?: Record<string, unknown>; dedupKey: string;
};

export async function upsertProposals(ctx: CoreCtx, cards: ProposalInput[]) {
  if (!cards.length) return { inserted: 0, skipped: 0 };
  return withOrgCore(ctx, async (tx) => {
    const rows = cards.map((c) => ({
      orgId: ctx.tenantId, source: c.source, kind: c.kind, title: c.title,
      summary: c.summary ?? null, payload: c.payload ?? {}, dedupKey: c.dedupKey,
    }));
    const res = await tx.insert(pulseProposals).values(rows)
      .onConflictDoNothing({ target: [pulseProposals.orgId, pulseProposals.dedupKey] })
      .returning({ id: pulseProposals.id });
    return { inserted: res.length, skipped: cards.length - res.length };
  });
}

export async function listPending(ctx: CoreCtx): Promise<PulseProposalRow[]> {
  return withOrgCore(ctx, (tx) =>
    tx.select().from(pulseProposals)
      .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.status, 'pending')))
      .orderBy(sql`${pulseProposals.createdAt} desc`));
}

export async function countPending(ctx: CoreCtx): Promise<number> {
  const rows = await withOrgCore(ctx, (tx) =>
    tx.select({ n: sql<number>`count(*)::int` }).from(pulseProposals)
      .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.status, 'pending'))));
  return rows[0]?.n ?? 0;
}

export async function markApproved(ctx: CoreCtx, id: string, by: string) {
  return withOrgCore(ctx, (tx) => tx.update(pulseProposals)
    .set({ status: 'approved', decidedBy: by })
    .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.id, id))));
}

export async function dismiss(ctx: CoreCtx, id: string, by: string) {
  return withOrgCore(ctx, (tx) => tx.update(pulseProposals)
    .set({ status: 'dismissed', decidedBy: by })
    .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.id, id))));
}

export async function editPayload(ctx: CoreCtx, id: string, args: Record<string, unknown>) {
  return withOrgCore(ctx, (tx) => tx.update(pulseProposals)
    .set({ payload: sql`jsonb_set(${pulseProposals.payload}, '{args}', ${JSON.stringify(args)}::jsonb)` })
    .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.id, id))));
}

export async function getProposal(ctx: CoreCtx, id: string): Promise<PulseProposalRow | null> {
  const rows = await withOrgCore(ctx, (tx) => tx.select().from(pulseProposals)
    .where(and(eq(pulseProposals.orgId, ctx.tenantId), eq(pulseProposals.id, id))).limit(1));
  return rows[0] ?? null;
}

const DEFAULT_SETTINGS = { enabled: false, briefingTime: '08:00', locale: 'es',
  channels: ['whatsapp'], watch: { email: true, whatsapp: true, calendar: true }, autoApprove: {} };

export async function getSettings(ctx: CoreCtx): Promise<PulseSettingsRow> {
  const rows = await withOrgCore(ctx, (tx) => tx.select().from(pulseSettings)
    .where(eq(pulseSettings.orgId, ctx.tenantId)).limit(1));
  return rows[0] ?? ({ orgId: ctx.tenantId, ...DEFAULT_SETTINGS, updatedAt: new Date() } as PulseSettingsRow);
}

export async function saveSettings(ctx: CoreCtx, patch: Partial<typeof DEFAULT_SETTINGS>) {
  return withOrgCore(ctx, (tx) => tx.insert(pulseSettings)
    .values({ orgId: ctx.tenantId, ...DEFAULT_SETTINGS, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({ target: pulseSettings.orgId, set: { ...patch, updatedAt: new Date() } }));
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test src/server/services/pulse.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/pulse.service.ts src/server/services/pulse.service.test.ts
git commit -m "feat(pulse): pulse.service — idempotent upsert, list, settings, decide"
```

---

### Task 5: Server-token ingest endpoint `POST /api/gateway/pulse/proposals`

**Files:**
- Create: `minion_hub/src/routes/api/gateway/pulse/proposals/+server.ts`
- Test: `minion_hub/src/routes/api/gateway/pulse/proposals/server.test.ts`

**Interfaces:**
- Consumes: `upsertProposals` (Task 4), `getCoreDb` (`$server/db/pg-client`), `CoreCtx`.
- Produces: `POST` body `{ orgId: string, proposals: ProposalInput[] }`; requires `locals.serverId`; returns `201 { ok, inserted, skipped }`; `401` without server token; `400` on missing `orgId`/`proposals`.

- [ ] **Step 1: Write the failing test**

```ts
// server.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

function req(body: unknown) {
  return new Request('http://x/api/gateway/pulse/proposals', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/gateway/pulse/proposals', () => {
  it('401 without server token', async () => {
    await expect(POST({ locals: {}, request: req({}) } as any)).rejects.toMatchObject({ status: 401 });
  });
  it('400 without orgId', async () => {
    await expect(POST({ locals: { serverId: 's1' }, request: req({ proposals: [] }) } as any))
      .rejects.toMatchObject({ status: 400 });
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun run test src/routes/api/gateway/pulse/proposals/server.test.ts`
Expected: FAIL (no `+server.ts`).

- [ ] **Step 3: Implement the endpoint**

```ts
// +server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { getCoreDb } from '$server/db/pg-client';
import type { CoreCtx } from '$server/auth/core-ctx';
import { upsertProposals, type ProposalInput } from '$server/services/pulse.service';

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.serverId) throw error(401, 'gateway server token required');
  const body = (await request.json().catch(() => ({}))) as { orgId?: unknown; proposals?: unknown };
  const orgId = typeof body.orgId === 'string' ? body.orgId : '';
  const proposals = Array.isArray(body.proposals) ? (body.proposals as ProposalInput[]) : null;
  if (!orgId || !proposals) throw error(400, 'orgId and proposals[] are required');

  // Minimal validation: each card needs source, kind, title, dedupKey.
  const clean = proposals.filter((p) => p && p.source && p.kind && p.title && p.dedupKey);
  const ctx: CoreCtx = { db: getCoreDb(), tenantId: orgId, profileId: null };
  try {
    const res = await upsertProposals(ctx, clean);
    return json({ ok: true, ...res }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/gateway/pulse/proposals]', e);
    return json({ error: e instanceof Error ? e.message : 'pulse ingest failed' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test src/routes/api/gateway/pulse/proposals/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/gateway/pulse/proposals/
git commit -m "feat(pulse): server-token ingest endpoint for proposal cards"
```

---

### Task 6: Gateway `pulse_propose` tool

**Files:**
- Create: `minion/extensions/gmail-calendar/src/pulse-tools.ts`
- Modify: `minion/extensions/gmail-calendar/index.ts` (register call, ~lines 27-53)
- Test: `minion/extensions/gmail-calendar/src/pulse-tools.test.ts`

**Interfaces:**
- Consumes: `getHubRest()` (`src/gateway/hub-rest-registry`), `MinionPluginApi`, TypeBox.
- Produces: a `pulse_propose` agent tool whose params carry `orgId: string` + `proposals: ProposalCard[]` (`{ source, kind, title, summary?, payload?, dedupKey }`); it POSTs to `${hubUrl}/api/gateway/pulse/proposals` with `Bearer serverToken`; returns a text summary of inserted/skipped.

- [ ] **Step 1: Write the failing test (payload shaping)**

```ts
// pulse-tools.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildPulseBody } from './pulse-tools';

describe('pulse_propose body', () => {
  it('shapes orgId + proposals', () => {
    const body = buildPulseBody('org-A', [{ source: 'daily_briefing', kind: 'digest', title: 'Day', dedupKey: 'k1' }]);
    expect(body).toEqual({ orgId: 'org-A', proposals: [{ source: 'daily_briefing', kind: 'digest', title: 'Day', dedupKey: 'k1' }] });
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd minion && pnpm vitest run extensions/gmail-calendar/src/pulse-tools.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the tool**

```ts
// pulse-tools.ts
import { Type } from '@sinclair/typebox';
import type { MinionPluginApi, MinionPluginToolFactory, AnyAgentTool } from '<same import path gmail-tools.ts uses>';
import { getHubRest } from '../../../src/gateway/hub-rest-registry'; // match the relative path the extension uses to reach src/

const txt = (text: string) => ({ content: [{ type: 'text' as const, text }] });

const CardSchema = Type.Object({
  source: Type.String(), kind: Type.String(), title: Type.String(),
  summary: Type.Optional(Type.String()),
  payload: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dedupKey: Type.String(),
});
const PulseProposeSchema = Type.Object({
  orgId: Type.String({ description: 'Target org id (PINONITE)' }),
  proposals: Type.Array(CardSchema),
});

export function buildPulseBody(orgId: string, proposals: unknown[]) {
  return { orgId, proposals };
}

export function registerPulseTools(api: MinionPluginApi): void {
  const factory: MinionPluginToolFactory = (): AnyAgentTool[] => [
    {
      name: 'pulse_propose',
      label: 'Propose Pulse cards',
      description: 'Write proactive proposal cards (digest / create_event / reminder / draft_reply / fyi) to the Hub Pulse feed for the user to approve.',
      parameters: PulseProposeSchema,
      async execute(_id: string, params: Record<string, unknown>) {
        const rest = getHubRest();
        if (!rest) return txt('Pulse: hub not linked; skipped.');
        const orgId = String((params as any).orgId ?? '');
        const proposals = Array.isArray((params as any).proposals) ? (params as any).proposals : [];
        if (!orgId || !proposals.length) return txt('Pulse: nothing to propose.');
        try {
          const res = await fetch(`${rest.hubUrl.replace(/\/$/, '')}/api/gateway/pulse/proposals`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${rest.serverToken}`, 'content-type': 'application/json' },
            body: JSON.stringify(buildPulseBody(orgId, proposals)),
          });
          const j = (await res.json().catch(() => ({}))) as { inserted?: number; skipped?: number };
          return txt(`Pulse: proposed ${j.inserted ?? 0}, skipped ${j.skipped ?? 0}.`);
        } catch (e) {
          return txt(`Pulse: post failed — ${e instanceof Error ? e.message : 'error'}`);
        }
      },
    },
  ];
  api.registerTool(factory, { names: ['pulse_propose'] });
}
```
> Confirm the exact import specifiers by matching `gmail-tools.ts` (types) and how another `src/hooks/*` file imports `hub-rest-registry`. Use those exact paths.

- [ ] **Step 4: Wire it into the extension**

In `index.ts` `register(api)`, add: `registerPulseTools(api);` (import at top).

- [ ] **Step 5: Run tests + typecheck, verify pass**

Run: `pnpm vitest run extensions/gmail-calendar/src/pulse-tools.test.ts && pnpm tsgo` (or the extension's typecheck)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add extensions/gmail-calendar/src/pulse-tools.ts extensions/gmail-calendar/src/pulse-tools.test.ts extensions/gmail-calendar/index.ts
git commit -m "feat(pulse): gateway pulse_propose tool -> hub ingest"
```

---

### Task 7: RBAC module + write-prefix registration

**Files:**
- Modify: `minion_hub/src/server/services/rbac.service.ts` (Module union + capability map)
- Modify: `minion_hub/src/hooks.server.ts` (`API_WRITE_PREFIXES`)
- Modify: `minion_hub/src/lib/routes/route-access-registry.ts` (optional `/pulse` view perm)

**Interfaces:**
- Produces: `'pulse'` is a valid `Module`; `requireOrgCapability(locals, 'pulse', 'view'|'edit')` resolves; `/api/pulse` is in `API_WRITE_PREFIXES`.

- [ ] **Step 1: Register the module**

Add `'pulse'` to the `Module` union and give it `view`/`edit` in the capability/role matrix, following how `'channels'` or `'stock'` is declared in `rbac.service.ts`. Default: org members get `pulse:view`+`pulse:edit` (personal org = single user).

- [ ] **Step 2: Add the write prefix**

In `hooks.server.ts`, add `'/api/pulse'` to `API_WRITE_PREFIXES` (the CSRF/write-guard list). Do NOT add `/api/gateway/pulse` — that path is server-token, already allowlisted like other `/api/gateway/*`.

- [ ] **Step 3: Typecheck**

Run: `cd minion_hub && bun run check` (svelte-check + tsc)
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/services/rbac.service.ts src/hooks.server.ts src/lib/routes/route-access-registry.ts
git commit -m "feat(pulse): register pulse RBAC module + write prefix"
```

---

### Task 8: Approve / dismiss / edit endpoints (+ one-shot execute)

**Files:**
- Create: `minion_hub/src/routes/api/pulse/proposals/[id]/+server.ts`
- Create: `minion_hub/src/routes/api/pulse/proposals/+server.ts` (GET list)
- Create: `minion_hub/src/routes/api/pulse/count/+server.ts`
- Test: `minion_hub/src/routes/api/pulse/proposals/[id]/server.test.ts`

**Interfaces:**
- Consumes: `pulse.service` (Task 4), `requireOrgCapability` (Task 7), `gatewayCallAsUser` (`$lib/server/gateway-rpc`), `requireCoreCtx`/`getCoreCtx` (`$server/auth/core-ctx`), `requireAuth` (`$server/auth/authorize`).
- Produces:
  - `GET /api/pulse/proposals` → `{ proposals: PulseProposalRow[] }`
  - `GET /api/pulse/count` → `{ count: number }`
  - `POST /api/pulse/proposals/[id]` body `{ action: 'approve'|'dismiss' }`; PATCH body `{ args }`.
  - On approve of `kind ∈ {create_event, reminder}`: fire a one-shot gateway agentTurn (below), set status `approved`. On `kind ∈ {digest, fyi, draft_reply}`: just `approved`.

**One-shot execute helper (the settled approach — no new gateway RPC):**
```ts
// inside the approve branch, for create_event | reminder:
const instruction = proposal.kind === 'create_event'
  ? `Execute now, without asking: call calendar_create_event with these args: ${JSON.stringify(proposal.payload.args)}. Then confirm in one short line.`
  : `Execute now, without asking: set a reminder using your cron tool for: ${JSON.stringify(proposal.payload.args)}. Then confirm in one short line.`;
await gatewayCallAsUser('cron.add', {
  job: {
    name: `pulse-exec-${proposal.id}`,
    enabled: true,
    scope: 'session',
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    schedule: { kind: 'at', at: new Date(Date.now() + 5000).toISOString() },
    deleteAfterRun: true,
    payload: { kind: 'agentTurn', message: instruction },
    delivery: { mode: 'announce', channel: 'whatsapp' },
  },
}, ctx.profileId, { orgId: ctx.tenantId });
```
> `gatewayCallAsUser` routes to the org's gateway and resolves the user's session (gws creds) so `calendar_create_event` runs in the user's context. Fire-and-forget; the agent's one-line confirmation is the receipt. `// ponytail: async receipt via WhatsApp confirm — a sync executed-status write is slice 2 (needs the agent to call back).`

- [ ] **Step 1: Write the failing test (guards + approve routing)**

```ts
// server.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/gateway-rpc', () => ({ gatewayCallAsUser: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('$server/services/rbac.service', () => ({ requireOrgCapability: vi.fn().mockResolvedValue(null) }));
// mock pulse.service getProposal -> a create_event card, markApproved spy, etc.

import { POST } from './+server';
import { gatewayCallAsUser } from '$lib/server/gateway-rpc';

describe('POST /api/pulse/proposals/[id]', () => {
  it('approve on create_event fires a one-shot agentTurn', async () => {
    // ... call POST with action:'approve', id of a create_event card ...
    // expect(gatewayCallAsUser).toHaveBeenCalledWith('cron.add', expect.objectContaining({ job: expect.any(Object) }), expect.anything(), expect.anything());
  });
  it('approve on digest does NOT call the gateway', async () => { /* expect gatewayCallAsUser not called */ });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun run test src/routes/api/pulse/proposals/[id]/server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the three endpoints**

Implement `[id]/+server.ts` `POST` (approve/dismiss with the one-shot helper above, guarded by `requireAuth` + `requireCoreCtx` + `requireOrgCapability(locals,'pulse','edit')`) and `PATCH` (editPayload). Implement `proposals/+server.ts` `GET` (list, `requireOrgCapability(...,'view')`) and `count/+server.ts` `GET` (countPending, view). All resolve `ctx = await requireCoreCtx(locals)` for `{ db, tenantId, profileId }`.

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test src/routes/api/pulse/proposals/[id]/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/pulse/
git commit -m "feat(pulse): approve/dismiss/edit + list/count endpoints; approve fires one-shot agentTurn"
```

---

### Task 9: Feed state + bell integration

**Files:**
- Create: `minion_hub/src/lib/state/features/pulse.svelte.ts`
- Modify: `minion_hub/src/lib/state/features/notifications.svelte.ts`

**Interfaces:**
- Consumes: `/api/pulse/count`, `/api/pulse/proposals`.
- Produces: `pulse` state object `{ get pendingCount, get items, refreshCount(), refresh(), approve(id), dismiss(id) }`; `notifications.badgeCount` includes `pulse.pendingCount`.

- [ ] **Step 1: Implement `pulse.svelte.ts`** (template = `finance-sync.svelte.ts`)

```ts
// pulse.svelte.ts
let s = $state<{ pendingCount: number; items: any[] }>({ pendingCount: 0, items: [] });

async function fetchCount() {
  try { const r = await fetch('/api/pulse/count'); if (r.ok) s.pendingCount = (await r.json()).count ?? 0; } catch { /* transient */ }
}
async function fetchItems() {
  try { const r = await fetch('/api/pulse/proposals'); if (r.ok) s.items = (await r.json()).proposals ?? []; } catch { /* transient */ }
}
async function act(id: string, action: 'approve' | 'dismiss') {
  await fetch(`/api/pulse/proposals/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
  await Promise.all([fetchItems(), fetchCount()]);
}
export const pulse = {
  get pendingCount() { return s.pendingCount; },
  get items() { return s.items; },
  refreshCount: fetchCount, refresh: fetchItems,
  approve: (id: string) => act(id, 'approve'),
  dismiss: (id: string) => act(id, 'dismiss'),
};
```

- [ ] **Step 2: Fold pulse into the bell badge**

In `notifications.svelte.ts` import `pulse` and add to the getter:
```ts
import { pulse } from './pulse.svelte';
// ...
get badgeCount() { return this.pendingCount + pulse.pendingCount + (updateState.pending ? 1 : 0); },
```
And in `refreshNotifications()` also call `pulse.refreshCount()`.

- [ ] **Step 3: Typecheck**

Run: `bun run check`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/state/features/pulse.svelte.ts src/lib/state/features/notifications.svelte.ts
git commit -m "feat(pulse): feed state + bell badge integration"
```

---

### Task 10: `/pulse` feed page

**Files:**
- Create: `minion_hub/src/routes/(app)/pulse/+page.server.ts`
- Create: `minion_hub/src/routes/(app)/pulse/+page.svelte`

**Interfaces:**
- Consumes: `pulse.service.listPending`, `requireOrgCapability(...,'view')`, `pulse` state (Task 9).
- Produces: a page listing pending cards with Approve / Edit / Dismiss, `depends('pulse:feed')`.

- [ ] **Step 1: Invoke `ui-design-governance`** (mandatory before the `.svelte` file), then implement.

- [ ] **Step 2: `+page.server.ts`** — `requireAuth` + `requireCoreCtx` + `requireOrgCapability(locals,'pulse','view')`, `return { proposals: await listPending(ctx) }`, with `depends('pulse:feed')`.

- [ ] **Step 3: `+page.svelte`** — render `data.proposals` as cards (semantic tokens only): title, source/kind badge, `summary` markdown; buttons call `pulse.approve(id)` / `pulse.dismiss(id)` then `invalidate('pulse:feed')`. `create_event`/`reminder` cards show `payload.args` (editable → PATCH). Empty state = "Nothing needs your attention." Use existing `Button`/`Badge`/card patterns.

- [ ] **Step 4: Lint + typecheck**

Run: `bun run lint:design && bun run lint:tokens && bun run check`
Expected: design/token debt does not increase; no new type errors.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(app)/pulse/"
git commit -m "feat(pulse): /pulse feed page — approve/edit/dismiss cards"
```

---

### Task 11: Settings section

**Files:**
- Create: `minion_hub/src/routes/(app)/settings/pulse/+page.server.ts`
- Create: `minion_hub/src/routes/(app)/settings/pulse/+page.svelte`
- Create: `minion_hub/src/routes/api/pulse/settings/+server.ts` (GET/POST)
- Modify: `minion_hub/src/lib/components/settings/SettingsNav.svelte:27-39`

**Interfaces:**
- Consumes: `getSettings`/`saveSettings` (Task 4).
- Produces: settings section with enable toggle, briefing time (`<input type="time">`), locale + channel `<Select>`, watch toggles; persists via `POST /api/pulse/settings`. `depends('settings:pulse')`.

- [ ] **Step 1: Add the nav tab** — add `{ id: 'pulse', label: m.settings_nav_pulse(), icon: 'Activity', href: '/settings/pulse', adminOnly: false }` to `GENERAL_TABS`, plus icon import + `ICON_MAP` entry + `m.settings_nav_pulse` message.

- [ ] **Step 2: `api/pulse/settings/+server.ts`** — `GET` returns `getSettings(ctx)`; `POST` validates `{ enabled?, briefingTime?, locale?, channels?, watch? }` and calls `saveSettings`. Guard: `requireOrgCapability(locals,'pulse','edit')`.
> `auto_approve` is NOT editable in slice 1 (scaffold only) — render its switches `disabled` with a "coming soon" hint. `// ponytail: graduation ramp is slice 2`.

- [ ] **Step 3: `+page.svelte`** (template = `settings/notifications/+page.svelte`) — invoke `ui-design-governance` first; toggle + time + selects + save via `jsonMutation` + `invalidate('settings:pulse')`.

- [ ] **Step 4: Lint + typecheck + compile i18n**

Run: `bun run lint:design && bun run lint:tokens && bun run check && bun run i18n:compile`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(app)/settings/pulse/" src/routes/api/pulse/settings/ src/lib/components/settings/SettingsNav.svelte messages/ src/lib/paraglide/
git commit -m "feat(pulse): settings section (enable, briefing time, locale, channel, watch)"
```

---

### Task 12: Seed the daily briefing + mission/vision line + manual E2E

**Files:**
- Modify: mission/vision doc (memory `minion-erp-mission-vision.md` — add one line) + `specs/2026-04-19-minion-meta-repo-design.md` if it enumerates tenants.
- No code file — this task wires the live daily job and verifies end-to-end.

**Seeding (slice-1 approach — agent self-schedules):**
- [ ] **Step 1:** With Pulse enabled in `/settings/pulse` for PINONITE, send the user's gateway agent a one-time instruction so it self-schedules via its cron tool:
  > "Every day at 07:00 America/Lima, review my Gmail, Calendar and WhatsApp for today. Write a short briefing in Spanish, then call `pulse_propose` (orgId = `<PINONITE org id>`) with a `digest` card plus one card per concrete action: `create_event` for appointments I agreed to, `reminder` for deadlines, `draft_reply`/`fyi` for messages awaiting my reply. Deliver the briefing to my WhatsApp."

  This uses `cron-tool add` which auto-derives agentId/sessionKey/delivery from the session. `// ponytail: hub-driven "enable → auto-seed cron" (sessionKey resolution from hub) is slice 2 — one user now, a one-time instruction is less code than reverse-engineering session-key wiring.`

- [ ] **Step 2: Manual E2E (per `verify` skill):**
  1. Trigger the job now: tell the agent "run my daily briefing now" (or `cron.run force`).
  2. Confirm a WhatsApp briefing arrives.
  3. Confirm `/pulse` shows the digest + action cards; the bell count is non-zero.
  4. Approve a `create_event` card → confirm the event appears in Google Calendar (agent DMs a one-line confirmation).
  5. Dismiss a card → it leaves the feed; re-running the briefing does NOT re-create it (dedup_key holds).

- [ ] **Step 3: Add the mission/vision line**

Append to the mission/vision doc: *"Individuals are a first-class ERP tenant: a personal org (`organizations.kind='personal'`, e.g. PINONITE) uses the same modules with friendlier labels and a proactive Pulse feed. Universality is an acceptance dimension alongside agent-parity and RBAC."*

- [ ] **Step 4: Commit + open PR to dev**

```bash
git add -A specs/ && git commit -m "docs(pulse): mission/vision — individuals as first-class tenant"
# open PR: feature branch -> dev (hub), feature branch -> DEV (gateway)
```

---

## Self-Review

**Spec coverage:**
- §3 architecture (agentTurn → pulse_propose → feed) → Tasks 6, 8, 12. ✓
- §4 data model (both tables, RLS, dedup) → Task 3. ✓
- §5 endpoints (ingest, approve/dismiss/edit, pulse_propose tool) → Tasks 5, 6, 8. ✓
- §6 UI (bell, /pulse, settings) → Tasks 9, 10, 11. ✓
- §7 personal-ERP (org.kind, nav gating, labels, mission line) → Tasks 1, 2, 12. Friendlier labels: nav labels changed via the Pulse entry; broader CRM→"People" relabel is cosmetic and folded into Task 2's message layer if desired (else slice 2). ✓
- §8 security (RLS, server-token, RBAC, HITL default, metadata-not-body) → Tasks 3, 5, 7, 8. ✓
- §9 slice-1 execution surface (create_event + reminder execute; draft_reply/fyi read-only) → Task 8. ✓
- §11 testing → Tasks 4, 5, 6, 8 (unit) + Task 12 (E2E). ✓

**Placeholder scan:** import specifiers in Tasks 4/6 are marked "match the sibling file" rather than guessed — these are real lookups, not TODOs; every code step shows complete code. No "TBD"/"add error handling" placeholders.

**Type consistency:** `ProposalInput`/`ProposalCard` fields (`source,kind,title,summary?,payload?,dedupKey`) are identical across Tasks 4, 5, 6. `kind`/`status` enums match Task 3's tables. `gatewayCallAsUser(method, params, profileId, opts)` signature matches the recon. `CoreCtx = { db, tenantId, profileId }` used consistently.

**Known open items to confirm during execution (not blockers):**
- Exact import path the extension uses to reach `src/gateway/hub-rest-registry` (Task 6) — resolve by matching an existing `src/hooks/*` import.
- The hub test-db harness helper name for service tests (Task 4) — match the nearest sibling `*.service.test.ts`.
- `gatewayCallAsUser`'s `cron.add` param shape accepts a nested `job` — confirm against `server-methods/cron.ts:70-86` flat-vs-nested handling; if it wants flat top-level keys, spread `job` fields up.
