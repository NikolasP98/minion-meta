---
id: 2026-11-16-org-api-keys-and-linked-domains-spec
title: Organization API keys and linked domains (base)
stage: spec
status: draft
pass: 1
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
proposal: 2026-11-16-org-api-keys-and-linked-domains
type: feature
related: [2026-11-13-doors-site-sdk-spec]
tags: [crm, security, data]
---

# Organization API keys and linked domains (base)

## 0. Product

An organization admin creates and revokes API keys; a server that sends a key with a form
submission gets its own limit instead of the one shared by its address. An admin links a
subdomain with one DNS record that the hub checks by itself; the subdomain then serves that
organization's form pages and nothing else of the hub.

The canonical [Spec Kit specification](121-org-api-keys-domains/spec.md) contains the AS-IS
evidence, TO-BE invariants, DELTA, stories and acceptance scenarios. `related`: it continues story
US3 of the parked Doors site SDK spec and replaces that spec's allowed-sites approach for the
owner's subdomain direction.

## Plan and verification

- Plan and slices: [121-org-api-keys-domains/plan.md](121-org-api-keys-domains/plan.md); tasks: [tasks.md](121-org-api-keys-domains/tasks.md).
- Contract: [contracts/api.md](121-org-api-keys-domains/contracts/api.md).

## Verification

Steps are in [quickstart.md](121-org-api-keys-domains/quickstart.md). Nothing is verified yet: this spec precedes the code.

## Out of scope

Browser use of keys, other key scopes, key expiry, provider-side one-click record creation, apex
domains, a default form at `/`, periodic re-checks of active domains, the form builder.

## Human gates

Security and data: the owner approves this spec and merges every hub PR. The DNS record and hosting
credentials for linked domains are set up by the owner.
