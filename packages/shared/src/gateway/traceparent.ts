// W3C Trace Context generator. Lets the dashboard stamp an outgoing request
// frame with a `traceparent` so the gateway can root its server span under the
// same trace — distributed-trace stitching without pulling a full OTel SDK into
// the browser bundle (a traceparent is just a formatted string).
// See https://www.w3.org/TR/trace-context/#traceparent-header

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;
const ZERO_TRACE_ID = '0'.repeat(32);

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let s = '';
  for (const b of a) s += b.toString(16).padStart(2, '0');
  return s;
}

/** Extract the 16-byte trace id from a W3C traceparent, or undefined if absent/invalid. */
export function traceIdOf(traceparent: string | undefined | null): string | undefined {
  if (!traceparent) return undefined;
  const m = TRACEPARENT_RE.exec(traceparent.trim());
  if (!m || m[1] === ZERO_TRACE_ID) return undefined;
  return m[1];
}

/**
 * Mint a W3C `traceparent`: `00-<16-byte trace id>-<8-byte span id>-01`.
 *
 * Pass a `parent` traceparent (e.g. the trace started by the SvelteKit server
 * for this navigation) to make the result a CHILD — it keeps the parent's trace
 * id and only mints a fresh span id, so the request stitches into the parent's
 * trace instead of being an orphan root. With no parent, a fresh root trace is
 * minted. The `01` flag marks the trace as sampled.
 */
export function newTraceparent(parent?: string): string {
  const traceId = traceIdOf(parent) ?? randHex(16);
  return `00-${traceId}-${randHex(8)}-01`;
}
