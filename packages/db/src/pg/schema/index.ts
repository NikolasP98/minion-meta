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
