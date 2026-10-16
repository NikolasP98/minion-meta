---
id: 2026-10-16-internal-whatsapp-personal-assistant
title: Internal WhatsApp access to each member's Hub personal agent
status: in-spec
created: 2026-10-16
updated: 2026-10-16
repos: [minion, minion_hub, minion-meta]
tags: [security, logic, data]
value: 9
effort: L
spawned_spec: 2026-10-16-internal-whatsapp-personal-assistant-spec
---

# Internal WhatsApp personal assistant

## Owner request

> I want to reimplement whatsapp assistant. I'll initially need it to be an internal whatsapp bot for the team (not available to the public, only for users/org members that claimed a phone number. It should be exactly like a user speaking to its agent in the hub, same rbac, same agent capabilities.

WhatsApp becomes another interface to the member's existing personal agent. The
user identity, organization, agent, tools, memory access, and action authorization
must follow the Hub contracts. A phone claim establishes identity; it does not
grant organization membership or additional permissions.

## Owner decisions

Scope approved in conversation on 2026-10-16: "I approve the scope". The
proposal has entered specification; this is not merge or deployment approval.

Additional requirements from the same conversation:

- "I need live whatsapp/baileys servers so that they don't timeout, to be
  constantly heartbeating." The initial transport is persistent Baileys,
  with protocol keepalive, supervised recovery, and durable credentials.
- "there should be a rule in place for only one org per whatsapp account."
  Every account belongs to exactly one organization. There is no shared
  cross-organization bot and no organization selector in WhatsApp. Multiple
  accounts may belong to the same organization.
- "they should both have the same memory. Since there really isn't a way to
  \"pick\" a past chat and you stick with the whatsapp history as-is."
  WhatsApp keeps one continuous channel conversation; Hub retains its selectable
  chats. Both use the same personal agent's authorized memory, with no separate
  WhatsApp memory store.

## AS-IS: inspected source

Evidence is from local checkouts on 2026-10-16: meta `5d9860fba`, Hub
`0acd6282`, gateway `db83e075556`. These are source observations, not deployment
or live WhatsApp verification. The checkouts contain unrelated work.

| Boundary | Current evidence | Consequence for this request |
| --- | --- | --- |
| Phone claiming | Hub `src/server/identity/channel-claim.service.ts:67,180,322` normalizes WhatsApp claims to digits, verifies OTPs, and attaches a verified Supabase identity. `src/routes/api/users/[id]/identities/verify-confirm/+server.ts:11` restricts claiming to the signed-in account. | Reuse the claim UX and identity ownership model. Verify race safety, revocation, and canonical identity reads before making this an admission credential. |
| Gateway identity feed | Hub `src/server/services/channel-identity.service.ts`, `listChannelIdentities`, reads `ctx.db` and filters only `kind='channel'`; it does not filter `verifiedAt` or organization membership. `src/routes/api/gateway/channel-identities/+server.ts` requires a tenant context. | This feed is not proof that a number is currently verified and authorized for the receiving bot. Canonical Supabase claims and the legacy feed also need reconciliation. |
| WhatsApp routing order | Gateway `src/web/auto-reply/monitor/on-message.ts:73` calls `resolveAgentRoute` without `resolvedUserId`. Identity is attached later in `process-message.ts:499`. | The early route cannot select the personal-agent tier using the claimed user. Late identity attachment must not authorize an already selected shared agent. |
| Sender normalization | `process-message.ts:485` prefers sender JID; `src/users/channel-identity-map.ts`, `buildKey`, uses exact string keys. Claims use phone digits. | JID and phone representations need a single tested mapping. An opaque WhatsApp LID must not be treated as phone digits. |
| General routing | `src/routing/resolve-route.ts:487` supports a personal tier after configured bindings; unmatched routing fails closed. | Internal assistant admission and personal-agent assignment must precede ordinary binding selection. Preserve the existing no-agent behavior for other accounts. |
| Cloud transport | Gateway `extensions/meta-graph/src/channels/shared.ts:197` also routes without a resolved Hub user. | Cloud needs separate qualification if added later; the owner selected Baileys for the first version. |
| Hub conversation | Hub `src/lib/services/gateway/chat-rpc.ts:249` sends `chat.send` to the personal-agent session; the default is `agent:<agentId>:main`, with explicit conversation keys supported. | Reuse agent execution and history contracts. Conversation continuity is a product decision, not an accidental consequence of the default session key. |
| Current authorization | Hub `src/server/auth/assistant-principal.ts`, `resolveGatewayPrincipal`, requires an active persisted agent/owner/gateway/org assignment and resolves current membership. `_shared/action-auth.ts:22` checks `capabilities.can`. | Keep assignment checks. Capability parity also needs module enablement, record ownership, field masking, and existing confirmation policy. A role label or prompt is insufficient. |
| Provisioning dependency | Hub `src/server/services/personal-agent-provisioner.ts:112` still passes `serverId: ''` when provisioning a missing personal agent. | Qualify and repair assignments through the existing harness-restoration work; do not weaken the resolver to make WhatsApp work. No current production row counts were checked here. |
| Browser-dependent actions | Hub `src/lib/assistant/briefing.ts:18,43` describes client-rendered navigation/choice/form commands and tells the agent not to submit forms. | Sending the same prompt to WhatsApp is insufficient. Use shared server actions for executable operations; render navigation as Hub links and choices as channel interactions. |

## TO-BE: observable contract

### Admission and identity

1. Enable an explicit internal-assistant mode only on approved bot accounts.
   This mode accepts one-to-one conversations. Group chats, statuses, broadcasts,
   public onboarding, and generic guest-agent fallback are excluded initially.
2. Authenticate the inbound transport event before trusting sender/account IDs.
   Resolve a provider-proven phone identity to exactly one currently verified
   Hub profile. Never infer identity from a message body, contact name, CRM
   record, unverified manual link, or a number supplied by the model.
3. Resolve the receiving account's single persisted organization and the user's
   current membership in that organization. Reject members of other
   organizations even if they have claimed their numbers. Prevent aliases or
   duplicate sessions for one linked WhatsApp number from bypassing this rule.
4. Resolve the user's active persisted personal agent and its assigned gateway.
   Missing, ambiguous, disabled, or inconsistent assignments deny execution;
   they never select the bot owner's agent or provision a guest.
5. The receiving account determines the organization. Ignore any claimed
   organization in message text or model arguments. A multi-organization user
   uses the organization assigned to this receiving account; no first-row
   membership fallback and no in-chat organization switching are permitted.
6. Unclaimed numbers receive no agent response and cause no model/tool run.
   The separate authenticated Hub OTP claim flow remains available. Internal
   mode must not feed unauthorized message content into personal-agent memory
   or organization brains. Existing transport retention must be assessed during
   the spec; avoid changing unrelated CRM ingestion implicitly.

### Same agent, permissions, and capabilities

- Reuse the persisted agent identity, configuration, model selection, permitted
  tools, personal memory, and organization brain access. Do not clone an agent
  per phone or maintain a separate WhatsApp role table.
- Derive user/org/agent/gateway/session scope in trusted server code. Carry it
  through every tool call, memory lookup, attachment, confirmation, and audit
  entry. Text prompts and caller-supplied IDs never confer authority.
- Apply the same policy path as Hub: module availability, capability, record
  ownership, sensitive-field masking, resource access, and required approvals.
  Tool discovery is filtered, and execution independently rechecks permission.
- Refactor shared execution boundaries where needed so both Hub and WhatsApp
  invoke the same services. Do not expose arbitrary internal HTTP forwarding
  or give the model a platform administrator token.
- A role removal, phone unlink, account disablement, membership removal, or
  gateway reassignment blocks the next protected operation. Revalidate pending
  actions and queued replies; stale cache entries are not authority. Do not
  deliver queued sensitive output to a revoked or reassigned number.
- Keep credentials under the same user scope as Hub. The bot account's
  credentials, Google identity, and memory cannot substitute for the sender's.

### Conversation and channel behavior

- WhatsApp has one continuous conversation per user/agent/org/receiving account,
  using its own history without a chat picker. Hub retains its selectable chats;
  changing the selected Hub chat does not redirect or reset WhatsApp history.
- Both channels read and write the same canonical personal-agent memory under
  the same policy. A permitted memory saved in either channel is available to
  subsequent retrieval in the other. Memory deletion and permission changes
  apply to both. Transcript sharing is not required for memory sharing.
- Keep pending actions and reply destinations attached to the originating
  conversation. A message in Hub cannot accidentally confirm a WhatsApp action.
- Never move one transcript across organizations. The selected organization
  and identity revision are part of the conversation binding.
- Adapt supported text, voice, images, files, results, and choices to the
  selected transport. Produce a capability matrix against Hub before release;
  unsupported media must produce an explicit outcome, never a claimed success.
- Navigation returns an authorized Hub deep link. Server-capable tasks execute
  without requiring an open browser. A browser-only operation must be identified
  and handed off honestly; a link is not evidence that a write was completed.
- Preserve the Hub action's confirmation policy. Bind every confirmation to a
  user, organization, conversation, exact action, and expiry. A delayed or
  forwarded "yes" cannot authorize another pending action.
- Deliver final answers and approved artifacts only. Keep tool traces,
  credentials, and internal reasoning out of WhatsApp responses.

### Reliability

- Deduplicate by transport + receiving account + provider message ID with
  durable state. Handle duplicated and out-of-order inbound events.
- Bind mutation idempotency to the accepted turn and action. If a write commits
  but reply delivery fails, retry delivery without repeating the write.
- Persist reply delivery state and handle reconnects, worker restarts, and
  retries. Recheck identity and organization before releasing sensitive output.
- Record user/org/agent/channel/run/action identifiers and authorization
  outcomes using existing audit infrastructure. Mask phone identifiers and
  exclude OTPs, credentials, and raw private content from operational logs.
- A feature flag disables new assistant turns without disabling unrelated
  receive-only or CRM channels. Cutover and rollback must preserve history and
  committed-action receipts.
- Baileys sockets run continuously in supervised gateway processes with durable
  credential storage. Protocol keepalive, worker liveness, and WhatsApp
  readiness are separate signals. Quiet chats must not trigger reconnection.
  Transient disconnects recover with bounded backoff; logout needs relinking.
  A singleton account owner prevents competing sockets during restart/failover.

## DELTA and proof

| Slice | Exact transition | Required proof |
| --- | --- | --- |
| 1. Shared prerequisites | Qualify provisioning assignment and shared Hub action authorization from the harness-restoration proposal. | Same user/resource/action yields equivalent Hub and agent authorization, including ownership, masking, disabled modules, and cross-org denials. |
| 2. Verified admission | Add canonical sender normalization and current claim/member/account checks before routing. | Claimed member admitted; unknown, unverified, removed member, revoked claim, wrong org, ambiguous identity, and group rejected before model/tool dispatch. Test phone, JID, and opaque LID cases. |
| 3. Personal-agent routing | Bind admitted principal to persisted agent/gateway and selected organization; reuse session execution. | Two members on one bot reach different agents. Explicit bot binding cannot override identity. Missing assignment fails closed. Concurrent turns cannot mix users or orgs. |
| 4. Channel capabilities | Reuse shared tools and context selection; adapt output, attachments, confirmations, and authorized links. | Role-based Hub/WhatsApp parity matrix; browser closed for server actions; voice/file errors honest; expired/duplicate/cross-user confirmations denied. |
| 5. Durable delivery | Persist inbox/outbox and action receipts using the existing infrastructure selected in the spec. | Redelivery and restart do not duplicate actions. Committed action plus failed send retries only the send. Revocation during a run blocks subsequent protected work/output. |
| 6. Internal rollout | Enable only the selected internal bot/account/orgs after local qualification. | Local QA with synthetic identities and transport fixtures, then an explicitly authorized team-number smoke test; flag-off rollback; deployment version and actual delivered replies recorded separately. |

Each implementation slice needs a spec, focused tests, self-review and
independent review. The spec receives the repository's two-pass review. Security
and data approval gates remain human-owned; this draft does not authorize a
production migration, bot reconfiguration, merge, or test message.

## Decisions settled

Persistent Baileys, one organization per account, and shared agent memory with
continuous WhatsApp history are confirmed by the owner. Hub's conversation
picker does not control the WhatsApp conversation. No product choice remains
open from the questions in this proposal.

Private DMs, explicitly enabled organization accounts, no public signup, and no
unsolicited outbound campaigns remain the initial boundary. Baileys is now the
selected transport. Cloud implementation is outside this initial delivery.
No provider pricing or policy assumptions are made in this proposal.

## Relationship to existing work

- `proposals/2026-10-15-agent-harness-restoration.md`: shared prerequisite for
  assignment, policy parity, tool completeness, and server actions. Reuse its
  fixes; do not build a WhatsApp-specific bypass or duplicate action catalog.
  Its historical production observations were not revalidated in this task.
- `specs/2026-05-27-whatsapp-qr-pairing.md`: transport/account onboarding; this
  proposal adds user admission and personal-agent semantics.
- `specs/2026-07-20-whatsapp-sync-status-spec.md`: transport synchronization;
  synchronization success does not establish assistant authorization.
- `specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.md`: Cloud outbound
  delivery dependency if that adapter is selected, not an identity contract.

## Out of scope

Public customer support, CRM customer impersonation, group assistants,
marketing broadcasts, new independent agent personalities, permission
expansion, and redesigning unrelated channel integrations. MCP restoration
belongs to the existing harness work and is not required merely to transport
an internal WhatsApp turn.

## Verification and release criteria

Complete the role/action/media parity matrix and all negative controls in the
DELTA table. Include owner, restricted member, removed member, two organizations,
and two simultaneously messaging users. Verify claim/unlink/reclaim races,
authorization outages, revocation during execution, duplicate events, and
delivery failure after a committed mutation.

Release only after the selected transport has a recorded end-to-end trace:
verified phone → current membership → assigned personal agent → authorized
tool → attributable effect → correctly scoped reply. A passing unit test,
green CI, or connected WhatsApp account alone is insufficient.

## Preparation status

Implementation is present in isolated gateway, Hub and meta branches. Focused
tests and native PostgreSQL integration tests exercise admission, revocation,
lease races, delivery uncertainty and canonical memory. No live account was
paired or messaged. Repository-wide verification and independent implementation
review are recorded in the specification review sidecar.

## Implementation qualification and release ledger

The owner authorized implementation with "ok, implement asap" on 2026-10-16.
Work is isolated on `feat/internal-whatsapp-20261016` in each affected repository.
Product scope is settled. Merge, production migration, account pairing/sends,
feature activation, and deployment are separate release actions.

- **Uncertain effects:** `minion_hub/src/server/services/whatsapp-assistant.service.ts`
  records operation intent before execution and fences a turn after uncertainty.
  `TODO(handoff)` at the receipt service tracks coupling local domain mutations
  and their receipts in a single transaction. Until each action has that coupling,
  an unknown result requires operator reconciliation against the domain record;
  the original model turn must never be replayed automatically.
- **Live transport qualification:** local deterministic tests cover quiet sessions,
  retry limits, lease loss, credential persistence and delivery uncertainty. They
  do not prove a real WhatsApp account survives a host restart, network interruption,
  or a 24-hour idle period. Verify those with an authorized internal account before
  activation; use the host's process supervisor and durable auth volume.
- **Release sequence:** install the Hub migration and its server endpoints before
  switching Hub-connected personal-agent memory to the canonical API in the
  gateway. Publish the shared schema package separately. Keep both feature flags
  disabled during rollout and inventory existing WhatsApp account conflicts first.
  No production data or credentials were changed during implementation.

- **Capability qualification:** `minion/src/agents/internal-assistant-runtime.ts`
  and `internal-assistant-authority.ts` contain matching `TODO(handoff)` markers.
  Host execution, custom/plugin runners, CLI model backends, browser/GWS and
  delegated session RPC are not yet qualified to preserve the admitted user's
  authority. The runtime rejects an unsafe shared agent configuration before
  inference. Full capability parity remains open; no approval to reduce the
  original scope is implied. Finish isolated runners and signed delegation, or
  obtain an explicit rollout decision for a shared restricted Hub/WhatsApp policy.
- **Per-agent memory migration:** keep `gateway.memorySync.canonicalPersonalAgents`
  empty until each personal agent's historical graph has been exported, reviewed
  and imported. Opting an agent in switches both Hub and WhatsApp to the canonical
  corpus. Do not activate the WhatsApp account before that switch and restart.
  Import preserves newer canonical records and delete tombstones. Production
  import and activation have not been performed.

- **SDK execution surface:** the qualified runtime pins the checked tool names
  and uses an empty SDK resource loader, preventing implicit native host bash,
  workspace extensions and MCP discovery from restoring rejected tools. Explicit
  codemode, SDK package/extension and hosted-tool configurations remain rejected
  until isolated authority propagation is implemented. The SDK gate has the
  matching `TODO(handoff)` in `internal-assistant-sdk.ts`.
- **Existing durable extraction threshold:** the current runner supplies two
  recent messages while the LLM extractor's default threshold is four. Canonical
  migration preserves that gate and the working heuristic automatic saves;
  it does not silently lower the threshold. A future shared session accumulator
  should enable the configured LLM policy without introducing a second durable
  memory store. The extraction call has a matching `TODO(handoff)`.
- **Memory failure qualification:** canonical auto-saves are awaited in both
  channels. HTTP cancellation cannot undo SQL already in progress; an ambiguous
  memory commit must be reconciled, not replayed. For an opted-in ordinary Hub
  agent, a failed canonical save can make completed inference return an error;
  qualify that Hub chat behavior before activation. The callsite in gateway
  `src/agents/pi-embedded-runner/run/attempt.ts` carries the matching TODO.

- **Scanner audit prerequisite:** the generated WhatsApp manifest's truncated
  SHA-256 schema checksum is a confirmed non-secret. Gateway
  [audit PR #331](https://github.com/NikolasP98/minion-ai/pull/331) adds only its
  exact fingerprint and evidence, including a different-digest negative control.
  Existing CI requires independent human audit and explicit acceptance of baseline
  updates. Feature PR #330 must inherit that approved baseline; its secrets check
  remains blocked until then. The generating schema has a matching TODO. No
  scanner policy or checksum algorithm was changed to bypass this requirement.

- **Default provisioning blocker:** Hub personal-agent provisioning currently
  sends only name/workspace and marks the row active without a runtime-policy
  preflight. Gateway defaults to sandbox off; the new internal runtime rejects
  that configuration and several standard-policy tools (process/session tools,
  messaging, TTS, summarize, and conditionally CRM search/SDK inspection). Thus
  ordinary newly provisioned personal agents cannot activate under this draft.
  Implement shared isolation and signed delegation, including background-process
  lifetime and completion authority; do not remove tools to declare parity. The
  runtime gate has the matching TODO. This is unfinished implementation, distinct
  from release authorization and live qualification.
