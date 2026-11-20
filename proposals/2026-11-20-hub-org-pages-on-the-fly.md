---
id: 2026-11-20-hub-org-pages-on-the-fly
title: Org pages on the fly — an agent builds a page for one org and it is live without a deploy
status: draft
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub, minion-meta]
value: 9
effort: L
source: owner-request-2026-11-20
tags: [security, data, ui]
---

# Org pages on the fly

## Request

Owner, 2026-11-20: "are you able to create custom pages on the fly without having to merge
anything? I want this to be possible. I ask you to create a page/dashboard for an org and you
create and deploy asap without the whole dev pipeline, and I can see your changes live on the org."
Then: "write the proposal and spec for the four steps. Also, implement for the mcp server for
better agentic control."

## AS-IS (hub `origin/master`, read 2026-11-20)

- `/sandbox` is live and admin-only (hub #542). An element is a row in `sandbox_elements`
  (`page`, `title`, `html`, `css`, `js`, size, position). Writing a row changes what the org sees
  on the next load. No deploy.
- An element runs in an iframe with `sandbox="allow-scripts"` and a `connect-src 'none'` policy
  (`src/lib/sandbox/srcdoc.ts`). It reads data only through `/api/sandbox/query`, which checks the
  viewer's own permissions and scopes to the viewer's org.
- Seven datasets, one table each, no joins: `crm.contacts`, `pos.tickets`, `pos.ticket_lines`,
  `pos.payments`, `finance.invoices`, `finance.products`, `scheduling.bookings`
  (`src/server/sandbox/datasets.ts`).
- `sandbox_elements.page` already separates pages in data, but the app shows one Sandbox screen and
  no org can put a sandbox page in its menu.
- Typed blocks (KPI, chart, table, list) rendered with the hub's own components exist only in hub
  #642, open since 2026-11-08.
- The only way to write an element is the in-page assistant while an admin has `/sandbox` open
  (`src/lib/sandbox/tools.ts`). An outside agent has no way in.
- The gateway serves `/mcp`, but every caller there is one shared admin identity and it exports
  read-only tools only; per-user identity is spec 005, draft and not approved.
- Org API keys exist (spec 121, hub #680): org-scoped, revocable, no scopes. Today they only
  authorise door submissions.
- The funnel page (spec 132) could not be built this way: it needed Meta ads, leads and customer
  identities joined, its own menu entry, and the hub's table, filter and tooltip components.

## TO-BE

The owner asks for a page for an org. The agent builds it and the org sees it within a minute, in
its menu, looking like the rest of the hub. No pull request is involved for a page made of existing
blocks over existing datasets.

Invariants:

- A page built this way never runs agent-written code on the server.
- A page shows a viewer only what that viewer's role may see.
- Every write names the credential that made it, and the credential can be revoked.
- A new block kind or a new dataset still goes through a pull request.

## DELTA

| Slice | Change | Proof |
|---|---|---|
| S1 Blocks | Merge hub #642 (typed blocks on shared components). **Done 2026-11-20** (`3677e35a`). | Its own tests; a block renders with hub components. |
| S2 Pages in the menu | A named sandbox page is a screen an org can place in its navigation (`app_nav_config` target), with its own URL and title. | Nav test: a page entry resolves; an org without the entry does not list it. |
| S3 Data | More datasets (Meta ads, leads, parties, stock) and saved queries with joins, each reviewed once. | Compiler tests per dataset; RBAC test per module. |
| S4 Block kinds | Calculated card with formula tooltip, funnel stages, table with the filter button. | Block tests; visual parity with `/pos/funnel`. |
| S5 Agent control (MCP) | A hub MCP endpoint, authorised by an org API key that carries a `sandbox` scope: list datasets and pages, read, write and remove elements, and write typed blocks (KPI, chart, table, list) from the block catalogue. | Protocol tests; a key without the scope is refused; a write is attributed to the key. |

Order: S5 first (it works on today's elements and gives the agent a way in), then S1, S2, S4, S3.

## Why the hub and not the gateway `/mcp`

A gateway caller is a shared admin, not a named org credential, and write tools there wait on spec
005. An org API key is already org-scoped and revocable, and the hub owns the sandbox service. The
gateway can proxy to this endpoint later without changing it.

## Risks

- A leaked key with the scope lets someone change an org's sandbox pages. It cannot read business
  rows (no query tool) and planted script cannot send data out (`connect-src 'none'`).
- Skipping the pipeline skips its checks. Limit: only typed blocks and allow-listed datasets are
  exempt; the escape hatch (free HTML) stays admin-visible and isolated.

## Open decisions (owner)

1. Approve S5 as security-tagged work (human gate at approval and merge).
2. S2: may a non-admin role open a sandbox page placed in the menu, under its own view rule?
