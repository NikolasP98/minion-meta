-- Phase 3c — drop personality columns. Personality state now lives in
-- gateway config (`agents.list[].personality.*`). Apply with the
-- @minion-stack/db v0.3.0 release (paired with 0012_drop_personal_agents_display_name).
ALTER TABLE `personal_agents` DROP COLUMN `personality_preset`;
ALTER TABLE `personal_agents` DROP COLUMN `personality_text`;
ALTER TABLE `personal_agents` DROP COLUMN `personality_configured`;
ALTER TABLE `personal_agents` DROP COLUMN `conversation_name`;
