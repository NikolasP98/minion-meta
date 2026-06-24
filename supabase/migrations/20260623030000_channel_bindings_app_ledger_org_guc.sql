-- channel_bindings was missing the app_ledger grant + org_guc policy that
-- withOrgCore needs. Latent until importGatewayChannels (fixed to actually
-- import — it had been reading config.get's snapshot wrapper and importing
-- zero channels) first tried to delete/insert bindings under the app_ledger
-- role and hit permission-denied. Mirrors channels / config_snapshots.
grant select, insert, update, delete on public.channel_bindings to app_ledger;
--> statement-breakpoint
alter table public.channel_bindings enable row level security;
--> statement-breakpoint
alter table public.channel_bindings force row level security;
--> statement-breakpoint
drop policy if exists channel_bindings_org_guc on public.channel_bindings;
--> statement-breakpoint
create policy channel_bindings_org_guc on public.channel_bindings for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
