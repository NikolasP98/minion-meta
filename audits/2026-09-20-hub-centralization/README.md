# Hub component and service centralization audit

The Hub has useful shared foundations, but callers still implement their own mutation, identity, rendering and refresh behavior. Centralize these contracts before removing more Save buttons. A successful write must update every relevant representation without overwriting a newer edit.

## Evidence and scope

Source audit dated 2026-09-20. Hub checkout: `master` at `0acd6282df74d18eacd27673fcf238cd16a29e56`, including uncommitted work. Meta checkout: `dev` at `5d9860fba62cc258680a76c6ae4e6841f55b1cf6`. The snapshot records per-file SHA-256 and dirty paths in [inventory.json](inventory.json). Line references are snapshot anchors, not promises about future revisions.

**Audit complete; consolidation proposed, not implemented.** No Hub source edits, database operations, deployment, browser testing, or runtime assertions were performed. No branches were switched, worktrees created, or commits made. The concurrent Claude table migration and existing POS work remain owned by those sessions. The screenshot shows a separate cell-edit checkout, whose unmerged contents are not represented by this source snapshot.

The reproducible lexical scan covers 2,812 source files under Hub `src/` and meta `packages/`. Its index contains 492 component files, 194 service-directory files and 661 shared-module files (these categories exclude filenames recognized as tests). These are file counts, not counts of independent APIs or confirmed duplication. There are **22 consolidated reviewed findings** in [findings.json](findings.json). Candidate matches have not all been semantically reviewed; neither the scanner nor this report claims to detect every duplicate implementation.

## Navigation

- [Full source index](INDEX.md): components, services and shared modules, exported symbols and direct consumer counts.
- [Component findings and canonical APIs](COMPONENTS.md): dates, charts, dialogs, fields, progress, status and exceptions.
- [Service findings and canonical APIs](SERVICES.md): tags, events, party identity, stock/recipe and invoice boundaries.
- [Query, mutation and freshness findings](FRESHNESS.md): autosave, errors, conflict detection, cache adapters and cross-view propagation.
- [Table ownership and discovery ledger](TABLES.md): current raw-table sites, reserved for the concurrent migration.
- [Draft consolidation proposal](../../proposals/2026-09-20-hub-component-service-centralization.md): AS-IS, TO-BE, slices and acceptance criteria.

## Domain matrix

| Domain | Authority to build on | Result | Next move |
|---|---|---|---|
| Primitive controls | `packages/ui/src/lib/index.ts`; Hub `components/ui` compatibility adapters | Shared primitives exist; call sites still rebuild fields, dialogs and confirmations | Migrate compatible callers; extend density/status semantics first where needed |
| Tables | `components/data-table/DataTable.svelte` | Raw implementations remain in this checkout; concurrent Claude migration underway | Re-scan after its changes land; do not start a second migration |
| Dates | `dashboard/DateRangeControls.svelte` + `dashboard/date-range/` | Campaigns rebuild a range toolbar | Adopt range SDK; single-date form controls are a separate need |
| Charts and diagrams | `charts/Chart.svelte`, chart sparklines, overview graph renderer/simulation | Generic Sparkline duplicate; scene controllers repeat lifecycle | Extend domain/interpolation options; preserve scientific bands and stock illustrations |
| Tags | `tag-links.service.ts`, CRM tag operations, `TagsField.svelte` | Shared definitions but separate DTO/mutation/cache contracts | Domain DTO and tagging facade with storage adapters |
| Workflow events | `server/events/emit.ts` | Typed contract bypassed for POS event | Register intended consumer behavior alongside schema |
| Browser events | `lib/realtime/org-events.ts` | Existing consumer scope is CRM messages | Extend committed entity signals and invalidation mapping |
| Party identity | `party.service.ts` | Creation and reconciliation validate differently | One normalization policy, typed identity variants |
| Stock and recipes | `stock.logic.ts`, `item-cost`, `stock-accruals`, `stock.service` | Pure math shared; root/graph loading repeated | Transaction-aware resolver; retain costing/reservation/posting separation |
| Invoices | Canonical invoice connector, `finance.service`, emission adapters | Ingestion already shared; outbound emission has distinct responsibility | Preserve boundaries; test adapters against shared contracts |
| Client querying | SvelteKit loads, QueryClient, CRM page LRU | Distinct cache lifecycles are intentional | Centralize change-to-invalidation adapters, not all storage |
| Server querying | `withOrgCore`, `@minion-stack/cache`, domain services | Some flow persistence still sits in route handlers | Extract domain service over existing scoped DB helpers |
| Autosave | `jsonMutation`, `fetchJson`, Pacer, local editors | Debouncing exists; shared revision/conflict coordinator does not | Serialize per entity, acknowledge exact revision, retain error state |

## Shared does not always mean one package

The meta UI package exports 13 primitives: Button, IconButton, Badge, Card, FormField, Input, Textarea, Select, Checkbox, Radio, Toggle, Spinner and Skeleton. Hub supplies application-specific wrappers and foundations. Its `package.json:25` currently consumes a **tarball dependency**, not the live `packages/ui` tree. A root-package edit therefore needs a built, versioned artifact and Hub adoption before it changes Hub behavior. The installed UI barrel was checked and exposes these primitives; implementation parity with the root was not assumed.

Keep generic design primitives in `@minion-stack/ui`, Hub-specific UI compositions in `src/lib/components`, domain mutations/services in `src/server`, and browser coordination in `src/lib`. Share contracts across boundaries; do not import scheduling component DTOs into server services. Preserve tenant/record/field permission checks and transaction ownership.

## Additional querying finding: Q01

[`flows/[id]/+server.ts`](../../minion_hub/src/routes/api/flows/[id]/+server.ts):49–83 owns flow update/delete persistence and cache invalidation. [`flow-groups/[id]/+server.ts`](../../minion_hub/src/routes/api/flow-groups/[id]/+server.ts):34–60 performs related mutations; [`flows/reconcile/+server.ts`](../../minion_hub/src/routes/api/flows/reconcile/+server.ts):66–89 is another writer. They already use `withOrgCore`; direct SQL is not itself evidence of an authorization defect.

Extract a flow domain service for graph serialization, version checks, related group operations and invalidation, retaining auth at transport boundaries and scoped transactions below. Do not redirect this to `workflow.service.ts`: that service manages support/sales document transitions, not flow-editor graphs. Verify PUT and reconciliation preserve plugin ownership and group membership, and that a delayed stale update cannot overwrite a newer graph.

## AS-IS → TO-BE → DELTA

**AS-IS:** stock views invalidate independent load keys; CRM tag mutations ignore non-success HTTP status; party validation differs by entry path; repeated recipe resolution must manage transaction scope independently. Components sometimes duplicate a shared implementation and sometimes need capabilities it lacks.

**TO-BE:** a reversible property edit has one domain mutation contract and visible pending/saved/error/conflict state. Its committed result refreshes all authorized representations. Shared components support the variants callers actually need, and intentional exceptions remain documented.

**DELTA:** reuse safe mutation helpers; introduce versioned entity mutations and a change-to-invalidation registry; extend the existing org channel with committed signals and recovery; consolidate domain invariants; migrate compatible UI callers. Removing buttons is the final UX step after those contracts work.

## Prioritized sequence

1. **Mutation correctness:** F02/F03/F04. HTTP failure handling, atomic stale-write checks and revision-aware saves. These protect data before broader autosave.
2. **Propagation:** F01 + service event findings. Map entity IDs and versions to page dependencies, query keys and local cache clears. Keep workflow automation and browser invalidation as distinct subscribers; do not treat `pg_notify` as a durable synchronization log.
3. **Domain consistency:** S01/S03/S04/S05/Q01. Party identity, transaction-aware recipe resolution, tagging facade and route-owned flow service. Coordinate S02 and recipe/POS consumers with the POS owner.
4. **Component adoption:** C01–C10, F06. Dialogs/ranges are smaller migrations; sparklines, progress and inline editing need extensions. Coordinate DataTable interfaces with Claude.
5. **Prevent recurrence:** add import/contract checks for migrated boundaries, narrowly scoped allowlists for intentional renderers, and per-domain adoption counts. Regex debt totals alone are not acceptance gates.

## Notion-style behavior contract

- Autosave reversible scalar fields, names and manual tag changes on an intentional commit gesture (blur/Enter, selection, or a bounded debounce appropriate to the field).
- Serialize writes for each entity; do not clear a newer dirty revision when an older request completes. Preserve unsent drafts through errors and refreshes.
- Use server compare-and-update versions; show conflicts rather than silently choosing the latest arriving request.
- Same-view updates reconcile from the authoritative response. Other views/tabs/users receive org-scoped identifiers and refetch through their normal permission-filtered APIs/loads. Deduplicate echoes and coalesce bursts.
- Reconnect/focus performs a canonical refresh so missed signals do not leave a stale page indefinitely. Subscription lifetime follows organization changes and unmount.
- Keep explicit submission for multi-field forms with interdependent validation, issuing/cancelling invoices, stock posting, payment, deletion and other consequential transitions.

Acceptance requires two views, two tabs and two authorized users observing the same committed version; an unauthorized organization must receive no entity details. Inject HTTP 403/409/500, a dropped connection, reordered/duplicated signals and edits made while save is pending. See FRESHNESS.md for the full matrix. These are proposed checks, not executed tests.

## Discovery and verification

Regenerate with `python3 audits/2026-09-20-hub-centralization/scan.py`. This overwrites only this audit's INDEX.md and inventory.json. Patterns scan text, including comments and valid primitive implementations. Import counts are direct, exclude recognized tests, and do not resolve barrel exports transitively. Relative/alias imports are resolved where possible; external package edges retain their package specifier.

The scan found 40 raw-table line matches, 18 native date-input matches, 21 manual-dialog matches, 430 fetch matches and 25 route SQL matches. None is a defect total. For example, chart accessibility tables, email HTML tables and specialized pickers should not be blindly migrated to DataTable; native date inputs often represent legitimate forms.

Documentation checks validate source links/anchors, JSON structure, snapshot drift, generated proposal-index consistency and diff whitespace. Existing source tests were not run because this session changes documentation and discovery tooling only. Static evidence does not establish production state or visual correctness.

Validation completed: `node audits/2026-09-20-hub-centralization/verify.mjs` checked 1,513 local Markdown links and finding anchors, found no source-file drift, and passed review JavaScript syntax. `node scripts/proposal-index.mjs --check` passed for 469 proposals. [Verification receipt](verification.json). Detailed reports use X-prefixed entries for intentional exceptions and suffixes for subfindings; the 22 consolidated work items are the rows in findings.json.
