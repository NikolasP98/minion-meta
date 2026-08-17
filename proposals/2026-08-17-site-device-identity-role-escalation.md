---
id: 2026-08-17-site-device-identity-role-escalation
title: Device-identity sign endpoint lets any member self-assign role/scopes
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion_site]
tags: [logic, security]
value: 9
effort: S
source: debt-sweep-2-2026-08-17
---

# Device-identity sign endpoint lets any member self-assign role/scopes

## Problem

src/routes/api/device-identity/sign/+server.ts:24-27 — client-supplied role/scopes signed verbatim (Ed25519) with only a session check; any member can mint role:'admin' device credentials.

## Definition of done

Caller's real role resolved server-side; requested role/scopes clamped or rejected when exceeding it; test: non-admin POSTing role admin is refused.

## Out of scope

New permission models.
