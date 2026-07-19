# Channel Setup Wizard — intent modes

**Date:** 2026-07-19
**Status:** Spec, ready to implement (not started)
**Trigger:** *"I'd suggest making the whatsapp connection wizard modular depending on where or why its triggered to avoid these agent-only items."*

---

## 1. Problem

`ChannelSetupWizard` has one fixed shape — **Connect → Name it → Assign** — written for an operator wiring up a business channel. It asks two questions that are meaningless (and slightly alarming) when a person is connecting their **own** number:

- **DM policy** — governs whether the agent auto-replies. For a personal number the only sane value is "disabled"; offering it invites the user to accidentally point a bot at their friends.
- **Assign (agent binding)** — reply routing. With DMs disabled it has no effect at all, so it's a step that does nothing but create doubt.

Both surfaced immediately once `/account/connections` gained a "Set up full sync" entry point (`28e1a320`): the same wizard now opens from a personal context and still asks operator questions.

## 2. Principle

The wizard's **trigger carries intent**. Rather than a pile of conditional flags, pass one `intent` and let it select a step set + defaults. Adding a third context later should be one entry in a map, not new branches through the component.

## 3. Design

Add one prop (default preserves today's behaviour exactly):

```ts
export type WizardIntent = 'operator' | 'personal';
interface Props {
  serverId: string;
  channelType: ChannelType;
  intent?: WizardIntent; // default 'operator'
  onclose: () => void;
}
```

| | `operator` (default) | `personal` |
|---|---|---|
| Steps | Connect → Name it → Assign | **Connect → Name it** |
| DM policy | asked | **not asked** — forced `replies='none'`, `allow_from=[]` |
| Agent assignment | asked | **skipped** (no binding row) |
| `owner_profile_id` | null (org-scoped) | **current user's profile id** (user-scoped) |
| Label default | user-supplied | prefill the account id (e.g. `+51922286663`) |
| Framing copy | "Register an account for this server" | "Connect your own number so its conversations sync" |

Call sites:
- `ChannelsTab` (`/settings?s=comms`) → `intent="operator"` (or omit).
- `ChannelLinking` (`/account/connections`) → `intent="personal"`.

Keep the intent→config mapping as one exported const (same spirit as `ORG_KIND_POLICY`), so a future `intent` is a data entry, not a code path.

## 4. Why `owner_profile_id` belongs here

P0 (`specs/2026-07-19-channel-scoping-fix-plan.md`) added `channels.owner_profile_id`: set ⇒ the account is **user-scoped** and follows the person across orgs; null ⇒ org-scoped via `tenant_id`. The personal intent is *exactly* the moment that classification is known — so the wizard should write it, instead of leaving a human to run an `update` afterwards. This closes P0's loop for every future personal connection, not just the first one.

`tenant_id` stays whatever org is active (it's NOT NULL, and remains the "home" org); `owner_profile_id` is what makes it follow the user.

## 5. Server-side note (do not skip)

`POST /api/servers/[id]/channels` → `channel.service.createChannel` must accept and persist `ownerProfileId`. Trust the **session**, not the client: derive the profile id server-side from `locals` when the request declares personal intent — never accept an arbitrary `ownerProfileId` from the body, or one user could claim another's account.

⚠️ The hub consumes `@minion-stack/db` as a **vendored tarball**, so `channels.ownerProfileId` is not yet in the hub's Drizzle types (see the raw-SQL workaround in `org-config-sync.service.ts`). Either repack/bump the db package first, or write the column the same raw way.

## 6. Verification

- Unit: the intent map — `personal` yields no assign step and `replies='none'`; `operator` unchanged.
- Manual: from `/account/connections` the wizard shows **2 steps, no DM policy, no assign**; from `/settings?s=comms` it is byte-for-byte today's flow.
- DB: a personal-intent connection lands `owner_profile_id = <caller's profile>`, `replies='none'`, `allow_from='{}'`.
- Gates: `bun run lint:design && bun run lint:tokens && bun run check` (0 errors).

## 7. Out of scope

Redesigning the operator flow, per-channel step variation beyond WhatsApp, and any change to `orgScopeVisible` enforcement (that's P2/P3 of the channel-scoping plan).
