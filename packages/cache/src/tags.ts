export const tags = {
  tenantDomain(tenantId: string, domain: string): string[] {
    return [`t:${tenantId}:${domain}`, `t:${tenantId}`, `d:${domain}`];
  },
  tenant(tenantId: string): string[] {
    return [`t:${tenantId}`];
  },
  entity(kind: string, id: string): string[] {
    return [`${kind}:${id}`];
  },
  user(userId: string): string[] {
    return [`u:${userId}`];
  },
  global(name: string): string[] {
    return [`global:${name}`];
  },
};
