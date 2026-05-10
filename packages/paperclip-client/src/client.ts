export type PaperclipClientOptions = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  headers?: Record<string, string>;
};

export class PaperclipApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`paperclip ${status}`);
  }
}

export type RequestArgs = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export type PaperclipClient = {
  request<T = unknown>(args: RequestArgs): Promise<T>;
};

export function createPaperclipClient(opts: PaperclipClientOptions): PaperclipClient {
  return {
    async request<T>({ method, path, body, query }: RequestArgs): Promise<T> {
      const url = new URL(opts.baseUrl + path);
      if (query) {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined) url.searchParams.set(k, String(v));
        }
      }
      const res = await opts.fetch(url.toString(), {
        method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...opts.headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) throw new PaperclipApiError(res.status, payload);
      return payload as T;
    },
  };
}
