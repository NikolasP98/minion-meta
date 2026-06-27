-- Phase 0 of the gateway.json → DB channel-config migration. Additive only —
-- nothing reads these yet; they give Phase 1 backfill somewhere to land.
-- See specs/2026-06-26-gateway-config-db-migration-plan.md.
--
-- auth_ref: explicit pointer to where this account's creds live (e.g.
--   'whatsapp/51906090526'); NEVER the creds themselves. Removes the authDir
--   convention-guessing that caused the 401 default-vs-phone slot mismatch
--   (see specs/2026-06-19-linked-channels-config-restructure.md).
-- settings: low-traffic transport knobs not worth typed columns
--   (debounceMs, streamMode, sendReadReceipts, selfChatMode, mediaMaxMb).
--   Shape validated by zod at the write path; promote a key to a real column
--   only when a query needs to filter on it. jsonb is shape-agnostic, so this
--   column locks in no design decision now.
alter table public.channels
  add column if not exists auth_ref text,
  add column if not exists settings jsonb not null default '{}'::jsonb;
