-- CRM: link a contact to its FULL conversation, not just the messages it sent.
--
-- The ledger keys a 1:1 conversation by `chat_id` (= the contact's handle) for
-- BOTH directions: inbound has sender_id = chat_id = the contact; outbound has
-- sender_id = NULL (the clinic/agent) but chat_id = the contact. Joining the
-- timeline/stats on `sender_id` therefore only captured INBOUND messages.
-- Switch the join to `chat_id` so the journey shows the whole chat (in + out),
-- outbound counts appear, and reciprocity (inbound/total) becomes meaningful.
--
-- DROP + CREATE (not REPLACE) because the column list changes (adds outbound_count).

drop view if exists public.crm_contact_stats;
--> statement-breakpoint
create view public.crm_contact_stats with (security_invoker = true) as
  select ci.contact_id,
         ci.org_id,
         count(*)                                          as message_count,
         count(*) filter (where m.direction = 'inbound')   as inbound_count,
         count(*) filter (where m.direction = 'outbound')  as outbound_count,
         count(distinct m.channel)                         as channels_used,
         min(coalesce(m.occurred_at, m.created_at))        as first_contact_at,
         max(coalesce(m.occurred_at, m.created_at))        as last_contact_at
  from public.crm_contact_identities ci
  join public.messages m
    on m.org_id = ci.org_id and m.channel = ci.channel and m.chat_id = ci.external_id
  where m.is_bot is not true
  group by ci.contact_id, ci.org_id;
--> statement-breakpoint

drop view if exists public.crm_contact_timeline;
--> statement-breakpoint
create view public.crm_contact_timeline with (security_invoker = true) as
  select ci.contact_id,
         m.org_id,
         'message'::text                            as kind,
         m.direction                                as direction,
         m.channel                                  as channel,
         m.content                                  as body,
         m.agent_id                                 as agent_id,
         m.metadata                                 as data,
         coalesce(m.occurred_at, m.created_at)      as occurred_at,
         m.id                                       as source_id
  from public.messages m
  join public.crm_contact_identities ci
    on ci.org_id = m.org_id and ci.channel = m.channel and ci.external_id = m.chat_id
  union all
  select a.contact_id,
         a.org_id,
         a.kind                                     as kind,
         null::text                                 as direction,
         null::text                                 as channel,
         a.body                                     as body,
         null::text                                 as agent_id,
         a.data                                     as data,
         a.occurred_at                              as occurred_at,
         a.id                                       as source_id
  from public.crm_activities a;
--> statement-breakpoint

grant select on public.crm_contact_stats    to app_ledger;
--> statement-breakpoint
grant select on public.crm_contact_timeline to app_ledger;
