---
id: 2026-09-29-hub-qa-personal-agent-provisioning
title: Provision personal agents for ordinary local QA profiles
status: done
created: 2026-09-29
updated: 2026-09-29
repos: [minion_hub]
spawned_spec: 2026-09-29-hub-qa-personal-agent-provisioning-spec
tags: [test]
---

# Local QA personal agents

## AS-IS

The DEV login picker exposes synthetic profiles whose agent fixtures are incomplete. The live loopback database shows missing agents for three UI Audit profiles and both formula/presentation masked profiles; UI Audit owner has an error agent after failed gateway self-healing. `scripts/qa/seed/tenancy.ts` provisions ordinary tenancy profiles, while the other persona seeds omit this step. `(app)/+layout.server.ts` redirects users without an active agent to onboarding when gateway provisioning fails. The local stack intentionally has no external gateway.

## TO-BE

Ordinary QA profiles have persisted active personal-agent fixtures before login, including existing failed fixtures. Selecting them reaches authenticated application routes without an external gateway. Keep explicitly pending-agent and no-organization fixtures available for their dedicated negative scenarios.

## DELTA

Share an idempotent agent seed helper across ordinary persona seeds, register fixture coverage, exercise real database reruns and browser login, and repair only the affected local fixture domains. No production account or gateway provisioning is requested. User authorization covers this backend correction and the prior reviewed-merge/release workflow.

## Outcome

Hub PR #407 merged as `e7d80d79379e500d3915b9582ba6f61be35b712d`. The local backend was repaired, the running dev checkout includes the seed correction, and fresh Home/POS access was verified. Final-head CI and independent two-axis review passed.
