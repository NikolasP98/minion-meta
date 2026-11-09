---
id: 2026-09-29-hub-qa-personal-agent-provisioning-spec
title: Complete local QA personal-agent fixtures
stage: done
status: shipped
pass: 2
verdict: approved
created: 2026-09-29
updated: 2026-09-29
repos: [minion_hub]
proposal: 2026-09-29-hub-qa-personal-agent-provisioning
tags: [test]
---

# QA personal-agent provisioning

## 0. Product

Make ordinary local QA accounts ready for application testing immediately after sign-in.

## AS-IS

Tenancy seed writes active `personal_agents` for ordinary users, but UI Audit and formula/presentation persona seeds omit them. The DEV picker lists these accounts. The app's personal-agent guarantee tries gateway self-healing, fails without a local gateway, then redirects to onboarding. Live evidence includes UI Audit owner in error and five other ordinary profiles without a personal-agent row.

## TO-BE and invariants

1. The exact covered set is the tenancy seed's owner, admin, manager, staff, viewer, custom-role, legacy-member, platform-admin, two-orgs and service-account profiles; the four `ui-audit-{owner,manager,member,restricted}@minion.test` profiles; and `formula.persona.finance-masked@qa.minion.test` plus `presentation.persona.finance-masked-manager@qa.minion.test`. Each has a persisted active personal agent with a nonempty agent ID and display name. Explicit call sites define this set; do not blanket-repair every account matching a domain.
2. Missing, pending or error rows in the covered set are repaired to stable fixture state; error and retry fields are cleared. Valid active rows preserve their existing row ID, agent ID, display name, server link and timestamps. Repair the profile pointer to the actual persisted agent ID. Agent-row changes and profile-pointer changes are atomic; a failure leaves neither half committed. A rerun preserves the resulting records, not just row counts.
3. Explicit `tenancy.user.pending-agent` remains pending; `tenancy.user.no-org` retains the join scenario. These are dedicated negative fixtures, not ordinary application profiles.
4. Provisioning uses the existing guarded local QA seed path. It must not invoke a production gateway or change production signup, auth, RBAC or onboarding behavior.
5. Fixture records make the local UI ready; this does not claim a live gateway worker or functioning model connection.

## DELTA and verification

- Add one shared fixture helper and call it from every ordinary persona seed that lacks agents. Reuse it for tenancy where that prevents drift.
- Add machine-checkable coverage and real PostgreSQL regression checks for newly covered profiles, error-row repair, pointer consistency, atomic rollback, full-row stability on reruns and preservation of negative fixtures.
- Reseed only affected local domains, then inspect all eligible synthetic profiles for expected agent status.
- Reproduce UI Audit owner's redirect before repair; after repair sign in freshly, render Home, and navigate to POS without onboarding. Exercise the formula/presentation profiles at the session and route boundaries.
- Independent Sol review covers requirements and safety. Focused tests and hosted checks must pass before the authorized merge. Record the dev repair separately from branch-triggered production deployment.

## Out of scope

Production onboarding changes, live model workers, external gateway provisioning and production account repair.

## Release evidence

Hub PR #407 merged at 2026-09-29 05:29:00 UTC as `e7d80d79379e500d3915b9582ba6f61be35b712d`. Independent Sol review approved exact head `d0341b0424f3428fdd201591f6183c395448fd74`, and all jobs in final-head CI run `36525838850` passed. Local fixture repair, fresh login for six affected profiles, visual Home/POS checks and the 16-profile readiness audit passed. Details are in the sibling review artifact.
