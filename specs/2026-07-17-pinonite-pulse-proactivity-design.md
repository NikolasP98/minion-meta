# Pulse — Proactive Spine (PINONITE personal org)

**Date:** 2026-07-17
**Status:** Design approved, pre-plan
**Author:** Nikolas + orchestrator
**Scope:** minion_hub (feed + settings + nav) · minion gateway (daily agentTurn + pulse_propose tool) · one shared table pattern

---

## 1. Problem & intent

Minion is an agent-native ERP built for SMEs. Nikolas created a personal org, **PINONITE**, to manage his own life (finances, people, social, education, knowledge) and to force the ERP to be **universal** — an individual is a first-class tenant, not just a company.

The primary goal is **proactivity**: today the system is reactive (the user drives every action). Pulse adds a spine that **watches signals → an agent decides what deserves attention → surfaces it to the user → the user approves → it acts.** Built on Nikolas's own life so the use cases are concrete, but org-scoped so it generalizes to every business org later.

### Steering decisions (locked)
| Decision | Choice |
|---|---|
| Autonomy | **HITL-first**, graduate per-action-type to auto later |
| First slice | **Daily briefing digest** (cross-source morning card) |
| Delivery | **In-app Pulse feed** (primary) + **WhatsApp DM** (briefing text) |
| Personal-ERP reframing | **Minimal now** — create org kind, gate nav, friendlier labels; defer heavy personal-mode UI |
| Engine home | **Gateway cron** `platform/cron` `agentTurn` (native home; least new code) |

---

## 2. What already exists (reuse, do not rebuild)

- **Gmail** — per-user auth (`user_identities`, provider=google), read+write agent tools (`minion/extensions/gmail-calendar/src/gmail-tools.ts`), Pub/Sub watcher wakes agents on new mail, metadata-only `email_ledger`.
- **Calendar** — read+write agent tools (`calendar-tools.ts`): list/create/update/delete/find_free_slots/rsvp. **No wake/sync, no ledger** (poll on request).
- **WhatsApp** — personal QR pairing (Baileys), reads inbound + sends outbound, feeds the shared org-scoped `messages` ledger.
- **Gateway `platform/cron`** (`minion/src/platform/cron/{service,schedule,delivery,isolated-agent,types}.ts`) — schedules a `CronPayload` kind `agentTurn` that wakes an agent **with context** and delivers output to a channel (`CronDeliveryMode`, `CronMessageChannel`). Agents self-schedule via `cron-tool.ts`.
- **Hub `notif_rules`/`notif_log`** (`notif.service.ts`, `pg-notifications-schema.ts`) — deterministic "when X changes → message Y" engine with idempotency/dedup. Reused later for deterministic rules; **not** the Pulse reasoning path.
- **`channels.send`** (gateway `server-methods/channels.ts`) — single OUT path: whatsapp | telegram | email.
- **Cron tick pattern** — `GET /api/*/tick` gated by `Authorization: Bearer $CRON_SECRET`, allowlisted in `hooks.server.ts`, driven by an **off-repo netcup crontab**.

### Gaps this spec fills
1. No **in-app notification surface** in the hub (everything currently goes out over a channel).
2. No **LLM decision step** feeding a feed (today's rules are filter+template only) → solved by the gateway `agentTurn`.
3. No **proposal/HITL model** — a place for "suggested action you approve/edit/dismiss".

---

## 3. Architecture

```
┌─ gateway (minion) ─────────────────────────────┐
│ platform/cron  ── daily 08:00 (per personal user)
│   agentTurn(prompt="review my day")            │
│     reads Gmail / Calendar / WhatsApp (tools)  │
│     ├─ calls tool pulse_propose(cards[])  ──────┼──▶ POST /api/gateway/pulse/proposals
│     └─ channels.send(whatsapp, briefingText) ──┼──▶ user's WhatsApp DM
└────────────────────────────────────────────────┘
                                                   │ (server token)
┌─ hub (minion_hub) ──────────────────────────────▼┐
│ pulse_proposals (Postgres, RLS org_id)           │
│ pulse_settings  (PK org_id)                       │
│ /pulse feed UI  + top-bar bell(count)             │
│   Approve → gatewayCall(execute payload tool) ───┼──▶ gateway executes (create_event, reminder)
│   Edit / Dismiss → update row                     │
└───────────────────────────────────────────────────┘
```

**Why the agent gathers instead of a hub signal-collector:** the agent already holds the user's Gmail/Calendar/WhatsApp tools and credentials. A separate hub-side collector would re-implement reads the agent already does. The hub owns only durable proposal state + UI + approval execution.

---

## 4. Data model (new)

Two Postgres tables in `minion_hub/src/server/db/pg-schema/` (org-scoped, RLS by `org_id` matching the `app.current_org_id` GUC, same pattern as `email_ledger`). Migration under `supabase/migrations/`.

### `pulse_proposals`
| col | type | notes |
|---|---|---|
| `id` | text pk | |
| `org_id` | text | RLS key |
| `created_at` | timestamptz | |
| `source` | text | `daily_briefing` \| `email` \| `whatsapp` \| `calendar` |
| `kind` | text | `digest` \| `create_event` \| `reminder` \| `draft_reply` \| `fyi` |
| `title` | text | one-line, shown in feed + bell |
| `summary` | text | markdown body of the card |
| `payload` | jsonb | `{ tool, args }` for executable kinds; free-form for digest/fyi |
| `status` | text | `pending` \| `approved` \| `dismissed` \| `executed` \| `failed` \| `snoozed` |
| `dedup_key` | text | unique per `(org_id, dedup_key)` — stops re-proposing the same signal |
| `decided_by` | text null | user id on approve/dismiss |
| `executed_at` | timestamptz null | |
| `error` | text null | execution failure detail |

Unique index `(org_id, dedup_key)`. Feed query = `status='pending' ORDER BY created_at DESC`.

### `pulse_settings` (PK `org_id`)
| col | type | default | notes |
|---|---|---|---|
| `org_id` | text pk | | |
| `enabled` | bool | `false` | opt-in |
| `briefing_time` | text | `'08:00'` | local time for the daily turn |
| `locale` | text | `'es'` | briefing language |
| `channels` | text[] | `{whatsapp}` | where the briefing DM goes |
| `watch` | jsonb | `{email:true,whatsapp:true,calendar:true}` | signal toggles |
| `auto_approve` | jsonb | `{}` | per-kind → bool; absent/false = **HITL**. The graduation ramp. |

`auto_approve` empty = every proposal is HITL. Slice 2 turns keys on (e.g. `{"create_event":true}`).

---

## 5. Endpoints & tools (new)

### Hub: `POST /api/gateway/pulse/proposals` (server-token)
Mirrors `api/gateway/email-ledger/+server.ts` auth (gateway server token, not session). Body: `{ orgId, proposals: [{source,kind,title,summary,payload,dedupKey}] }`. Upserts on `(org_id, dedup_key)` — re-runs are idempotent. Returns inserted/skipped counts. **Writes with an explicit `org_id`** (PINONITE), so it never hits the `organization_members.limit(1)` multi-org attribution bug.

### Hub: approval actions (session, RBAC-gated)
- `POST /api/pulse/proposals/[id]/approve` → if `kind∈{create_event,reminder}`: `gatewayCall` executes `payload.tool` with `payload.args` in the user's context; set `status=executed`/`failed`+`error`. If `kind∈{digest,fyi,draft_reply}` (slice 1): mark `status=approved` (acknowledged), no execution.
- `POST /api/pulse/proposals/[id]/dismiss` → `status=dismissed`.
- `PATCH /api/pulse/proposals/[id]` → edit `payload.args` before approve.

### Gateway: `pulse_propose` tool
Small agent tool (`minion/extensions/…` or existing gmail-calendar ext) that batches cards and calls the hub endpoint with the server token. Given to the daily agent turn. Registered like other agent tools.

### Gateway: daily cron job
One `agentTurn` per personal-org user, scheduled at `pulse_settings.briefing_time`. Prompt (templated): *"Review my Gmail, Calendar and WhatsApp for today. Write a short briefing (locale=X). Then call `pulse_propose` with: a `digest` card (today's events + emails needing reply + WhatsApp threads waiting on me + commitments I made), plus one card per concrete action (create_event for appointments I agreed to, reminder for deadlines, draft_reply/fyi for messages awaiting my response). Deliver the briefing text to WhatsApp."* Delivery = `announce` to `whatsapp`.

---

## 6. Hub UI

- **Top-bar bell** — count of `status='pending'` proposals for the active org. First in-app notification surface; keep it a thin Svelte component reading a `pulse.svelte.ts` state module.
- **`/pulse` page** — cards (title, summary markdown, source/kind badge) with **Approve / Edit / Dismiss**. `create_event`/`reminder` cards show the concrete args (editable). `digest` card renders the morning briefing. Follows `ui-design-governance` (semantic tokens only); reuse the `DataTable`/card patterns already in the hub.
- **Settings** — a Pulse section: enable toggle, briefing time, locale, channel, watch toggles, and (scaffold, disabled in slice 1) per-kind auto-approve switches.

---

## 7. Personal-ERP reframing (minimal)

- **`organizations.kind`** — add `text` column, `'business'` default, PINONITE = `'personal'`. Migration + backfill.
- **Nav gating** — personal orgs hide POS / Stock / Workforce (drive via existing nav `requires:` + `policy.ts`); add **Pulse** entry. Business orgs unchanged.
- **Friendlier labels** — a label map keyed by `org.kind` (CRM → "People", etc.). Small, data-driven; no route renames.
- **Mission/vision** — one line added: individuals are a first-class ERP tenant. No rewrite.

---

## 8. Security / RBAC

- Both tables RLS by `org_id` (matches `app.current_org_id` GUC) — standard hub org-scoping.
- `POST /api/gateway/pulse/proposals` authenticated by the gateway **server token** only (same class as `email-ledger`), never a session; validates `orgId` against the token's allowed scope.
- Approval endpoints session-auth + RBAC (`rbac.service`) — Pulse is an org-data surface, so it gets a matrix entry from day one (per [[minion-erp-mission-vision]] acceptance bar).
- HITL by default: nothing executes without an explicit approve. Auto-approve is per-kind, opt-in, and never enabled in slice 1.
- Content: proposals store the agent's **summary/title**, not raw email bodies — consistent with the `email_ledger` "metadata never contents" stance. Draft-reply *text* lives in `payload` only for reply kinds (slice 2) and is the minimum needed to send.

---

## 9. Slice boundaries

### Slice 1 — the spine (ship first)
1. `organizations.kind` + nav gating + labels + Pulse nav entry.
2. `pulse_proposals` + `pulse_settings` migrations + RLS + state module.
3. Gateway `pulse_propose` tool + daily `agentTurn` cron for PINONITE user.
4. Hub `POST /api/gateway/pulse/proposals` + approve/dismiss/edit endpoints.
5. `/pulse` feed UI + bell + settings section (auto-approve scaffolded, disabled).
6. Execution on approve for **create_event + reminder**; draft_reply/fyi = read-only.

**Done = ** at 08:00 a WhatsApp briefing arrives, the `/pulse` feed shows the day's cards, approving a `create_event` card creates the calendar event.

### Slice 2 — graduate
- Draft-reply **execution** (email + WhatsApp) with edit-before-send.
- In-chat WhatsApp approve ("reply 1") — reuse `reminders.service` `scanConfirmationReplies` inbound-parse pattern.
- **Calendar wake watcher** (mirror the Gmail Pub/Sub watcher) → real-time event cards, not just daily.
- Event-triggered proposals (important new email → immediate card).
- Auto-approve go-live (per-kind switches active).

### Slice 3+ — expand
- More signals: finance thresholds (reuse `notif_rules` CandidateSource), knowledge/education nudges.
- Business-org rollout of Pulse.
- Multi-org connection→org binding hardening (fix the `organization_members.limit(1)` attribution for users in >1 org).

---

## 10. Deliberately deferred (`// ponytail`)
| Deferred | Why | Add when |
|---|---|---|
| Hub-side LLM decision engine | Gateway `agentTurn` **is** the reasoning step | never (reuse stands) |
| Connection→org binding fix | Pulse writes explicit `org_id`; doesn't hit the bug | business rollout (slice 3) |
| Calendar wake/sync | daily poll covers the digest | slice 2 |
| Draft-reply execution | higher blast radius on a personal account | slice 2 |
| In-app approve over push/email | WhatsApp + in-app cover it | on request |

---

## 11. Testing (minimum runnable checks)
- **Hub endpoint:** unit test `POST /api/gateway/pulse/proposals` — idempotent upsert on `(org_id, dedup_key)` (re-post skips), rejects bad server token, writes explicit `org_id`.
- **Approve execution:** test approve on a `create_event` card calls `gatewayCall` with `payload.args` and flips status to `executed`; failure path sets `failed`+`error`.
- **RLS:** a proposal for org A is invisible to org B's session.
- **Gateway tool:** `pulse_propose` batches and posts; assert the HTTP shape.
- No new test framework — vitest in each repo; focused runs only (never the full gateway suite per [[gw-no-full-test-suite]]).
