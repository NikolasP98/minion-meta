-- Workflow engine (ERPNext Workflow port). A per-doc_type state machine over the
-- doc's existing status column: states + role-gated transitions. Transitions are
-- logged to doc_audit_log (op='workflow'). One enabled def per (org, doc_type).

create table if not exists public.workflow_defs (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  doc_type    text not null,                       -- support_issue | sales_order
  name        text not null,
  enabled     boolean not null default true,
  states      jsonb not null default '[]'::jsonb,  -- string[]
  transitions jsonb not null default '[]'::jsonb,  -- {action,from,to,role?,allowSelfApprove?}[]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists workflow_defs_org_doctype_uniq on public.workflow_defs (org_id, doc_type);
--> statement-breakpoint
grant select, insert, update, delete on public.workflow_defs to app_ledger;
--> statement-breakpoint
alter table public.workflow_defs enable row level security;
--> statement-breakpoint
alter table public.workflow_defs force  row level security;
--> statement-breakpoint
create policy workflow_defs_org_guc on public.workflow_defs
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
