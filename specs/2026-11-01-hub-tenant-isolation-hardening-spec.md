---
id: 2026-11-01-hub-tenant-isolation-hardening-spec
title: Hub tenant isolation hardening before a third org — RLS coverage test, bypass inventory, reproducible schema
stage: dev
status: implementing
pass: 1
created: 2026-11-01
updated: 2026-11-01
repos: [minion_hub, minion-meta]
tags: [security, data, test]
---

## 0. Product

Spec Kit feature: [`specs/048-hub-tenant-isolation-hardening/`](048-hub-tenant-isolation-hardening/spec.md). Source proposal: `proposals/2026-10-28-hub-tenant-isolation-hardening-before-org-3.md`.

The hub stays on one shared database with per-org row-level security. Before a third organisation onboards: a CI test fails when an org-keyed table lacks a forced-RLS policy (H1); a CI test fails when a new RLS-bypassing query appears without an inventory entry (H2); write-path services are converted to `withOrgCore` one PR at a time (H3, later); the four core tables missing from the repo are recovered from an owner-provided dump so a database can be rebuilt (H4, blocked on the owner).

Security-tagged: owner approved 2026-11-01; owner merges every slice.

**Out of scope:** converting services (H3, later PRs); the schema dump itself (owner runs `pg_dump`); moving any org to its own database.

**Verification:** both tests green in hub CI on the PR that adds them; a throwaway commit adding an unlisted `getCoreDb()` call turns the inventory test red (recorded in the PR, then reverted).
