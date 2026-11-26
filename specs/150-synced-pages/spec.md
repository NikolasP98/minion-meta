---
status: merged
verdict: approved
created: 2026-11-25
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, logic]
source_proposal: 2026-11-25-hub-synced-pages
source_item: S1
---

# Feature Specification: Synced pages S1 — filters that drive the blocks that listen to them

**Feature Branch**: Planned hub branch `feat/150-synced-pages-s1`; hub PR base `master` (repo-policy row `minion_hub`).

**Created**: 2026-11-25

**Status**: Draft, pass 3 (after EGM stages 5–8; stage 8 moved link state, custom date ranges, id labels, the page-name input and candidate columns to later slices; reports in meta `.local/egm/2026-11-25-synced-pages/`). Owner asked for the program and its implementation on 2026-11-25.

**Input**: Owner (verbatim, 2026-11-25): "I ask the agent to add items to the page and wire them up: connect visuals to live data, create filters that affect other elements. The idea is to create a synced page and being able to tweak how they behave with eachother."

**Current behavior (AS-IS)**: see the proposal `proposals/2026-11-25-hub-synced-pages.md` §AS-IS (single owner of the evidence). **Design**: `plan.md` in this folder.

**Words used here.**
- *Data block*: a KPI, chart, table or list on a sandbox page.
- *Filter*: a control in the filter bar above the blocks — a date filter, a single-choice picker or a multi-choice picker.
- *Value name*: the short name a filter publishes its value under, e.g. `period` or `service`.
- *Page value*: what a filter is currently set to.
- *Connection*: a line on a data block saying "when page value X is set, filter my column Y".
- *Wiring report*: per data block, its working connections and its problems (a value no filter publishes, a filter that does not fit the column, two filters sharing a value name).
- *Page description*: what the agent reads to see the page (internally the "canvas map").
- *QA stack*: the hub's local test stack with seeded data. *FACES*: the FACES SCULPTORS clinic, the client used for live checks. *Accessibility checks*: the hub's automated accessibility gates (spec 137).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One date filter moves the whole page (Priority: P1)

An admin opens a sandbox page with four blocks: a revenue KPI, a bookings chart, a tickets table and a "revenue this year" KPI. A date filter sits in the filter bar. Choosing "last 30 days" updates the first three, each on its own date column. The yearly KPI has no connection to the date filter and stays on "this year".

**Why this priority**: It is the smallest synced page and the case the owner described first.

**Independent Test**: Build the page, change the date filter, and check that exactly the three connected blocks reload with the new date range.

**Acceptance Scenarios**:

1. **Given** three blocks connected to `period` on their own date columns and one that is not, **When** the filter changes to "last 30 days", **Then** the three connected blocks reload with that range and the fourth block does not reload and its numbers do not change.
2. **Given** the filter is cleared, **When** the blocks reload, **Then** each connected block shows the same data it would show if the filter did not exist.
3. **Given** a block that has its own date range on a column, **When** it is also connected to the date filter on that same column, **Then** the filter's range replaces the block's own range while the filter is set; when the filter is cleared, the block's own range applies again.
4. **Given** a block that has its own date range on one column, **When** it is connected to the date filter on a different date column, **Then** both ranges apply.

---

### User Story 2 — Pick values to narrow the page (Priority: P1)

The page has a "Service" picker (single choice) and a "Status" picker (multi choice). Picking a service narrows every block connected to `service`; picking two statuses shows rows that have either status.

**Why this priority**: Value pickers are the second half of "filters that affect other elements".

**Independent Test**: With a picker whose choices come from a column, choose one value, then several, and compare each block's numbers with a hand-written query.

**Acceptance Scenarios**:

1. **Given** a single-choice picker whose choices come from one column, **When** opened, **Then** it lists that column's values, most common first, up to 200; it shows only values from rows the viewer is allowed to see, and never an empty (blank) value.
2. **Given** a multi-choice picker with two values chosen, **When** connected blocks reload, **Then** they show rows having either value. Choosing more than 100 values is not possible.
3. **Given** a picker set to take its choices from a column marked as personal data (for example a customer's name), **When** saved, **Then** the save is refused naming that column.

---

### User Story 3 — The agent builds and rewires the page (Priority: P1)

The admin asks the assistant (or an agent over MCP): "Add a date filter and a service picker; connect every block to both except the yearly KPI." The agent creates the two filters and the connections. A follow-up — even in a new conversation — "make the bookings chart ignore the service picker" removes exactly that one connection and changes nothing else in the chart.

**Why this priority**: The owner's concept is that the agent does the wiring.

**Independent Test**: Issue the tool calls an agent would make; read back the saved blocks; check the page behaves as in stories 1 and 2.

**Acceptance Scenarios**:

1. **Given** the agent tools, **When** the agent creates a filter and blocks connected to it, **Then** they are saved as settings (not code) and the open page shows them without the user reloading.
2. **Given** an existing chart with connections, **When** the agent changes only its connections, **Then** the saved chart is identical except for its connections, and the agent did not have to restate the chart.
3. **Given** an existing chart with connections, **When** the agent changes something else about it (for example line instead of bars) without mentioning connections, **Then** its connections stay as they were.
4. **Given** a connection to a column the block's data does not have, or to a column marked as personal data, or a value name that is not a short lowercase word, **When** saved, **Then** the save is refused naming the field, so the agent can correct it.
5. **Given** a block connected to a value no filter publishes, or to a filter that does not fit the column (for example a date filter on a text column), **When** the agent reads the page description, **Then** the wiring report lists the problem under that block. The save was still allowed, so blocks and filters can be created in any order; until fixed, the page ignores that connection.
6. **Given** two filters with the same value name and the same kind, **When** the agent reads the page description, **Then** the wiring report lists the duplicate; both filters keep working and set the same value, and the most recent change wins.
7. **Given** the page description, **When** the agent reads it, **Then** each block shows which filters it is connected to and which of its columns each one filters, and each filter shows its kind, value name and default.

### Edge Cases

- Two filters share a value name but differ in kind or column type: listed in the wiring report as a problem, and blocks ignore that value until fixed.
- A filter is deleted: blocks connected to it keep their connections, the wiring report lists them, and their data ignores that value.
- When a user clicks or types quickly in any filter, connected blocks reload once, 250 ms after the last change, not once per click or keystroke; a reload that was overtaken by a newer change is cancelled.
- A viewer who may not see one block's data: that block shows the same "no access" message it shows today; the filters keep working for the others.
- Custom (code) elements cannot have connections; saving one with connections is refused.
- Time zones: date ranges use the browser's local day, exactly as block date ranges do today.
- A KPI with "vs previous period" or a trend must still have its own date range to be saved. While the date filter is set on the same column, the KPI compares the filter's range with the range just before it (the previous calendar month for "this month"/"last month", the previous year for "this year") and the trend covers the filter's range.
- Reloading the page resets filters to their defaults in S1; keeping them in the link arrives in S2.
- A connection the page cannot resolve while a filter is set (for example its data definition can no longer be read): the block shows an error, never the unfiltered numbers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A page MUST support filters of three kinds: a date filter, a single-choice picker and a multi-choice picker. A date filter's value is a preset — the same list blocks already use: today, yesterday, last 7/30/90 days, this week, this month, last month, this year, all. Each filter has a title and a value name (a short lowercase word). Filters appear together in one filter bar above the blocks, in their saved order, each with remove and save-to-library actions (changing a filter is done by asking the assistant until the Connections view in S4); they never occupy a block's place in the grid.
- **FR-002**: Pickers MUST take their choices from one column of one data source: most common first, up to 200, never blank values. Pickers MUST show only values the viewer is allowed to see, checked the same way block data is checked today.
- **FR-003**: Every data block MUST be able to hold up to 6 connections, each naming a value name and one of the block's own columns, at most one per value name.
- **FR-004**: While a page value is set, every block connected to it MUST keep only matching rows: a date filter keeps rows whose column falls in the range (replacing the block's own range when it is on the same column; both apply on different columns); a single-choice picker keeps rows whose column equals the value; a multi-choice picker keeps rows whose column equals any chosen value (at most 100). When a filter is empty, the block MUST show what it would show with no filter.
- **FR-005**: When a filter changes, every block connected to it MUST reload and no other block may reload. Changes settle 250 ms after the last click or keystroke, and a reload overtaken by a newer change is cancelled.
- **FR-007**: The system MUST refuse to save, naming the field at fault, when: a connection names a column the block's data lacks; a connection or a picker's choices use a column marked as personal data; a picker's choice column does not exist; a value name is not a short lowercase word (letter first, up to 32 letters, digits or underscores); a custom element has connections; a block's own filters plus its date range plus its connections could exceed the number of conditions one data request allows.
- **FR-008**: Some problems involve more than one element. These MUST NOT block saving and MUST appear in the wiring report under the affected block, for the assistant and for MCP agents: (a) a block connected to a value no filter publishes; (b) a filter that does not fit the column (a date filter fits only date-time columns; a picker fits only columns of the same type as its choices); (c) two filters sharing a value name with different kind or column type. For (a)–(c) the page ignores that connection. Two filters sharing a value name with the same kind and type are listed too, but both keep working on one value and the latest change wins.
- **FR-009**: The assistant tools and the MCP tools MUST be able to create and update filters, set connections when creating a block, and change only a block's connections without restating the block. Changing anything else on a block without mentioning connections MUST keep its connections; the save check then runs on the combined result, so a kept connection that no longer fits (for example after the block's data source changed) is refused naming that connection. Both tool sets MUST follow the same rules as the save check.
- **FR-010**: The page description MUST list, per block, its connections (value name → column) and its wiring problems, and per filter, its kind, value name and default.
- **FR-011**: Blocks without connections and custom elements MUST behave exactly as before; filters are left out of block-only actions (grid layout, rearranging, resizing).
- **FR-012**: Filters MUST NOT let anyone see data they cannot see today: blocks still load data through today's permission and organization checks, filter values are checked as strictly as today's block filters, and a value that does not fit its column is refused before any data request runs.
- **FR-013**: All new user-facing text MUST be in Spanish and English, and the filter bar MUST pass the hub's accessibility checks: usable by keyboard alone and labelled for screen readers.
- **FR-016**: Date-trend KPIs and time-axis charts MUST load (today their data requests are refused; fixed here because synced pages depend on them).
- **FR-015**: The bookings data source MUST offer the booked service's name (the same catalog name sales already show), so one service picker can narrow bookings and sales.

### Key Entities

- **Filter**: kind (date / single choice / multi choice), title, value name, choices source (data source and column — pickers only), optional default.
- **Connection** (on a data block): value name and the block's own column.
- **Page values**: the current value per value name for one viewer's open page; kept in the page while it is open (link in S2), not saved.
- **Wiring report** (per page, derived, not saved): per data block, its working connections and its problems.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a page with 6 blocks of which 3 are connected to a value, changing that filter reloads exactly those 3 (automated test), and on the QA stack all 3 show their new numbers within 2 seconds of the change (median of 5 runs).
- **SC-002**: For every acceptance scenario in stories 1 and 2, each connected block's numbers match a hand-written query with the same condition on seeded data (100% match, automated).
- **SC-003**: Given the in-page assistant (current production model), the fixed request in the test fixture and no other help, the assistant builds the story-1 page (1 filter, 3 connected blocks, 1 unconnected block) in a single reply with no refused save, in at least 4 of 5 runs on the QA stack.
- **SC-004**: Every refusal in FR-007 and every wiring problem in FR-008 has a test asserting the named field or block; a test changes a chart's look and asserts its connections are unchanged.
- **SC-005**: All block and sandbox tests on hub master `133c4154` pass unchanged, except these intended edits: the in-page tool-name list (+2), the MCP tool list (+1), and the host publish signature test.
- **SC-007**: The page description and MCP `sandbox_elements` list every connection and wiring problem (automated snapshot test on a page with one of each problem).
- **SC-008**: Tests prove that filter values reach the database only as bound values, that a value not fitting its column is refused before any data request, and that a viewer without access to a block's data gets today's denial.
- **SC-009**: The filter bar passes the accessibility checks (spec 137), and every new text exists in Spanish and English.

## Assumptions

- Filters and blocks live on the same page; values do not cross pages.
- Page values are per viewer and per open page, not saved per user; links arrive in S2.
- The sandbox stays admin-only (`settings:manage`); no new permission.
- Not marked as a security or data change: no new data becomes visible (filter values go through today's checked data path) and the database structure does not change (filters are saved like other blocks). The service-name addition (FR-015) shows catalog names to viewers who may already read bookings; it adds no new rows.
- In S1 every agent tool call still lands on the live page immediately; drafts arrive in S3.

## Out of Scope

Program-level exclusions: see the proposal (non-admin access, multi-page navigation, new data sources or joins, free-form expressions, saved views). S1 additionally excludes: filter values in the link, custom date ranges and readable labels for id pickers (S2), click-to-filter and drill-down (S2), the page name as an input (S3), candidate columns for unconnected values (S4), draft preview in chat and Apply (S3), Connections view (S4), streamed rendering (S5), assistant page snapshot (S6), series split and per-row currency (S7).
