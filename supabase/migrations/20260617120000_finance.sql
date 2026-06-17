-- Hub-native Finances module (spec: finances plugin).
-- Provider-agnostic billing schema: invoices, line items, payments, clients,
-- and per-org connector config (sources).
--
-- Tenancy: org_id text (matches messages.org_id / crm_*), enforced by the
-- existing app_ledger role + app.current_org_id GUC (created in
-- 20260603074413_messages_rls). Every hub query routes through withOrgCore();
-- RLS is the hard backstop.
--
-- Idempotent: CREATE ... IF NOT EXISTS throughout (surgical-apply convention;
-- never drizzle-kit push for the core DB).
-- Money is stored as numeric (string in JS via Drizzle).

-- ── fin_invoices ─────────────────────────────────────────────────────────────
create table if not exists public.fin_invoices (
  id                uuid primary key default gen_random_uuid(),
  org_id            text not null,
  provider          text not null,
  provider_ref      text not null,
  number            text,
  document_id       text,
  issued_at         timestamptz,
  client_name       text,
  client_doc_type   text,
  client_doc_number text,
  client_email      text,
  currency          text,
  subtotal          numeric,
  tax               numeric,
  discount          numeric,
  total             numeric,
  status            text,
  seller            text,
  note              text,
  metadata          jsonb not null default '{}'::jsonb,
  synced_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists fin_invoices_provider_ref_uniq
  on public.fin_invoices (org_id, provider, provider_ref);
--> statement-breakpoint
create index if not exists fin_invoices_org_dni_idx
  on public.fin_invoices (org_id, client_doc_number);
--> statement-breakpoint
create index if not exists fin_invoices_org_issued_idx
  on public.fin_invoices (org_id, issued_at);
--> statement-breakpoint

-- ── fin_invoice_items ────────────────────────────────────────────────────────
create table if not exists public.fin_invoice_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  invoice_id  uuid not null references public.fin_invoices(id) on delete cascade,
  code        text,
  description text,
  category    text,
  quantity    numeric,
  unit_price  numeric,
  discount    numeric,
  tax         numeric,
  total       numeric,
  metadata    jsonb not null default '{}'::jsonb
);
--> statement-breakpoint
create index if not exists fin_invoice_items_invoice_idx
  on public.fin_invoice_items (invoice_id);
--> statement-breakpoint

-- ── fin_payments ─────────────────────────────────────────────────────────────
create table if not exists public.fin_payments (
  id           uuid primary key default gen_random_uuid(),
  org_id       text not null,
  invoice_id   uuid not null references public.fin_invoices(id) on delete cascade,
  provider_ref text,
  method       text,
  paid_at      timestamptz,
  amount       numeric,
  status       text,
  metadata     jsonb not null default '{}'::jsonb
);
--> statement-breakpoint
create index if not exists fin_payments_invoice_idx
  on public.fin_payments (invoice_id);
--> statement-breakpoint
create index if not exists fin_payments_org_paid_idx
  on public.fin_payments (org_id, paid_at);
--> statement-breakpoint

-- ── fin_clients ──────────────────────────────────────────────────────────────
create table if not exists public.fin_clients (
  id           uuid primary key default gen_random_uuid(),
  org_id       text not null,
  provider     text not null,
  provider_ref text not null,
  name         text,
  doc_type     text,
  doc_number   text,
  email        text,
  phone        text,
  metadata     jsonb not null default '{}'::jsonb
);
--> statement-breakpoint
create unique index if not exists fin_clients_provider_ref_uniq
  on public.fin_clients (org_id, provider, provider_ref);
--> statement-breakpoint
create index if not exists fin_clients_org_dni_idx
  on public.fin_clients (org_id, doc_number);
--> statement-breakpoint

-- ── fin_sources (per-org billing connector config + sync watermark) ───────────
create table if not exists public.fin_sources (
  org_id       text not null,
  provider     text not null,
  config       jsonb not null default '{}'::jsonb,
  secret_refs  jsonb not null default '{}'::jsonb,
  enabled      boolean not null default true,
  watermark    text,
  last_sync_at timestamptz,
  last_status  text,
  updated_at   timestamptz not null default now(),
  primary key (org_id, provider)
);
--> statement-breakpoint
create unique index if not exists fin_sources_org_provider_uniq
  on public.fin_sources (org_id, provider);
--> statement-breakpoint

-- ── RLS: org isolation via the app_ledger role + GUC ─────────────────────────
grant select, insert, update, delete on public.fin_invoices      to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.fin_invoice_items to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.fin_payments      to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.fin_clients       to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.fin_sources       to app_ledger;
--> statement-breakpoint

alter table public.fin_invoices      enable row level security;
--> statement-breakpoint
alter table public.fin_invoices      force  row level security;
--> statement-breakpoint
alter table public.fin_invoice_items enable row level security;
--> statement-breakpoint
alter table public.fin_invoice_items force  row level security;
--> statement-breakpoint
alter table public.fin_payments      enable row level security;
--> statement-breakpoint
alter table public.fin_payments      force  row level security;
--> statement-breakpoint
alter table public.fin_clients       enable row level security;
--> statement-breakpoint
alter table public.fin_clients       force  row level security;
--> statement-breakpoint
alter table public.fin_sources       enable row level security;
--> statement-breakpoint
alter table public.fin_sources       force  row level security;
--> statement-breakpoint

create policy fin_invoices_org_guc on public.fin_invoices
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy fin_invoice_items_org_guc on public.fin_invoice_items
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy fin_payments_org_guc on public.fin_payments
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy fin_clients_org_guc on public.fin_clients
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy fin_sources_org_guc on public.fin_sources
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
