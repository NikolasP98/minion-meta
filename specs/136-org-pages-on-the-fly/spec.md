# Feature Specification: Org pages on the fly, with agent control over MCP

**Feature Directory**: `specs/136-org-pages-on-the-fly`
**Created**: 2026-11-20
**Status**: Draft — security tagged; owner approval required before merge (Constitution V)
**Tags**: security, data, ui
**Repos & PR base**: `minion_hub` → `master`; `minion-meta` → `dev`
**Proposal**: `proposals/2026-11-20-hub-org-pages-on-the-fly.md`
**Input**: Owner, 2026-11-20: "I ask you to create a page/dashboard for an org and you create and deploy asap without the whole dev pipeline, and I can see your changes live on the org." and "implement for the mcp server for better agentic control."

AS-IS, TO-BE and the slice table are in the proposal. This spec states the requirements per slice.
S5 is specified to implementation depth and is built first; S1–S4 are specified to planning depth.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An outside agent builds a page for one org (Priority: P1) — slice S5

The owner creates an API key for an org and ticks "Sandbox pages". The agent, connected to the
hub's MCP endpoint with that key, lists the datasets and their columns, lists the org's sandbox
pages, and writes elements onto a page. The owner reloads the page and sees them.

**Why this priority**: It is the only missing piece for "create and deploy without the pipeline"
on what the Sandbox can already show.

**Independent Test**: With a scoped key, a `tools/call` that writes an element is followed by the
element appearing in that org's page listing, and in no other org's.

**Acceptance Scenarios**:

1. **Given** a key with the sandbox scope, **When** the client calls `initialize` then `tools/list`, **Then** it receives the server identity and exactly the ten tools below.
2. **Given** the same key, **When** it writes an element with a title and markup onto page `ventas`, **Then** the element is stored for the key's org on that page and the reply carries its id.
3. **Given** the same key, **When** it updates that element's title by id, **Then** only the title changes.
4. **Given** the same key, **When** it removes the element, **Then** it is gone from the page listing.
5. **Given** a key without the scope, **When** it calls anything, **Then** it is refused with a message that names the missing scope.
6. **Given** no key, a malformed key or a revoked key, **When** it calls anything, **Then** it is refused as unauthorised and nothing is written.
7. **Given** a key of org A, **When** it passes an element id that belongs to org B, **Then** nothing changes and the reply says the element was not found.
8. **Given** a scoped key, **When** it sends more calls than the limit in a minute, **Then** it gets a retryable "too many requests" reply.
9. **Given** a scoped key, **When** it asks for the block catalogue, **Then** it receives the block kinds, every preset value and one complete example per kind.
10. **Given** a scoped key, **When** it writes a KPI block naming a dataset, a metric and a format onto page `ventas`, **Then** the block is stored as data (no markup or script) on that page, and the org sees it rendered with the hub's own components.
11. **Given** a scoped key, **When** it writes a block that names a column the dataset does not have, or a sum over a text column, **Then** nothing is stored and the reply names the field that is wrong.
12. **Given** a scoped key, **When** it sends a block by id, **Then** that element becomes the new block and stays on its page.

### User Story 2 - The owner grants and withdraws the ability (Priority: P1) — slice S5

In Settings → Developers the owner creates a key and chooses whether it may manage sandbox pages.
The key list shows which keys can. Revoking a key stops its MCP access at once.

**Acceptance Scenarios**:

1. **Given** the create-key dialog, **When** "Sandbox pages" is left off, **Then** the key works for doors as today and is refused by the MCP endpoint.
2. **Given** an existing key from before this change, **When** it calls the MCP endpoint, **Then** it is refused (no key gains the ability silently).
3. **Given** a revoked key, **When** it calls, **Then** it is refused.

### User Story 3 - A page built this way sits in the menu and covers more shapes (Priority: P2) — slices S2, S4

Slice S1 is done: the block kit (hub #642) is live, and S5 writes blocks over MCP. What remains
is placing a page in the org's menu with its own address and title (S2) and the block kinds the
funnel needed (S4).

### User Story 4 - The page can show what the funnel showed (Priority: P3) — slice S3

Datasets for ads, leads, customers and stock, and reviewed saved queries with joins, are available
to blocks under the viewer's own permissions.

### Edge Cases

- A page name with characters outside `a-z 0-9 -` is refused; the reserved library page cannot be written through MCP.
- An element larger than the existing size limit is refused with the limit stated.
- A request that is not valid JSON-RPC gets a protocol error, not a server error.
- An unknown tool name gets "unknown tool", not a server error.
- The endpoint never returns business rows: there is no query tool in S5.

## Requirements *(mandatory)*

### Functional Requirements — S5 (built now)

- **FR-001**: The hub MUST serve an MCP endpoint over HTTP (JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`, and accept `notifications/*`).
- **FR-002**: The endpoint MUST accept only an org API key in the `Authorization` header and act for that key's org alone.
- **FR-003**: API keys MUST carry a list of scopes. Only keys with the `sandbox` scope may use the endpoint. Existing keys have no scopes.
- **FR-004**: The owner MUST be able to set the scope when creating a key and see it in the key list. Scopes cannot be changed after creation.
- **FR-005**: Tools: `sandbox_datasets` (datasets with columns and types, no rows), `sandbox_pages` (page names with element counts), `sandbox_elements` (elements of one page), `sandbox_element_write` (create, or change by id), `sandbox_element_remove`.
- **FR-005a**: Block tools (added 2026-11-20 at the owner's request, after the block kit went live): `sandbox_blocks` (the catalogue: kinds, presets, one example per kind) and one writer per kind, `sandbox_block_kpi`, `sandbox_block_chart`, `sandbox_block_table`, `sandbox_block_list`. Their inputs come from the same grammar the in-page assistant uses, so the two cannot differ.
- **FR-005b**: A block MUST be checked against the dataset registry before it is stored: unknown dataset, unknown column, or a metric over the wrong column type is refused with the field named.
- **FR-005c**: Block tools are the default way to build a page. `sandbox_element_write` (free markup) is the escape hatch for a visual no block kind can express, and the tool descriptions MUST say so.
- **FR-006**: Every write MUST record which key made it.
- **FR-007**: The endpoint MUST limit calls per key and answer over-limit calls with a retryable error.
- **FR-008**: The endpoint MUST NOT expose any tool that returns business data rows.
- **FR-009**: Refusals MUST say why in plain words (missing scope, unknown key, not found, too many requests).
- **FR-010**: Door submissions with a key MUST behave exactly as before.

### Functional Requirements — S1–S4 (planned)

- **FR-011** (S1): Typed blocks render with the hub's shared components (hub #642).
- **FR-012** (S2): A sandbox page can be a navigation target for one org, with its own address, title and view rule.
- **FR-013** (S3): New datasets and saved queries are added by pull request, each with a permission module and tests.
- **FR-014** (S4): Block kinds exist for a calculated card with formula tooltip, funnel stages, and a table with the filter button.
- **FR-015** (S4, S5): each new block kind added in S4 appears as an MCP writer automatically, from the shared grammar.

### Key Entities

- **API key**: org, name, scopes, created/revoked. A scope is a named ability, starting with `sandbox`.
- **Sandbox page**: a name within an org that groups elements.
- **Sandbox element**: one visual on a page; a typed block (preferred) or free markup; records who or which key wrote it.

## Success Criteria *(mandatory)*

- **SC-001**: From "key created" to "element visible to the org" takes under one minute and no deploy.
- **SC-002**: A key without the scope, a revoked key and a key of another org each fail every tool call.
- **SC-003**: Reading everything the endpoint can return for an org reveals no customer, sale or booking row.
- **SC-004**: Every element written through the endpoint can be traced to one key.
- **SC-005**: Door submissions pass their existing tests unchanged.

## Assumptions

- The agent learns column names from `sandbox_datasets`; the page queries data in the viewer's browser under the viewer's role, so the agent needs no row access.
- Script inside an element cannot send data out (`connect-src 'none'`), so a scoped key cannot be used to leak rows.
- The gateway `/mcp` is not changed; it can proxy to this endpoint after spec 005.
- Sandbox stays admin-only until S2 defines a view rule.
