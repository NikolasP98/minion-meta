import { describe, it, expect } from 'vitest';
import { mapGoogleIdentity, type GoTrueUserLike } from './identity-mapper.js';

const gotrueUser: GoTrueUserLike = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'nik@example.com',
  user_metadata: { full_name: 'Nik P', provider_id: 'google-sub-123' },
  app_metadata: { provider: 'google' },
};

describe('mapGoogleIdentity', () => {
  it('produces a profile row from the GoTrue user', () => {
    const { profile } = mapGoogleIdentity(gotrueUser, { refreshToken: 'rt', scope: 'email profile' });
    expect(profile).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'nik@example.com',
      displayName: 'Nik P',
    });
  });

  it('produces a google oauth identity keyed by email as externalId', () => {
    const { identity } = mapGoogleIdentity(gotrueUser, { refreshToken: 'rt', scope: 'email profile' });
    expect(identity.provider).toBe('google');
    expect(identity.kind).toBe('oauth');
    expect(identity.externalId).toBe('nik@example.com');
    expect(identity.userId).toBe(gotrueUser.id);
    expect(identity.scope).toBe('email profile');
    expect(identity.hasSecret).toBe(true);
  });

  it('marks hasSecret false when no refresh token present', () => {
    const { identity } = mapGoogleIdentity(gotrueUser, { refreshToken: null, scope: null });
    expect(identity.hasSecret).toBe(false);
  });
});
