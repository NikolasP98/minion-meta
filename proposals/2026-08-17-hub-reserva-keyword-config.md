---
id: 2026-08-17-hub-reserva-keyword-config
title: Extract the triplicated 'reserva' keyword into one org-configurable rule
status: in-spec
spawned_spec: 2026-08-17-hub-reserva-keyword-config-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, hardcoded]
value: 6
effort: M
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Extract the triplicated 'reserva' keyword into one org-configurable rule

## Problem

Spanish single-tenant keyword ilike '%reserva%' baked into crm-finance.service.ts:9, crm-similarity.service.ts:55, crm-journey.service.ts:39 for deposit-classification in multi-tenant services.

## Definition of done

One shared constant minimum (org-level config preferred); the three services consume it; existing tests green.

## Out of scope

Reclassifying historical rows.

## Handoff — S3 (write path), 2026-08-20

S3 shipped: `PUT /api/crm/settings` writes `crm_settings.value.deposit` via a key-level jsonb
merge (`crm-settings.service.ts`'s `writeDepositRule`), gated centrally by `apiWriteCapability`
(`/api/crm` → `crm:edit`), with a strict zod boundary (`depositWriteSchema`, unknown keys and
over-cap input rejected, `updatedAt` stamped server-side) and the anti-recurrence guard test
(`crm-deposit-rule.test.ts`) that fails the suite if `/reserva/i` or a string-built ILIKE pattern
ever reappears outside `crm-deposit-rule.ts`.

**Still open, as the spec's own §5 (⚠️ A3) anticipated:** a keyword change does not retroactively
reclassify rows already materialized into `crm_win_embeddings.bought`/`snippet` — this is the
proposal's own out-of-scope ("Reclassifying historical rows"), so `writeDepositRule` only
*discloses* it: the response carries `staleDerivedCount`/`staleDerived` and a `warn` log names the
affected org and row count. Nothing rebuilds those rows. `TODO(handoff)` left at the disclosure
site in `crm-settings.service.ts` (`writeDepositRule`). If an operator's keyword change needs the
similarity index to reflect the new rule immediately, wire a rebuild trigger off `staleDerived` —
out of scope here, matching the proposal's boundary.

The S3 spec's perf-sanity check (`explain analyze` on the largest dev org at 1 vs. 20 keywords) was
**not run** — this handoff had no live dev-DB connection. `fin_invoice_items.description` has no
index (confirmed in the spec's own recon), so this is worth doing before an org actually
configures 15–20 keywords in production.
