# Feature Specification: One owner per WhatsApp number, with a confirmed handover between orgs

**Feature Branch**: `spec/034-whatsapp-number-handover`
**Created**: 2026-10-23
**Status**: Draft — security-tagged (tenant scoping, channel ownership): owner approves the spec before code and merges every slice
**Input**: Owner, 2026-10-23: "set it, and write the spec for the proper fix. If a whatsapp org number is set and already exists on another org, then there should be a proper decomission/comission flow, so the MINION org automatically retires the number once the new org confirms the number (not before, to avoid number stealing)."
**Follows**: spec 032 (WhatsApp member agents). Its P2 story (pair on the card's gateway, refuse numbers owned by another org) is the entry point this spec completes.

## AS-IS (evidence, 2026-10-23, gateway `origin/DEV`, hub `origin/master`, production)

**Two physical gateways share one token and three hub gateway records**

| Hub gateway record | Name | Org | Channel rows | Used by |
|---|---|---|---|---|
| `870bd8f1` (legacy id `1cf319d2`) | netcup-prd | MINION | 10 | `minion_gateway-default` (its `hubMetrics.serverId` is `1cf319d2`) |
| `a64274a8` | netcup-faces-prd | FACES SCULPTORS | 2 | `minion_gateway-faces` (`hubMetrics.serverId` = `a64274a8`) |
| `db408ec9` | netcup-prd | PINONITE | 1 | no gateway connects as it (`last_connected_at` null) |

All three records store the same token ciphertext.

**Hydration ignores which gateway is asking**
- The gateway loads its channel settings from `GET /api/internal/channels/resolved` with only the bearer token (`src/gateway/channel-hydrate.ts:80-81`). It does not send `x-minion-server-id`.
- Every other gateway→hub call sends it: hub tools (`src/agents/tools/hub/hub-common.ts:92`), the message ledger (`src/infra/message-ledger-flusher.ts:77`) and the REST registry (`src/gateway/hub-rest-registry.ts:12`).
- Without the header, the hub's `resolveServerTokenAuth` resolves the shared token to the MINION record. So **both** gateways get `870bd8f1`'s rows (`minion_hub src/routes/api/internal/channels/resolved/+server.ts:26-55`).

**The hub's rows don't match where the numbers actually run**

| Number | Physically on (gateway.json) | Hub row(s) | Hub row's org |
|---|---|---|---|
| +51902829738 PANIK | faces **and** default | `870bd8f1`, plus `a64274a8` (created 2026-10-22 by the cross-org link) | MINION; FACES |
| +51906090526 FACES OFICIAL | faces | `870bd8f1` | FACES (on the MINION gateway record) |
| +51992376833 | faces | `870bd8f1` | FACES (on the MINION gateway record) |
| +51922286663 | default | `a64274a8` | org `3e721e98` (on the FACES gateway record) |

The FACES gateway's mirror is right today only by accident. It loads the MINION record, and that record happens to hold the three numbers FACES runs. If FACES hydrated from its own record instead, it would lose FACES OFICIAL and +51992376833 from its mirror. With `ORG_SCOPE_SOURCE=db` those two would then fall back to gateway.json for org ownership (`src/plugins/org-enforcement.ts:62-75`). It would also pick up +51922286663, which it doesn't run.

**Nothing stops two orgs from owning the same number**
- The channels unique key is `(tenant_id, gateway_id, type, account_id)` (`minion_hub src/server/services/channel-sync.service.ts:198`). So the same WhatsApp number can sit in any number of orgs and on any number of gateway records.
- Pairing uses the active WebSocket gateway and ignores the card's server (`WhatsAppQrPairing.svelte:19 void serverId`; spec 032 P2). That is how PANIK got a FACES row while its MINION row stayed live.
- Settings now have to be set on both copies. On 2026-10-23 the member-mode toggle on the FACES card did nothing, because the gateway reads the MINION copy. A one-row DB update was the workaround. (It set `memberAgents` on `chan_4090d197…`; undo with `settings - 'memberAgents'`.)

**Not verified:** whether PANIK is actually connected on `minion_gateway-default` as well as `minion_gateway-faces`. Two live sessions on the same WhatsApp linked device would compete. Production container reads were blocked in this session, so the plan must check this first.

## TO-BE

1. Every active WhatsApp number has exactly **one** active owner: one org, on one hub gateway record, which is the gateway that physically runs it.
2. A gateway's settings come only from **its own** gateway record. A setting changed on the card the hub shows always reaches the gateway that runs the number.
3. Moving a number to another org is a two-phase handover:
   - **Commission:** the new org links the number on its own gateway.
   - **Confirm:** the link proves possession, because the phone that scanned the QR reports the same number.
   - **Decommission:** only then does the old org's row retire, automatically.
   - Until confirmation, the old owner keeps the number and nothing about it changes.
4. A number can't be stolen. An org that merely types, imports or syncs a number it can't link gets nothing, and the current owner's row is untouched.

## User Scenarios & Testing

### User Story 1 - A setting on the card reaches the gateway (Priority: P1)

An org admin turns on member mode (or changes replies or the allowlist) on their WhatsApp card. Within one refresh cycle the gateway running that number applies it. The admin never has to switch org or touch the database.

**Why this priority**: today's failure. The FACES toggle didn't work and needed a DB write.

**Independent Test**: change a setting on the FACES PANIK card. The FACES gateway's mirror shows the change after its next tick. No change to any other org's row is needed.

**Acceptance Scenarios**:

1. **Given** a number owned by org A on gateway record G, **When** an admin of A changes a setting on its card, **Then** the gateway that connects as G applies it within one refresh cycle (5 min).
2. **Given** two gateways that share a token, **When** each hydrates, **Then** each receives only the rows of its own gateway record, never another record's.
3. **Given** a gateway that sends no gateway id (an old build), **When** it hydrates, **Then** it gets today's behaviour (token-resolved record), and the hub logs a warning naming the gateway.

### User Story 2 - Move a number to another org with a confirmed handover (Priority: P1)

The FACES admin links PANIK on the FACES card. The number still belongs to MINION. The hub shows "This number is in use by another organization. Scan the QR with that phone to move it here."

1. The admin scans the QR with PANIK's phone.
2. The link succeeds and the phone reports +51902829738.
3. The hub moves ownership to FACES and retires MINION's row.
4. MINION's admins get a notification that the number moved.

**Why this priority**: the owner's explicit ask. It also repairs today's PANIK duplication through the product, not by hand.

**Independent Test**: from org B, start a link for a number org A owns.
- Before scanning: org A's row is unchanged and still routes messages.
- After a successful scan: org A's row is retired, org B's row is the only active one, and messages route under org B.

**Acceptance Scenarios**:

1. **Given** org A owns the number, **When** org B starts a link, **Then** org B's card shows a pending handover, and org A's row, settings, routing and connection are unchanged.
2. **Given** a pending handover, **When** the scanned phone reports the same number, **Then** in one step: org B's row becomes the active owner, org A's row is retired (kept, not deleted), and org A's admins are notified.
3. **Given** a pending handover, **When** the scanned phone reports a different number, **Then** nothing changes for org A. Org B sees a mismatch message (spec 032's `onMismatch`).
4. **Given** a pending handover, **When** the QR expires or the admin cancels, **Then** the pending state clears and org A is unchanged.
5. **Given** the number ran on a different physical gateway under org A, **When** the handover confirms, **Then** the old gateway stops running the number: it drops it from its mirror and closes its session. That gateway never fights the new one for the linked device.

### User Story 3 - A number can't be claimed without the phone (Priority: P1)

Several paths can create a row without pairing: a gateway.json import or sync, a backfill, or a typed account. If one of them creates a row for a number another org owns, the hub doesn't make it active. It stays inactive with reason "owned by another organization", and the existing owner is untouched.

**Why this priority**: the "avoid number stealing" half of the owner's rule.

**Independent Test**: run the channel import for a gateway.json that lists a number org A owns, under org B. No active row for org B, and org A unchanged.

**Acceptance Scenarios**:

1. **Given** org A owns the number, **When** any path other than a confirmed handover writes a row for org B, **Then** that row is inactive with reason `owned_elsewhere`, and the gateway that runs org B's accounts doesn't load it.
2. **Given** a retired row, **When** a sync re-imports it, **Then** it stays retired. Sync never revives it.

### User Story 4 - Repair today's data once (Priority: P2)

A one-time repair makes production match TO-BE 1:

- every WhatsApp row moves to the gateway record that physically runs it;
- PANIK gets a single owner, FACES, which the owner chose on 2026-10-22: "lets keep it in FACES for now";
- MINION's PANIK row retires through the same retire path US2 uses;
- the gateway.json on the gateway that no longer owns PANIK stops listing it.

**Independent Test**: after the repair:
- each gateway's hydrated mirror lists exactly the numbers in its gateway.json;
- no number has more than one active row;
- the run is idempotent (a second run changes nothing).

### Edge Cases

- **Handover started, then the old owner changes settings**: the settings apply to the old owner until confirmation. On confirmation the new owner's row keeps its own settings. Nothing is carried over implicitly.
- **Two orgs start a handover for the same number at once**: the first confirmed link wins. The other link gets the mismatch/owned-elsewhere message once ownership has moved.
- **Old owner's gateway is offline at confirmation**: the hub retires the row anyway. When that gateway next hydrates, the number is gone from its mirror and it closes the session.
- **Number logged out on the old gateway** (e.g. +51992376833 today): the handover works the same way. Possession is proved by the new scan, not by the old session.
- **Retired row's history** (messages, member identities, ledger rows): kept and still visible to the old org. A retired row is never deleted.
- **Handing a number back** (FACES → MINION later): the same flow in reverse. The retired MINION row may be reactivated by the confirm step, instead of a duplicate being created.
- **Personal org owns the number** (e.g. +51922286663 under org `3e721e98`): same rules. No org kind is exempt.
- **PINONITE gateway record `db408ec9`**: no gateway connects as it. The repair leaves it alone and only records it.

## Requirements

### Functional Requirements

- **FR-001**: The gateway MUST identify its own gateway record when loading channel settings, the same way its other hub calls already do.
- **FR-002**: The hub MUST return channel settings only for the gateway record the caller identifies. A caller that identifies a record the token does not authorize MUST be refused.
- **FR-003**: Old gateway builds that send no gateway id MUST keep today's behaviour, and the hub MUST log a warning for them until every gateway is upgraded.
- **FR-004**: At most one active WhatsApp row per number MUST exist across all orgs and gateway records. The hub MUST enforce this at the data level, not only in UI checks.
- **FR-005**: Linking a number that another org owns MUST start a pending handover. A pending handover MUST NOT change the current owner's row, settings, routing or connection.
- **FR-006**: A handover MUST confirm only when the phone that completed the link reports the same number as the pending claim. On confirmation, the new row becomes active and the old row retires in one atomic step.
- **FR-007**: Retiring MUST mark the row inactive with a reason, time and successor reference. It MUST NOT delete it. Its history stays readable to its org.
- **FR-008**: The gateway that ran a retired number MUST stop running it on its next refresh: drop it from routing and close its WhatsApp session for that number. It MUST NOT log the linked device out, because the new owner's session uses the same phone.
- **FR-009**: Admins of the old org MUST be notified when a number is moved away, naming the number, the new org and the time.
- **FR-010**: Any path that writes a channel row without a confirmed link (import, sync, backfill, manual) MUST NOT activate a number owned by another org, and MUST NOT revive a retired row.
- **FR-011**: A pending handover MUST clear on QR expiry, link failure, number mismatch or cancel, with no effect on the current owner.
- **FR-012**: A one-time repair MUST move each WhatsApp row to the gateway record that runs it, leave one active owner per number, and be idempotent. It MUST dry-run by default and print every row it would change.
- **FR-013**: Pairing MUST run on the gateway that belongs to the card's gateway record, not the browser's active connection (completes spec 032 P2).

### Key Entities

- **Channel row**: a number's membership in one org on one gateway record. Gains a lifecycle state (active / pending-handover / retired / owned-elsewhere), plus a retire reason, time and successor.
- **Handover**: one pending claim of a number by an org. It records the claiming org, the target gateway record, who started it and when, and its outcome (confirmed / mismatch / expired / cancelled).
- **Gateway record**: one hub record per physical gateway. Today several records share a token. Each running gateway is identified by its own record id.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A setting changed on a WhatsApp card takes effect on the gateway that runs the number within 5 minutes, in 10 of 10 trials, with no DB write.
- **SC-002**: Zero WhatsApp numbers have more than one active row after the repair. A daily check reports any new duplicate.
- **SC-003**: In a handover test, the old owner's row and routing are unchanged at every point before confirmation. After confirmation, the old row is retired within one step and the old gateway stops running the number within one refresh cycle.
- **SC-004**: An import, sync or backfill that names a number owned elsewhere creates zero active rows.
- **SC-005**: Each gateway's mirror lists exactly the WhatsApp numbers in its own gateway.json after the repair.

## Assumptions

- **Proof of possession is the QR scan.** A successful link where the phone reports the same number is the confirmation. No extra approval from the old org is required. The owner asked for an automatic retire on confirmation; the old org is notified (FR-009) but can't veto.
- **The final owner of PANIK is FACES.** This follows the owner's 2026-10-22 instruction to keep testing it there. Change the repair input if that changes.
- **Retired rows are kept indefinitely.** Pruning them is out of scope.
- **Out of scope:**
  - separate tokens per gateway record (token rotation);
  - the PINONITE record;
  - Telegram and Discord numbers. The rules generalize to them, but this spec only enforces them for WhatsApp, where the bug is.
  - the WhatsApp `external_id` normalization (spec 032 follow-up).
- **Check first in the plan:** whether PANIK is connected on both physical gateways right now. Container reads were blocked in this session.
