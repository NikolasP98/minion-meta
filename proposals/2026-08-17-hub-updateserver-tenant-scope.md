---
id: 2026-08-17-hub-updateserver-tenant-scope
title: Add DB-level tenant scope to updateServer (blocked on Turso re-key migration)
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, security, edge-case]
value: 5
effort: M
source: debt-sweep-2026-08-17
---

# Add DB-level tenant scope to updateServer (blocked on Turso re-key migration)

## Problem

server.service.ts:30 TODO — update relies entirely on the call-site IDOR check; no tenantId in the WHERE clause. Defense-in-depth gap until the Turso re-keying migration lands (blocker).

## Definition of done

After re-key: eq(servers.tenantId, ctx.tenantId) in the update + cross-tenant-update-denied test.

## Out of scope

Doing this before the re-key migration (would break on old keys).

## Gate note 2026-08-18

PARKED-BLOCKED: waits on the Turso re-key migration; fixing before it would break on old keys. Re-triage when the migration lands.
