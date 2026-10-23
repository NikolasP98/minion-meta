# Factory research and source reconciliation

## Pins and evidence class

Factory base `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`; meta base `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`. Registry currently selects npm/`dev` for Factory. Lockfile SHA-256: `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`. These are local source observations. Frozen `npm ci` completed with exit 0 on Node 22.23.3/npm 12.2.1, lock unchanged; installed Express 5.2.1, tsx 4.23.12 and TypeScript 5.9.3 were read from package files. Receipt: workspace `audits/2026-10-23-agent-harness-batches/setup/b-factory-install.json`. No old node_modules symlink is accepted as qualification.

## Decisions

| Decision | Rationale and alternatives considered |
|---|---|
| Separate run ledger from token map | Token revocation is authority, not a refund. Token-owned counters currently reset on mint. Distributed store is unnecessary for the approved single runner. |
| One in-flight request reserves remaining allowance | Prevents concurrency overshoot with existing fallback behavior. Multi-flight reservation engine is outside scope. |
| Unknown spend fences | Input-token estimate at `jev-proxy.ts:44–49,234–243` cannot establish full bill; retain unknown instead of presenting guessed cost. |
| Keep v2 receipt reconciliation | Slices 6–7 already landed; replacing envelopes would discard settled evidence and expand scope. |
| Duration propagated through shell and route | Setting only `FACTORY_JEV_TIMEOUT_S` does not shorten current proxy timeout. Absolute cross-host timestamps are unnecessary and untrusted. |
| Preserve direct host compatibility | Unstick host/direct calls lack a proxy run capability; do not claim the per-run cap covers them or silently move secrets. |
| Add accounting coverage at current callers | Existing slice 6 `TODO(handoff)` explicitly assigns failed/unknown receipts to slice 8. Keep numeric subtotal for older consumers and qualify structured totals. |

## Installed contracts to qualify

`runner/package.json` declares Express `^5.1.0`, tsx `^4.20.0`, TypeScript `^5.8.0`; exact versions come from frozen lock installation receipt. `agent/Dockerfile:27–31` pins Claude Code `2.1.233`, Codex `0.147.0`, pnpm `11.22.0`, Bun `1.3.14`; `/etc/factory-toolchain.json` is populated from installed versions during image build. Harness proof must use the pinned installed artifact; reading these ARGs alone is insufficient.

## Open verification gates

Real HTTP/body/disconnect regressions, installed harness timing, full declared gates and independent Standards/Spec code review remain implementation work. No runtime behavior, tests or release are claimed by this SDD. There are no unresolved design alternatives requiring a new owner decision.

## Review corrections, pass 2

Independent pass1 B-P1-02 required authoritative terminal retirement/no-remint before ledger cleanup; token expiry is insufficient. Pass2 B2-01 traced cost loss through guard temp cleanup, actual run/spec/reconcile emitters and queue FinishResult/settlement. The contract now defines a bounded durable v2 journal and preserves incomplete coverage through those exact paths. B2-02 requires revision-aware terminal stats refresh after late settlement. Stub heading correction follows TEMPLATE.md body lint. Exact pinned Claude2.1.233 binary is provisioned with setup receipt; runtime loopback execution remains T013, not inferred from version output.
