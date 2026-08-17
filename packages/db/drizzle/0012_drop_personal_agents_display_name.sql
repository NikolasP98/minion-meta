-- Drop personal_agents.display_name column.
-- Display name now lives in the gateway config (`agents.list[].identity.name`)
-- as the single source of truth. /my-agent writes via config.patch directly.
-- See PROJECT_HUB_COMMAND_CENTER_REDESIGN — Phase 2b consolidation.
ALTER TABLE `personal_agents` DROP COLUMN `display_name`;
