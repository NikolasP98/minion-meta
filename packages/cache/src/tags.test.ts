import { describe, expect, it } from 'vitest';
import { tags } from './tags';

describe('tags helpers', () => {
  it('tenantDomain returns scoped + tenant + domain', () => {
    expect(tags.tenantDomain('ten_abc', 'agent-groups')).toEqual([
      't:ten_abc:agent-groups',
      't:ten_abc',
      'd:agent-groups',
    ]);
  });

  it('tenant returns just the tenant tag', () => {
    expect(tags.tenant('ten_abc')).toEqual(['t:ten_abc']);
  });

  it('entity returns entity-scoped tag', () => {
    expect(tags.entity('agent', 'agt_123')).toEqual(['agent:agt_123']);
  });

  it('user returns user tag', () => {
    expect(tags.user('usr_xyz')).toEqual(['u:usr_xyz']);
  });

  it('global returns global:<name>', () => {
    expect(tags.global('skill-index')).toEqual(['global:skill-index']);
  });
});
