---
"@minion-stack/shared": minor
---

`GatewayClient` no longer discards failures from your `onEvent` handler: both
synchronous throws and rejected promises are now reported exactly once.

New optional `onEventError(err, frame)` receives them — omit it and the client
falls back to `console.error`, or pass `() => {}` to opt into silence
explicitly. The hook may be sync or async; a reporter that itself fails is
contained and never escapes as an unhandled rejection. The fallback log names
the event only, never the payload.

The same release closes the two sibling lifecycle swallows. New optional
`onReconnectError(err, { delayMs })` receives the rejection from a failed
auto-reconnect attempt, together with the backoff delay that attempt was
scheduled with — previously every failed reconnect was discarded silently.
Omit it and the client falls back to `console.error`. Note there is no dedupe:
a gateway that stays down logs one line per attempt, roughly every 15s once the
backoff reaches its cap.

New optional `onSocketError(err)` receives the value the runtime hands the
socket's `error` event (an `Error` under Node `ws`, typically an `Event` in
browsers), which was previously dropped. Omit it and the client falls back to
`console.error`. It is reporting only — `close` still drives every lifecycle
decision — and a stale socket belonging to a superseded connection reports
nothing. Like `onEventError`, both new hooks may be sync or async, and a
reporter that itself throws or rejects is contained.

No protocol, frame-type, or reconnect-timing change.
