---
slice: S3
branch: feat/entitlements-s3-hide-ai-ui
audited_commit: f99c4140
pr: minion_hub#620 (draft)
date: 2026-10-29
verdict: fixed-pending-owner-review
---

# Spec 043 S3 audit: hide disabled AI (executing audit)

Every finding was checked by running code. Throwaway probes were written under `src/__probe/`, run, and deleted.
Fixes are in the commit `fix(ui): S3 audit fixes` on the S3 branch. That commit is not pushed.

## What I executed

| Probe | Result |
|---|---|
| Swap the old `entitlements.service.ts` back in and run the two new flag-off tests | Both FAIL. The hook test hangs for 5 s on a DB that never answers. This proved the per-request plan query. |
| Route probe: every `+page` under `src/routes/(app)` (153 paths) × `{bare, /es, /en, /__data.json}` through `canonicalPath` + `isAppRouteBlocked`, for Base, Premium and no features | Every `FEATURE_PAGES` prefix and its nested routes 404 for Base in all four variants and stay open for Premium. `/pulse` and `/settings/pulse` are blocked for `business` by kind, as before. The probe found `/home/settings` open for Base. |
| Mounted probe (happy-dom, `fetch` stubbed): `CrmFunnel`, the doors FAQ `Editor`, `DynamicSecretGroup`, each mounted as Base, as Premium and with no entitlements (flag off) | Base: no `/funnel/analyze` fetch, no analyze or suggest button, no AI hint. Premium and flag off: no change. Before the fix, `DynamicSecretGroup` rendered a `/settings/plugins` link for Base. |
| Greps for client callers of every S2-gated API and gateway AI method (`chat.send`, `chat.history`, `myAgent.emailSummary`/`emailDraftReply`) | Every caller is on a gated page, sits behind a `hasFeature` wrapper, or runs only on cron/admin paths. Remaining gap: `/home` loaded chat history for an org with a provisioned agent (🟡 below). |
| Nav greps (sections, GNav, utility row, SettingsNav, command palette incl. `actionCommands` and agent commands, ModuleSwitcher, mobile sheet via `navMode.activeModule`, NotificationsPopup `/pulse`) | All of these filter through `canViewPath`. Two hard-coded `/settings/plugins` links bypass it (🟡 below). |
| Live render check | **Skipped.** It needs a long-lived `vite dev` process, and this audit allows only foreground commands. Also, `dev:local` reseeds the shared QA DB at :54422. |

## Findings

### 🔴 Fixed

- **Flag off still ran one plan query per app page load.** `src/hooks.server.ts:391` calls `resolveEntitlements` on every authenticated `(app)` page. With the flag off, that function still ran `lookupPlan`. The prod cache is `noop`, so each load cost one Postgres query, and a slow DB delayed the guard. Fix: when the flag is off, `src/server/services/entitlements.service.ts:78` returns the full catalog without any DB or cache access. Every caller benefits, including the new landing check. With the flag off, `plan` is reported as `'base'` because it is never looked up. Nothing acts on `plan` while unenforced; the code comment says so. Tests: `entitlements.service.test.ts` "flag off: zero I/O", and `hooks.tenant.test.ts` "a DB that never answers does not delay the guard". Both failed on the old code.

### 🟡 Fixed

- **`/home` still showed the orb and old chat for a Base org.** `src/lib/state/features/assistant.svelte.ts:61`: `personalAgentId` is now `null` without `ai.chat`. Effects:
  - `/home` no longer loads chat history or renders the thread, even for an org that had an agent before a downgrade.
  - `CrmInsightsChat` and `FloatingAssistant` also see no agent.
  - The orb mini-avatar is hidden (`home/+page.svelte:929`).

  The greeting text and the feed stay. This replaces the implementer's `TODO(handoff)` on `/home`. Test: `assistant.entitlements.test.ts`.
- **`/home/settings` was reachable by URL.** It holds the personal-agent settings: tone presets, workspace setup and channel links. It is now `'ai.chat'` in `FEATURE_PAGES` (`availability.ts:181`), so the guard 404s it and `canViewPath` hides it. `/home` itself is unchanged. Test: `availability.test.ts`.
- **Dead `/settings/plugins` links for Base.** Two links bypassed `canViewPath`:
  - `ChannelGroup.svelte:133`: the "Plugin settings" CTA on the comms channel cards.
  - `DynamicSecretGroup.svelte:55`: the "manage" link in the secrets section.

  Both are now behind `hasFeature('ai')`. Test: `DynamicSecretGroup.mounted.test.ts`.
- **Empty or useless AI elements on CRM pages for Base:**
  - Contact page `wins` grid cell: it rendered an empty 2×2 cell. Now dropped (`crm/[contactId]/PageBody.svelte:598`).
  - CRM settings "AI" tag-kind option: it let Base create tags that are never evaluated. Now hidden (`crm/settings/PageBody.svelte:317`).
  - CRM insights win-index card ("never built") and sentiment card (model-scored): not rendered without `ai` (`crm/insights/PageBody.svelte:109`). The word cloud stays because it is not AI.
- **A landing page on an AI prefix gave a 404 right after login.** `/` now falls back to the locale-prefixed `/home` when the org's plan lacks the landing page's feature (`hooks.server.ts:515`). With the flag off this costs no I/O. Test: `hooks.tenant.test.ts` "landing page on an AI prefix falls back to /home".

### 🟢 Confirmed, no change

- `FEATURE_PAGES` matches the AI page list in the design. Locale-prefixed, nested and `__data.json` requests 404 for Base.
- Inline controls skip both render and fetch: EmailModal (existing test), funnel auto-analyze, insights auto-score, FAQ draft, notes autofill/polish/spelling/transcribe, todo suggest, reminders AI toggles, flow copilot and AI palette nodes, `turn-router`, `voice-call`.
- Premium and flag-off states change nothing (mounted probe, plus the existing "with ai: unchanged" tests).
- Channels, inbox (`OmnichatDock`), the message ledger and `/channels/gmail` stay visible for Base.

### Left as is (report only)

- With the flag off, `requireFeature` on gated APIs still looks up the plan in order to log `entitlement.would_deny`. This is S1's intended shadow logging, and it runs only on AI endpoints, not on every page.
- The landing fallback checks only plan features. A landing page on a module that has been toggled off still 404s; that is pre-existing behavior.
- The `/home` `<title>` still says "My Agent" (minor).
- The proposal `proposals/2026-10-29-hub-org-entitlements-followups.md` should mark its `/home` item resolved. That is a meta edit, not made here.

## Gates

- Targeted vitest, 19 files / 294 tests: green.
- `bun run check`: only the 2 PostHog errors that were already there.
- `lint:design` and `lint:tokens`: 0 violations.
- Prettier `--check` on changed files: clean. I applied `--write` to `assistant.svelte.ts`, which was already unformatted before this change.
