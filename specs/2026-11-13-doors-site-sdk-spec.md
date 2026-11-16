---
id: 2026-11-13-doors-site-sdk-spec
title: A lead form on any site with two lines — Doors site SDK
stage: spec
status: draft
pass: 1
created: 2026-11-13
updated: 2026-11-13
repos: [minion_hub]
proposal: 2026-11-13-doors-site-sdk-low-boilerplate
type: feature
related: [2026-11-13-hub-form-door-files-multiselect-tags-spec, 2026-10-24-hub-collection-points-spec]
tags: [crm, security, data]
---

# A lead form on any site with two lines — Doors site SDK

## Status

Parked on 2026-11-13 by the owner after slice S0 (hub PR 659). The FACES form stays hosted on its own site as built. The owner's later direction is a hub-hosted form builder on a customer subdomain with DNS validation; see the proposal.

## 0. Product

A site puts a Minion form door on a page with one script tag and one `<minion-door slug>` element.
Organizations list the sites that may do so and can create API keys for server-side callers. The
form's sections, conditional fields, country pickers, photo guides and translations are settings of
the door, so the hosted page and the embedded form are the same form.

The canonical [Spec Kit specification](114-doors-site-sdk/spec.md) contains the AS-IS evidence,
TO-BE invariants, DELTA, stories and acceptance scenarios. Plan, data model, contract and tasks sit
beside it.

## Plan and verification

- Plan and slices: [114-doors-site-sdk/plan.md](114-doors-site-sdk/plan.md); tasks: [tasks.md](114-doors-site-sdk/tasks.md).
- Contract: [contracts/public-api.md](114-doors-site-sdk/contracts/public-api.md).

## Verification

Steps are in [quickstart.md](114-doors-site-sdk/quickstart.md). Nothing is verified yet: this spec precedes the code.

## Out of scope

Browser-direct uploads above 4 MB, `minion doors push`, a published client package, an iframe embed, captcha, DNS proof of domain ownership,
key scopes beyond door submit, custom guide images, framework wrapper components.

## Human gates

Security and data: the owner approves this spec and merges every hub PR. Production data changes
(door config, allowed-site rows) need an explicit go-ahead.
