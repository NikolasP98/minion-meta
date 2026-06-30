-- DB-backed pending channel pairing requests — replaces the gateway's
-- ~/.minion/credentials/<channel>-pairing.json files (removed in favor of this table).
-- A request is created when an unknown sender DMs a channel whose access policy is
-- `pairing` (opt-in). Approving a code adds the sender to channels.allow_from and deletes
-- the request. Never stores the plaintext code — only its SHA-256 hash.
-- Org-scoped (tenant_id) + RLS org_guc, matching channel_bindings.
-- See specs/2026-06-26-gateway-config-db-migration-plan.md + p5-dmpolicy-strip-pairing-incident.

create table if not exists public.channel_pairing_requests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  gateway_id    uuid not null references public.gateway(id) on delete cascade,
  channel_type  text not null,
  account_id    text not null,
  sender_id     text not null,
  code_hash     text not null,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists idx_channel_pairing_lookup
  on public.channel_pairing_requests (tenant_id, gateway_id, channel_type, account_id);

create unique index if not exists channel_pairing_uniq_sender
  on public.channel_pairing_requests (tenant_id, gateway_id, channel_type, account_id, sender_id);

grant select, insert, update, delete on public.channel_pairing_requests to app_ledger;

alter table public.channel_pairing_requests enable row level security;
alter table public.channel_pairing_requests force row level security;
drop policy if exists channel_pairing_requests_org_guc on public.channel_pairing_requests;
create policy channel_pairing_requests_org_guc on public.channel_pairing_requests for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
