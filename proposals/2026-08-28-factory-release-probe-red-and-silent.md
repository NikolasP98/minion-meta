---
id: 2026-08-28-factory-release-probe-red-and-silent
title: 'Preserve safe Factory probe failure diagnostics'
status: draft
created: 2026-09-12
updated: 2026-09-12
repos: [minion-factory]
---

# Preserve safe Factory probe failure diagnostics

Status: open. Created2026-09-12 to satisfy the existing probe source TODO with this identifier; no earlier proposal file was found in the current meta checkout.

Factory promoter34715953488 attempts1/2 failed the initial candidate /turn with broker-assigned502 UPSTREAM_FAILURE after candidate tests and readiness passed. No deployment occurred. The exact configured model id exists in the public registry; that does not establish account authorization, credit, endpoint compatibility or the actual failure cause.

The broker maps SDK error/turn-failure events and arbitrary exceptions into one code. Probe cleanup removes diagnostic state; the shell then validates empty stdout and emits a secondary JSON error. This obscures the actionable cause without supplying a safe artifact.

Bounded ownership: broker error classification and probe failure-artifact capture/cleanup, plus their existing focused tests. Add allowlisted error class/status and always-retained failure metadata. Never persist raw provider errors, prompts, tokens, credentials or environment dumps. Add deterministic redaction tests, preserve failure exit semantics and keep bounded artifact retention. Root must approve the exact metadata schema and trusted-controller integration before implementation. This is not permission to change providers, model, billing, activation flags or skip release gates.

Respect trusted-main controller promotion ownership. Complete with diagnostic evidence that identifies a subsequent actual failure, or an authenticated exact-candidate probe followed by normal verified promotion. Current production remains02900306a1fcc7b182bae726a24260d08467f81e; candidate467906db88f51476e2ca5fb561c2c4a79459e268 is dev-only. No additional paid probe was issued for diagnosis.

Evidence: .planning/operations/360/priority-delivery-2026-09-12/factory-release-blocker.json and PRIORITY-DELIVERY-2026-09-12.md. Existing source TODO in the production-probe script points to this proposal identifier.
