---
id: 2026-09-16-hub-post-merge-review-findings
title: Post-merge review of the 2026-09-16 hub/meta merges — findings ledger
status: approved
created: 2026-09-16
updated: 2026-09-17
repos: [minion_hub, minion-meta]
tags: [logic, security, ux, test]
effort: M
---

# Post-merge review of the 2026-09-16 merges

Read-only review (Fable 5.1) of hub #280–#301 and meta #450/#455/#458/#459/#464 on hub `a338c576`. No blockers. Numbered as in the review; "→ PR" marks the fix in flight the same night.

## Before training (2026-09-17)

1. `insufficient_stock` (409) has no UI path: raw English string, no sender of `allowNegativeStock`, no manager override. → PR `fix/review-pos-stock-shortfall-ux-and-consistency`.
2. Catalog/recipe stock badge sums every warehouse; preflight and issue use the default warehouse only. → same PR.
3. `/stock` dashboard flags low stock per bin, `/stock/items` per item sum. → PR `fix/review-join-role-grant-and-low-stock-consistency`.
4. `SellCart` clamps an oversized discount to 0, then the server 400s (`invalid_discount`). → PR 1.
5. Join links / approvals write only `organization_members.role='member'`; `legacyRoleKey('member')='manager'` ⇒ every invitee gets manager (incl. `pos:manage`). → PR 2 (real role key, default staff, never owner, `member_roles` upsert, zod enum).
6. `/pos/accounts` `link` CTE is not unique per party ⇒ double counts when a party has two contacts. → PR 1.

## Safety / security (later, some in flight)

7. `dev:local` strips only Supabase/Turso keys; B2, Resend, Meta, GitHub, OpenRouter, Sentry, SUNAT creds from `.env.local`/Infisical reach the DEV app. → PR `fix/review-dev-backend-isolation-and-guards`.
8. Public booking is an unauthenticated write with no rate limit (`/api/scheduling/public/[slug]/book`). → PR 3.
9. `isDevBackend` trusts hostnames only; a loopback tunnel to the prod pooler would enable `/api/dev/switch-user`. → PR 3 (also requires dev build + local ports).
10. Walk-in `partyId` stamped on the ticket without an org check (`scheduling-bookings.service.ts:697-705`; `pos_tickets.party_id` has no FK). Insider-only. Open.
11. `PUT /api/pos/settings` turns every non-`PosError` into a 400 carrying the DB message. Open.
12. `/api/dev/switch-user` shares the 5/min login limiter. → PR 3.

## Correctness / UX (later)

13. Revenue KPI: only `net`/`tax` exclude voids; `gross`/`discount`/`invoices` don't ⇒ `avgTicket`, `discountRate` biased. → PR 1.
14. Package draw never checks grant↔service or grant↔client server-side; drawer needs `pos:manage` while `/pos/appointments/new` has no gate. Open.
15. Manager override on shortfall issues 0 units of the short item instead of the partial; modifiers invisible to the preflight. Open (has `TODO(handoff)`).
16. Duplicate approve path `join-requests/[id]` PATCH (role `'user'`); applicant request lands in `listAllOrganizations()[0]`. → PR 2 (dedupe + `PUBLIC_DEFAULT_ORG_SLUG` resolution).
17. Verified-only initial picker list hides unverified clients until typing; empty state says nothing; three flag values for one concept. Open — tell trainees "type to search".
18. Receipt/adjustment `rate ≤ 0` rejected server-side; the form allows 0 ⇒ zero-cost receipts (samples) impossible. Decision needed.
19. `requireOrgCapability` 403 says "manage roles" for every module. → PR 2.
20. POS calendar sticky axes borrow page-level z tiers inside a non-isolated scroller; day view shows each booking twice (All + resource). Open.
21. DataTable permanent end gutter when `hasEdit` even without overflow; `virtualizer.svelte.ts` reformatted wholesale. Open (partly superseded by #305's measured width).
22. Cron manifest "verified against crontab" line not re-dated; pseudo-path in `path`; DEV switcher grouped by org name. → PR 3 (switcher) / open (manifest).
23. Docs drift: `AGENTS.md` said Better Auth for hub (fixed in this PR); `docs/qa-stack.md` refuses vs ignores (→ PR 3); dead `assertLoopbackIfSet`; identity-cache key duplicated (→ PR 3); `vitest.config.ts` `hookTimeout: 30_000` global; `run-migrations.ts` tolerates `no such table` with a warn.
24. Tests that overstate: #283 "D2 repro" asserts SQL regex shape only; #288 asserts SQL text for `net` only (→ PR 1 extends).

## Looked good
QA/dev scripts cannot reach prod (loopback strip + assert); DEV surfaces are server-derived and 404 in prod; #300 org scoping with 31 tests; #286 gating; #289/#290 draw and void invariants; #282 crons strictly cheaper; #299 real crash fix.
