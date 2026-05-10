import { SignJWT, jwtVerify } from 'jose';

export type IdentityClaims = {
  userId: string;
  email: string | null;
  name: string | null;
  companyId: string | null;
};

function secretToKey(secret: string): Uint8Array {
  return new Uint8Array(Buffer.from(secret, 'base64'));
}

export async function mintIdentity(params: {
  secret: string;
  claims: IdentityClaims;
  ttlSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...params.claims })
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
  };
}
