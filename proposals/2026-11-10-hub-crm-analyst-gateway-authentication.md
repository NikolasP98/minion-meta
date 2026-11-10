---
id: 2026-11-10-hub-crm-analyst-gateway-authentication
title: Restore authenticated CRM analyst tools without widening CRM access
status: in-spec
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
tags: [auth]
effort: S
source: owner-reported CRM analyst chat failure
spawned_spec: 2026-11-10-hub-crm-analyst-gateway-authentication-spec
---

# Restore authenticated CRM analyst tools

The owner reported a CRM Insights conversation whose assistant said that CRM
needed authentication. The actual failure occurs at Hub's gateway authentication
boundary, before the CRM permission check. Anonymous machine identity reaches
the handler, whose trusted-principal resolver returns 401. This proposal records the confirmed
incident and a scoped repair for owner approval. No functional patch or deployment
had been made at the initial investigation checkpoint. The owner subsequently
conditionally approved implementation after EGM, which passed; current source
and qualification state are recorded in the spawned spec.

## AS-IS

- The matching gateway chat history contains a `crm_conversation_themes` call with
  empty arguments on 2026-11-09 at 16:07 UTC. Its tool result is HTTP 401,
  `HUB_HTTP_401`, `Authentication required`. The final assistant response incorrectly
  suggests reconnecting the CRM integration.
- A bounded, read-only production check using the affected principal's assigned
  gateway credential and configured server identity returns HTTP 200 from
  `/api/gateway/query/tool-permissions`, with CRM `view`, `create`, and `edit`.
  The same identity returns HTTP 401 from both routes below. Search was probed
  with an empty body to avoid embeddings or model calls.
- In Hub production commit `206d9ae218efd4bf682d6c4063797c7441f4d52a`,
  `src/server/auth/resolve-identity.ts` does not include these exact paths in its
  gateway-token allowlist:
  - `/api/gateway/crm-conversation-themes`
  - `/api/gateway/search-crm-conversations`
  Valid gateway credentials consequently fall through to browser-session auth.
- Both handlers already call `resolveAssistantPrincipal` and check `crm:view`.
  Their aggregate/search calls currently do not enforce CRM owner scope or
  sensitive-field restrictions. Restoring machine access must account for this.
- Fresh gateway `origin/DEV` at `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`
  already registers `serverId` and sends `x-minion-server-id` in Hub requests.
  An initial hypothesis based on an older local checkout is superseded; no
  gateway identity patch is proposed.

Private diagnostic receipts remain outside git. They contain chat/principal
information and must not be included in public source, PRs, or fixtures.

## TO-BE

The affected FACES user can ask CRM conversation questions through their assigned
agent. Hub admits a valid gateway credential on only the two named routes, then
resolves the current principal and enforces existing organization assignment,
membership, CRM permissions, and the search AI entitlement.

For this repair, both endpoints explicitly reject CRM roles with owner-only or
sensitive-field restrictions before any conversation data is retrieved or any
embedding is generated. Supporting those roles requires separately qualified
scoped retrieval and masking; an unrestricted result is never a fallback.

Invalid credentials, arbitrary agent IDs, foreign organization assignments, and
insufficient permissions continue to fail closed. No role permissions, tokens,
organization settings, database schema, or gateway configuration change.

## DELTA

1. Add only these two exact equality checks to `isServerTokenPath` in
   `src/server/auth/resolve-identity.ts`. Preserve existing credential matching,
   configured server hints, browser fallback, and the trusted principal resolver.
2. After trusted principal resolution and `crm:view`, add this guard to each of
   the two existing route handlers, using `SENSITIVE_FIELD_LEVEL` from
   `$lib/permissions`:

   ```ts
   capabilities.ownerScoped('crm') ||
   capabilities.fieldLevel('crm') < SENSITIVE_FIELD_LEVEL
   ```

   Return HTTP 403 with code `CRM_CONVERSATION_SCOPE_UNSUPPORTED` and a concise
   explanation that conversation analysis is unavailable for roles with record
   or sensitive-field restrictions. Preserve search's AI entitlement gate.
3. At both guards, leave `TODO(handoff)` comments pointing to
   `proposals/2026-11-10-crm-conversation-restricted-role-support.md` for the bounded
   follow-up: owner-filtered retrieval and qualified sensitive-field handling.
   Analysis already accepts an owner filter; semantic search needs a qualified
   owner-aware query. Do not treat this as permission to remove either guard.
4. Add authentication regression tests for both exact routes, invalid/missing
   credentials, configured identity selection with shared-token rows, and nearby
   unlisted paths. Add handler tests for unrestricted CRM access, denied CRM,
   owner scope, field-level restriction, principal rejection, and the existing
   search entitlement. Rejected calls must not invoke data or embedding services.
5. Run the focused regression tests, Hub check/test/build, and independent
   standards/spec review on the exact candidate. After separately approved merge
   and deployment, verify the configured gateway/principal route admission and
   CRM result. A local green test is not production repair evidence.

## Gates and delivery state

- Investigation and read-only reproduction: complete.
- Independent source review: recommends this narrow Hub-only repair, preserving
  principal authority and rejecting unsupported restricted roles.
- Owner decision: "I approve after you've passed it thu egm." Full EGM passed
  with two consecutive clean feature and technical rounds; the conditional
  implementation approval is satisfied. Actual reports are under
  `audits/2026-11-10-crm-analyst-auth/egm/`.
- Spec: approved for implementation after EGM. Security-tagged work keeps the
  approval and merge gates required by root `AGENTS.md`.
- Implementation is published in Hub PR 650; the final signed test/ledger cleanup
  passed independent Standards/Spec review, typecheck zero errors/warnings,
  9320 tests,architecture3/3 and production build. The configured signer recovered after
  owner authentication and signed source660ef077 is published.
- Fresh final-head CI is running; the earlier published-head CI had
  all assertions pass but one unhandled test teardown import, repaired locally.
- Merge and deployment: not started; no production repair is claimed.
- No production configuration or data was changed during this investigation.

## Out of scope

Role expansion, new CRM authentication, token rotation, gateway redeployment,
assistant prompt changes, paid model replays, and unrestricted access for
owner-scoped or masked-field CRM roles.

## Definition of done

Both exact machine routes accept the assigned valid credential, enforce current
principal authority and CRM policy, and return the permitted result for the
reported FACES workflow. Invalid and restricted requests are rejected before
data/model work. Source qualification and post-deployment evidence are recorded;
the privacy-restricted role follow-up remains explicit until separately delivered.
