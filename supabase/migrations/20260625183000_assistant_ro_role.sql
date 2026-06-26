-- Dedicated read-only role for the in-app assistant's analytics SQL (crm_query).
-- Linked to the hub's existing RLS model: a NON-bypass role (like app_ledger), so
-- the PUBLIC `*_org_guc` policies (tenant_id = current_setting('app.current_org_id'))
-- scope every row to the caller's org. SELECT grants are restricted to business-
-- domain tables only, so platform/secret/identity tables (gateway tokens, settings,
-- config_snapshots, profiles, channel_*, flows, agent internals, member_roles, …)
-- are unreadable even within the same org — PG enforces the boundary. No write
-- grants at all → reads can never mutate.
--
-- Applied to prod (gxv) via mcp apply_migration on 2026-06-25.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_assistant_ro') then
    create role app_assistant_ro nologin;
  end if;
end $$;
--> statement-breakpoint
grant app_assistant_ro to postgres;
--> statement-breakpoint
grant app_assistant_ro to authenticator;
--> statement-breakpoint
grant usage on schema public to app_assistant_ro;
--> statement-breakpoint
-- Business-domain tables ONLY. Deliberately NOT granted: gateway/gateway_signing_keys
-- (tokens), settings/crm_settings/support_settings/sched_reminder_config, config_snapshots,
-- backup_*/server_*, profiles/organizations/organization_members, member_roles/
-- permission_rules/permission_roles (RBAC), user_*/personal_agents/channel_*/device_*/
-- identity_*/join_*/pending_* (auth+PII), flows/skills/built_*/workflow_defs,
-- sessions/tasks/missions/chat_messages/agent_memories, files/notes/doc_*/workshop/
-- dashboard, marketplace_*, fin_sync_jobs, crm_win_embeddings, naming_series_counters.
-- (org_areas excluded: its policy keys on auth.uid(), not the GUC → empty here anyway.)
grant select on
  parties,
  crm_contacts, crm_contact_identities, crm_contact_tags, crm_tags,
  crm_activities, crm_message_sentiment,
  fin_clients, fin_invoices, fin_invoice_items, fin_payments, fin_products, fin_sources,
  sales_orders,
  memberships, membership_cycles, membership_plans,
  sched_bookings, sched_event_types, sched_event_type_resources, sched_resources,
  sched_availability, sched_schedules, sched_links, sched_reminders,
  support_issues,
  proj_projects, proj_tasks, proj_templates, proj_timesheets,
  messages,
  app_modules,
  notif_log
to app_assistant_ro;
-- No ALTER DEFAULT PRIVILEGES on purpose: a new table must be granted explicitly,
-- so secret tables never become readable by accident (fail-closed).
