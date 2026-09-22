# Hub shared components and remaining bypasses

Source audit, 2026-09-20. Hub checkout reported branch `master`, HEAD
`0acd6282df74d18eacd27673fcf238cd16a29e56`; findings include its dirty working tree.
Line numbers describe the inspected snapshot and may move during concurrent work.
This document records proposed migrations, not completed implementation or runtime defects.

The concurrent Claude session owns table migration and DataTable editing. Do not modify
DataTable, its tests, or table consumers under that session without coordinating ownership.
The campaign toolbar finding below overlaps a table consumer and is reserved accordingly.
POS and TeamTab also have concurrent changes. This audit made no Hub source edits.

## AS-IS: shared component index

Paths link to current source; plain line references identify the inspected declaration.

| Capability | Canonical source and interface | Existing behavior to preserve |
| --- | --- | --- |
| Controls | [UI barrel](../../minion_hub/src/lib/components/ui/index.ts), lines 5–20 | Button, Badge, Card and Input come from `@minion-stack/ui`; Hub Select, Toggle, Spinner and Skeleton adapt shared controls. |
| Fields | [FormField](../../minion_hub/src/lib/components/ui/foundations/FormField.svelte), line 16 | Label, helper, error, disabled/required; child snippet receives IDs and ARIA props. FormFieldset and FieldGroup compose related controls. |
| Modal and drawer foundations | [Foundation barrel](../../minion_hub/src/lib/components/ui/foundations/index.ts), lines 1–20; [Dialog](../../minion_hub/src/lib/components/ui/foundations/Dialog.svelte), line 166 | Native dialog foundation, Sheet and DraggableWindow variants. Modal is a compatibility wrapper. |
| Confirmation | [ConfirmDialog](../../minion_hub/src/lib/components/ui/foundations/ConfirmDialog.svelte), lines 13–79 | Async confirmation, busy guard, failure state, dismissal blocked while pending. |
| Floating menus and selection | [UI barrel](../../minion_hub/src/lib/components/ui/index.ts), lines 9–24 | Dropdown, Popover, Combobox, Picker and PickerCombobox. SegmentedControl represents small exclusive choices. |
| Date ranges | [DateRangeControls](../../minion_hub/src/lib/components/dashboard/DateRangeControls.svelte), line 34; [date-range SDK](../../minion_hub/src/lib/components/dashboard/date-range/index.ts) | Controlled from/to, quick ranges, optional periods and time, per-user configuration; range and URL helpers. |
| Charts | [Chart](../../minion_hub/src/lib/components/charts/Chart.svelte), lines 12–44 | ECharts options, click/legend callbacks, merge-update option, accessible label and table, theme and reduced-motion handling. |
| Sparklines | [SVG Sparkline](../../minion_hub/src/lib/components/charts/Sparkline.svelte), line 2; [EChartsSparkline](../../minion_hub/src/lib/components/charts/EChartsSparkline.svelte), line 80 | SVG bins/color/glow API; separate lightweight ECharts renderer. Different engines may remain intentional. |
| Progress | [ProgressBar](../../minion_hub/src/lib/components/ui/ProgressBar.svelte), lines 5–59 | Determinate/indeterminate, label/detail, size; finite-bound normalization and value clamping. |
| Status | [StatusDot](../../minion_hub/src/lib/components/ui/StatusDot.svelte), lines 2–39 | Labeled active/attention/disabled states; plain running/thinking/idle/aborted dots. |
| Empty and error states | [EmptyState](../../minion_hub/src/lib/components/ui/EmptyState.svelte), line 8 | Title, description, icon, tone, compact variant and action snippet. |
| Chips and avatars | [Chip](../../minion_hub/src/lib/components/ui/Chip.svelte), line 11; [Avatar](../../minion_hub/src/lib/components/ui/Avatar.svelte), line 6; [EntityChip](../../minion_hub/src/lib/components/ui/EntityChip.svelte) | Shared presentation exists already; domain identity and tagging semantics remain separate concerns. |
| Graph engine | [Simulation](../../minion_hub/src/lib/components/overview/graph/simulation.ts); [renderer](../../minion_hub/src/lib/components/overview/graph/renderer.ts) | Overview and architecture topology already share simulation and rendering. |
| Page structure | [Foundation barrel](../../minion_hub/src/lib/components/ui/foundations/index.ts) | PageShell, PageBody, SectionShell, SectionNav and PublicTaskShell. |
| Tables | [DataTable](../../minion_hub/src/lib/components/data-table/DataTable.svelte) | Reserved to the concurrent table session. Reconcile its completed inventory before creating migrations. |

The governance skill's statement that Chip and Avatar have no primitives is stale against
the present files and barrel exports. Use current source when deciding whether reuse exists.

## AS-IS: evidence of bypasses and specializations

| ID | Source evidence | Classification and consequence |
| --- | --- | --- |
| C01 | [Campaign page](../../minion_hub/src/routes/(app)/socials/campaigns/+page.svelte), lines 74–94 and 126–135 | Custom range query construction, 30-day arithmetic, all-time end-date advancement and two native date controls bypass DateRangeControls. The all-time preset advances the displayed maximum by one day; reconcile the server's bound semantics before changing it. Table owner coordination required. |
| C02 | [Root Sparkline](../../minion_hub/src/lib/components/Sparkline.svelte), lines 2–49; imports in [workforce overview](../../minion_hub/src/routes/(app)/workforce/+page.svelte), line 7, [costs](../../minion_hub/src/routes/(app)/workforce/costs/+page.svelte), line 7, and [agent detail](../../minion_hub/src/routes/(app)/workforce/agents/[id]/+page.svelte), line 6 | A second generic SVG sparkline normalizes against min/max, while canonical charts/Sparkline scales from zero and smooths paths. Direct replacement changes the meaning and shape of trends. |
| X01 | [KpiSparkline](../../minion_hub/src/lib/components/reliability/KpiSparkline.svelte), lines 3–85 | Intentional statistical specialization: raw series, rolling mean, process mean and ±3σ band. Not equivalent to plain Sparkline. |
| C03 | [ExportDialog](../../minion_hub/src/lib/components/crm/ExportDialog.svelte), lines 46–72 | Fixed backdrop Button and role=dialog div bypass Dialog; the component has no Escape handler. CSV/XLSX buttons repeat SegmentedControl behavior. |
| C04 | [DeleteChapterModal](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/DeleteChapterModal.svelte), line 10; [ConditionModal](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/ConditionModal.svelte), lines 12–45 | Handwritten overlays repeat dialog infrastructure. ConditionModal also repeats labels, helper text, validation errors and inputs outside FormField. |
| C05 | [Builder DeleteConfirmModal](../../minion_hub/src/lib/components/builder/_builder-hub/DeleteConfirmModal.svelte), line 15; [RegistryAgentSheet](../../minion_hub/src/lib/components/builder/_builder-hub/RegistryAgentSheet.svelte), line 35 | Separate role=dialog overlays implement backdrop/Escape behavior instead of ConfirmDialog and Sheet. |
| C06 | [Brain detail](../../minion_hub/src/routes/(app)/brains/[id]/+page.svelte), line 50; [social settings](../../minion_hub/src/routes/(app)/socials/settings/+page.svelte), line 66; [gateway settings](../../minion_hub/src/routes/(app)/settings/gateways/+page.svelte), line 106; [contact detail](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte), line 334; [roles](../../minion_hub/src/lib/components/users/RbacRolesSection.svelte), line 100 | Native confirm calls bypass shared pending/error presentation. Destructive confirmation remains appropriate. POS and TeamTab examples are excluded from proposed ownership because of concurrent changes. |
| C07 | [FinanceSyncBadge](../../minion_hub/src/lib/components/finance/FinanceSyncBadge.svelte), lines 6–26 | Independent Zag progress machine and radial SVG repeat progress infrastructure. Horizontal ProgressBar is not a visual drop-in. Its local normalization is stronger than the badge's, but upstream finance state already clamps overflow: see qualification below. |
| C08a | [Workforce overview](../../minion_hub/src/routes/(app)/workforce/+page.svelte), line 252; [settings](../../minion_hub/src/routes/(app)/workforce/settings/+page.svelte), line 98; [costs](../../minion_hub/src/routes/(app)/workforce/costs/+page.svelte), lines 126–133 | Generic bars duplicate ProgressBar; costs has distinct current/projected bands requiring an extension. |
| C08b | [Portfolios](../../minion_hub/src/routes/(app)/workforce/portfolios/+page.svelte), line 81; [portfolio detail](../../minion_hub/src/routes/(app)/workforce/portfolios/[id]/+page.svelte), lines 106 and 122; [projects](../../minion_hub/src/routes/(app)/workforce/projects/+page.svelte), line 154; [project detail](../../minion_hub/src/routes/(app)/workforce/projects/[id]/+page.svelte), lines 259, 347, 365 and 389 | Bespoke empty paragraphs. Existing EmptyState compact still applies py-8 and may be too large for these sections; introduce an inline density. |
| C09 | [HostPill](../../minion_hub/src/lib/components/hosts/HostPill.svelte), lines 11–21 | Custom connection-status dot exists outside StatusDot. Shared plain-dot enum lacks connected/connecting/disconnected semantics; disconnected must not be silently mapped to idle. |
| C10 | [OverviewGraph](../../minion_hub/src/lib/components/overview/OverviewGraph.svelte), lines 218–396; [ArchitectureGraph](../../minion_hub/src/lib/components/reliability/architecture/ArchitectureGraph.svelte), lines 449–634 | Rendering and simulation are already shared; scene lifecycle and pointer/wheel plumbing remain candidates for a shared controller. Architecture-specific hover/drilldown must remain intact. |

### Qualifications and intentional differences

- [Finance state](../../minion_hub/src/lib/state/features/finance-sync.svelte.ts), lines 25–28,
  already clamps processed to total. C07 is a normalization/ARIA consolidation opportunity,
  not a reproduced current overflow crash. A shared model should also define negative,
  non-finite and zero-total behavior.
- Most native date inputs represent single dates in forms: [AppointmentForm](../../minion_hub/src/lib/components/scheduling/AppointmentForm.svelte),
  line 310; [PeopleView](../../minion_hub/src/lib/components/team/PeopleView.svelte), line 732;
  [TimeOffView](../../minion_hub/src/lib/components/team/TimeOffView.svelte), line 412.
  DateRangeControls does not replace them. A DateInput composed with FormField is a separate
  potential shared primitive.
- [ConsumptionGauge](../../minion_hub/src/lib/components/stock/ConsumptionGauge.svelte),
  [UnitDiagram](../../minion_hub/src/lib/components/stock/UnitDiagram.svelte) and
  [ShapePicker](../../minion_hub/src/lib/components/stock/ShapePicker.svelte) depict physical
  stock geometry; they are not redundant ECharts charts.
- ArchitectureGraph explicitly imports overview simulation/renderer at lines 29–38.
  Do not report separate canvas tags as proof of duplicate rendering engines.
- The ECharts search found initialization in Chart and EChartsSparkline, not independent
  initialization in the inspected route consumers. Local chart options are legitimate
  domain configuration unless they repeat reusable behavior.
- Custom SVG icons, decorative canvases, workshop physics and flow-editor graphs have
  different contracts from dashboard charts. Their presence alone is not a bypass.
- A role=dialog search includes legitimate foundations and specialized windows; a native
  date-input search includes legitimate forms. Candidate counts are not defect counts.

## TO-BE

Each component family has one maintained behavior contract. Domain components compose
that contract or document a required specialization. Shared extensions preserve existing
meaning: sparkline domain, progress forecasting, statistical bands and connection states.

Controls for reversible choices update immediately where their owning service supports
safe persistence and observable failure recovery. Shared components should not conceal
failed writes. Forms retain submit actions; destructive operations retain confirmation.
Component reuse alone does not provide cross-page realtime consistency: shared data,
mutation and invalidation contracts must be implemented alongside the service audit.

## DELTA and verification criteria

| Work unit | Proposed change | Evidence required before completion |
| --- | --- | --- |
| Dates, C01 | Use DateRangeControls and shared range/URL helpers after table owner finishes. | Same-day interval, last-day records, all-time extent, clearing a bound, back/forward navigation; preserve campaign hierarchy and export behavior. |
| Sparklines, C02 and X01 | Add explicit domain, interpolation and size options; migrate generic duplicate; retain statistical wrapper. | Constant, empty, single-point, negative and mixed-sign series; compare zero/min-max domains; retain all statistical overlays. |
| Dialogs, C03–C06 | Compose Dialog, Sheet, ConfirmDialog, SegmentedControl and FormField. | Keyboard Escape, focus entry/return, background inertness, dismissal, accessible names/errors, rejected mutation stays visible, double submit blocked. |
| Progress, C07–C08a | Share normalized progress model; add radial/forecast presentations when required. | Null, zero/invalid max, negative and overflow values; accessible progress semantics; current/projected values remain distinct. |
| Empty states, C08b | Add inline density and migrate embedded placeholders. | No layout inflation, stable empty/loading transitions, recovery action remains usable. |
| Status, C09 | Extend shared status model to express connection states. | Connected, connecting and disconnected retain distinct meanings and accessible labels; theme and reduced-motion behavior verified. |
| Graph controller, C10 | Extract lifecycle and gesture plumbing only after mapping specialized behavior. | Pan/zoom, hit testing, resize, unmount cleanup, theme updates, C4 drilldown and hover actions retain behavior. |
| Single-date forms | Evaluate DateInput with FormField rather than replacing with range controls. | Required/min/max constraints, keyboard entry, locale display and persisted date-only value preserved. |

Implementation must follow the repository lifecycle and the required UI design/token gates.
Run focused behavioral tests for the changed contract, then the applicable project checks
and local QA UI verification. This audit does not claim those checks passed for migrations
that have not been implemented.

## Audit coverage and limits

Read-only discovery used rg, source inspection and a Python scan over 677 Svelte source
files after excluding fixture/harness names and `/_test/`. That narrow scan found 21 files
with literal role=dialog/alertdialog and 11 files containing 17 literal type=date inputs.
Those counts describe search candidates, not confirmed violations or an exhaustive
component census. Consult the accompanying inventory for its separately defined scope.

No runtime path was exercised, no browser validation ran, and no source tests were run
because this work only indexed and documented existing code. Standards review checked
reuse targets and governance requirements; behavior review identified where drop-in
replacement would lose meaning. Actual runtime failure and migration safety remain
unproven until each work unit meets its verification criteria.
