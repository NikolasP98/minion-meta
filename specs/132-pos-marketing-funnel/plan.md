# Implementation Plan: PDV marketing funnel and targetable customers

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` (bun, SvelteKit 2, Svelte 5 runes) · **PR base**: `master` · **Branch**: `feat/132-pos-funnel`

## Approach

One read-only page, one service, no migration, no new dependency, no API route.

| Piece | Where | Pattern to copy |
|---|---|---|
| Service (all SQL + pure math) | `src/server/services/pos/pos-funnel.service.ts` | `src/server/services/meta/meta-insights.service.ts` (`CoreCtx`, `DateRange`, inclusive `<= to`, org-scoped transaction helper) |
| Pure helpers (ratios, tiers, rates) | `src/server/services/pos/pos-funnel.logic.ts` + `.test.ts` | `pos-accounts.logic.ts` |
| Page | `src/routes/(app)/pos/funnel/+page.server.ts`, `+page.svelte`, `PageBody.svelte` | `src/routes/(app)/pos/history/` (`datasetCtx(locals,'pos')`, `isDenied`, `DataSource`) |
| Menu entry | `src/lib/nav/modules.ts` (pos area, setup group after catalog) | existing pos items |
| Route contract | `route-design-manifest.ts` (`screen('/pos/funnel','POS marketing funnel','scheduling-pos','collection')`) + every hardcoded count that the route tests assert | memory note: six counts |
| Access | inherits `pos:view` like `/pos/history` (no override) | — |
| i18n | `messages/en.json`, `messages/es.json`, then `bun run i18n:compile` | existing `pos_nav_*` keys |

## Data definitions (all org-scoped; party = customer)

- **Sale**: `fin_invoices` where `provider='susii'` joined to `fin_clients.party_id`; plus `pos_tickets` where `voided_at is null`. Disjoint in time on FACES (invoices end 2026-09-29, tickets start 2026-10-09; zero tickets carry `invoice_provider_ref`). If a ticket has `invoice_provider_ref` matching an invoice `provider_ref`, drop the invoice.
- **Customer**: party with ≥1 sale. Lifetime spend, count, first/last date over all time.
- **Tier**: `ntile(3)` over lifetime spend descending (1 = top).
- **Reachability**: phone = `parties.phone9`; email = `parties.email`; whatsapp/instagram = exists `crm_contact_identities` of that channel on any `crm_contacts` with that `party_id` and `deleted_at is null`.
- **Ad day**: `meta_ad_insights` summed per range; conversations = `actions` entry `CONVO_ACTION` (reuse the constant and extraction from `meta-insights.service.ts`).
- **Lead**: `meta_lead_attribution.first_contact_at` in range.
- **First-time customer**: first sale date in range. **Repeat customer**: ≥2 sales all-time and ≥1 sale in range.
- Metrics: CAC = spend ÷ first-time; LTV = avg lifetime spend of all customers; ROAS = range revenue ÷ spend; avg ticket = range revenue ÷ range sales; repeat rate = customers with ≥2 sales ÷ customers. `null` when denominator is 0 → UI shows "not enough data".

## Constraints

- Customer list is ~2.3k rows: load once, filter and sort client-side with `$derived`; no pagination endpoint.
- Semantic design tokens only; run `bun run lint:design && bun run lint:tokens` (debt may not rise). Reuse existing table/stat components; no new component library pieces.
- Money formatting through the hub's existing money formatter.
- Tests are node-env vitest, no component mounting: test the logic file and, where a mock-db pattern exists, the service shape.
- No request to Meta; no write.

## Risks

- Tax-ledger (`sunat-sire`) invoices are excluded on purpose; if FACES starts invoicing only through SUNAT, revenue would undercount. `TODO(handoff)` at the provider filter.
- Funnel lead stage is heuristic; labelled in UI.
