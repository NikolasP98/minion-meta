-- Message idempotency is enforced by the org-scoped client-id and provider-id
-- unique indexes. The standalone global message_id index had zero scans in the
-- production statistics window and consumed substantial storage.
drop index if exists public.messages_message_id_idx;
