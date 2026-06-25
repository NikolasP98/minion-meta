-- Memberships / recurring (ERPNext Subscription + Membership port). A plan defines
-- a recurring interval + price; a membership ties a contact to a plan with a
-- next_cycle_date watermark; the cron tick spawns a cycle (+ a draft sales order
-- for billing — NOT a fin_invoice, keeping SUSII the revenue source of truth) each
-- time a membership comes due. cycle unique (membership, cycle_no) = no double-spawn.

create table if not exists public.membership_plans (
  id             uuid primary key default gen_random_uuid(),
  org_id         text not null,
  name           text not null,
  price          numeric,
  currency       text,
  interval_unit  text not null default 'month',   -- day | week | month | year
  interval_count integer not null default 1,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists membership_plans_org_idx on public.membership_plans (org_id, enabled);
--> statement-breakpoint

create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  org_id          text not null,
  plan_id         uuid not null,
  crm_contact_id  uuid,
  party_id        uuid,
  customer_name   text,
  status          text not null default 'active',  -- active | paused | cancelled
  started_at      timestamptz not null default now(),
  next_cycle_date timestamptz not null,
  cycle_no        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists memberships_org_status_idx on public.memberships (org_id, status, next_cycle_date);
--> statement-breakpoint
create index if not exists memberships_contact_idx on public.memberships (crm_contact_id);
--> statement-breakpoint

create table if not exists public.membership_cycles (
  id             uuid primary key default gen_random_uuid(),
  org_id         text not null,
  membership_id  uuid not null,
  cycle_no       integer not null,
  period_start   timestamptz not null,
  period_end     timestamptz not null,
  sales_order_id uuid,
  created_at     timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists membership_cycles_uniq on public.membership_cycles (membership_id, cycle_no);
--> statement-breakpoint
create index if not exists membership_cycles_org_idx on public.membership_cycles (org_id, created_at);
--> statement-breakpoint

grant select, insert, update, delete on public.membership_plans  to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.memberships       to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.membership_cycles to app_ledger;
--> statement-breakpoint
alter table public.membership_plans  enable row level security;
alter table public.membership_plans  force  row level security;
alter table public.memberships       enable row level security;
alter table public.memberships       force  row level security;
alter table public.membership_cycles enable row level security;
alter table public.membership_cycles force  row level security;
--> statement-breakpoint
create policy membership_plans_org_guc on public.membership_plans
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy memberships_org_guc on public.memberships
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy membership_cycles_org_guc on public.membership_cycles
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
