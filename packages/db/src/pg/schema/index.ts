export { profiles } from './profiles.js';
export { userIdentities } from './user-identities.js';

// Identity helpers (consumed by minion_site auth path)
export { mapGoogleIdentity } from '../identity-mapper.js';
export type {
  GoTrueUserLike,
  GoogleGrant,
  MappedProfile,
  MappedIdentity,
} from '../identity-mapper.js';
export { sealSecret, openSecret } from '../crypto.js';
