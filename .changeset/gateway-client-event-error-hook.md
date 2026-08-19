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

No protocol, frame-type, or reconnect-timing change.
