-- Assignment work-queue (ERPNext Assignment Rule + ToDo port). A rule picks an
-- assignee for incoming docs (round-robin / least-open) and stamps the doc's
-- own owner_id — owner IS the assignment (no separate work_items mirror to keep
-- in sync). The "my work" queue is a union read over the owner_id columns.
-- support_issues + crm_contacts already have owner_id; sales_orders gains it here.

alter table public.sales_orders add column if not exists owner_id uuid;
--> statement-breakpoint
create index if not exists sales_orders_owner_idx on public.sales_orders (org_id, owner_id);
--> statement-breakpoint

create table if not exists public.assignment_rules (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  name        text not null,
  enabled     boolean not null default true,
  doc_type    text not null,                      -- support_issue | crm_contact | sales_order
  strategy    text not null default 'round_robin', -- round_robin | least_open
  assignees   jsonb not null default '[]'::jsonb,  -- profile uuid[]
  condition   jsonb not null default '[]'::jsonb,  -- Filter[] (reuses notif evaluator)
  cursor      integer not null default 0,          -- round-robin pointer
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists assignment_rules_org_idx on public.assignment_rules (org_id, doc_type, enabled);
--> statement-breakpoint
grant select, insert, update, delete on public.assignment_rules to app_ledger;
--> statement-breakpoint
alter table public.assignment_rules enable row level security;
--> statement-breakpoint
alter table public.assignment_rules force  row level security;
--> statement-breakpoint
create policy assignment_rules_org_guc on public.assignment_rules
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
