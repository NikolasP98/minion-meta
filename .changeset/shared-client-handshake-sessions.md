---
"@minion-stack/shared": minor
---

GatewayClient: add an optional `onAuthenticated(hello, { generation })` hook that fires exactly once per successful handshake on the current socket, including internal auto-reconnects. The connect promise settles before the observer runs, and observer throws/rejections are contained with a fixed non-payload diagnostic.

Handshake state is now owned per connection attempt: stale challenge, response and error continuations from a superseded socket can no longer send, settle, close or publish on its successor, and failed or explicitly closed handshakes clean up their pending promises and timers.
