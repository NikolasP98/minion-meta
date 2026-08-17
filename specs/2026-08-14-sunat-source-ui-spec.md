---
id: 2026-08-14-sunat-source-ui-spec
title: SUNAT (SIRE) source card in /finances settings
stage: done
status: shipped
pass: 1
created: 2026-08-14
updated: 2026-08-17
repos: [minion_hub]
type: feature
---

# SUNAT (SIRE) source card in /finances settings

## 0. Product

The `sunat-sire` connector (PR #95, merged) is configurable only via raw API
calls. Add a **SUNAT card directly below the existing SUSII card** on
`/finances/settings` so the source can be configured, enabled, and synced from
the UI. Backend needs almost nothing: `GET/PUT /api/finances/sources` already
accepts `?provider=` / body `provider` + `clientSecret`, and the sync endpoints
accept `provider` (defaulting to susii).

## 1. Scope

`src/routes/(app)/finances/settings/+page.svelte` + `+page.server.ts`:

- Server load: also `getSource(ctx, 'sunat-sire')` (strip `secretRefs`, expose
  `hasCredentials` — mirror the susii load at `+page.server.ts:9`).
- New card under the SUSII one, same visual pattern:
  - Config fields → `config`: **RUC** (11 digits), **Client ID** (the SOL API
    app id), **Start period** (YYYYMM, optional backfill knob).
  - Credential fields → secrets: **SOL user** (username), **SOL clave**
    (password), **Client secret** — all three write-only (blank = keep
    existing, same convention as susii's card).
  - Enabled toggle, Save (PUT with `provider: 'sunat-sire'`), Sync-now +
    status/cancel wired through the existing `finance-sync` state module —
    its `refresh/start/cancel` already take a provider arg (default 'susii');
    pass `'sunat-sire'` explicitly. Status polling must not clobber the susii
    card's status: check how `finance-sync.svelte.ts` holds state — if it is
    single-provider, hold the sunat status in page-local state via direct
    `fetch('/api/finances/sync/status?provider=sunat-sire')` on demand
    (poll only while a sunat sync is active). Do NOT restructure the susii flow.
- The hardcoded `<span class="mono-val">susii</span>` label at `:178` stays;
  the new card shows `sunat-sire` the same way.
- i18n: new `finance_settings_sunat_*` keys in en+es (append-only), reuse
  generic keys where they exist. Design tokens only; run
  `DESIGN_LINT_BASE_REF=origin/master bun run lint:design && bun run lint:tokens`.
- No RBAC changes needed (same page, same admin gate) — verify the settings
  PUT path is already gated and do not weaken it.

## 2. Verification

1. `bun run check` 0/0, full `bun run test` green, both design lints clean.
2. Manual (document in PR): save SUNAT config+creds → `fin_sources` row
   `provider='sunat-sire'` with encrypted secrets; enabled toggle persists;
   Sync-now returns a job id (a real sync will fail without valid creds in dev —
   that error surfacing IS the success criterion for the wiring).

## 3. Out of scope

Purchases/RCE UI (separate spec), changing susii defaults anywhere, cron
changes, provider threading beyond what the APIs already accept.
