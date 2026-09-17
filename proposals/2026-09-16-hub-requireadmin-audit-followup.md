---
id: 2026-09-16-hub-requireadmin-audit-followup
title: Full requireAdmin call-site audit (org-vs-platform misclassification)
status: draft
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub]
tags: [logic]
effort: M
---

## Progress (2026-09-16, second increment)

`join-links/*` and `join-requests/*` (admin side: GET, `[id]/+server.ts`,
`[id]/approve`, `[id]/deny`, `pending`, `count`) confirmed as the same
misclassification via the acceptance walkthrough (D4: an org owner got
"Admin access required" minting a join link) and switched to
`requireOrgCapability(locals, 'users', 'manage')`, org-scoped (POST/GET
validate `organizationId` against `locals.tenantCtx.tenantId`, 403/404 on
mismatch; platform admins keep the cross-org path explicitly). `POST
/api/join-requests` (top-level) is intentionally untouched — applicant
self-service, gated by `requireAuth` only. hub PR: `fix(rbac): org owners
manage join links/requests (org-scoped); any multi-org member can switch
org`. Remaining count: ~50 (was ~55; gateways/servers/users/workflow-defs/
backup-config/memberships/etc. still spot-audited-only, not line-by-line).

# Full requireAdmin call-site audit (org-vs-platform misclassification)

## Problem

`requireAdmin` (`minion_hub/src/server/auth/authorize.ts:19`) checks the
PLATFORM role (`profiles.role !== 'admin'`), not org membership. An org
owner/admin with no platform-admin role gets a 403 from any handler that
calls it. This was confirmed as a live defect on the scheduling links
(`POST/PATCH/DELETE /api/scheduling/links`) and event-types
(`POST/PATCH/DELETE /api/scheduling/event-types`) handlers, plus
`scheduling/reminders/config`, `scheduling/reminders/preview`, and
`scheduling/resources/[id]/availability` — all switched to
`requireOrgCapability(locals, 'scheduling', 'manage')` in the fix PR (see
`fix/training-server-defects`, this branch's PR).

`requireAdmin` has ~55 other call sites across `minion_hub/src/routes/api/**`
(`grep -rl "requireAdmin(" src/routes/api`): artifacts, assignment/rules,
backup-config, dashboard-layouts, finances/sync/cancel, flows/exports,
gateway*, gateways*, join-requests/join-links, memberships/plans, org-areas,
notifications/rules, servers/*, shared-identities/manage, support/settings,
users/*, workflow/defs. These were **spot-audited by path name only** (not
read line-by-line) and judged platform-admin-appropriate — infra/gateway/
server/user/workflow-definition management reads as intentionally
platform-scoped. That judgment is unverified for each individual handler.

## AS-IS

Every one of those ~55 handlers 403s a caller who is an org owner/admin but
not a platform admin. Whether that's correct depends on whether the action is
genuinely platform-wide (keep `requireAdmin`) or is really per-org management
that should route through `requireOrgCapability(locals, <module>, <action>)`
the way scheduling now does.

## TO-BE

Each of the ~55 remaining call sites classified with actual evidence (read
the handler, not just the path), and org-management ones switched to
`requireOrgCapability`, each with an owner-passes/viewer-fails test — same
pattern as `src/routes/api/scheduling/links/server.test.ts` and
`src/routes/api/scheduling/event-types/server.test.ts` added in the fix PR.

## Out of scope

Re-litigating scheduling's choice of `'manage'` vs a looser action — that
shipped and is covered by tests.

## Definition of done

- Every `requireAdmin(` call site under `src/routes/api/**` has a one-line
  classification comment or is switched to `requireOrgCapability`.
- No behavior change for genuinely platform-only routes.
- Targeted vitest added per switched handler.

## Source

`grep -rl "requireAdmin(" src/routes/api` in the worktree at
`/home/nikolas/.cache/claude-tmp/hub-fix-f1` on 2026-09-16, cross-referenced
against `defaultCaps`/`requireOrgCapability` in
`src/server/services/rbac.service.ts`.

## Related, found by the same walkthrough (2026-09-16, not a `requireAdmin` site)

- **Legacy-member role rendered inconsistently.** `tenancy.user.legacy-member` (only an
  `organization_members.role`, no `member_roles` row) shows as "viewer" on the Team page but
  as `roleKey: "manager"` in `/api/dev/users` and in RBAC resolution (`legacyRoleKey`
  fallback). One of the two surfaces reads the legacy column differently; align the Team
  page's role display with `rbac.service.ts`'s fallback. Severity: low (display only, the
  effective permissions follow RBAC).
