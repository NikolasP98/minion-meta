-- Gateway-token auth re-home (Turso servers -> Supabase gateway), Phase 6 Stage 3.
-- server-token ingest auth (resolveServerTokenAuth) needs the org (tenantId).
-- The Supabase gateway model is profile-linked (user_gateway) and had no org;
-- add a soft org_id ref + backfill the live netcup gateway to FACES — the org
-- all its data and the converged Turso servers.tenant_id already use.
-- Nullable during the dual-read bake (resolveServerTokenAuth falls back to Turso).
alter table public.gateway add column if not exists org_id uuid;
--> statement-breakpoint
update public.gateway set org_id = '21e0601b-f632-43fd-8414-d644af4271f4'
  where legacy_server_id = '1cf319d2-cad0-42d9-9bb5-151cef48c347';
