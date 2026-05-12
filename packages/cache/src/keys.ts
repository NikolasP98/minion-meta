type Scope = { t?: string; u?: string; d?: Record<string, string | number> };
type Build = (domain: string, scope?: Scope, opts?: { v?: number }) => string;

function build(namespace: string): Build {
  return (domain, scope = {}, opts = {}) => {
    if (!domain) throw new Error('domain is required');
    const v = opts.v ?? 1;
    const parts: string[] = [`${namespace}:v${v}:${domain}`];
    if (scope.t) parts.push(`t=${scope.t}`);
    if (scope.u) parts.push(`u=${scope.u}`);
    if (scope.d) {
      const sorted = Object.keys(scope.d).sort();
      for (const k of sorted) parts.push(`${k}=${scope.d[k]}`);
    }
    return parts.join(':');
  };
}

export const keys = {
  hub: build('hub'),
  gateway: build('gateway'),
  paperclip: build('paperclip'),
  site: build('site'),
};
