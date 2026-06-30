export { profiles } from './profiles.js';
export { userIdentities } from './user-identities.js';
export { joinRequest, joinLink } from './join.js';

// Identity helpers (consumed by minion_site auth path)
export { mapGoogleIdentity } from '../identity-mapper.js';
export type {
  GoTrueUserLike,
  GoogleGrant,
  MappedProfile,
  MappedIdentity,
} from '../identity-mapper.js';
export { sealSecret, openSecret } from '../crypto.js';
export { gateway, userGateway } from './gateway.js';
export { messages } from './messages.js';
// App tables migrated off Turso (telemetry/app split) — see
// docs/superpowers/specs/2026-06-05-turso-supabase-split-migration.md
export { userPreferences } from './user-preferences.js';
export { personalAgents } from './personal-agents.js';
export { settings } from './settings.js';
export { workshopSaves } from './workshop-saves.js';
export { deviceIdentities } from './device-identities.js';
export { files } from './files.js';
export { agentGroups, agentGroupMembers } from './agent-groups.js';
export { marketplaceAgents, marketplaceInstalls } from './marketplace.js';
export {
  builtSkills,
  builtSkillTools,
  builtChapters,
  builtChapterEdges,
  builtChapterTools,
  builtAgents,
  builtAgentSkills,
  agentBuiltSkills,
  builtTools,
} from './builder.js';
export {
  channels,
  channelAssignments,
  channelIdentities,
  channelBindings,
  channelPairingRequests,
} from './channels.js';
export { sessions, sessionTasks } from './sessions.js';
export { missions, tasks } from './missions.js';
export { chatMessages } from './chat-messages.js';
export { userAgents } from './user-agents.js';
export { skills, skillExecutionStats } from './skills.js';
export {
  serverBackups,
  serverProvisionConfigs,
  backupConfigs,
  configSnapshots,
} from './server-ops.js';
export { workspaceMembership } from './workspace-membership.js';
export type { WorkspaceMembership, NewWorkspaceMembership } from './workspace-membership.js';
// Org-scoped agent memory corpus (pgvector) — RAG retrieval + hub visualization.
export { agentMemories } from './agent-memories.js';
// Better Auth tables (Postgres) — Turso→Supabase Better Auth cutover (Track B).
// Export names mirror Better Auth's model names so the auth factory can pass
// this module straight to the drizzle adapter (provider: 'pg').
export {
  user,
  session,
  account,
  verification,
  jwks,
  organization,
  member,
  invitation,
  oauthApplication,
  oauthAccessToken,
  oauthConsent,
} from './auth.js';
