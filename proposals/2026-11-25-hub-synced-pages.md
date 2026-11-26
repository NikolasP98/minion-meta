---
id: 2026-11-25-hub-synced-pages
title: Synced pages — the agent builds a page in chat, connects its filters to the blocks, and applies it
status: approved
created: 2026-11-25
updated: 2026-11-26
repos: [minion_hub, minion-meta]
tags: [ui, logic]
value: 9
effort: L
source: owner-request-2026-11-25
---

# Synced pages

## Problem (owner, verbatim, 2026-11-25)

> "what I meant was for the agent to be able to build the page contents (maybe rendered in chat before committing to the page). The main concept I was trying to convey was that I ask the agent to add items to the page and wire them up: connect visuals to live data, create filters that affect other elements. The idea is to create a synced page and being able to tweak how they behave with eachother."

Also (same day): "I love all paths! And I want them all to be implemented for sure" — the four paths
offered earlier (blocks in chat, block-kit follow-ups, streaming, the assistant page snapshot) are
folded into this program as slices.

## AS-IS (hub master `133c4154`, 2026-11-25)

| Fact | Anchor |
|---|---|
| A **block** is a stored, typed spec (kpi, chart, table, list) on a sandbox element; it never carries code. | `src/lib/sandbox/blocks/schema.ts:12,180-195`; column `sandbox_elements.spec` |
| A block's data is **its own fixed query**: `blockQueries(spec, now)` turns the spec into query specs in the browser; the server compiles them with RBAC and org scope. Filters and period live **inside each block** (`source.filters`, `source.period`). | `src/lib/sandbox/blocks/query.ts:1-8`; `src/lib/components/sandbox/BlockView.svelte:30-55`; `/api/sandbox/query` |
| **Nothing connects two blocks.** There is no page-level value, no filter control, no click-to-filter. Changing "last 30 days" means editing every block. | grep: no shared state in `src/lib/sandbox/` or `src/routes/(app)/sandbox/` |
| The assistant builds blocks with typed tools (`sandbox.block_kpi|chart|table|list`, `sandbox.preview`, `sandbox.arrange`); external agents get the same through `/api/mcp`. Every write **lands on the live page immediately**. | `src/lib/sandbox/tools.ts:143-380`; `src/server/mcp/sandbox-tools.ts` |
| **Chat cannot show a block.** The only rich card in chat is `chat_artifact` — raw HTML in a sandboxed iframe. | `src/lib/chat/ChatBlocks.svelte:87-314` (0 references to `BlockView`) |
| `/sandbox` is admin-only (`settings:manage`) and shows page `default` only — but the data layer already holds several pages (`sandbox_elements.page`, `listPages`, `?page=` on `GET /api/sandbox/elements`, `page` on the MCP tools). | `src/routes/(app)/sandbox/+page.server.ts`; `src/server/sandbox/sandbox.service.ts` |
| Block tools replace the whole spec, and the in-page assistant cannot read a stored spec (`sandbox.list_elements` returns descriptions without `spec`). | `blockToolSchemas().parse`; `src/lib/sandbox/canvas.ts` `describeElement` |
| Datasets do not join; the same idea lives in different columns per dataset (a period is `start_time` on bookings, `submitted_at` on tickets). Column types are `text, number, timestamp, boolean, uuid`; columns carry a `pii` flag; the registry can define computed columns (`expr`). There is no staff column, and a service name exists only on ticket lines. | `src/server/sandbox/datasets.ts:16-25,66-90,177-190` |
| The server checks every column a block names against the registry before saving. | `src/server/sandbox/blocks.ts:12-51` |
| Block date ranges use one preset list resolved in the browser's local day; the dashboard date control uses a different list, the business time zone and a per-user default. | `src/lib/sandbox/blocks/schema.ts:22-33`; `query.ts:42-70`; `src/lib/components/dashboard/DateRangeControls.svelte` |
| An element PATCH replaces the whole spec (`coalesce(new, old)` per column); the service never read-modify-writes a row. | `src/server/sandbox/sandbox.service.ts:240-266` |
| The query endpoint allows at most 20 conditions per request and 100 values per `in`. | `src/routes/api/sandbox/query/+server.ts:19-22`; `src/server/sandbox/query-compiler.ts:133` |

Verified live on FACES 2026-11-20: a KPI block created through the API renders natively with
org-scoped data (17,247 contacts) and no iframe.

## TO-BE (observable)

1. **Filters are elements, shown as a filter bar.** The page can hold filter controls — a date
   range and a value picker (single or multi) — each publishing one named page value (e.g.
   `period`, `service`, `status`). They are stored like any element but rendered together in one
   strip above the grid.
2. **Every visual says what it listens to.** A block lists the page values it reacts to and, for
   each, which of its own columns that value filters. Changing the date filter updates every block
   that listens to `period`, each on its own date column. A block that does not list a value
   ignores it.
3. **Clicking a visual can filter the page.** A chart bar, list row or table row can set a page
   value (cross-filtering); clicking it again or the chip on the filter clears it. A detail table
   that listens to that value is the drill-down.
4. **A filtered view is a link (S2).** Current filter values live in the URL, so a link or a reload
   reopens the same view. A relative date ("last 30 days") stays relative in the link.
5. **The agent builds and wires it, and previews it in chat first.** "Add a date filter and make
   everything follow it except the yearly KPI" produces a **live, interactive draft in the chat**
   (real data, working filters). The draft is a scratch page the agent builds with the same tools;
   nothing touches the real page until "Apply to page" (button or instruction). Follow-ups ("make
   the service picker not affect revenue") change exactly one connection.
6. **The wiring is visible and editable by hand.** A "Connections" view on the page shows, per
   block, which filters drive it, and a click toggles a connection — the same change the agent
   makes.
7. A multi-block draft appears block by block as the agent builds it (S5).
8. The assistant reads one description of everything actionable on a page, and every change it
   makes is marked as made by the agent (S6).

**Invariants:** a block stays data, never code; every query still goes through the existing
RBAC- and org-scoped endpoint with bound values (filter values are user input exactly like today's
block filters); a viewer who may not see a dataset sees nothing new; existing blocks and custom
iframe elements behave exactly as before (no `listens` ⇒ today's behavior); the sandbox stays
admin-only in this program.

## DELTA — slices (each a Spec Kit spec + hub PR)

| Slice | Delivers | Proof |
|---|---|---|
| **S1 Filters + connections** | `filter` block kind (date presets, single/multi picker) rendered as a filter bar; up to 6 connections (`listens`) on kpi/chart/table/list; only connected blocks reload; per-save validation (FR-007); server-side wiring report in the page description and MCP; connections kept across other edits; `sandbox.block_filter`, `listens` on creation, in-page `sandbox.wire`, MCP `listens` on `sandbox_element_write`; compiler value-type check; service name on bookings. | See §S1 transitions and proofs. |
| **S2 Cross-filter, drill, links** | `emits` on chart/list/table (click sets a page value, second click clears); clear chips on the filter bar; filter values in the link (relative presets, typed parsing, defaults, cleared state); custom date ranges; readable labels for id pickers. | Mounted + e2e with a fixed clock. |
| **S3 Draft in chat + Apply** | The page, its tools and data loading take a page name; the agent builds on a draft = clone of the target (`d-` + 8 hex, hidden from page lists, removed after 24 h); chat embeds that page's renderer (live data, working filters); "Apply to page" swaps the draft into the target in one transaction, refused if the target changed after the clone. Non-web channels get a text summary. | e2e: ask → preview → tweak → apply. |
| **S4 Connections view** | Toggleable overlay listing each block's connections from the wiring report, plus candidate columns for values it is not yet connected to; click to connect/disconnect through the connections write. | Mounted + a11y gate (program S0). |
| **S5 Streaming draft** | Each draft block renders as soon as its tool call completes; placeholders for the rest. | Mounted with a staged stream. |
| **S6 Assistant page snapshot** | One snapshot of the page's actionable state for the assistant; every agent-made change tagged `source: 'agent'`. | Unit + dispatch tests. |
| **S7 Block-kit follow-ups** | Series split, per-row currency — tracked in `2026-11-08-hub-sandbox-block-kit-followups`, not gating this program. | Per item. |

S1 is specified in detail in `specs/150-synced-pages/`; S2–S7 get their own specs when S1 lands.

## S1 transitions and proofs

Design: `specs/150-synced-pages/plan.md` (single owner of the S1 design). Requirements: `specs/150-synced-pages/spec.md`.

| AS-IS → TO-BE | Spec | Proof |
|---|---|---|
| No filter kind → `filter` block kind, rendered in a filter bar | FR-001, FR-011 | schema unit tests; mounted filter-bar test; grid/arrange exclude filters |
| Blocks own fixed conditions → blocks hold up to 6 connections | FR-003, FR-004 | `blockQueries` unit tests (same column replaces, different column adds, empty = unchanged) |
| Pickers: none → choices from a column (top 200, no blanks, no PII) | FR-002, FR-007 | options query unit test; PII refusal test |
| Any filter change reloads nothing → exactly the connected blocks reload, debounced, superseded cancelled | FR-005 | mounted test counting requests; abort test |
| Per-element validation only → + connection checks at save; cross-element wiring report computed on the server | FR-007, FR-008 | refusal tests + wiring report snapshot (SC-004, SC-007) |
| Block tools replace the whole spec → connections have their own write; other edits keep them and the merged result is checked | FR-009 | "change preset keeps connections" test; "change dataset refuses a stale connection" test |
| Agent sees no wiring → page description lists connections and problems | FR-010 | canvas map + MCP snapshot (SC-007) |
| Bookings carry no service name → `service_name` from the catalog | FR-015 | compiler test: column compiles with the org predicate |
| **Invariants**: blocks stay data; same RBAC/org path with bound values; unconnected blocks unchanged; admin-only | FR-011, FR-012 | SC-005 (existing tests unchanged), SC-008 (bound values, type refusal, denial), existing `/sandbox` route-access test |
| Filter bar accessible and translated | FR-013 | accessibility gate (spec 137) + i18n check (SC-009) |

S2–S7 each get their own spec and the same table when they start. **S3 contract** is in the S3 row above (fixed now so S1 does not block it). **S2 hook:** the
wiring model has a `publishers` list (filters in S1; chart/list/table click emitters in S2).

## Terms

See the glossary in `specs/150-synced-pages/spec.md` (§"Words used here").

## Alternatives considered

1. **Formula/expression bindings** (`value: {$var}` anywhere in a spec) — more powerful, but harder
   to show and toggle; `listens` keeps "what drives this block" as one visible list.
2. **Server-side page state** (store filter values per user) — no need: values are view state; the
   URL gives sharing and reload for free.
3. **Adopt OpenUI / UI SDK** — evaluated 2026-11-20 and rejected (Svelte port lags; beta + licence).
4. **Cross-dataset semantic keys** (declare "staff" once, map per dataset automatically) — useful
   later; S1 keeps the per-block column mapping explicit and lets the agent pick.

## Risks & mitigations

- **Wrong mapping** (a value bound to a column with the same type but different meaning) → the
  agent previews (S3) and the Connections view (S4) shows it; the wiring report lists type mismatches.
- **Query fan-out** (one filter change re-queries N blocks) → only connected blocks reload; existing
  endpoint limits apply; every filter change is debounced (250 ms) and superseded requests are cancelled.
- **PII through options** → select options may not come from PII columns (registry flag).
- **Bad link values (S2)** → parsed against the column type; the compiler also refuses mistyped values (400) from S1 on.

## Out of scope

Non-admin access to `/sandbox`; page-as-nav-entry and multi-page navigation (spec 136 S2); new
datasets or cross-dataset joins; free-form expressions; per-user saved views.

## Definition of done (program)

S1–S4 merged and live (S5–S7 tracked, not gating); on FACES an admin can ask the assistant for a
page with a date filter, a service picker and a click-to-filter chart, see and tweak it in chat,
apply it, and change how the blocks react to each other from the Connections view — with no code
written by the agent. **Verified by:** the S1–S4 automated tests green on hub master, the S3 e2e
(ask → preview → tweak → apply) and one recorded live run on FACES whose stored specs contain no
`html`/`js`.

## Detailed Implementation Plan

S1 design: `specs/150-synced-pages/plan.md`; S1 tasks: `specs/150-synced-pages/tasks.md` (Spec Kit). The EGM review reports for this
document live in meta `.local/egm/2026-11-25-synced-pages/` (untracked).

## Open items ledger (S1 implementation, hub `feat/150-synced-pages-s1`)

| # | Open end | Where (`TODO(handoff)`) | Next step |
|---|---|---|---|
| 1 | e2e `tests/e2e/ui-audit/synced-pages.spec.ts` written but never run (local QA stack unusable since 11-23: DB re-keyed, every page 500) | spec file header | Owner OK to reseed the shared QA stack, or run on prod with a temporary admin bump; proves SC-001 timing + SC-002 |
| 2 | Picker choices beyond the first 200 need a server-side search | `src/lib/sandbox/blocks/query.ts` (`optionsQuery`) | S2 |
| 3 | `sandbox.arrange` skips filters through an `isFilter(id)` callback instead of GETting elements (a GET broke three lease-timing tests) | `src/lib/sandbox/tools.ts` | Keep unless arrange is called outside `/sandbox`; then add the GET with the lease tests adjusted |
| 4 | Shared `ui/MultiSelectFilter` popup fails the APG listbox pattern (no name, one tab stop per option, no arrow/End keys) | `PickFilter.svelte` + its test | Hub a11y program (meta #1060, S3 primitives) |
| 5 | SC-003 agent trial (5 runs) | — | Post-merge (T026) |

## Amendment 2026-11-26 — apps and template copies

Owner direction 2026-11-26 (see `2026-11-26-hub-apps-clinic-package`): the modules built so far are
the **Clinic** app; each module's main page becomes an editable copy of the app's template, and
agents edit main pages only. For this program that means:

- **S3 (draft in chat + Apply) is delivered as slice E1 of the apps proposal** (page registry, page
  kinds, drafts, guarded apply). Its draft contract here is kept.
- **Program order** becomes the "editable pages" track there: S1 → E1 → E2 (CRM main page) → S2 →
  E3 → S4 → E4.
- **Invariant narrowed:** "the sandbox stays admin-only" now reads "`/sandbox` stays the admin-only
  scratch area; a module's main page follows that module's dashboard permission, and staff read
  added blocks by element id with their own permissions".
- **Agents write drafts only** on main pages; a person applies.
- **Reserved link names** for S2 page values: `copy`, and each main page's own parameters
  (`range`, `from`, `to`).
