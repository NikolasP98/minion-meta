---
"@minion-stack/shared": minor
---

Distributed-trace stitching for gateway requests. The WS client now stamps every
outgoing request frame with a W3C `traceparent`, and `newTraceparent(parent?)` is
parent-aware so a request can descend from an upstream trace (child span id)
instead of always minting a random root. `GatewayClient` gains a
`getParentTraceparent` option + `setParentTraceparent()`, `sendRequest()` takes an
optional parent, and `traceIdOf()` is exported. `RequestFrame` gains an optional
`traceparent` field.

Consumers (hub, site, paperclip) can bump to this version to make their
gateway RPCs nest under a server-side trace.
