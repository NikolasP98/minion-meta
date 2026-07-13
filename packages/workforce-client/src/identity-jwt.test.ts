import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { mintIdentity, verifyIdentity } from './identity-jwt.js';

const SECRET = 'a'.repeat(43) + '='; // 32 bytes base64

describe('identity-jwt', () => {
  it('round-trips claims', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: {
        userId: 'u1',
        email: 'a@b.c',
        name: 'A',
        companyId: 'c1',
        roleKeys: ['staff', 'project:reviewer', 'staff'],
      },
      ttlSeconds: 60,
    });
    const verified = await verifyIdentity({ secret: SECRET, token });
    expect(verified.userId).toBe('u1');
    expect(verified.email).toBe('a@b.c');
    expect(verified.companyId).toBe('c1');
    expect(verified.roleKeys).toEqual(['project:reviewer', 'staff']);
  });

  it('rejects expired tokens', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: { userId: 'u1', email: null, name: null, companyId: null, roleKeys: [] },
      ttlSeconds: -1,
    });
    await expect(verifyIdentity({ secret: SECRET, token })).rejects.toThrow();
  });

  it('rejects tokens signed with the wrong secret', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: { userId: 'u1', email: null, name: null, companyId: null, roleKeys: [] },
      ttlSeconds: 60,
    });
    const other = 'b'.repeat(43) + '=';
    await expect(verifyIdentity({ secret: other, token })).rejects.toThrow();
  });

  it('treats a legacy token without roles as an empty role set', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      userId: 'u1',
      email: null,
      name: null,
      companyId: 'c1',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new Uint8Array(Buffer.from(SECRET, 'base64')));

    await expect(verifyIdentity({ secret: SECRET, token })).resolves.toMatchObject({ roleKeys: [] });
  });

  it('rejects malformed or oversized role claims', async () => {
    await expect(
      mintIdentity({
        secret: SECRET,
        claims: {
          userId: 'u1',
          email: null,
          name: null,
          companyId: 'c1',
          roleKeys: [' staff'],
        },
        ttlSeconds: 60,
      }),
    ).rejects.toThrow('invalid identity roleKey');

    await expect(
      mintIdentity({
        secret: SECRET,
        claims: {
          userId: 'u1',
          email: null,
          name: null,
          companyId: 'c1',
          roleKeys: Array.from({ length: 65 }, (_, index) => `role-${index}`),
        },
        ttlSeconds: 60,
      }),
    ).rejects.toThrow('invalid identity roleKeys');
  });
});
