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

export interface HttpBroadcasterOptions {
  url: string;
  token?: string;
  timeoutMs?: number;
  /** Test-injectable fetch. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  onError?: (err: Error) => void;
}

export class HttpBroadcaster implements CacheBroadcaster {
  private readonly url: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly onError?: (err: Error) => void;

  constructor(opts: HttpBroadcasterOptions) {
    this.url = opts.url;
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 2_000;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.onError = opts.onError;
  }

  async emit(payload: CacheInvalidatePayload): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error(`HttpBroadcaster timeout after ${this.timeoutMs}ms`)),
      this.timeoutMs,
    );
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (this.token) headers.authorization = `Bearer ${this.token}`;
      const res = await this.fetchImpl(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HttpBroadcaster: ${res.status} ${res.statusText} ${text}`);
      }
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      clearTimeout(timer);
    }
  }
}
