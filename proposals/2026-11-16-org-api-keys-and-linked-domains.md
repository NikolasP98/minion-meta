---
id: 2026-11-16-org-api-keys-and-linked-domains
title: An organization gets API keys and can link its own subdomain for forms
status: in-spec
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
effort: L
value: 7
tags: [crm, security, data]
spawned_spec: 2026-11-16-org-api-keys-and-linked-domains-spec
source: parked spec 2026-11-13-doors-site-sdk-spec (story US3) and the owner's subdomain direction
---

# An organization gets API keys and can link its own subdomain for forms

## Problem (owner's words)

> Build the per-org api key feature. Use speckit and egm. also build the base for the dns
> validation. I need you to make this process as simple as possible (kind of how resend email
> validates dns, one-click if possible)

Earlier: "Yes, it should belong to the ORG." and "Eventually, we can consider a form builder to
embed into a subdomain like modelos.facesculptors.net. This would need DNS validation."

## AS-IS

A customer's server that forwards form submissions to a door is anonymous to the hub, and all its
visitors share one rate limit (5 submissions per minute and door). An organization has no API keys
and no record of a domain it owns; forms are served only on the hub's own address.

## TO-BE

An organization admin creates and revokes API keys on a Developers settings page. A server that
sends a key may state its visitor's address, so limits count per visitor. An admin links a
subdomain by adding one DNS record; the hub checks it by itself, and the subdomain then serves that
organization's form pages and nothing else.

Invariant: callers without a key, and the hub's own address, behave exactly as today.

## DELTA

Keys (create, list, revoke, use on submit and upload) → linked domains (add, automatic check,
activate, remove) → host guard (a linked host serves only its organization's forms).

## Out of scope

Browser use of keys, other key scopes, key expiry, provider-side one-click record creation, apex
domains, a default form at `/`, periodic re-checks, the form builder.

## Definition of done

The Spec Kit specification `specs/121-org-api-keys-domains/` and its quickstart.

## Open-items ledger

None yet.
