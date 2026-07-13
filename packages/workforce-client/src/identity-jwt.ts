import { SignJWT, jwtVerify } from 'jose';

export type IdentityClaims = {
  userId: string;
  email: string | null;
  name: string | null;
  companyId: string | null;
  roleKeys: string[];
};

const MAX_ROLE_KEYS = 20;
const MAX_ROLE_KEY_LENGTH = 80;
const ROLE_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/;

function normalizeRoleKeys(value: unknown): string[] {
  // Tokens minted before role-scoped HITL assignments did not carry this
  // claim. Treat that as an empty role set so exact-user assignments remain
  // backward compatible while role authorization fails closed.
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ROLE_KEYS) {
    throw new Error('invalid identity roleKeys');
  }

  const unique = new Set<string>();
  for (const roleKey of value) {
    if (
      typeof roleKey !== 'string' ||
      roleKey.length === 0 ||
      roleKey.length > MAX_ROLE_KEY_LENGTH ||
      roleKey.trim() !== roleKey ||
      !ROLE_KEY_PATTERN.test(roleKey)
    ) {
      throw new Error('invalid identity roleKey');
    }
    unique.add(roleKey);
  }
  return [...unique].sort();
}

function secretToKey(secret: string): Uint8Array {
  return new Uint8Array(Buffer.from(secret, 'base64'));
}

export async function mintIdentity(params: {
  secret: string;
  claims: IdentityClaims;
  ttlSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...params.claims, roleKeys: normalizeRoleKeys(params.claims.roleKeys) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + params.ttlSeconds)
    .sign(secretToKey(params.secret));
}

export async function verifyIdentity(params: {
  secret: string;
  token: string;
}): Promise<IdentityClaims> {
  const { payload } = await jwtVerify(params.token, secretToKey(params.secret), {
    algorithms: ['HS256'],
  });
  return {
    userId: String(payload.userId ?? ''),
    email: (payload.email as string | null) ?? null,
    name: (payload.name as string | null) ?? null,
    companyId: (payload.companyId as string | null) ?? null,
    roleKeys: normalizeRoleKeys(payload.roleKeys),
  };
}
