alter table public.gateway enable row level security;
--> statement-breakpoint
alter table public.user_gateway enable row level security;
--> statement-breakpoint
create policy "gateway_linked_select" on public.gateway
  for select using (
    exists (
      select 1 from public.user_gateway ug
      where ug.gateway_id = id and ug.profile_id = auth.uid()
    )
  );
--> statement-breakpoint
create policy "gateway_admin_all" on public.gateway
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
--> statement-breakpoint
create policy "user_gateway_self_select" on public.user_gateway
  for select using (profile_id = auth.uid());
--> statement-breakpoint
create policy "user_gateway_admin_all" on public.user_gateway
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
