export interface CacheInvalidatePayload {
  tags: string[];
  keys?: string[];
  source: 'hub' | 'gateway' | 'paperclip' | 'browser' | 'site';
  sourceId: string;
  tenantId: string;
  ts: number;
}

export interface CacheBroadcaster {
  emit(payload: CacheInvalidatePayload): Promise<void>;
}

export class NoopBroadcaster implements CacheBroadcaster {
  async emit(_payload: CacheInvalidatePayload): Promise<void> {
    // intentionally empty
  }
}
