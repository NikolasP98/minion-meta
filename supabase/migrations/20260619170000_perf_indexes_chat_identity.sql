-- Performance indexes (additive, non-destructive — CREATE INDEX IF NOT EXISTS only).
-- No table/column drops; safe to run against populated tables. Plain (non-CONCURRENT)
-- to stay transaction-compatible with the Supabase migration runner.
--
-- 1. chat_messages: the hot transcript read (listChatMessagesBySessionKey in
--    hub chat.service.ts) filters gateway_id = ? AND session_key = ? (AND
--    tenant_id, redundant given gateway → org) and orders by timestamp,
--    limit 2000. Existing indexes lead with tenant_id (idx_chat_tenant) or with
--    agent_id (idx_chat_by_agent) — neither serves the gateway_id + session_key
--    probe, so the read scans. This composite carries the equality columns plus
--    timestamp for the ORDER BY.
-- 2. user_identities: (user_id, provider) lookups (Google credential read,
--    channel-key filters). MARGINAL — the existing idx_user_identity_user
--    (user_id) already prefix-covers; this only lets a multi-identity user skip
--    the provider filter step. Included for parity.

create index if not exists chat_messages_gateway_session_idx
  on public.chat_messages (gateway_id, session_key, "timestamp");
--> statement-breakpoint
create index if not exists user_identities_user_provider_idx
  on public.user_identities (user_id, provider);
