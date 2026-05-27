import { describe, it, expect } from 'vitest';
import { buildConnectParams } from './connect-params.js';
import { PROTOCOL_VERSION } from './client.js';

const client = { id: 'minion-control-ui', version: '1.0', platform: 'web' as const };

describe('buildConnectParams', () => {
  it('defaults protocol to PROTOCOL_VERSION and scopes/caps to []', () => {
    const p = buildConnectParams({ client, role: 'operator' });
    expect(p.minProtocol).toBe(PROTOCOL_VERSION);
    expect(p.maxProtocol).toBe(PROTOCOL_VERSION);
    expect(p.scopes).toEqual([]);
    expect(p.caps).toEqual([]);
    expect(p.role).toBe('operator');
  });

  it('includes auth.token only when a token is provided', () => {
    expect(buildConnectParams({ client, role: 'operator' }).auth).toBeUndefined();
    const p = buildConnectParams({ client, role: 'operator', token: 'tok' });
    expect(p.auth).toEqual({ token: 'tok' });
  });

  it('carries password, jwt and userId through when present', () => {
    const p = buildConnectParams({
      client,
      role: 'operator',
      password: 'pw',
      jwt: 'jwt-abc',
      userId: 'user-1',
      scopes: ['operator.read'],
    });
    expect(p.auth).toEqual({ password: 'pw' });
    expect(p.jwt).toBe('jwt-abc');
    expect(p.userId).toBe('user-1');
    expect(p.scopes).toEqual(['operator.read']);
  });

  it('omits jwt/userId/auth for empty-string and null inputs', () => {
    const p = buildConnectParams({ client, role: 'node', token: '', jwt: null, userId: null });
    expect(p.auth).toBeUndefined();
    expect('jwt' in p).toBe(false);
    expect('userId' in p).toBe(false);
  });
});
