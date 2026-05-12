// Cache invalidation gateway event frame.
//
// Convention follows existing EventFrame in ./types.ts:
//   { type: 'event', event: '<name>', payload: {...} }
// (No `v: 3` discriminator — the gateway WS protocol does not version frames.)

export type CacheInvalidateSource = 'hub' | 'gateway' | 'paperclip' | 'browser' | 'site';

export interface CacheInvalidatePayload {
  /** Tag names whose entries should be busted. Always present (may be empty if `keys` covers the bust). */
  tags: string[];
  /** Optional surgical key list — busted in addition to tag-matched keys. */
  keys?: string[];
  /** Runtime that originated the mutation. */
  source: CacheInvalidateSource;
  /** Per-process unique id so emitters can dedupe their own busts. */
  sourceId: string;
  /** Tenant scope — subscribers may gate on this. Empty string means global/no-tenant. */
  tenantId: string;
  /** Emission timestamp, ms since epoch. */
  ts: number;
}

export interface CacheInvalidateEvent {
  type: 'event';
  event: 'cache.invalidate';
  payload: CacheInvalidatePayload;
}

export function isCacheInvalidateEvent(value: unknown): value is CacheInvalidateEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.type !== 'event' || v.event !== 'cache.invalidate') return false;
  if (typeof v.payload !== 'object' || v.payload === null) return false;
  const p = v.payload as Record<string, unknown>;
  return (
    Array.isArray(p.tags) &&
    typeof p.source === 'string' &&
    typeof p.sourceId === 'string' &&
    typeof p.tenantId === 'string' &&
    typeof p.ts === 'number'
  );
}
