-- Shared / service accounts + per-user identity feed subscriptions.
-- Additive + idempotent. No behavior change until the hub/gateway features ship
-- (`shareable` defaults false → zero shareable identities → zero subscriptions).
-- Spec: specs/2026-06-15-shared-account-identities-design.md

-- 1. Classify a profile as a real person vs a shared/business "service" account.
alter table profiles
  add column if not exists account_type text not null default 'person';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_type_chk') then
    alter table profiles
      add constraint profiles_account_type_chk check (account_type in ('person', 'service'));
  end if;
end $$;

-- 2. Mark which identities of a (service) account may be subscribed to by others.
alter table user_identities
  add column if not exists shareable boolean not null default false;

-- 3. Per-user opt-in: profile X pulls shared identity Y into its feed (org ctx Z).
create table if not exists identity_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  identity_id           uuid not null references user_identities(id) on delete cascade,
  subscriber_profile_id uuid not null references profiles(id)        on delete cascade,
  organization_id       uuid not null references organizations(id)   on delete cascade,
  created_at            timestamptz not null default now(),
  unique (identity_id, subscriber_profile_id)
);
create index if not exists idx_idsub_subscriber on identity_subscriptions (subscriber_profile_id);
create index if not exists idx_idsub_identity   on identity_subscriptions (identity_id);

-- A user may see/manage only their OWN subscriptions. The hub & gateway read via
-- the service role (bypasses RLS), so these policies only constrain any direct
-- authenticated-client access — defense in depth, matching profiles/user_identities.
alter table identity_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'identity_subscriptions' and policyname = 'idsub_self_select') then
    create policy idsub_self_select on identity_subscriptions
      for select using (subscriber_profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'identity_subscriptions' and policyname = 'idsub_self_insert') then
    create policy idsub_self_insert on identity_subscriptions
      for insert with check (subscriber_profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'identity_subscriptions' and policyname = 'idsub_self_delete') then
    create policy idsub_self_delete on identity_subscriptions
      for delete using (subscriber_profile_id = auth.uid());
  end if;
end $$;
