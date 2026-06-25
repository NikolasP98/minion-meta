-- Party — the shared "someone you do business with" spine (person or company).
-- The canonical record the per-module facets (crm_contacts / fin_clients /
-- sched_bookings) point at via a nullable party_id. See pg-party-schema.ts.
--
-- Tenancy: org_id text (matches messages.org_id / crm_* / fin_* / sched_*),
-- enforced by the existing app_ledger role + app.current_org_id GUC. Every hub
-- query routes through withOrgCore(); RLS is the hard backstop.
--
-- Idempotent: CREATE ... IF NOT EXISTS + ADD COLUMN IF NOT EXISTS throughout
-- (surgical-apply convention; never drizzle-kit push for the core DB).

-- ── parties ──────────────────────────────────────────────────────────────────
create table if not exists public.parties (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,
  type       text not null default 'person',   -- 'person' | 'company'
  name       text,
  phone9     text,                              -- normalized last-9-digits (Peru)
  email      text,
  doc_type   text,
  doc_number text,                              -- RUC/DNI
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists parties_org_idx on public.parties (org_id);
--> statement-breakpoint
create index if not exists parties_org_phone9_idx on public.parties (org_id, phone9);
--> statement-breakpoint
create index if not exists parties_org_doc_idx on public.parties (org_id, doc_number);
--> statement-breakpoint
-- Identity key: doc_number (DNI/RUC) is permanent + unique per person, so it is
-- the ONLY uniquely-enforced key (partial-unique; multiple NULLs allowed).
-- phone9 is a BRIDGE, NOT an identity — Peruvian phones get shared across a
-- family and reassigned, so two distinct DNIs can carry the same number; a
-- unique phone index would wrongly reject the second person. phone9 stays a
-- plain (non-unique) index for fast fallback matching.
create unique index if not exists parties_org_doc_uniq
  on public.parties (org_id, doc_number) where doc_number is not null;
--> statement-breakpoint

-- ── facet bridges: nullable party_id on each existing module table ────────────
alter table public.crm_contacts   add column if not exists party_id uuid;
--> statement-breakpoint
alter table public.fin_clients     add column if not exists party_id uuid;
--> statement-breakpoint
alter table public.sched_bookings  add column if not exists party_id uuid;
--> statement-breakpoint
create index if not exists crm_contacts_party_idx   on public.crm_contacts (party_id);
--> statement-breakpoint
create index if not exists fin_clients_party_idx     on public.fin_clients (party_id);
--> statement-breakpoint
create index if not exists sched_bookings_party_idx  on public.sched_bookings (party_id);
--> statement-breakpoint

-- ── RLS: org isolation via the app_ledger role + GUC ─────────────────────────
grant select, insert, update, delete on public.parties to app_ledger;
--> statement-breakpoint
alter table public.parties enable row level security;
--> statement-breakpoint
alter table public.parties force  row level security;
--> statement-breakpoint
create policy parties_org_guc on public.parties
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
