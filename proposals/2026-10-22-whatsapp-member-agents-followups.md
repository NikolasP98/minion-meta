---
id: 2026-10-22-whatsapp-member-agents-followups
title: WhatsApp member agents — open ends from spec 032 S1/S2
status: draft
created: 2026-10-22
updated: 2026-10-23
repos: [minion, minion_hub]
spawned_spec: 2026-10-22-whatsapp-member-agents-spec
effort: M
source: specs/032-whatsapp-member-agents
---

# WhatsApp member agents — open ends

Open ends left by S1 (hub #579) and S2 (gateway #353). Each has a `TODO(handoff)` at its site except where noted.

**AS-IS → TO-BE**

1. **Assistant sends still reach the org ledger.** The generic outbound path (`src/infra/outbound/deliver.ts`, e.g. the message tool) still records a member's assistant sends in the org ledger. TO-BE: skip member sessions (FR-007).
2. **Contact import and backfill include member chats.** On link or reconnect, the per-account contact import and history backfill (`src/web/inbound/monitor.ts`) pull in member chats. TO-BE: exclude verified members' chats, or accept this explicitly in the spec.
3. **Slash commands blocked for members.** Command authorization still reads the customer allowlist, so a member who isn't on it can't run slash commands. TO-BE: members authorized like their web session.
4. **Multi-org members get the customer path.** When the hub answers `agent_not_ready` (an unbound agent of a multi-org member, or a multi-gateway org), the gateway treats the sender as a non-member. TO-BE: one "assistant not ready" reply, per spec 032 AS-6. No TODO at the site; recorded here.
5. **Card reply-mode buttons may not save (unverified).** The ChannelCard behaviour block (reply-mode buttons, enable toggle) only renders for gateway-only `gw:whatsapp:…` cards, whose PUT can't match a DB row, so those controls may not persist. Found while building S1; not reproduced in a browser.
6. **Removal reaches the gateway late.** A cached "yes" can outlive a membership removal by up to 5 minutes (shortcut). TO-BE: hub push on membership/identity change.
7. **Multi-gateway orgs.** Unbound agents never auto-bind there (shortcut). TO-BE: bind when an org runs more than one gateway.

**DELTA**: one PR per item. Each test asserts the TO-BE: no ledger row for member sessions, no member chats imported, a member's slash command authorized, a "not ready" reply for multi-org members, and a reply-mode change that persists.

**Source references** (absorbed from the handoff-ledger sweep, which independently flagged the same two TODO(handoff) sites):
- Item 1: `NikolasP98/minion-ai@DEV src/infra/outbound/deliver.ts:989` — https://github.com/NikolasP98/minion-ai/blob/DEV/src/infra/outbound/deliver.ts#L989 (was handoff-minion-ai-632575475)
- Item 2: `NikolasP98/minion-ai@DEV src/web/inbound/monitor.ts:603` — https://github.com/NikolasP98/minion-ai/blob/DEV/src/web/inbound/monitor.ts#L603 (was handoff-minion-ai-3056368971)
