---
"@minion-stack/db": minor
---

Add linked-channel rule columns to `channels` (intent: `enabled`, `replies`, `allow_from`, `group_allow_from`, `require_mention`; observed: `reconnect_count`, `last_seen_at`, `last_error`) and a new `channel_bindings` table for per-channel agent routing (`agent_id` NULL = explicit noAgent). Moves per-channel rules out of the gateway's `gateway.json` so channel enable/disable + reply policy become runtime-applied and hub-editable. Migration: `20260619180000_linked_channels_rules`. See `specs/2026-06-19-linked-channels-config-restructure.md`.
