import { describe, it, expect } from 'vitest';
import { mintIdentity, verifyIdentity } from './identity-jwt.js';

const SECRET = 'a'.repeat(43) + '='; // 32 bytes base64

describe('identity-jwt', () => {
  it('round-trips claims', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: { userId: 'u1', email: 'a@b.c', name: 'A', companyId: 'c1' },
      ttlSeconds: 60,
    });
    const verified = await verifyIdentity({ secret: SECRET, token });
    expect(verified.userId).toBe('u1');
    expect(verified.email).toBe('a@b.c');
    expect(verified.companyId).toBe('c1');
  });

  it('rejects expired tokens', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: { userId: 'u1', email: null, name: null, companyId: null },
      ttlSeconds: -1,
    });
    await expect(verifyIdentity({ secret: SECRET, token })).rejects.toThrow();
  });

  it('rejects tokens signed with the wrong secret', async () => {
    const token = await mintIdentity({
      secret: SECRET,
      claims: { userId: 'u1', email: null, name: null, companyId: null },
      ttlSeconds: 60,
    });
    const other = 'b'.repeat(43) + '=';
    await expect(verifyIdentity({ secret: other, token })).rejects.toThrow();
  });
});
