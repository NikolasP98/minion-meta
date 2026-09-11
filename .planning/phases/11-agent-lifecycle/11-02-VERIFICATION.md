---
phase: 11-agent-lifecycle
plan: "02"
status: gaps_found
slice_status: passed
requirements_completed: []
verified: 2026-09-09
---

# Independent Shells admission verification

The bounded active-admission slice passes. Full AGT-03 and phase11 remain open for durable request identity, terminal receipts, confirmed cancellation, restore and actual ACP harness conformance. Root reviewed the executor's source and independently ran the fixture suite.

## Independent finding and correction

The first candidate parsed JSON and accessed frame.type without a nonnull-object guard. An actual no-provider call to Bridge.onFrame with JSON null threw TypeError outside request error handling. The executor added a guard and seven malformed/recovery cases within the same two source files. The final independent package test run passes18/18 in597ms. Each malformed case exercises subsequent healthy invocation, busy rejection and delta routing. Full frame shape/size/authority validation remains14-01; this guard alone is not a protocol validator.

## Verified behavior

- Synchronous reservation enforces the advertised one active run across sessions. Identical active frame IDs on the same connection replay the original result; conflicting params are denied before another ACP call.
- Completion and release require the same run identity. Obsolete WebSocket messages/open/close cannot replace or erase the current connection, and a reconnect cannot admit another prompt while the old one is active.
- Harness exit and shutdown stop admission. Cancel acknowledgement keeps the reservation until prompt settlement; unknown cancellation leaves it untouched.
- Missing test discovery now fails. Independent deliberate no-suite selection exited1, rather than the former green no-op.

Source inspection and18 independently rerun fake-transport tests support these claims. No real model/harness process, device token, restore or production endpoint was used. Independent typecheck also passed for the final guard candidate. The only manifest change is removal of passWithNoTests. Existing ACP client WIP remains untouched.

## Scope and unresolved gates

Active request identity is bounded by one active run and the original connection. Completed IDs are not retained; reconnect/end-user retries may carry new gateway frame IDs. These are11-03 requirements. ACP session updates do not carry run IDs, so delayed updates after an uncertain timeout cannot be attributed to a historical run by this patch. Returning cancelled:true is acknowledgement of the existing call, not proof that a remote effect stopped. Final events can still be lost while disconnected and restore remains unquiesced; existing exact source handoffs and the QC proposal retain11-03/04 work.

Malformed input guard, busy/replay and identity-safe release are source-verified. No unsupported claim of durable execution, deployed adoption or whole-agent-layer certification is made.

## Candidate SHA-256

| File | SHA-256 |
|---|---|
| `packages/shells-bridge/src/bridge.ts` | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` |
| `packages/shells-bridge/src/bridge.test.ts` | `fee02b7c9740827a6e95197963e788f346b7a126e17cd1d5772f9d15d3029f0b` |
| `packages/shells-bridge/package.json` | `63cf520c4051fe62881fc2cd1b36089b2b53691d2918850b0dc40a3d2b9b0ad9` |
