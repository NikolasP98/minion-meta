-- Hub-native Finances — product catalog. Canonical product per (org, code):
-- one standardized name + reference price, so billed line items reconcile against
-- a single list. Line items link via fin_invoice_items.product_id (separate migration);
-- the item keeps its as-billed code/description (faithful snapshot).
--
-- Tenancy: org_id text, enforced by app_ledger role + app.current_org_id GUC.
-- Idempotent: CREATE ... IF NOT EXISTS throughout (never drizzle-kit push core DB).

create table if not exists public.fin_products (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  code        text not null,
  name        text not null,
  category    text,
  unit_price  numeric,
  active      boolean not null default true,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists fin_products_org_code_uniq
  on public.fin_products (org_id, code);
--> statement-breakpoint
grant select, insert, update, delete on public.fin_products to app_ledger;
--> statement-breakpoint
alter table public.fin_products enable row level security;
--> statement-breakpoint
alter table public.fin_products force  row level security;
--> statement-breakpoint
create policy fin_products_org_guc on public.fin_products
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
