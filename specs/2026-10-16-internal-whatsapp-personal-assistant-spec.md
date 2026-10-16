---
id: 2026-10-16-internal-whatsapp-personal-assistant-spec
title: Internal WhatsApp personal agents on persistent Baileys workers
stage: dev
status: implementing
pass: 3
created: 2026-10-16
updated: 2026-10-16
repos: [minion, minion_hub, minion-meta]
proposal: 2026-10-16-internal-whatsapp-personal-assistant
type: feature
verdict: pending
tags: [security, data, logic, infra]
relationship: depends-on
related: [2026-10-15-agent-harness-restoration]
---

# Internal WhatsApp personal assistant

## 0. Product

An organization member messages its WhatsApp account and reaches their own Hub
personal agent with equivalent authorization and capabilities. The owner
approved scope on 2026-10-16 and subsequently required persistent Baileys
servers with continuous heartbeats and exactly one organization per WhatsApp
account. These requirements are settled; no additional scope approval is needed.

One organization may own multiple accounts. One account must never serve more
than one organization, even through aliases, duplicate credential directories,
different gateways, or a multi-organization user. The receiving account chooses
the organization; the sender and model cannot override it.

The owner explicitly authorized implementation with "ok, implement asap" on
2026-10-16. Local implementation is underway on isolated branches. Production
configuration, database migrations, messages, merges, and deployments remain
outside this authorization. The owner settled continuous WhatsApp history and
the same authorized personal-agent memory across both channels (§10).
Implementation qualification is pending; this is not a release approval.

## 1. AS-IS and evidence

Discovery baseline: Hub `0acd6282`, gateway `db83e075556`, meta `5d9860fba`.
Implementation rebased onto current development heads: Hub `7d917ed0`, gateway
`39be924dcd6`, meta `cda2e453f`. Some shared tool instantiation fixes are already
present on these heads and are reused.
See the source proposal for phone-claim, routing, and assistant authorization
anchors. Additional inspection for this specification established:

| Source | Observed behavior | Required transition |
| --- | --- | --- |
| `packages/db/src/pg/schema/channels.ts:24` | Channel has non-null `tenantId` and `gatewayId`, but `ownerProfileId` marks a user account that follows that user across organizations. Account uniqueness includes tenant and gateway. | WhatsApp account ownership must be globally unambiguous; the user-scoped cross-org visibility rule cannot apply to WhatsApp. |
| Hub `src/server/services/channel-publish.service.ts:30,108` | Cache key uses type/account alias; hydration carries org and owner classification. | Carry canonical account identity and org through hydration and admission. Audit alias collisions and enforce org scope in visibility/config writes. |
| Gateway `src/web/session.ts:109` | Baileys socket, persisted multi-file auth, queued credential saves; library pinned to `7.0.0-rc11`. | Retain persistent socket ownership and qualify credential crash recovery; explicitly configure keepalive. |
| Installed Baileys `lib/Defaults/index.js:52` and `lib/Socket/socket.js:528` | 20s connection timeout and 30s keepalive interval; missing server traffic closes the socket. | Preserve real protocol liveness. Application logs are not proof of a successful protocol exchange. |
| Gateway `src/web/auto-reply/monitor.ts:164,288,313` | A 60s default logging heartbeat; watchdog reconnects after 30 minutes without a handled message. | Quiet conversations stay connected. Watchdog relies on transport state and fresh worker observations. |
| Gateway `src/web/reconnect.ts:11` | Backoff starts at 2s, caps at 30s, and defaults to 12 attempts; zero supports unlimited attempts. | Internal-account transient recovery must remain supervised after extended outages. |
| Gateway `src/gateway/channel-health-monitor.ts` | Checks every five minutes, caps restarts, honors `needsRelink`; another restart layer exists in `server-core/server-channels.ts`. | Coordinate one recovery owner; avoid simultaneous reconnect loops and false recovery of logged-out accounts. |
| Gateway `docker-compose.yml:47,57` | Persistent state mount and `restart: unless-stopped` on gateway. | Qualify persistent host deployment and add real process supervision evidence. A running or restartable container does not prove WhatsApp readiness. |
| Gateway `src/web/inbound/monitor.ts:142` | Writes inbound content to ledger and emits hooks before later conversational filtering. | Internal-account admission must precede content-bearing ledger/hooks/brain ingestion, not merely agent dispatch. |
| Hub identity DELETE route | `src/routes/api/users/[id]/identities/[identityId]/+server.ts` selects legacy vs Supabase removal through `source`. | Claim and unlink must target the same canonical vault and scope identity ID to its actual owner. |
| Shared PG schema | `personal_agents.profile_id` is unique, with one nullable gateway pointer. | Do not invent per-org agents. Reject a personal agent not assigned to the receiving account's org/gateway. Multi-org parity may require a separately reviewed shared-assignment change. |
| Hub `src/server/services/bg-runtime.ts` | Durable jobs have generations and `withOwnership`; `job-effects.ts` constrains receipts to vector-ingest payloads. | Reuse worker scheduling/lease patterns; do not insert WhatsApp action receipts into embedding-specific tables. |

External reference: the upstream [socket implementation](https://github.com/WhiskeySockets/Baileys/blob/master/src/Socket/socket.ts)
implements protocol keepalive and connection-loss detection. Its current branch
is not the installed-version contract; the pinned local package was inspected
separately. The [maintainer troubleshooting guide](https://github.com/WhiskeySockets/docs/blob/main/advanced/troubleshooting.mdx)
distinguishes reconnection from logged-out authentication recovery.

## 2. TO-BE: account and organization authority

Extend the existing canonical PG `channels` model, rather than introducing a
second independently editable org/account registry:

- New `provider_account_id` reserves the canonical self phone ID for WhatsApp,
  normalized as international digits. `provider_account_verified_at` records
  when the linked socket proved that identity. A reservation is not proof of
  ownership. This is not the configurable gateway `account_id` alias and never
  comes from sender text.
- Add a partial unique index on `(type, provider_account_id)` for WhatsApp
  rows with a non-null canonical identity, across all tenants and gateways.
  Identity resolution comes from the authenticated linked socket. If the
  provider supplies only an unresolved opaque identifier, activation waits.
- `tenant_id` is the sole org owner. For WhatsApp, `owner_profile_id` must be
  null; creator attribution belongs in audit metadata, not a scope bypass.
  The account gateway's current org must equal this tenant on every activation.
- Draft/unpaired rows can lack `provider_account_id`; they cannot receive
  assistant turns or send business messages. Before opening a pairing socket,
  an authorized org administrator reserves the intended number under the same
  global unique index and exclusive auth reference. On pairing, compare the
  provider-proven self identity with that reservation and set verification
  atomically. A mismatch closes the socket and requires correction. This avoids
  discovering a duplicate only after a second pairing socket has been opened.
  The provider can still revoke/replace externally linked devices; that is an
  ownership incident, not a uniqueness guarantee this application controls.
- Schema checks, write services, hydration, account lists, pairing callbacks,
  worker admission, and outbound routing must enforce the same binding.
  Reject canonical-identity conflicts with an opaque conflict response; do not
  expose the other organization's name, number, or credentials.
- Account identity and tenant are immutable while paired, leased, or holding
  pending turns. Cross-org transfer is outside the first release; no upsert
  may silently transfer an account. Relinking to a different number requires
  draining/revoking the old account first.
- Read-only migration inventory classifies existing WhatsApp rows by canonical
  number, tenant, gateway, user ownership, and credential reference. Never pick
  an arbitrary org for a duplicate. Unresolved/conflicting accounts stay
  disabled until owner disposition. Do not rewrite Telegram/Discord scoping.

Store internal-assistant intent in the existing validated `channels.settings`
as `assistantMode: 'internal' | 'off'`, default `off`. Keep `enabled` as the
transport switch and `replies='none'` as an unconditional outbound stop.
Enabling internal mode requires `replies='bound'`, a valid immutable org/account
binding, and successful policy qualification. The internal-mode branch resolves
personal identity before ordinary binding selection; wildcard `allowFrom`, a
shared agent binding, and legacy pairing approval cannot bypass admission.

## 3. Persistent Baileys runtime

### Hosting and ownership

Use long-running gateway workers on a persistent host/container runtime. No
request lifecycle, serverless invocation, sleeping instance, or browser tab owns
the socket. The initial operational target is the existing gateway deployment
model; actual host/account inventory must be verified before rollout, not
inferred from a Docker or Fly template.

Exactly one worker owns an account's socket and auth store. Add a PG
`whatsapp_account_leases` row keyed by canonical channel ID with `owner_id`,
monotonic `generation`, `lease_until`, `heartbeat_at`, and diagnostic state.
Acquire/renew by compare-and-swap using database time. Renew every 15s with a
60s lease. Workers stop receiving protected turns and sending before their
conservative local lease deadline if renewal cannot be confirmed. A lease loss
closes the socket and fences stale callbacks. A replacement process acquires a
new generation only after expiry or clean release. Never copy live auth stores
into two active processes. An expired lease alone cannot prevent an old process
from writing files: an exclusive auth-store lock and close-before-release are
also required. Initial deployment uses one persistent host per auth store;
cross-host automatic failover needs a qualified exclusive storage handoff.

Graceful shutdown stops admission, checkpoints pending work, drains bounded
credential writes, closes the socket, releases storage ownership, then releases
the lease. A host supervisor restarts crashes and detects a wedged process.
The control plane reports stale workers even if the process cannot report its
own failure. Provider outages must not cause process restart storms.

### Three independent health signals

| Signal | Initial setting | Meaning and response |
| --- | --- | --- |
| Baileys protocol keepalive | Explicit `keepAliveIntervalMs: 30000`, connection timeout 20000ms | Provider traffic/connection state determines transport health; use Baileys' existing loop, not a second competing ping loop. |
| Worker heartbeat | Every 15s, stale at 60s | Lease owner/generation, connection state, last transport receive time, last successful operation, last error class, next retry, credential-write status. No bodies or credentials. |
| External supervisor | Check every 15s; alert at 90s stale/disconnected | Detect dead/wedged worker and false `connected` reports; restart only when ownership can safely transfer. Quiet user traffic is not a failure signal. |

Expose separately: `starting`, `connecting`, `ready`, `reconnecting`,
`needs_relink`, `stopped`, and `stale`. `ready` requires open provider connection,
current ownership, account/org binding, durable auth availability, and fresh
transport evidence. Process liveness can remain healthy during a provider outage
while readiness is false. Health reporting must not invoke an LLM or send chat
messages. `markOnlineOnConnect` controls presence and is not a keepalive mechanism.

Remove the message-idleness trigger for internal accounts. Keep a last-user-
message timestamp for activity display only. Use observable socket receive/state
events for health; do not invent a public Baileys "pong" event without checking
the pinned API. Never treat a timer tick or `connected=true` alone as fresh proof.

### Recovery policy

One account recovery controller owns retry scheduling. Reuse the current
2s → 30s bounded exponential backoff with 25% jitter. Transient retries continue
while the account is enabled and leased; reaching the current 12-attempt limit
must not permanently abandon the internal account. The generic manager and
health monitor recognize a fresh scheduled retry instead of opening another
socket. Reset backoff only after 60s of observed healthy transport.

Classify logout/revoked session as `needs_relink`, persist it, alert the existing
operator surface, and stop retries until an authorized relink succeeds.
Connection replacement is an ownership incident, not grounds for two workers
to fight; fence and investigate ownership. Retry transient connection loss and
restart-required events with one new socket after closing listeners/timers on
the old one. Repeated credential persistence failures make the account unready.
Never delete credentials or require a fresh QR on every ordinary reconnect.

Persistent credentials include Signal keys as well as `creds.json`. Retain the
current pinned library; qualify all key/credential writes under abrupt restart,
backup restore, corruption, and permission errors. The current backup helper
alone is not sufficient evidence of an atomic complete auth snapshot.

Targets are testable objectives, not zero-disconnect promises: healthy idle
accounts remain connected through a 24h soak; a recoverable network outage is
detected and the account returns to ready within 90s after connectivity and Hub
authority are restored in controlled tests. Logout can require human action.

## 4. Verified sender and agent admission

Define a new authenticated Hub endpoint
`POST /api/gateway/whatsapp/admit` with a bounded input:
`{ channelId, providerMessageId, senderPhone, senderJid, chatKind, leaseGeneration }`.
This path does not accept `userId`, `orgId`, `agentId`, or a caller-selected
session key. The gateway token must resolve to the current registered gateway
and the account assigned to it. Rate-limit per gateway/account and sender;
reject malformed inputs before identity queries. There is no enumeration API.

Before exposing content to hooks, triggers, ledgers, brain ingestion, or the
model, the internal account adapter resolves provider-proven sender identity:
canonical phone or authenticated JID→phone mapping. Do not strip digits out of
an opaque LID, use message text as proof, or accept a CRM contact match.

The server checks, in order: active account and lease; exactly one org binding;
verified `kind='channel', provider='whatsapp'` Supabase identity; enabled user
under the canonical account policy; current org membership; active personal
agent; matching gateway/org assignment. Explicitly reject uncertainty/errors.
The current profiles schema has no disable flag: the implementation must reuse
the Hub/GoTrue account-disable authority, not invent a `profiles.disabled` check.

On success, persist a turn admission bound to identity row ID and revision,
profile, org, channel, canonical provider account, agent, gateway, and generation.
Return an opaque `admissionId` and the trusted route. A removed/recreated claim
must invalidate old admissions, including same-user reclaim of the same number.
Persist a monotonic claim generation; claim attach and unlink advance it
atomically. Canonical claim confirmation/attachment and attempt limits need
transactional race tests, not separate unchecked read/update operations.

On denial: no model/tool execution, no public onboarding response, and no
content-bearing hooks or retained raw body/media for this internal account.
Retain bounded redacted rejection metadata only. Historical sync/replay follows
the same policy and never dispatches old messages as new turns. Existing CRM
accounts keep their prior ingestion rules unless explicitly converted.

## 5. Shared authorization and execution

`resolveAssistantPrincipal` remains authoritative for persisted agent delegation.
Extend the shared assistant boundary to validate `admissionId` on WhatsApp tool,
memory, credential, attachment, and result-delivery operations. The immutable
principal is supplied by server code, never by generated tool arguments.
Re-read phone claim generation, current membership, account enablement, agent
assignment, and applicable Hub policy before each protected operation.

Reuse shared module/capability/ownership/field-mask/resource checks and action
services for both Hub and WhatsApp. Discovery filters tools, but execution must
enforce policy independently. Shared harness restoration is a prerequisite:
`proposals/2026-10-15-agent-harness-restoration.md`. Never bypass a 403, grant a
bot administrator role, or create a WhatsApp-only copy of business permissions.

Context building must reuse the canonical tool registry, permitted memory and
brains, and the same turn-routing policy. Extract channel-neutral context from
browser-dependent builders. Omit active-page/form claims when there is no Hub
page. Server actions work with the browser closed; navigation yields scoped Hub
links. Browser-only interactions explicitly hand off without claiming a write.

Build a checked-in capability matrix covering every Hub-advertised tool and
action: policy rule, executor, confirmation, channel rendering, success test,
and negative test. Missing parity blocks a parity release claim. Text/voice/
image/file support must use the existing bounded media pipeline with the admitted
principal; unsupported media produces an honest outcome. Never expose hidden
tool traces or secrets in final replies.

Confirmations are one-time records bound to admission, profile, org, account,
conversation, exact canonical action hash, and expiry; consume and execute
atomically where possible. Ambiguous free-text "yes" must not choose among
multiple pending actions. Recheck authorization at confirmation execution.

## 6. Durable turns, effects, and replies

Add feature-owned PG tables under the existing Hub DB/migration system:

| Table | Required key and state |
| --- | --- |
| `whatsapp_account_leases` | Channel PK, owner/generation/expiry, health metadata; authority described in §3. |
| `whatsapp_assistant_turns` | Unique `(channel_id, provider_message_id)`; canonical sender/claim generation/principal/org/agent/conversation/admission; `admitted → running → completed`, or `denied/cancelled/failed/reconcile_required`. |
| `whatsapp_assistant_replies` | Unique `(turn_id, reply_part)`; encrypted or access-controlled payload reference, destination binding, content hash, provider message ID, and `pending/sending/confirmed/unknown/cancelled`. |
| `assistant_action_receipts` | Shared transport-neutral `(principal, org, turn, action_index)` with canonical arguments hash and `prepared/committed/unknown`; change in payload under one key is rejected. |

All feature records carry org scope with explicit RLS and service grants; no
authenticated browser gets a bulk phone/credential listing. A gateway may
operate only rows assigned to that gateway/account. Store payloads using existing
protected storage, not raw credentials or media in general logs. Retention and
dedup expiry must cover the supported replay horizon; do not silently forget an
old action key and execute its redelivered message anew.

Schedule bounded persisted work through existing `bg_jobs` ownership mechanisms,
with separate feature receipts. `job_effects` currently validates embedding
results and must not be repurposed. Long-running agent execution remains on the
gateway; Hub jobs coordinate receipts and polling, not a long serverless socket.

Deduplication occurs before model invocation and is per original provider
message, even when conversational debounce combines text. Freeze the ordered
input-ID manifest and turn ID; a changed debounce batch must not mint new action
authority for already consumed input. Serial execution key is org/profile/agent/
conversation. Worker generation fences every state transition and send attempt.

Database actions commit mutation plus action receipt in one transaction.
External actions require a downstream idempotency key or a reconciliation path.
After an ambiguous external outcome, record `unknown` and do not blindly repeat
the action. A crash after gateway run submission likewise requires reconciling
the stable run ID before rerunning. Agent text is not an action receipt.

Baileys send acknowledgement is not evidence of exactly-once delivery. Persist
intent before sending and provider ID/ack after. Timeout after send becomes
`unknown`; reconcile by stable message ID when the pinned API supports it,
otherwise require operator disposition. Never rerun the agent or a mutation to
repair delivery. The first release may visibly report uncertain delivery rather
than silently risk duplicate outbound messages.

Immediately before send, revalidate recipient claim generation, membership,
org/account binding and worker ownership. Cancellation suppresses queued
sensitive output. A revocation cannot recall a message already accepted by
WhatsApp; the guarantee applies to operations admitted after the revocation
commit, with the unavoidable in-flight send race recorded in the audit.

## 7. DELTA and implementation slices

Each slice has its own scoped branch/PR, focused tests and evidence. Paths below
marked **new** are proposed additions. Prerequisites are verified first; an
unimplemented harness dependency is not assumed shipped.

### Slice 1 — Account ownership schema and migration inventory

**Topics:** `security`, `data`

Extend `packages/db/src/pg/schema/channels.ts` and add a Hub SQL migration plus
QA seed cases for canonical identity, single-org ownership and duplicate aliases.
Add a read-only inventory script before constraints are applied. Dependency:
owner disposition of conflicting existing accounts. Proof: SQL rejects two
orgs/gateways for one WhatsApp canonical number; accepts multiple distinct
numbers in one org; existing Telegram/Discord fixtures retain their rules.

### Slice 2 — Scope enforcement and paired-account activation

**Topics:** `security`, `logic`

Update Hub channel writes, reads, pairing completion, publication/hydration and
gateway account loading. New `whatsapp-account-scope` contract tests exercise
config aliases, stale cache, attempts to transfer accounts and wrong-org tokens.
Proof: rejected binding never opens an assistant-enabled socket; a valid pair
binds once and repeated callbacks are idempotent. Audit personal-account visibility.

### Slice 3 — Protocol liveness and reconnect controller

**Topics:** `infra`, `logic`

Gateway `src/web/session.ts`, `reconnect.ts`, `auto-reply/monitor.ts`,
`gateway/channel-health-monitor.ts`, `gateway/server-core/server-channels.ts`.
Set explicit keepalive, replace message-idleness recovery for internal accounts,
coordinate retry ownership and persistent terminal states. Extend existing
session/reconnect/health-monitor tests. Proof: 24h fake-clock idle with live
transport yields zero forced reconnects; >12 transient failures still recover;
logout and competing-owner events do not loop; no duplicated timers/listeners.

### Slice 4 — Worker lease, auth durability, and host supervision

**Topics:** `infra`, `data`, `security`

Add lease migration/seed, authenticated renewal/status handlers, exclusive auth
ownership and bounded shutdown. Reuse persistent deployment configuration and
prove supervisor behavior in an isolated container. Proof: two workers cannot
open one account; lost lease fences late callbacks; process kill recovers stored
auth; corrupted/incomplete credentials yield an explicit unready state; stale
worker alerts are independent of a dead worker's reporting ability.

### Slice 5 — Canonical claims and revocation

**Topics:** `auth`, `security`, `data`

Hub channel-claim service, verify-confirm, identity DELETE, canonical PG claim
generation migration and QA matrix. Fix only the claim boundary needed for this
feature. Proof: concurrent OTP consumes are atomic, unique phone ownership,
owner-scoped unlink, revoked/reclaimed number invalidates old admission, failed
DB writes cannot report successful verification. No fixed production OTP secret.

### Slice 6 — Admission before ingestion

**Topics:** `auth`, `security`, `logic`

New Hub `api/gateway/whatsapp/admit` and server admission service; gateway
`src/web/inbound/monitor.ts` and `auto-reply/monitor/on-message.ts`. Apply account
and sender checks before content persistence/hooks and routing; preserve ordinary
channel mode. Proof: denial dispatch count and retained content count both zero;
verified users route to their persisted personal agents; opaque LID fails closed;
history import cannot bypass admission; allowlist wildcard cannot grant access.

### Slice 7 — Durable execution and shared policy binding

**Topics:** `security`, `data`, `logic`

New turn/receipt schema and services, gateway run binding and shared assistant
authorization context. Requires the harness assignment and policy prerequisites
from §5 and the settled conversation contract in §10. Proof: per-role parity matrix,
cross-org/user/tool-argument forgery denied, stable run reconciliation after
restart, and exactly one committed local mutation under duplicate input delivery.

### Slice 8 — Channel context, media, and confirmation adapters

**Topics:** `security`, `logic`

Extract common assistant context, reuse bounded media processing, map final
results/choices/links and bind confirmations. Proof: checked-in capability matrix,
browser-closed server action, media rejection, expired/cross-user confirmation,
bidirectional memory recall and deletion, and no sensitive-field leakage. Split individual media adapters into follow-on
PRs within this slice if needed; no partial capability-parity release claim.

### Slice 9 — Outbox and delivery reconciliation

**Topics:** `data`, `security`, `logic`

New reply state/service plus gateway send adapter. Proof: committed action +
failed send does not repeat action; unknown provider outcome is reconciled or
held; revocation and lease loss block queued output; chunks retain stable IDs.

### Slice 10 — Operational qualification and rollout

**Topics:** `infra`, `test`, `security`

Document per-account health and operator relink/rollback in the existing channels
surface; any UI changes require design governance and token/design lint. Local
QA first, then approved team-account live soak with recorded image SHA, binding,
health timeline and test receipts. Enable assistant flag only after all parity
and isolation gates pass. Do not send a live test message without authorization.

## 8. Verification

Focused existing gateway checks (baseline plus extended tests during development):

```sh
cd minion
pnpm exec vitest run src/web/session.test.ts src/web/reconnect.test.ts src/gateway/channel-health-monitor.test.ts
pnpm exec vitest run --config vitest.e2e.config.ts src/web/auto-reply.web-auto-reply.reconnects-after-connection-close.e2e.test.ts
```

The E2E config path exists in the inspected checkout. These commands were not
run during specification; implementation PRs must record their results. New focused
Hub tests belong alongside their admission, scope, claim and receipt services;
real SQL tests run against the loopback QA stack. Schema PRs include QA seeds.

Required cases: two users in one org; one user in two orgs; two orgs attempting
one account; duplicate aliases across gateways; unclaimed/revoked/reclaimed
phone; disabled user; missing agent assignment; unauthorized fields and rows;
duplicate input; out-of-order events; worker crash at every state transition;
outbox uncertainty; revoked access during a run; malformed/oversized media;
healthy silence; >12 disconnects; logout; competing workers; credential-write
failure; Hub authority outage; flag disabled during a run.

Memory/conversation cases: save an authorized memory from Hub and retrieve it in
WhatsApp, then reverse the direction; delete/correct it and verify both channels
observe the committed change; change Hub's selected chat while WhatsApp retains
its own prior context; reconnect/restart without resetting that context; deny
cross-org or cross-user memory; prevent a Hub "yes" from confirming a WhatsApp
action. These tests assert actual canonical storage and retrieval, not just
matching prompt text. Do not automatically persist every message as memory.

Local E2E: claim synthetic phones through real QA auth, activate a fake-provider
account, inject messages through the adapter, assert agent identity and RBAC,
perform one permitted mutation, replay it, drop the outbound ack, restart the
worker, revoke the phone, and assert no additional mutation or sensitive send.
Real-account soak additionally records 24h heartbeat freshness and no quiet-chat
reconnects. Network-drop recovery target is ≤90s after dependencies recover.

Standards and specification review results are recorded separately in the review
sidecar. Metadata validation does not prove bot runtime behavior. Production
release needs independently recorded migration, deployment and message receipts.

## 9. Rollout, rollback, and impact zones

Stage the account schema in compatibility mode, inventory duplicates, resolve
ownership, validate constraints, then enable the new adapter mode for one
organization account. Keep the old mode off for that same account to avoid two
consumers. Deploy shared DB package consumers coherently; do not assume the
gateway/Hub use the workspace package instead of their pinned dependency.

Flag-off stops new turns and cancels pending uncommitted actions and queued
sensitive replies. It preserves receipts/transcripts and may keep the supervised
socket connected for transport health. `replies='none'` blocks all outbound,
including late send attempts. Disabling transport closes the owned socket.
Do not roll back the one-org invariant by re-enabling legacy user-scoped access.

Impact: shared DB schema/package, Hub identity/RBAC/channel/config and QA seeds,
gateway WhatsApp adapter/runtime and assistant tool context. Shared protocol
changes must be reflected in `@minion-stack/shared` and tested with Hub/site/
Paperclip consumers if needed. No change to site auth or other channel ownership
is intended. Scope checks and parity requirements apply across indirect callers.

## 10. Shared memory, continuous WhatsApp history, and handoff

Owner decision: "they should both have the same memory. Since there really isn't
a way to \"pick\" a past chat and you stick with the whatsapp history as-is."

WhatsApp has one continuous logical conversation for the tuple
`(orgId, profileId, personalAgentId, receivingChannelId)`. Persist its binding to
the gateway session server-side. It survives socket reconnects, worker restarts,
and ordinary deployments. It has no Hub-style chat picker and never follows
whatever Hub chat happens to be selected. Context-window summarization may
compact model context without deleting the durable transcript or shared memory.

Hub retains its selectable chats and their local conversational context. Both
channels use the same canonical personal-agent memory service and namespace;
never create a parallel memory store keyed by channel, phone, or conversation.
Personal memory and organization knowledge retain their existing visibility
rules. In particular, org-scoped knowledge retrieved in one organization's
account cannot become globally readable merely by writing a personal memory.
Apply the same provenance and scope checks on memory writes and reads as in Hub.

Use the existing memory-save policy: a message becoming part of a transcript
does not automatically make it a durable memory. When a permitted memory write
commits in either channel, subsequent retrieval from the other sees it through
the canonical service. Use shared revision/cache invalidation for corrections,
deletions and access changes; no independent per-channel memory copy. Concurrent
turns may see only committed state, and must not overwrite each other's memory
changes with stale snapshots. Test these behaviors against the actual store.

Reply destinations, confirmations and pending actions stay in their originating
conversation; shared memory never transfers execution authority. Revoking a
phone cancels its active admissions. A reassigned number mapped to another
profile receives a different conversation binding and cannot inherit the former
owner's transcript or memory. A same-user relink requires fresh verification
and current authorization before any existing conversation can be resumed.

No product choice remains open from the earlier questions. Implementation
readiness still depends on the technical prerequisites and review below.

The shared harness dependency is not a shipped implementation claim. If it
cannot provide an agent assigned to this account's org, the correct outcome is
unavailable, not a fallback agent. Resolve that prerequisite before rollout.

The proposal and spec indexes now validate in the isolated meta worktree.
Implementation evidence and outstanding qualification are recorded below and in
the review sidecar. This does not authorize a production release.

## 11. Out of scope

Public assistants, group chat, marketing sends, Meta Cloud transport, cross-org
account sharing/transfer, active-active sockets for one account, transparent
multi-host auth-store replication, new model providers, a second permission
system, and claims of guaranteed uninterrupted WhatsApp connectivity.

## Implementation review clarifications

Independent architecture review by `security_review` found no unresolved product
decision. Standards and spec design passed, with implementation evidence pending.
Required implementation boundaries include fresh canonical gateway credentials,
atomic phone claim consumption, account ban/deletion checks, immutable turn
authority through every protected operation, conversation-bound confirmations,
no internal message debounce, and reconciliation after uncertain effects.
The development branch stays disabled by default until qualification passes.

## 12. Implemented release controls and operator sequence

The runtime currently refuses shell/process/custom/plugin/host/CLI execution and unsigned
session delegation. This is a technical parity gap, not a change to the approved
product scope. The proposal ledger and source `TODO(handoff)` markers track it.
Until the missing runners preserve authority, activation remains gated unless
the owner explicitly accepts a shared restricted capability policy.

This gap affects ordinary newly provisioned personal agents, not only optional
extensions. Hub `personal-agent-provisioner.ts:getProvisioningPayload` supplies
only name/workspace to `agents.create`; existing provisioning marks the agent
active without a runtime-policy preflight. Gateway sandbox defaults are `off`.
The new runtime requires an isolated shared configuration and rejects the normal
standard-policy session/process tools. Consequently this draft cannot activate
an ordinary new personal agent as-is. Completing shared isolation and signed
delegation is required to deliver the approved scope; neither an `active` database
row nor passing transport tests establishes personal-agent capability parity.

For an authorized release, perform these steps in order:

1. Run Hub `bun run whatsapp:inventory` against the intended database and resolve
   account/claim conflicts before applying `20261016120000_internal_whatsapp.sql`.
   Publish the matching `@minion-stack/db` schema separately.
2. Install Hub endpoints first with `WHATSAPP_INTERNAL_ASSISTANT_ENABLED` disabled.
   Export each personal graph on its owning gateway using
   `node --import tsx scripts/export-personal-knowledge.ts --state-dir <state> --agent-id personal-<profile> --org-id <org> --out <new-file>`.
   Review the private snapshot and unique profile/agent/org assignment.
3. Run `bun run whatsapp:memory-import --file <reviewed-file>` in Hub for a dry run.
   After explicit migration authorization, rerun with `--apply`. Preserve the
   original SQLite store. Verify imported facts, weighted relationships and
   tombstones before opting in the agent.
4. Add only migrated IDs to `gateway.memorySync.canonicalPersonalAgents` and
   restart the gateway. This activates canonical memory in both channels;
   unlisted agents retain their previous memory path. Prove a write, correction
   and deletion from each channel is visible from the other.
5. Qualify the same agent configuration for both channels: canonical private
   workspace, Docker sandbox mode `all`, scope `agent`, workspace access `rw`,
   network `none`, no extra mounts/setup commands/secret environment, read-only
   root, capabilities dropped, filesystem `workspaceOnly`, sandbox exec and no
   elevated or host-browser access. Configure the shared sandbox tool allowlist;
   shell/process and the default session/delegation tools are currently rejected. Do not enable
   the account by silently reducing existing Hub capabilities.
6. Bind the canonical provider account to exactly one organization and one
   durable auth directory. Enable the Hub flag and that channel's
   `settings.assistantMode=internal` only after the parity decision and tests pass.
   Pairing, sends and production configuration require release authorization.
7. Run role, attachment and confirmation parity checks using two users and two
   organizations. Verify revocation mid-turn, idle connectivity, network recovery,
   process restart and durable auth under the host supervisor. Keep observed
   application heartbeat (5s), lease (60s), health poll (15s) and Baileys keepalive
   (20s) distinct: each proves a different part of liveness.

An unknown business effect or provider send is not retried automatically. Inspect
its domain record/provider receipt before resolving the reconciliation state.
The application supervisor waits for old ownership to stop; an event-loop or
process freeze additionally requires a working external process supervisor.
