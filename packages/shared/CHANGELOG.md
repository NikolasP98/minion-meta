# @minion-stack/shared

## 0.2.0

### Minor Changes

- b7aa4fd: Initial release of `@minion-stack/shared` — gateway protocol types and utilities migrated from `minion-shared`.

  Exports:
  - Root (`.`): all gateway types + utils re-exported
  - `./gateway`: `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `PendingRequest`, `sendRequest`, `handleResponseFrame`, `flushPending`, connection utilities
  - `./utils`: `uuid`, `parseAgentSessionKey`, `extractText`, `cleanText`, `parseGatewayMetadata`, `extractMessageTimestamp`
