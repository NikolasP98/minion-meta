---
id: 2026-11-20-hub-org-pages-on-the-fly-spec
title: Org pages on the fly — an agent builds a page for one org over MCP and it is live without a deploy
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: pending
type: feature
tags: [security, data, ui]
---

# Org pages on the fly

## 0. Product

The owner asks for a page or dashboard for one org; an agent builds it and the org sees it within a
minute, without a pull request. Slice S5 gives an outside agent a way in: a hub MCP endpoint,
authorised by an org API key that carries a `sandbox` scope, to list datasets and pages and to
write and remove sandbox elements, including typed blocks (KPI, chart, table, list). Slices S1–S4 make such pages look like the hub, sit in the
org's menu, and reach the data the funnel page needed.

The canonical [Spec Kit specification](136-org-pages-on-the-fly/spec.md), its
[plan](136-org-pages-on-the-fly/plan.md) and [tasks](136-org-pages-on-the-fly/tasks.md) hold the
requirements; the AS-IS evidence and slice table are in
`proposals/2026-11-20-hub-org-pages-on-the-fly.md`.

## Verification

- S5: protocol, tool, route and key-scope tests listed in the plan; a local end-to-end call.
- S1–S4: planned, not built.

## Out of scope

Changing the gateway `/mcp`; row-returning query tools; non-admin access to sandbox pages (S2 decides).

## Human gates

Tagged `security` and `data`: the owner approves this spec and merges each PR.
