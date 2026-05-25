export interface GoTrueUserLike {
  id: string;
  email: string | null;
  user_metadata?: { full_name?: string; name?: string; provider_id?: string } | null;
  app_metadata?: { provider?: string } | null;
}

export interface GoogleGrant {
  refreshToken: string | null;
  scope: string | null;
}

export interface MappedProfile {
  id: string;
  email: string;
  displayName: string | null;
}

export interface MappedIdentity {
  userId: string;
  provider: 'google';
  kind: 'oauth';
  externalId: string; // google email
  displayName: string | null;
  scope: string | null;
  hasSecret: boolean;
}

/** Pure mapping — no DB, no crypto. Caller seals the secret and upserts. */
export function mapGoogleIdentity(
  user: GoTrueUserLike,
  grant: GoogleGrant,
): { profile: MappedProfile; identity: MappedIdentity } {
  const email = user.email ?? '';
  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  return {
    profile: { id: user.id, email, displayName },
    identity: {
      userId: user.id,
      provider: 'google',
      kind: 'oauth',
      externalId: email,
      displayName,
      scope: grant.scope,
      hasSecret: Boolean(grant.refreshToken),
    },
  };
}
