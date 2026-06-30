// W3C Trace Context generator. Lets the dashboard stamp an outgoing request
// frame with a `traceparent` so the gateway can root its server span under the
// same trace — distributed-trace stitching without pulling a full OTel SDK into
// the browser bundle (a traceparent is just a formatted string).
// See https://www.w3.org/TR/trace-context/#traceparent-header

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let s = '';
  for (const b of a) s += b.toString(16).padStart(2, '0');
  return s;
}

/**
 * Mint a new W3C `traceparent` value: `00-<16-byte trace id>-<8-byte span id>-01`.
 * The `01` flag marks the trace as sampled.
 */
export function newTraceparent(): string {
  return `00-${randHex(16)}-${randHex(8)}-01`;
}
