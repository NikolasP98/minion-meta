import { describe, it, expect, vi } from 'vitest';
import { createAuth } from './factory.js';
import { organization } from 'better-auth/plugins';

describe('createAuth factory', () => {
  const base = {
    db: {} as unknown,
    schema: {} as Record<string, unknown>,
    secret: 'test-secret-min-32-chars-xxxxxxxxxxx',
    baseURL: 'http://localhost:5173',
  };

  it('returns a Better Auth instance with handler and api', () => {
    const auth = createAuth(base);
    expect(typeof auth.handler).toBe('function');
    expect(auth.api).toBeDefined();
    expect(typeof auth.api.getSession).toBe('function');
  });

  it('appends caller plugins to the default jwt plugin', () => {
    const auth = createAuth({ ...base, plugins: [organization()] });
    const pluginIds = (auth.options.plugins ?? []).map((p: any) => p.id);
    expect(pluginIds).toContain('jwt');
    expect(pluginIds).toContain('organization');
  });

  it('sets useSecureCookies false for http baseURL', () => {
    const auth = createAuth(base);
    expect(auth.options.advanced?.useSecureCookies).toBe(false);
  });

  it('sets useSecureCookies true for https baseURL', () => {
    const auth = createAuth({ ...base, baseURL: 'https://hub.example.com' });
    expect(auth.options.advanced?.useSecureCookies).toBe(true);
  });

  it('includes default localhost trusted origins', () => {
    const auth = createAuth(base);
    expect(auth.options.trustedOrigins).toEqual(
      expect.arrayContaining([
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4173',
      ])
    );
  });

  it('appends caller-supplied trustedOrigins', () => {
    const auth = createAuth({ ...base, trustedOrigins: ['https://vercel.example.app'] });
    expect(auth.options.trustedOrigins).toContain('https://vercel.example.app');
  });

  it('omits google socialProvider when google param absent', () => {
    const auth = createAuth(base);
    expect((auth.options.socialProviders as any)?.google).toBeUndefined();
  });

  it('sets google socialProvider when google param provided', () => {
    const auth = createAuth({ ...base, google: { clientId: 'id', clientSecret: 'sec' } });
    expect((auth.options.socialProviders as any)?.google).toEqual({
      clientId: 'id',
      clientSecret: 'sec',
    });
  });

  it('enables accountLinking with google trusted provider by default', () => {
    const auth = createAuth(base);
    expect(auth.options.accountLinking?.enabled).toBe(true);
    expect(auth.options.accountLinking?.trustedProviders).toContain('google');
  });

  it('forwards hooks param', () => {
    const after = vi.fn();
    const auth = createAuth({ ...base, hooks: { after: after as any } });
    expect(auth.options.hooks?.after).toBe(after);
  });

  it('jwt plugin uses baseURL as issuer and openclaw-gateway as audience', () => {
    const auth = createAuth(base);
    const jwtPlugin: any = (auth.options.plugins ?? []).find((p: any) => p.id === 'jwt');
    expect(jwtPlugin).toBeDefined();
    expect(jwtPlugin?.options?.jwt?.issuer).toBe('http://localhost:5173');
    expect(jwtPlugin?.options?.jwt?.audience).toBe('openclaw-gateway');
  });

  it('jwt plugin uses EdDSA alg and 1h expirationTime', () => {
    const auth = createAuth(base);
    const jwtPlugin: any = (auth.options.plugins ?? []).find((p: any) => p.id === 'jwt');
    expect(jwtPlugin?.options?.jwks?.keyPairConfig?.alg).toBe('EdDSA');
    expect(jwtPlugin?.options?.jwt?.expirationTime).toBe('1h');
  });
});
