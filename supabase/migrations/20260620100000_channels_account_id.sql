-- Linked-channel DB-sourcing (#3): add the gateway account key so the hub channels
-- registry can be populated from / reconciled against the gateway's per-account
-- config. account_id is e.g. '+51906090526' (whatsapp) — the join into
-- gateway.json channels.<type>.accounts.<accountId>. Additive, non-destructive.
-- See specs/2026-06-19-linked-channels-config-restructure.md.

alter table public.channels add column if not exists account_id text;
--> statement-breakpoint

-- Upsert key for gateway-account sync. account_id NULL stays allowed (legacy rows);
-- Postgres treats NULLs as distinct so they never collide.
create unique index if not exists channels_uniq_type_account
  on public.channels (tenant_id, gateway_id, type, account_id);
