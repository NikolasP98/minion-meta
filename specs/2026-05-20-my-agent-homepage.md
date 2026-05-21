# /my-agent Homepage — Design

**Date:** 2026-05-20
**Status:** Draft — ready for review
**Author:** Claude (Opus 4.7) + Nikolas P., synthesized from 5-specialist UX panel (IA, IxD, Visual, Patterns, Disclosure) + PM aggregator
**Memory:** [[project_my_agent_homepage_redesign]]

## Goal

Replace the hub's default homepage (agents-list + tabbed detail) with `/my-agent` — a calm, always-visible surface for each user's **personal "drone" agent**, the biographer that watches the user's cross-channel activity and surfaces only what's relevant. The current home moves to `/agents` under the gateway group. A per-user setting (with per-team admin default) picks which page renders at `/`.

## Motivation

Today the hub's `/` is a power-user agent-management view. It assumes the user wants to inspect, configure, and chat with the custom agents they've built. That's correct for operators but wrong for the everyday user, who has one agent that matters most: their own.

The personal agent is conceptually new and architecturally significant:

- **Never spoken to by strangers** — only by its owner. All inbound channel messages route to other agents; the personal agent observes them passively.
- **Auto-created on first contact** — when a stranger texts a user-owned channel, the gateway checks the users DB; if no match, it creates the user + workspace using the user's ID, then attaches a personal-agent scaffold of `.md` files (parallel to `agents/<id>/` but per-user).
- **The biographer** — it intercepts every cross-channel message the user exchanges with custom agents (WA/TG/Discord/calls/Gmail/Calendar when tools connected), identifies the (user, session, agent) tuple, and writes to the user's workspace `.md` scaffold.
- **Owns user-scoped credentials** — gws (Google), per-channel tokens, etc., stored in the secrets vault under the user's namespace.

`/my-agent` is the surface the user sees first every day. It is *not* a chat UI; it is a curated daily feed that the user can talk to. The chat affordance is one input at the bottom, not the page's center of gravity.

## Architecture

### Routing

```
src/hooks.server.ts  ──┐
  handle({event}):     │
    if (url.pathname === "/"):
      choice = event.locals.user?.homePageChoice
            ?? event.locals.team?.defaultHomePage
            ?? "/my-agent"
      throw redirect(307, choice)

src/routes/(app)/
  my-agent/+page.svelte         ← NEW · default home
  agents/+page.svelte           ← MOVED from current /+page.svelte
  settings/identities/+page.svelte  ← NEW · claim/merge management
  settings/general/+page.svelte ← adds "Open this page on startup" radio list
```

307 (temporary) lets defaults change without poisoning browser caches.

### Layout grammar

```
┌────────────────────────────────────────────────────────────┐
│ [logo] netcup▾  Browse▾   FACES SCULPT▾  ⚙ 🐛 NS         │ ← topbar unchanged
├──┬─────────────────────────────────────────────────────────┤
│🏠│  Good morning. 2 threads, 1 meeting at 3pm.            │ ← agent greeting
│👥│                                                          │
│⚙ │  TASKS · 2                                              │
│NS│  ☐ Review Q2 roadmap         [Reply] [Snooze] [✕]      │ ← top-3 curated
│  │  ☐ Approve team budget                                  │
│  │                                                          │
│  │  THREADS · 3                                             │
│  │  💬 Sussi · WA · "tomorrow?"                            │
│  │                                                          │
│  │  CALENDAR · 1                                            │
│  │  📅 3:00 PM · Team standup                              │
│  │                                                          │
│  │  ── More from today (9) ────────────────                │ ← collapsed
│  │  ── What I noticed (35) ────────────────                │ ← raw observations
│  │                                                          │
│  │  ── Yesterday ──────────────────────────                │ ← history 60% opacity
│  │  [sealed dated card]                                     │
│  │                                                          │
│  │  ┌─ Ask your agent…                              ⌘K ─┐  │ ← sticky bottom
│  │  └────────────────────────────────────────────────────┘  │   52→96px on focus
└──┴─────────────────────────────────────────────────────────┘
```

- **48px icon-rail left** replaces today's 220px agents-list sidebar. Icons: `/my-agent`, `/agents`, Settings, avatar.
- **720px centered single column**, content background `#111111` against `#0d0d0d` shell.
- **Top bar unchanged** — workspace dropdown, Browse, status, gear, avatar all stay.
- **Coral `#e87d6a` accent** preserved. New: 32px circular avatar with 1px coral ring at top of column (sole signature treatment for the personal-agent surface).

### Data flow

```
inbound channel message (WA/TG/Discord/call/email)
  └─→ channel extension handler
       ├─→ existing routing → custom agent
       └─→ personal-agent intercept hook   ← NEW
             ├─→ resolve (user, session, agent) tuple
             ├─→ append to user's message-ledger (per-user scope)
             ├─→ relevance scorer → maybe surface in feed
             └─→ update user workspace .md scaffold

/my-agent page
  └─→ gateway RPCs
       ├─→ myAgent.feedToday()         → curated items (3 surfaced + 9 collapsed + 35 hidden)
       ├─→ myAgent.claimSuggestions()  → unresolved identity links
       ├─→ myAgent.compactEod()        → seal today into history (cron + manual fallback)
       └─→ myAgent.askChat()           → conversational interface to the agent
```

The intercept hook extends the existing `src/infra/message-ledger.ts` globalThis-shared module (per [[reference_module_state_bundle_dup]]) with per-user scoping. No new bundling-state trap.

### Component tree

```
src/lib/components/myAgent/
  NavRail.svelte           — 48px icon column (replaces existing sidebar on this route)
  AgentGreeting.svelte     — single-sentence status line
  FeedSection.svelte       — TASKS / THREADS / CALENDAR group with small-caps header
  FeedCard.svelte          — 56px row, hover Reply/Snooze/Dismiss, click=open thread
  ClaimSuggestion.svelte   — muted secondary card, last in feed, ghost buttons
  HistoryTray.svelte       — collapsible past-days with sealed dated cards
  ChatInput.svelte         — sticky bottom, 52→96px, two-mode (ask vs capture)
  EmptyState.svelte        — dashed coral avatar + 3 setup suggestion cards
```

## Decisions

Locked via AskUserQuestion 2026-05-20 and UX panel synthesis:

| Decision | Choice | Rationale |
|---|---|---|
| Canvas semantics | Curated daily feed (not raw chat, not co-writing doc) | User quote: *"the agent captures in detail, but should only post whats relevent into the feed like today's tasks and project"* |
| Layout shape | 720px centered single column | Granola/Linear/Mem precedent; Bringhurst 65–75 char reading range at 14–16px body |
| Sidebar | 48px icon rail; agents list moves to `/agents` | User quote: *"the agents list should now be part of the new /agents tab"* |
| Chat input placement | Sticky bottom (conflict resolution) | Web-native muscle memory; top-pin shadows content. Rejected: IA spec's top-pinned input. |
| Chat input modality | Single input, two modes: `↵`=ask agent, `⌘↵` or `#`-prefix=memory capture | Raycast pattern; ambient blue/amber left-border, no toggle button |
| Feed grouping | By type (TASKS · THREADS · CALENDAR) | Faster scan than chronological; matches existing AGENTS/BOTS small-caps header pattern |
| Feed density default | 3 items visible, rest collapsed under "More from today" + "What I noticed" | Linear-inbox model: 47 observed → 12 relevant → 3 surfaced |
| Claim card styling | Muted secondary card, last in feed, no border (conflict resolution) | Occasional event; loud styling = false urgency. Rejected: IA spec's amber-topmost. |
| Claim card actions | Ghost buttons "Yes, that's me" / "Not mine"; accept = inline green confirm, auto-collapse 2s | Auth0/Clerk identity-linking pattern; no modal, no redirect |
| Claim management | Both inline + Settings → Identities | User quote: *"Both — agent suggests, settings manages"* |
| Merge UI | Diff-style "fields kept / fields discarded" preview | Linear duplicate-issue merge pattern; rejects manual field reconciliation |
| EOD compaction | Auto at user's local midnight + 2h undo window | Granola past-meetings tray; no manual "compact today" button (creates anxiety) |
| Language | Never "logged/watched/saw"; use "I noticed", "Based on your calendar…" | Calm-assistant framing; avoids surveillance creep |
| Transparency | Ghost "How I know this" per card, inline expander with 2-3 source signals | No modal; per-signal mute hidden in `...` overflow |
| Homepage picker | Radio list with one-line descriptions | VS Code "Workbench: Startup Editor" / Chrome "On startup" pattern. Rejected: dropdown, drag-to-reorder. |
| `/` routing | `src/hooks.server.ts` 307 redirect | Per-user pref → team default → `/my-agent` fallback |
| Empty state | Dashed coral avatar + "Your agent is getting to know you" + 3 setup cards | Linear inbox model; no mascot, no illustration, no confetti |
| Quiet day | "Quiet morning so far." + chat + single ambient card | Mercury banking calm pattern; not shaming, not apologetic |
| Keyboard | ⌘K (chat), J/K (nav), R (reply), S (snooze), X (dismiss), ⌘⇧H (history) | Power-user dashboard; matches Linear/Superhuman discipline |
| Live updates | Top slide-down 200ms, push others, blue-border fade 8s, "N new since HH:MM" sticky divider | Slack unread-marker pattern |

## Cross-Project Impact

| Surface | Change |
|---|---|
| `minion/src/agents/personal/` | NEW — personal-agent scaffold + workspace `.md` writer |
| `minion/src/infra/message-ledger.ts` | EXTEND with per-user scoping; add cross-channel intercept hook |
| `minion/src/gateway/` | NEW RPCs: `myAgent.feedToday`, `myAgent.claimSuggestions`, `myAgent.compactEod`, `myAgent.askChat` |
| `minion/src/channels/*` inbound | HOOK personal-agent intercept after existing routing |
| `minion/src/users/` | NEW user auto-create flow when stranger texts user-owned channel |
| `@minion-stack/shared` | NEW frame types for myAgent RPCs |
| `@minion-stack/db` | NEW tables: `personal_agent_observations`, `personal_agent_feed`, `personal_agent_compactions`, `channel_identity_claims`; new columns `users.home_page_choice`, `team_settings.default_home_page` |
| `minion_hub/src/routes/(app)/+page.svelte` | MOVE to `agents/+page.svelte` (verbatim) |
| `minion_hub/src/routes/(app)/my-agent/+page.svelte` | NEW |
| `minion_hub/src/routes/(app)/settings/identities/+page.svelte` | NEW |
| `minion_hub/src/routes/(app)/settings/general/+page.svelte` | EXTEND with homepage radio list |
| `minion_hub/src/hooks.server.ts` | EXTEND with `/` redirect |
| `minion_hub/src/lib/state/` | NEW `myAgent.svelte.ts` state module |
| `minion_hub/src/lib/components/myAgent/` | NEW component dir (see tree above) |
| `minion_site` | NONE for this spec — members area unaffected |
| `paperclip-minion` | NONE for this spec |

## Anti-Patterns Explicitly Rejected

- **Slack activity firehose** — destroys curation. Surface only decision-requiring items.
- **Facebook Memories auto-modal** — push interruption. EOD compaction must be pull (user opens tray).
- **ChatGPT session-list history** — agent-centric not life-centric. Organize by calendar date + thread, not chat sessions.
- **Split pane (feed + chat)** — wastes horizontal space at hub's typical 1280–1440px viewport.
- **Tabs (Today / Chat / Archive)** — false seam between chat and today.
- **Dropdown homepage picker** — radio list clarifies intent.
- **Mascot / illustration empty state** — reduces trust; Linear text-only is more credible.
- **Chat-first density as default** — feed discovery is higher value for a biographer; chat is secondary.

## Implementation Phases

### Phase 1 — Scaffold + Move (this week)

Ship-this-week scope. No personal-agent runtime yet; everything mocked.

1. Create `src/routes/(app)/my-agent/+page.svelte` with greeting + sticky `ChatInput.svelte` + one mock `FeedCard.svelte`.
2. Move current `src/routes/(app)/+page.svelte` → `src/routes/(app)/agents/+page.svelte`. Verbatim move; update Browse menu link.
3. Extend `src/hooks.server.ts` with `/` redirect (per-user → team → `/my-agent`).
4. Extend Settings → General with "Open this page on startup" radio list.
5. DB migration: `users.home_page_choice TEXT`, `team_settings.default_home_page TEXT`.
6. `NavRail.svelte` (48px icon column) replaces sidebar on `/my-agent` route only — existing sidebar persists elsewhere until Phase 3.

### Phase 2 — Real Build (2–3 weeks)

Stand up the personal-agent runtime and the feed.

1. Personal-agent scaffold under `minion/src/agents/personal/` — workspace `.md` skeleton (IDENTITY, USER, SOUL, memory/).
2. User auto-create flow: stranger-texts-user-owned-channel → DB lookup → create user + workspace + personal-agent attachment.
3. Cross-channel intercept hook in each channel extension's inbound path; writes to extended `message-ledger.ts` with per-user scope.
4. Gateway RPCs: `myAgent.feedToday`, `myAgent.claimSuggestions`, `myAgent.compactEod`, `myAgent.askChat`. Frame types in `@minion-stack/shared`.
5. DB tables: `personal_agent_observations`, `personal_agent_feed`, `personal_agent_compactions`, `channel_identity_claims`.
6. Components: `FeedSection`, `FeedCard` (real), `ClaimSuggestion`, `HistoryTray`, `EmptyState`.
7. Right-side thread panel — reuse existing tabbed detail pane, restyled to slide-in on Reply click.
8. Settings → Identities full UI with diff-style merge preview.

### Phase 3 — Polish (ongoing)

1. Keyboard shortcuts (J/K/R/S/X/⌘⇧H).
2. EOD auto-compaction cron + 2h undo + card-shuffle stacking animation.
3. Live updates: top slide-down 200ms, blue-border fade 8s, Slack-style "N new since HH:MM" divider.
4. Two-mode chat input (ask vs capture) with ambient left-border color shift.
5. Density preferences in Settings → Feed (Narrative / 3-card default / Chat-first).
6. "How I know this" inline expander + per-signal mute in `...` overflow.
7. Replace global sidebar with `NavRail.svelte` across all routes (deferred from Phase 1 to avoid scope creep).

## Open Questions

1. **Personal-agent workspace location**: parallel directory `agents/personal/<user-id>/`? Or nested under users dir `users/<user-id>/agent/`? The latter keeps user-scoped state colocated.
2. **Relevance scoring**: rule-based heuristics for v1, or LLM scorer? Suggest rules (unread + deadline + sender-priority) for Phase 2; LLM scorer in Phase 3 if signal-to-noise stays poor.
3. **Cross-user observations**: when User A and User B both interact with the same agent in the same session, do their personal-agent intercept hooks both fire? Yes — each user gets their own slice of the message exchange written to their own workspace.
4. **Calendar / Gmail tool connection**: gws-credentials are stored per-user in the vault, but the personal agent needs to know it can pull. Add a `user_tool_connections` table.
5. **Channel claim auth proof**: WA number claim — does the user need to verify (e.g., reply with a code) or is "Yes, that's me" sufficient given they're already logged in? Suggest: passive (logged-in user clicks accept) for same-platform claims; verification for cross-platform merges.
6. **EOD timezone**: store user's timezone for cron scheduling. Default to browser-reported TZ on first sign-in; allow override in Settings → General.

## Specialist Transcript Archive

5 parallel `voltagent-biz:ux-researcher` outputs at `/tmp/claude-1000/-home-nikolas-Documents-CODE-AI/c45efed7-5171-4316-b70b-231ebf2ee136/tasks/`:

- `a0c5c37e89f742f19.output` — Information Architecture (recommended Chronicle Feed / Option A)
- `a2a3eb82669a6e67e.output` — Interaction Design (recommended Unified Input Bar / Model A)
- `ad5d3d3cc688f8836.output` — Visual & Layout (recommended Centered Column 720px / Layout A)
- `ad5e80e19be5b2998.output` — Comparable Products (Granola top-1, Linear inbox for feed, Auth0 for claim, VS Code for picker)
- `a4d22702aaf260268.output` — Progressive Disclosure (recommended 3-card-first / Strategy B)

PM synthesis inline in main thread (no separate file).
