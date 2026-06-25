-- Hub-native Sales Orders (ERPNext document-chain port: Booking → Sales Order).
-- A Sales Order is the commitment-to-bill created from an upstream Booking with
-- a source_booking_id backref. NOT a financial invoice — SUSII (fin_invoices)
-- stays the revenue source of truth; the order reconciles against it later via
-- status='invoiced' + invoice_provider_ref, so revenue is never double-counted.
-- See pg-sales-schema.ts.
--
-- Tenancy: org_id text + app_ledger role + app.current_org_id GUC. Idempotent.

create table if not exists public.sales_orders (
  id                   uuid primary key default gen_random_uuid(),
  org_id               text not null,
  source_booking_id    uuid,
  party_id             uuid,
  crm_contact_id       uuid,
  customer_name        text,
  event_type_id        uuid,
  product_id           uuid,
  description          text,
  quantity             numeric not null default 1,
  unit_price           numeric,
  total                numeric,
  currency             text,
  status               text not null default 'draft',  -- draft|confirmed|invoiced|cancelled
  invoice_provider_ref text,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists sales_orders_org_status_idx  on public.sales_orders (org_id, status);
--> statement-breakpoint
create index if not exists sales_orders_org_created_idx on public.sales_orders (org_id, created_at);
--> statement-breakpoint
create index if not exists sales_orders_contact_idx     on public.sales_orders (crm_contact_id);
--> statement-breakpoint
create index if not exists sales_orders_party_idx       on public.sales_orders (party_id);
--> statement-breakpoint
-- One order per booking → createOrderFromBooking is idempotent.
create unique index if not exists sales_orders_booking_uniq
  on public.sales_orders (org_id, source_booking_id) where source_booking_id is not null;
--> statement-breakpoint

grant select, insert, update, delete on public.sales_orders to app_ledger;
--> statement-breakpoint
alter table public.sales_orders enable row level security;
--> statement-breakpoint
alter table public.sales_orders force  row level security;
--> statement-breakpoint
create policy sales_orders_org_guc on public.sales_orders
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
