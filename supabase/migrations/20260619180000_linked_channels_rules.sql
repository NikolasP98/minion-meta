-- Linked-channel config restructure (one concern per column) — additive, non-destructive.
-- Moves per-channel rules out of the gateway's gateway.json into the DB, so channel
-- enable/disable + reply policy are runtime-applied (no gateway restart) and editable
-- from the hub. See specs/2026-06-19-linked-channels-config-restructure.md.
--
-- `channels.status` (active|inactive|pairing) is kept as the coarse observed badge;
-- the new columns split intent from observed so no value does double duty (the bug
-- that let dmPolicy:disabled silence the bot AND kill the ledger feed).

-- 1. Intent columns on channels (each = exactly one concern).
alter table public.channels
  add column if not exists enabled          boolean   not null default true,
  add column if not exists replies          text      not null default 'none',
  add column if not exists allow_from       text[]    not null default '{}',
  add column if not exists group_allow_from text[]    not null default '{}',
  add column if not exists require_mention  boolean   not null default true,
  -- Observed (gateway-reported, read-only).
  add column if not exists reconnect_count  integer   not null default 0,
  add column if not exists last_seen_at     timestamptz,
  add column if not exists last_error       text;
--> statement-breakpoint

-- replies is a closed set; enforce it without a pg enum type (cheaper to evolve).
alter table public.channels
  drop constraint if exists channels_replies_chk;
--> statement-breakpoint
alter table public.channels
  add constraint channels_replies_chk check (replies in ('none', 'bound'));
--> statement-breakpoint

-- 2. Agent routing for a channel. No rows => receive-only (noAgent). agent_id NULL
--    on a row is an explicit noAgent binding. Specificity (dm_peer > group >
--    catchall) orders resolution; no priority column.
create table if not exists public.channel_bindings (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  channel_id  text not null references public.channels (id) on delete cascade,
  match_kind  text not null check (match_kind in ('catchall', 'dm_peer', 'group')),
  match_peer  text,
  agent_id    text,
  created_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists idx_channel_bindings_channel
  on public.channel_bindings (channel_id);
--> statement-breakpoint
create unique index if not exists channel_bindings_uniq
  on public.channel_bindings (channel_id, match_kind, match_peer);
--> statement-breakpoint

-- 3. RLS — mirror public.channels (tenant_id scoped via app.current_org_id GUC).
alter table public.channel_bindings enable row level security;
--> statement-breakpoint
alter table public.channel_bindings force row level security;
--> statement-breakpoint
drop policy if exists channel_bindings_org_guc on public.channel_bindings;
--> statement-breakpoint
create policy channel_bindings_org_guc on public.channel_bindings for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
