---
id: 2026-09-09-assistant-query-delegation-restoration
title: Restore typed assistant analytics and persisted brain delegation after security containment
status: draft
created: 2026-09-09
updated: 2026-09-09
repos: [minion_hub, minion, minion-meta]
---

# Assistant capability restoration

User authorized implementation of the platform QC work. Phase 09 / plan 09-01 contains the initial authorization defects on the existing local branch; this proposal tracks intentionally unavailable capabilities under Phase 15 / SEC-06. It authorizes no deployment or production data mutation.

## Containment contract

- Raw `/api/gateway/query` always returns 503 with `code: ASSISTANT_SQL_DISABLED`, `retryable: false`, and safe explanatory text. The legacy `runReadOnlyOrgQuery` function rejects before database access. No feature flag re-enables arbitrary SQL.
- Gateway personal-agent requests require the active persisted `personal_agents` owner/agent/gateway assignment, an unambiguous current `gateway` identity and org, token-org agreement and current membership. Gateway `userId` overrides are rejected. Browser self/admin paths retain their identity and membership checks.
- Gateway brain calls return `ASSISTANT_BRAIN_ASSIGNMENT_REQUIRED`: the current `brains` table persists agent/org but no gateway assignment. An org match or brain_access grant alone is not gateway delegation.
- Server creation/update no longer dump request credentials, URLs or arbitrary backend exception values into logs, analytics properties or HTTP error messages.

## Required restoration work

1. Replace flexible raw SQL with versioned server-owned dataset/query operations. Resolve tenant, module, owner and sensitive-field permissions before execution; enforce database-side row limits and bounded returned bytes. Qualify low-privilege personas with independent negative controls. Do not use statement-prefix checks or caller-mutable session context as an SQL sandbox.
2. Retire or mark unavailable the gateway's `crm_query` advertisement in `minion/src/agents/minion-tools.ts`, `tools/knowledge/crm-query-tool.ts`, its metadata/generated registry and dependent tool hints. Hub's existing tool-permissions response publishes module actions only, so adding a Hub-only field would not remove the advertised tool. Coordinate a real consumer contract and compatibility fixture rather than introducing an unused flag.
3. Persist an authoritative brain-agent/gateway/org assignment and its lifecycle, including revocation/reassignment and channel/runtime identity. Bind invocation identity to that assignment; a gateway can only act for the delegated principal/org. Add explicit negative and positive gateway integration tests before removing the fail-closed guard.
4. The Phase 09 seeded PGlite fixture now qualifies actual Drizzle assignment queries, database-backed membership and RBAC against canonical/legacy IDs with two synthetic orgs. Remaining acceptance must verify deployed PostgREST/JWT/pooler/RLS boundaries and actual runtime provisioning emits the persisted assignments expected by the resolver. Do not backfill or relax missing assignments automatically to restore old permissive behavior.
5. Review credential exposure in historical logs and rotate only credentials with established exposure under the operational owner's authorization. Code log removal is not evidence of historical cleanup or rotation.

## Source handoff pointers

- `minion_hub/src/server/services/assistant-query.service.ts`: typed analytics and gateway advertisement TODO(handoff).
- `minion_hub/src/server/auth/assistant-principal.ts`: brain assignment TODO(handoff).
- `.planning/phases/09-security-containment/09-01-SUMMARY.md`: exact source/test evidence and limits.

No security reproduction payloads, credentials or tenant records belong in this proposal.
