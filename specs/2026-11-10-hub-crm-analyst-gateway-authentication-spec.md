---
id: 2026-11-10-hub-crm-analyst-gateway-authentication-spec
title: Restore CRM analyst gateway authentication within current CRM permissions
stage: spec
status: approved
verdict: approved
pass: 2
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
tags: [auth]
type: fix
proposal: 2026-11-10-hub-crm-analyst-gateway-authentication
---

# Restore CRM analyst gateway authentication

## Problem and outcome

A FACES Staff user asked the CRM analyst for customers' main pain points. The
matching gateway chat records `crm_conversation_themes({})` failing with HTTP
401, `HUB_HTTP_401`, `Authentication required`. The assistant then suggested
reconnecting CRM. That advice does not address the reproduced Hub defect.

Using the affected principal's configured gateway credential and server identity,
Hub's tool-permissions endpoint returned 200 with CRM view/create/edit. Both
conversation-analysis endpoints returned 401 in the handlers' principal
resolution, before CRM capability checks. No real model turn was replayed. Private transcripts
and credentials stay outside source control and test environments.

The required outcome is that assigned agents can use these two existing CRM tools
under the current user's CRM permissions. This fix does not grant new permissions.
The owner's approval is conditional on passing EGM (Elephant–Goldfish Model): "I approve after you've
passed it thu egm." EGM review precedes implementation. Source qualification and
independent implementation review precede any release claim.

## AS-IS and source evidence

Hub production `206d9ae218efd4bf682d6c4063797c7441f4d52a` has the same tree as
the inspected feature head `71d3743d020a518b95ad1a090b76ca46f16fd56f`.

- `src/server/auth/resolve-identity.ts`, `resolveIdentity`: gateway Bearer
  credentials are recognized on an explicit route allowlist. The two CRM
  conversation paths are absent; credentialed machine calls fall through to
  cookie-based browser identity and receive 401 without a browser session.
- `src/routes/api/gateway/crm-conversation-themes/+server.ts` resolves the trusted
  assistant principal and checks CRM view before calling `conversationThemes`.
- `src/routes/api/gateway/search-crm-conversations/+server.ts` resolves the same
  principal, checks the AI entitlement and CRM view, embeds a nonempty query,
  then calls `similarConversations`.
- These handlers currently return organization-wide conversation information
  without owner filtering or reliable masking of unstructured sensitive content.
- `src/server/auth/assistant-principal.ts` independently validates the personal
  agent, gateway assignment, requested organization, membership, and current
  capabilities. It remains unchanged.
- Current gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd` already sends
  `x-minion-server-id` through `hubHeaders` and registers its configured server
  identity. No gateway code or configuration change is needed for this fix.

## TO-BE and invariants

1. Exactly `/api/gateway/crm-conversation-themes` and
   `/api/gateway/search-crm-conversations` accept the existing gateway Bearer
   identity provider. No new route prefix is admitted.
2. Identity admission is not data permission: the same trusted principal,
   gateway assignment, organization membership, CRM view and search AI
   entitlement checks remain necessary. Browser-session identity stays supported.
3. Both endpoints reject CRM roles with owner-only access or sensitive-field
   restrictions with HTTP 403 and stable code
   `CRM_CONVERSATION_SCOPE_UNSUPPORTED`. The message is: "Conversation analysis is
   unavailable for roles with record or sensitive-field restrictions."
   No conversation read, vector search, or embedding runs on this rejection.
4. The reported FACES Staff role has organization-wide CRM view and field level
   1, so it passes the new restriction guard without any role change. The
   canonical sensitive-field threshold comes from `$lib/permissions`.
5. Invalid or missing credentials cannot become machine identity. Foreign agents,
   organization mismatches and removed memberships stay rejected by the existing
   principal resolver. No token rotation, new schema, migration, user messaging,
   model replay, gateway restart or production role change is part of this fix.

## DELTA and acceptance matrix

| Case | Required result | Proof |
|---|---|---|
| Each exact CRM route, valid token and configured server hint | Machine identity with expected tenant/server | Execute identity resolver with synthetic token rows |
| Same token on two registered gateways, each explicit server hint | Each resolves its own registered organization | Exercise real resolver and its hint-keyed cache |
| Missing/invalid token or unmatched server hint, no browser session | Anonymous identity; real handler/principal returns 401 | Resolver negatives composed with real handlers/principal; separate existing hook regressions |
| Nearby or suffixed unlisted path with valid token | No machine identity | Resolver negative matrix |
| Unrestricted CRM viewer | Existing aggregate/search payload | Execute each real handler with isolated dependencies |
| CRM denied | 403, no conversation/embedding call | Both handler tests |
| Owner-only CRM or field level below threshold | 403 with stable scope code, no data/model call | Both handler tests |
| Rejected trusted principal | Existing rejection propagates; no data/model call | Both handler tests plus existing principal suite |
| Search AI entitlement denied | Existing rejection; no embedding/search | Search handler test |
| Search query absent | Existing 400; no embedding | Search handler test |
| Deployed repair | Same assigned gateway can enter routes; permitted themes result | Bounded post-deploy read-only verification; not a model replay |

## Alternatives and limits

- Broadly admit `/api/gateway/*`: rejected because unrelated handlers have
  different authority contracts. Only the two reviewed exact paths are added.
- Use a browser cookie in machine calls, rotate tokens, or enlarge Staff rights:
  rejected because a valid gateway already authenticates on sibling tools and
  the affected user already has the required CRM access.
- Implement owner-scoped semantic retrieval and text masking in this hotfix:
  deferred because unstructured conversation content requires separate privacy
  qualification. Fail closed for those roles now. This restriction also applies
  to browser callers of these endpoints; it is an explicit safety limitation.
- Modify Gateway identity propagation: rejected because fresh DEV already does
  this and the direct, correctly hinted CRM calls still reproduce the 401.
- Change assistant wording alone: rejected because it leaves the actual tool
  unusable. Clearer structured errors can be separately reviewed if needed.

Existing token resolution scans registered gateways and caches successful
matches for up to 60 seconds. This patch does not expand that existing cache or
change revocation semantics. Additional token-resolution load is limited to the
two restored tools; no new process, table, index or queue is introduced.

## Risks and mitigations

Restoring machine access can reveal pre-existing overly broad data reads. The
restriction guard prevents that expansion for owner-scoped and masked CRM roles.
Unknown privacy scope is not treated as unrestricted by a new fallback. Supported
roles still use the existing trusted principal's organization and capabilities.

No realistic regression test can establish that a deployed user turn succeeded:
tests prove specific resolver and handler contracts. A deployed read-only check
must separately establish route admission and permitted aggregate output. Search
admission can be checked with an empty body, avoiding paid embeddings. Tests
never import the diagnostic production environment or private transcript.

## Detailed Implementation Plan

### Phase 1: Regression before repair

Create `src/server/auth/resolve-identity-crm.test.ts`. Use synthetic gateway rows,
stubbed crypto and an empty Supabase session, and disable legacy fallback in the
test environment (`AUTH_DISABLED=false`, `GATEWAY_TURSO_FALLBACK=false`). Stub
both `getCoreDb` for the registry lookup and `getDb` for admitted tenant context.
Execute `resolveIdentity` itself. Use unique synthetic token
values per case to avoid accidental cross-case cache hits; deliberately reuse
one token with two server hints in the shared-token/cache test. Assert tenant,
server and bypass result, not source text. Verify exact positive cases fail on
the unmodified allowlist and adjacent-path/invalid-credential negatives pass.
For each exact CRM route and each anonymous-identity cause, pass resolved locals
into the real POST handler with the real principal resolver. Stub only data,
embedding and entitlement infrastructure; assert principal 401 and no data or
embedding call. The normal hook dispatches `/api/gateway/*` to handler-owned
authentication even without a tenant; it does not itself produce this 401.

Create `src/routes/api/gateway/crm-conversations.test.ts`, importing both real
POST handlers. Isolate `resolveAssistantPrincipal`, `getCoreDb`, entitlement,
embedding, aggregate and vector services with typed mocks. Use capability
fixtures with `can`, `ownerScoped`, and `fieldLevel`; no real customer data.
Assert both successful responses and no-effect failures from the acceptance
matrix. Owner/field restrictions must fail before service calls. Preserve
existing invalid-query, body/filter handling and error semantics.

### Phase 2: Small runtime repair

Modify `src/server/auth/resolve-identity.ts`: in the existing allowlist's
trusted-principal MCP/AI-Brains section, add a narrow CRM comment and the two
exact equality expressions. The clean baseline has no incident-specific handoff
comment to replace. Do not refactor the provider or token matching.

Modify the two existing handlers only: import `SENSITIVE_FIELD_LEVEL` from
`$lib/permissions`. Immediately after the existing CRM view denial, before ctx,
body parsing or any conversation/model work, reject when
`capabilities.ownerScoped('crm') ||
capabilities.fieldLevel('crm') < SENSITIVE_FIELD_LEVEL`. Both handlers return
exactly this JSON body with HTTP 403, and tests assert exact body equality:

```json
{"code":"CRM_CONVERSATION_SCOPE_UNSUPPORTED","error":"Conversation analysis is unavailable for roles with record or sensitive-field restrictions."}
```

This preserves the handlers' existing `error` field and adds the stable code.
Search keeps its existing entitlement position. At each
restriction guard add `TODO(handoff)` pointing to the originating proposal's
limited-role support follow-up. Do not change service signatures or SQL.

Run focused identity, both-handler and existing assistant-principal/hook suites.
No dependencies, generated UI, localization, schema or gateway source change.

### Phase 3: Qualification and delivery

Use a clean isolated feature checkout based on current Hub `master` and a new
slice-scoped feature branch; preserve earlier feature artifacts and unrelated
working trees. Confirm any base drift does not invalidate this spec before code.
Run `bun run check` (zero errors/warnings), `bun run test` (zero failures), and
`bun run build` cleanly on the final candidate, serializing heavy commands to
avoid machine-memory pressure. Capture concise receipts tied to the candidate.
Execute a local guarded QA route check where the existing stack is available;
report any distinction between mocked seam tests and actual server checks.

Run independent Standards and Spec review of the exact source diff and tests.
Resolve material findings and repeat affected qualification. Commit only scoped
files with configured signing; open a PR against registry base `master` using a
user-facing conventional title. Record actual EGM, local, CI, merge, deployment
and runtime states separately. The conditional owner approval is not a claim
that EGM or any later gate has already passed.

The owner approved implementation once EGM passes. Merge/release authorization
must be interpreted from that exact scope and the repository's required human
merge gate; do not bypass checks or infer an administrative override. Production
verification does not send messages or replay a model conversation.

### Limited-role support follow-up

The originating proposal remains the open-items ledger for owner-filtered
semantic retrieval and sensitive-field handling. Keep the new guards until
those cases have a separately approved design and runtime privacy tests. This
fix is complete for unrestricted roles when its named tests and deployed
verification pass; limited-role support remains explicitly unavailable.

### Review artifacts

Write EGM reports under `audits/2026-11-10-crm-analyst-auth/egm/` in minion-meta.
Use the uninterrupted full five-stage flow with fresh-context reviewers; resolve
document findings and require two consecutive clean feature/technical rounds.
Document combined-persona review, if used, as one reviewer rather than multiple
independent agents. Missing or failed reviewers never count as clean.

The five stages are initial Zoom Out, comprehension, design/structural/style
critique, intermediate Zoom Out, and readiness/codebase-details/style review.
The governing [EGM review workflow](https://github.com/google/elephant-goldfish-model/blob/main/skills/egm-review/SKILL.md)
and its linked personas/standards are installed in this session's discovered EGM
plugin bundle; the review report records their actual paths and completed reads.
Post-code Standards review checks contributor rules and engineering invariants;
Spec review checks this document's acceptance requirements and scope.
