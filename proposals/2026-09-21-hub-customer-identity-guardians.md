---
id: 2026-09-21-hub-customer-identity-guardians
title: Complete POS customer registration, guardians and birth dates
status: done
spawned_spec: 2026-09-21-hub-customer-identity-guardians-spec
created: 2026-09-21
updated: 2026-09-22
repos: [minion_hub]
tags: [crm, data, security]
---

# Customer identity and guardians

## AS-IS

`CustomerQuickAdd.svelte` gates registration around document lookup and exposes fewer fields than CRM customer details. `api/crm/parties/+server.ts` accepts name, phone, email and document identity only. The CRM contact detail renders DOB as a read-only ISO string even while editing. `parties` is the shared identity record; no guardian relationship exists there. `reenrichVerifiedDnis` selects only parties with no registry payload, missing partially populated payloads and DOB gaps.

## TO-BE

POS quick-add exposes the available editable customer fields, supports foreign/manual registration and offers optional Peruvian DNI autofill. Customers can link adult CRM contacts as legal guardians. CRM DOB is editable with a working date picker and localized `dd mmm yyyy` display. Audit all verified customer identities and fill missing name, DOB and sex from authoritative evidence.

## DELTA

Implement the companion [spec](../specs/2026-09-21-hub-customer-identity-guardians-spec.md). Prove persistence, explicit foreign document handling, tenant isolation, adult guardian checks, date-only correctness and idempotent missing-only backfill. Keep existing populated values and concurrent workspace edits.

## Authorization and delivery

The user explicitly authorized implementation and live missing-metadata repair on 2026-09-21 and requested Sol implementation agents. Production repair is separate from feature deployment. Human merge/release gates remain. No branch changes or commits are implicit in this request; the shared checkout already contains unrelated work.

## Open data-source item

The 2026-09-21 production audit covered every row with `dni_verified = true`: 2,113 identities total, comprising 2,108 people and 5 companies. All verified people had an eight-digit DNI; no verified foreign/manual person was silently excluded. Name and canonical sex were complete for all 2,108 people, while seven were missing `parties.dob`.

The configured PERUDEVS complete-DNI endpoint was queried for those seven records. Fourteen calls were made across the initial fail-closed run and one corrective cached run; the seven final responses are retained privately under the Hub's gitignored `data/repair-evidence/` directory with mode `0600`. Request-bound lookup plus both the current party name and the prior verified registry full name established the intended identity for all seven, but `fecha_nacimiento` was empty in every response. The repair therefore made zero production updates. Legacy `custom_fields.edad` exists for four records but cannot establish an exact birth date and must not be used to invent one.

Keep this item open until an authoritative exact-DOB source is available. Then refresh the private provider cache and rerun `scripts/repair-verified-customer-metadata.ts --apply`; its guarded update fills missing fields only and preserves populated name, DOB and sex. The same provider investigation also found that `@minion-stack/crm-sdk` treats undocumented `person.id` as a preview DNI even though live responses did not echo the requested DNI. POS quick-add must preserve the document the user requested, and the shared SDK mapping needs a separate correction before consumers may trust `preview.dni`.

## Released — 2026-09-22

The implementation is ready in Hub PR [#362](https://github.com/NikolasP98/minion_hub/pull/362) at head `70b1f63c00a92f8816620e0c5f74eb76661a42a0`. The final release review is **PASS** for the quick-add, DOB, sex, foreign-document and guardian behavior. Guardian reads explicitly require `crm:view`; guardian removal uses the edit-gated POST path; contact resolution excludes soft-deleted contacts and preserves owner scope. GitHub Actions run `35690259849` passed all seven jobs and both hosted builds are green.

After explicit user authorization and an independent subagent approval against the exact head and latest base, Hub PR [#362](https://github.com/NikolasP98/minion_hub/pull/362) merged at `2026-09-22T05:33:16Z` as `fff81b3885ab2028c0ef7abd70f864fe5971397e`. GitHub prevented the author account from submitting its own approval; the independent approval was posted transparently as a comment. The authorized admin merge used the reviewed head match and did not change repository policy.

Vercel production deployment `dpl_2xwqtx2hFjN9DSaYpr4HLCrjYFRG` completed READY at `2026-09-22T05:35:55Z`. [hub.minion-ai.org](https://hub.minion-ai.org) resolves to that production deployment. The build applied migration `20260921220000`; read-only verification confirmed the migration ledger timestamp `2026-09-22T05:33:25.531223Z`, schema, forced RLS, policy, grants, foreign keys, triggers and index. Public browser smoke rendered the production login successfully; `/api/me` and the guardian endpoint returned `401` unauthenticated. No live customer records were mutated. Post-merge CI is currently running and is not claimed green here.

Production repair remains separate: seven DOB values are still unavailable from authoritative evidence, and no dates were invented.
