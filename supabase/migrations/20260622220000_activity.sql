-- Generic per-record activity (ERPNext Comment + Version port). Polymorphic via
-- (ref_type, ref_id). doc_comments = human threaded comments; doc_audit_log =
-- field-level change history. org-scoped + forced RLS.

create table if not exists public.doc_comments (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,
  ref_type   text not null,
  ref_id     uuid not null,
  kind       text not null default 'comment',
  body       text,
  actor_id   uuid,
  actor_name text,
  parent_id  uuid,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists doc_comments_ref_idx on public.doc_comments (org_id, ref_type, ref_id, created_at);
--> statement-breakpoint

create table if not exists public.doc_audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  ref_type    text not null,
  ref_id      uuid not null,
  actor_id    uuid,
  actor_name  text,
  op          text not null default 'update',
  changes     jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists doc_audit_log_ref_idx on public.doc_audit_log (org_id, ref_type, ref_id, occurred_at);
--> statement-breakpoint

grant select, insert, update, delete on public.doc_comments  to app_ledger;
--> statement-breakpoint
grant select, insert on public.doc_audit_log to app_ledger;
--> statement-breakpoint
alter table public.doc_comments  enable row level security;
--> statement-breakpoint
alter table public.doc_comments  force  row level security;
--> statement-breakpoint
alter table public.doc_audit_log enable row level security;
--> statement-breakpoint
alter table public.doc_audit_log force  row level security;
--> statement-breakpoint
create policy doc_comments_org_guc on public.doc_comments
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy doc_audit_log_org_guc on public.doc_audit_log
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
