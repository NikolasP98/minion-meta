# Feature Specification: WhatsApp member agents and channel linking

**Feature Branch**: `spec/032-whatsapp-member-agents`
**Created**: 2026-10-22
**Status**: Approved by owner 2026-10-22 (defaults FR-006/007/008 accepted) — security-tagged (RBAC, tenant scoping): owner approves this spec before code and merges every slice
**Input**: Owner, 2026-10-22: "allow all org users with a linked whatsapp account to be able to get responses from the whatsapp agent, as if they were talking to the web agent. Same one, same RBAC, just instead of the web channel, we're using the whatsapp channel." Plus: "design a better UI experience for the user for whatsapp/channel linking with callback function support", and fold in past channel-logic debt (permissions, who can speak, how it responds, who it responds as).

## AS-IS (evidence, 2026-10-22, gateway `origin/DEV` 6d1cd88, hub `origin/master`, production)

**What makes the web agent "the same agent with RBAC"**
- The hub picks session key `agent:personal-<profileId>:…`, and the gateway runs that agent (`src/gateway/server-methods/chat/handlers.ts:338`; id format `src/agents/personal-agent-id.ts:11-17`).
- Hub tool calls carry only the gateway server token, `x-minion-server-id` and `?agentId=personal-<uuid>` (`src/agents/tools/hub/hub-common.ts:89-129`). The tools only work for `personal-*` agents (`hub-common.ts:12`).
- The hub derives the user and their permissions from that agent id on every call (`assistant-principal.ts` `resolveAssistantPrincipal`):
  1. the gateway token maps to exactly one org (`:116-140`);
  2. the `personal_agents` row is active on that same gateway (`:149-183`);
  3. the user is a member of the org (`:187-211`);
  4. capabilities are checked per module/action (`action-auth.ts:22-33`).
- **Consequence:** routing a WhatsApp DM to `personal-<profileId>` gives the same RBAC as web, with no new token.

**What a WhatsApp DM does today**
- Access control runs first. With an allowlist, an unknown sender is dropped before routing (`src/web/inbound/access-control.ts:192-235`).
- Routing never looks up who the sender is (`src/web/auto-reply/monitor/on-message.ts:73`, no `resolvedUserId`).
- The personal-agent routing tier only runs after the account and catch-all bindings (`src/routing/resolve-route.ts:486-496`).
- The gateway has a sender-identity map that Telegram, Discord and Signal use (`src/channels/channel-identity-resolver.ts:26`). Nothing fills it for WhatsApp.
- The hub has no endpoint the gateway can call to map a phone number to a member: `GET /api/gateway/channel-identities` returns identities platform-wide and gives a gateway token a 401.

**Who owns a phone number**
- Supabase `user_identities` (`provider='whatsapp'`, `external_id` = digits only, `verified_at`).
- It is unique per number across the platform and has no org column. Org scope comes from `organization_members` (`organization_id, profile_id, role`).

**FACES production data (queried 2026-10-22)**
- 12 members, 10 personal agents. **9 of those 10 have `gateway_id` NULL.** Cause: the provisioner passes `serverId: ''` (`personal-agent-provisioner.ts:181`), and the insert never re-binds an existing row (`personal-agent.service.ts:113-125`).
- 3 members have a verified WhatsApp number. **Only 1 member is both verified and bound.**
- The FACES gateway's `agents.list` holds only `faces_bot_prd`, `clinic`, `faces_public` and the owner's `personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0`.
- **Consequence:** for most members the "same web agent" does not run on that gateway today, and their hub tool calls would be refused (403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`).

**Linking**
- The hub's QR pairing ignores the card's server and pairs on whichever gateway the browser is connected to (`WhatsAppQrPairing.svelte:19` `void serverId`).
- The gateway accepts any account id. On 2026-10-22 the owner deliberately linked PANIK (+51902829738, org `c9e8dc46`) from inside FACES. It was accepted silently:
  - a hub channel row was created in FACES (`rtvk049q2n9s3fauxsx6hzn9`);
  - **1,724 PANIK messages were written under the FACES org**;
  - PANIK's own gateway logged out.
- The owner is keeping that state for further testing.

**Earlier attempt**
- Drafts gw #330, hub #544 and meta #810 (Oct 16, about 12k lines; spec `specs/2026-10-16-internal-whatsapp-personal-assistant-spec.md`) add leases, a turn/reply outbox, signed per-turn admissions and canonical memory.
- They stay in draft because the drafts' authors gated them on full capability parity. **This spec is the minimal direct path.** It supersedes the drafts' slice 1 and leaves their durability work as later options (see P3).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A member talks to their own assistant on WhatsApp (Priority: P1)

A FACES staff member has verified their WhatsApp number in the hub. They DM the org's WhatsApp number and ask what they would ask the hub assistant ("what's on my agenda today?", "register a sale…"). Their own personal agent answers, with the same memory, tools and permissions as in the hub. A teammate with fewer permissions asking the same thing gets the same refusal they would get on the web.

**Why this priority**: it's the owner's stated priority action. It puts the assistant where staff already are, with no new permission model to trust.

**Independent Test**: with member mode on for one account, member A (who has a sales permission) and member B (who doesn't) each send the same request. A's request succeeds and B's is refused, exactly as both are on the web. A non-member sending a DM gets the account's existing customer behaviour.

**Acceptance Scenarios**:
1. **Given** member mode is on for account X of org O, and member M has a verified number +N and an active personal agent, **When** +N DMs X, **Then** M's personal agent replies on WhatsApp within the normal agent latency.
2. **Given** the same setup, **When** M asks for something their role can't do, **Then** the agent refuses for the same reason as on the web, and nothing changes in the data.
3. **Given** +N is not a verified identity of any current member of O, **When** +N DMs X, **Then** the account's existing behaviour applies unchanged (allowlist, receive-only or bound agent).
4. **Given** M is removed from O or un-verifies +N, **When** +N DMs X, **Then** within 5 minutes their messages are no longer answered by M's agent. Any tool call is refused immediately, because the hub re-checks membership on every call.
5. **Given** a group chat on X, **When** M writes in it, **Then** member mode does not apply. Groups keep their current behaviour.
6. **Given** M's personal agent isn't provisioned on O's gateway yet, **When** +N DMs X, **Then** it is provisioned there before the first reply, or M gets a single clear message that their assistant isn't ready yet. M is never routed to another agent.

---

### User Story 2 — An admin links a WhatsApp account safely (Priority: P2)

An org admin adds or re-links a WhatsApp account. They get one guided flow: a QR code, a live status (waiting → scanned → linked), and a clear outcome. If the phone that scanned isn't the expected number, or the number belongs to another organization, they get an explicit message and nothing is linked.

**Why this priority**: today's test proved the current flow can attach another org's number and import its history without warning.

**Independent Test**: re-link a card by scanning the expected phone and it succeeds. Scan a different phone and the flow reports a mismatch with no data imported. Try a number owned by another org and it is refused before any history arrives.

**Acceptance Scenarios**:
1. **Given** a card on gateway G, **When** the admin starts pairing while the browser is connected to another gateway, **Then** pairing still runs on G.
2. **Given** the card expects +A, **When** the admin scans with +B, **Then** the flow shows "scanned with +B, expected +A". There is no new account, no history import, and the old credentials are kept until a pairing succeeds.
3. **Given** +B is linked to a channel of another org, **When** someone tries to link +B in org O, **Then** it is refused with "This number belongs to another organization", and the other org's channel is untouched.
4. **Given** a linked account gets logged out by WhatsApp, **Then** the org's channel admins get a notification within 5 minutes, and the card shows "Needs re-link" (not "linked").
5. **Given** the pairing component is reused elsewhere (setup wizard, card re-link, member self-service), **Then** every caller gets the same lifecycle callbacks: QR ready, scanned, linked, mismatch, expired, error.

---

### User Story 3 — One place to control who can speak, how it replies, and as whom (Priority: P3)

An admin opens a WhatsApp account and sees, in one panel:
- **Who can talk to it:** nobody, members only, allowlist, everyone.
- **How it replies:** receive-only, auto-reply.
- **Who it replies as:** a bound agent, or each member's own agent.

All of it is stored in the hub, and each setting has one source of truth.

**Why this priority**: it pulls together existing debt (routing bindings still in `gateway.json`, the channel-scoping fail-open plan, the internal-WhatsApp drafts). It's valuable, but it isn't needed for P1/P2 to ship.

**Independent Test**: changing any of the three settings in the panel changes the gateway's behaviour without editing `gateway.json`.

**Acceptance Scenarios**:
1. **Given** the panel, **When** the admin chooses "members talk to their own agent", **Then** P1 behaviour is on for that account, and customer behaviour is shown next to it.
2. **Given** routing bindings exist, **When** viewed or edited in the panel, **Then** the change persists in the hub and reaches the gateway through the channel mirror.

### Edge Cases

- **Number formats:** WhatsApp sends JIDs/LIDs, the hub stores digits, the gateway compares E.164. All three are normalised to one form before lookup. A LID-only sender with no phone can't be resolved and gets customer behaviour.
- **Number in several orgs:** a number verified by one user who belongs to two orgs. Only the account's own org counts, and that membership is what's checked.
- **Hub unreachable:** member mode fails closed for that message (customer behaviour or no reply). It never replies as a different agent. The failure is logged.
- **Receive-only account (`replies:none`):** stays a full kill switch, members included. The panel says so.
- **Owner messaging their own business number from the paired phone itself:** that phone's sender isn't a separate DM (existing self-chat rules apply). No change.
- **Media from members:** handled as for any personal-agent turn. No new media path.
- **Org CRM inbox:** member conversations with their assistant aren't written into the org's shared customer message ledger or CRM, and aren't backfilled into it.

## Requirements *(mandatory)*

### Functional Requirements

**P1 — member agents**
- **FR-001:** Per WhatsApp account, an org admin can turn on **member mode**. It is off by default, so existing accounts behave identically.
- **FR-002:** With member mode on, a 1:1 DM is answered by the sender's personal agent if and only if the sender's number is a verified identity of a current member of the account's org, and that member has a personal agent.
- **FR-003:** The member's agent identity is exactly the one the web assistant uses (same agent id), so every permission check is the existing one. No new permission rules, tokens or capability lists.
- **FR-004:** The decision is made by the hub, the source of truth for membership and verification, and asked per message. The gateway may cache a "yes" for at most 5 minutes and a "no" for at most 1 minute.
- **FR-005:** Member DMs skip the account's customer allowlist and customer routing. Non-member DMs keep the current behaviour exactly.
- **FR-006:** A member's personal agent must be bound to and present on the account's gateway before it answers.
  - If the org has exactly one gateway, an unbound agent is bound to it and provisioned on first use.
  - Otherwise the member gets one "assistant not ready" reply, and the case is logged.
- **FR-007:** Member conversations aren't written to the org's shared message ledger or CRM, aren't backfilled, and keep their own per-member WhatsApp session with the agent.
- **FR-008:** `replies: none` (receive-only) blocks member mode too.
- **FR-009:** Every member-mode decision is logged on the gateway: account, number fingerprint, member yes/no, agent id. Phone numbers appear in logs only as fingerprints.

- **FR-019** (owner, 2026-10-22): a WhatsApp number an org provisions starts in **members-only** mode: closed to the public, with verified org members reaching their own assistant. That means auto-reply on, an empty customer allowlist, and member mode on. The setup wizard offers it as the default for org (operator) setups. Other channels and personal numbers keep their defaults. Existing accounts are unchanged.

**P2 — linking**
- **FR-010:** Pairing always runs on the gateway that owns the channel being linked, whichever gateway the browser is connected to.
- **FR-011:** The gateway refuses to pair an account id that isn't registered for its org.
- **FR-012:** After a scan, the linked number is compared with the card's expected number.
  - On a mismatch: no account is created, no history is imported, and the previous credentials are kept.
  - The flow reports the expected and actual numbers.
- **FR-013:** A number linked to another org's channel can't be linked in this org.
- **FR-014:** One reusable link-session flow is used by the setup wizard, card re-link and any future self-service. It exposes the lifecycle events QR ready, scanned, linked, mismatch, expired and error, so each caller can react (persist, toast, advance a wizard step).
- **FR-015:** When WhatsApp logs an account out, the hub marks the card "Needs re-link" and notifies the org's channel admins within 5 minutes. The status dashboard stops showing "linked" just because credential files exist.

**P3 — consolidation (roadmap, specified separately per slice)**
- **FR-016:** Who-can-speak, reply mode and reply-as live in one panel per account, backed by the hub.
- **FR-017:** Routing bindings move from `gateway.json` to the hub's channel mirror, which the `channel_bindings` table was created for but never read.
- **FR-018:** The channel-scoping fail-open plan (`specs/2026-07-19-channel-scoping-fix-plan.md`, P1–P4) is resumed, and gateway org checks fail closed.

### Key Entities

- **Member mode:** a per-account setting (on/off) stored with the account's other channel settings in the hub.
- **Verified member identity:** a hub user's verified WhatsApp number, valid for an org while the user is a member of it.
- **Personal agent:** one per user (`personal-<profileId>`), with an assigned gateway. The same agent serves web and WhatsApp.
- **Link session:** one pairing attempt for one account on one gateway, with lifecycle states and an expected number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001:** For a member with a verified number, a DM to a member-mode account gets their own agent's reply in 100% of trials, for 3 different FACES members.
- **SC-002:** The RBAC parity test produces identical allow/refuse outcomes on web and WhatsApp for at least 5 permission-gated requests across 2 roles.
- **SC-003:** Non-member behaviour is unchanged: 0 differences on a replay of the account's customer test cases, and no customer gets a member-agent reply.
- **SC-004:** After a member is removed, their number gets no member-agent reply within 5 minutes, and tool calls are refused immediately.
- **SC-005:** A wrong-phone or foreign-org pairing attempt creates 0 accounts and imports 0 messages.
- **SC-006:** A WhatsApp logout reaches a channel admin as a notification within 5 minutes.

## Assumptions

- WhatsApp's sender identity on a 1:1 DM is trusted the way it is for every other channel feature; there is no extra second factor.
- Members are expected to verify their number through the existing hub flow.
- "Same memory" means the agent's existing memory, unchanged. Unifying web and WhatsApp memory into one canonical store (draft #544's canonical memory) is out of scope; the agent already shares whatever memory it has across both.
- The drafts gw #330, hub #544 and meta #810 stay unmerged. P3 re-evaluates their durability parts (outbox, leases) as optional hardening.
- The owner's deliberate PANIK-in-FACES test state is left in place and is not cleaned up by this work.
