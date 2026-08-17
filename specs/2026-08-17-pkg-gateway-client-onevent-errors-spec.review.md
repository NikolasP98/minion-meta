---
spec: 2026-08-17-pkg-gateway-client-onevent-errors-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

Changes made:

- Set `status: approved`, `pass: 2`, and `verdict: approved` so the lifecycle fields agree after a successful second-pass review.
- Limited the current-failure claim from every indefinitely reconnecting client to failed reconnect attempts, matching what the new hook can actually observe.
- Expanded the post-fix summary to name all three in-scope failure sources, making it consistent with the S2 extension.
- Defined arrival order as handler invocation order and explicitly left concurrent async completion/report order unconstrained.
- Restricted the two-event ordering test to synchronous failures so its expected order is deterministic.
- Replaced S2's claim that a transport error necessarily carries a cause with the runtime-neutral socket error callback value.
- Removed the unsupported claim that all three consumers drive Svelte state and left the absent paperclip handler shape to Slice 0.
- Defined `onSocketError` as receiving the exact runtime-emitted value and made its fallback acceptance criterion machine-checkable.
- Required `onReconnectError` to receive the exact delay captured for that scheduled attempt, removing ambiguity about the `attempt.delayMs` value.
- Corrected the silent-catch goal and grep checks to account for both intentional catches: malformed-frame discard and broken-reporting-hook containment.
- Qualified the reconnect log-rate estimate for immediate versus delayed connection failures.
- Scoped the payload-safe JSDoc requirement to `onEventError` while requiring context-specific fallback documentation for the other hooks.
- Distinguished reconnect failures that trigger a socket close from constructor failures, which do not schedule a subsequent attempt under current control flow.
- Reworked the S2 smoke scenario to use close-before-hello for the backoff-continuity assertion and test constructor rejection separately.
- Clarified the out-of-scope ordering language as frame-arrival invocation order.
- Replaced the unverifiable claim that consumers cannot bump on the same day with the actual dependency: they must wait for publication after the version-package merge.
- Changed both built-artifact smoke-test WebSocket injections from arrow functions to constructible functions because `GatewayClient` invokes `WebSocketImpl` with `new`.

Human flags: none.
