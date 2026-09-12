# ACP SDK qualification candidate

This directory is test-only. The production bridge still imports `src/acp-client.ts`; production TypeScript output and the package archive exclude this candidate. The exact SDK 1.4.0 and Zod 4.3.6 pins are development dependencies.

From the meta-repo root:

```sh
pnpm --filter @minion-stack/shells-bridge exec tsc -p tsconfig.qualification.json
pnpm --filter @minion-stack/shells-bridge exec vitest run test/qualification/acp-conformance.test.ts
```

The package's existing `test` command also discovers these tests. Tests spawn Node children with an allowlisted environment and temporary home/work directories. They require the installed official SDK example agent and fail if it is missing; no provider credentials or model calls are used.

Coverage includes initialization, agent-owned session creation, permission request IDs, default refusal, cancellation notification ordering, actual child exit, oversized input, bounded pending requests, local timeout uncertainty, SDK parse errors, and invalid terminal evidence. The SDK owns JSON-RPC and inbound request/notification validation. It does not validate generic response payloads; this candidate checks the version, session identifier and terminal reason it consumes.

The real SDK example agent reports `cancelled` during model work, but reports `end_turn` when cancellation arrives during its pending permission request. The negative test records that difference and must not be rewritten as cancellation acknowledgement.

## Adoption remains open

Do not replace the production adapter with this candidate until the caller session contract is selected and tested. Caller input is one text or multimodal message; it is not a complete conversation history. A fresh provider session for every invocation could discard context.

The follow-up must define persistent caller-to-provider session mapping, negotiated load/resume support, restart and backup behavior, refusal when continuity cannot be recovered, and isolation of late updates from earlier runs. Preserve gateway-issued durable identities, journal admission before dispatch, replay without reprompting, and unresolved/cancellation uncertainty. Real deployed harness and provider acceptance remains a separate gate.

See `proposals/2026-09-08-platform-qc-remediation.md`, section **11-04 ACP SDK continuation**. This candidate does not complete phase 11-04 or authorize runtime publication.
