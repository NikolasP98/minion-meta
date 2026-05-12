import { describe, expect, it } from 'vitest';
import { keys } from './keys';

describe('keys helpers', () => {
  it('hub key with tenant + user', () => {
    expect(keys.hub('agent-groups', { t: 'ten_abc', u: 'usr_xyz' }))
      .toBe('hub:v1:agent-groups:t=ten_abc:u=usr_xyz');
  });

  it('hub key with only tenant', () => {
    expect(keys.hub('sessions', { t: 'ten_abc' }))
      .toBe('hub:v1:sessions:t=ten_abc');
  });

  it('hub key with discriminator (alphabetized)', () => {
    expect(keys.hub('sessions', { t: 'ten_abc', d: { limit: 50, cursor: 'abc' } }))
      .toBe('hub:v1:sessions:t=ten_abc:cursor=abc:limit=50');
  });

  it('gateway global key', () => {
    expect(keys.gateway('skill-index')).toBe('gateway:v1:skill-index');
  });

  it('respects version override', () => {
    expect(keys.hub('agent-groups', { t: 't1' }, { v: 2 }))
      .toBe('hub:v2:agent-groups:t=t1');
  });

  it('throws on empty domain', () => {
    expect(() => keys.hub('', { t: 't1' })).toThrow();
  });
});
