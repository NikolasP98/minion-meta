-- Hub-native Support / Helpdesk (ERPNext Issue + SLA port).
-- An Issue is a ticket linked to the party spine (+ optional CRM contact) with
-- SLA-derived response/resolution deadlines. SLA = one per-org default config
-- in support_settings (jsonb); deadlines are now()+minutes (no business
-- calendar in v1). See pg-support-schema.ts.
--
-- Tenancy: org_id text, enforced by the app_ledger role + app.current_org_id
-- GUC. Idempotent (CREATE ... IF NOT EXISTS); never drizzle-kit push.

-- ── support_issues ───────────────────────────────────────────────────────────
create table if not exists public.support_issues (
  id                 uuid primary key default gen_random_uuid(),
  org_id             text not null,
  subject            text not null,
  description        text,
  status             text not null default 'open',    -- open|replied|on_hold|resolved|closed
  priority           text not null default 'medium',  -- low|medium|high|urgent
  party_id           uuid,
  crm_contact_id     uuid,
  owner_id           uuid,
  source             text not null default 'manual',
  channel            text,
  response_by        timestamptz,
  resolution_by      timestamptz,
  first_responded_at timestamptz,
  resolved_at        timestamptz,
  closed_at          timestamptz,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists support_issues_org_status_idx  on public.support_issues (org_id, status);
--> statement-breakpoint
create index if not exists support_issues_org_created_idx on public.support_issues (org_id, created_at);
--> statement-breakpoint
create index if not exists support_issues_party_idx       on public.support_issues (party_id);
--> statement-breakpoint
create index if not exists support_issues_contact_idx     on public.support_issues (crm_contact_id);
--> statement-breakpoint
create index if not exists support_issues_owner_idx       on public.support_issues (owner_id);
--> statement-breakpoint

-- ── support_settings (per-org default SLA config) ────────────────────────────
create table if not exists public.support_settings (
  org_id     text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint

-- ── RLS: org isolation via the app_ledger role + GUC ─────────────────────────
grant select, insert, update, delete on public.support_issues   to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.support_settings to app_ledger;
--> statement-breakpoint
alter table public.support_issues   enable row level security;
--> statement-breakpoint
alter table public.support_issues   force  row level security;
--> statement-breakpoint
alter table public.support_settings enable row level security;
--> statement-breakpoint
alter table public.support_settings force  row level security;
--> statement-breakpoint
create policy support_issues_org_guc on public.support_issues
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy support_settings_org_guc on public.support_settings
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
