# Source and creation-path inventory

Inspected Hub `origin/master` commit
`523ca2e934e93d0fc0d6f7d052c94694b86553b6` on 2026-11-12. Source queries used
`git show` and `git grep` because the shared working checkout contains unrelated
changes. This document contains no credentials or private member records.

## Organization and membership writers

| Entry point | Current behavior | Required adapter owner |
|---|---|---|
| `src/routes/api/organizations/provision/+server.ts` → `organization-provision.service.ts` | Production Hub org insertion, owner membership/role and external provisioning | Slice 2 transactional bootstrap |
| `join/links.service.ts` → `join/membership.ts` | Invite consumption, membership upsert and role grant | Slice 4 admission transaction |
| `join/requests.service.ts` → `join/membership.ts` | Approval creates membership then separately marks request approved | Slice 4 admission transaction |
| `src/routes/onboarding/+page.server.ts` | Updates settings/onboarding of an existing org; no organization insertion found | No new bootstrap, retain current org model |
| `src/lib/server/workforce-company.ts` | Reads existing Hub org; creates a Workforce company with matching ID | External phase only; cannot choose role model |
| `supabase/qa/baseline/schema.sql` `handle_new_auth_user` | Creates profile on auth signup; no organization insertion | Preserve profile admission behavior |
| `scripts/qa/seed/tenancy.ts` and test fixtures | Synthetic organization/membership rows | Slice 1 explicit legacy/new-model fixtures |

Searches covered tracked `src/`, migrations, QA baseline and creation scripts:
organization table inserts, `from('organizations')`, personal organization keys,
membership writers, RPC/function names and organization/member-role triggers.
No automatic production personal-org writer was found. Existing imported personal
orgs remain legacy; this feature does not create a new signup path.

Read-only PostgreSQL catalog inspection of the configured Supabase target found:

- `auth.users` trigger `on_auth_user_created` invokes `public.handle_new_auth_user`.
- Its function body SHA-256 was
  `84e3a783b5360405eb6d003a20e53ec8c9ab0d5f2c020e23f3d181be0b5eae28`.
- The inspected function does not insert organizations. No function matching an
  organization-insert or personal-org bootstrap signature was returned.
- No non-internal triggers were returned for public `organizations`,
  `organization_members` or `member_roles`.

These catalog checks are point-in-time metadata evidence, not a guarantee against
an external caller writing directly to the database. Deployment preflight must
repeat the inventory and keep unqualified writers on the legacy model.

## Authority consumers that require adaptation

| Consumer | Why it matters |
|---|---|
| `rbac.service.ts` | Global catalog/defaults, fallback, assignment/rank and last owner |
| `section-access.service.ts` | Catalog union, fresh actor authority, revisions, page rules, policy deletion |
| `role-simulation.service.ts` | Five-role catalog assertion, owner/admin-name eligibility, simulation snapshots |
| `fresh-org-authority.ts` | Fresh notification recipient capability and legacy fallback |
| `notifications/projection/transaction.ts`, `revalidate.ts` | SQL embeds legacy role mappings and owner/admin defaults |
| `src/server/auth/assistant-principal*`, `effective-authority*` | User/agent authority, snapshots and simulation intersections |
| `brains.service.ts` | Owner/admin-name bypass for private brain access |
| `permissions.service.ts`, `dataset-ctx.ts`, `hooks.server.ts` | Page visibility, data reads and central API mutation checks |
| `join/*`, join API endpoints, Team/invite components | Built-in enums, Staff default, replay and assignment semantics |

Broader last-admin checks must cover permission, page, assignment and member
removal, not just role deletion. No display name or rank may stand in for a
capability. Keep operator/platform guards and ownership lifecycle separate.

## Known concurrent work and integration boundaries

- [Hub PR 630](https://github.com/NikolasP98/minion_hub/pull/630) changes organization
  provisioning/base-module installation. Preserve its module/landing behavior and
  reconcile its head against the candidate before touching bootstrap.
- [Hub PR 602](https://github.com/NikolasP98/minion_hub/pull/602) changes contextual
  page access and role APIs. Preserve current policy keys/revisions and reconcile
  any remaining changes before implementing template creation.
- [Hub PR 544](https://github.com/NikolasP98/minion_hub/pull/544) concerns verified
  WhatsApp member access; delegated authority must see the same new local grants.

These PRs were open at inspection. Their current merge state is a moving input,
not an instruction to merge them or assume their implementation is deployed.

## Decisions from review pass 1

Use fixed invite authority: resolve the default at mint/approval time, store
role/revision/grantor and recheck on redemption. Do not make outstanding invite
permissions change when the default changes. Keep Team administration, brain-wide
administration, simulation eligibility and ownership as separate predicates.
Use blank-role rank 10. Last administrator protection includes actual page access.
