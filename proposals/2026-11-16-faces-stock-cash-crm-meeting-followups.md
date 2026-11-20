---
id: 2026-11-16-faces-stock-cash-crm-meeting-followups
title: FACES meeting follow-ups — reconcile stock, correct valuation, and complete operations views
status: in-spec
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [logic, data, ui]
source: notion-41a40763da0880a28127e2dd674b82d8
---

# FACES stock, cash and CRM meeting follow-ups

## Execution request and current state

On November 16 the owner requested proceeding thoroughly with Spec Kit and EGM for every item.
Eight separate feature directories are being prepared and independently reviewed:

| Item | Spec Kit feature | State |
|---|---|---|
| F1 | [122: stock reconciliation](../specs/122-faces-stock-reconciliation/spec.md) | Planning / EGM review; no correction applied |
| F2 | [123: receipt valuation](../specs/123-faces-receipt-valuation/spec.md) | Planning / EGM review; no correction applied |
| F3 | [124: stock corrections](../specs/124-stock-correction-workflow/spec.md) | Planning / EGM review; no implementation |
| F4 | [125: readable movements](../specs/125-stock-readable-movements/spec.md) | Planning / EGM review; no implementation |
| F5 | [126: product consistency](../specs/126-booking-product-consistency/spec.md) | Planning / EGM review; no implementation |
| F6 | [127: operations agenda](../specs/127-faces-operations-agenda/spec.md) | Planning / EGM review; no configuration write |
| F7 | [128: accounts backlog audit](../specs/128-faces-receivables-audit/spec.md) | Planning / EGM review; read-only baseline observed |
| F8 | [129: CRM profiles](../specs/129-crm-profile-followups/spec.md) | Planning / EGM review; no configuration write |

Read-only database evidence subsequently confirmed these bounded observations:

- Faja M currently consumes FAJA-L through its recipe. Both reported tickets record Faja M,
  while their submitted stock movements issue FAJA-L. This is a variant mismatch, not a
  demonstrated incorrect choice by the user.
- The 89-unit receipt candidate stores 5474.58 as the unit rate, yielding 487237.62. Seventeen
  later stock issues used the affected item valuation. The intended receipt total remains
  conditional on the owner's receipt/source-document confirmation.
- The `pdv` section has no agenda page. CRM and event tags named Modelo exist separately.
- At the recorded snapshot the canonical pending-work count was 184: one paid service line
  awaiting scheduling plus 183 unbilled bookings. It is not a measurement of collectible debt.

Evidence: [initial database summary](../audits/2026-11-16-faces-followups/evidence/database-read-summary.json)
and [meeting-case summary](../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json).
Both record their observation times, guard and limits. Raw customer evidence remains private
under `.local/`. The meta-repo remote is public; this local business-data review package has
not been published. Data/security spec approval and owner merge gates remain in force.

## Source and evidence boundary

Read the summary and full transcript of [Revisión de stock, caja y CRM en el sistema](https://app.notion.com/p/41a40763da0880a28127e2dd674b82d8), last edited November 16, 2026. The transcript has recognition errors; names, item identity and contradictory quantities require record matching.

Inspected GitHub `origin/master` at `c6c2d5739572356239c4048c0f564f40b0768adc` after fetching November 16. All source links below pin that commit. The shared local Hub checkout has extensive unrelated edits and its HEAD is older; its working files are not the evidence baseline. Source inspection does not establish which version produced the reported records or what is deployed now. At the initial intake no production database, affected customer record or installed app had been accessed. The subsequent scoped read-only database observations are recorded above and in the execution report; they do not establish a deployed source version. No product fix or production mutation has been performed.

The original proposal-stage intake is preserved below. The execution request and linked Spec Kit/EGM ledger above record the subsequent planning work. Independent implementation review, approval for exact data repairs, merge, deployment and runtime verification remain separate lifecycle stages.

## AS-IS

### What the users reported

| ID | Evidence from meeting | Assessment |
|---|---|---|
| E1 | Advance payment on one day, appointment on another; user sees stock deducted before delivery and suspects a second deduction later. She spent four hours checking manually and says she had raised it a week earlier. | Urgent stock-integrity report; duplicate cause is a hypothesis until ledger rows are linked. |
| E2 | Isabel Gómez and a name transcribed as “Díaz Maciel Díaz” are tentative examples. Nayeli Quiroz and Alicia Lengua feature in the garment investigation. Nayeli's November 3 appointment displays a garment, but the user cannot find the expected deduction. | Resolve exact same-org IDs, product variants and dates. These are not four proven duplicate cases. |
| E3 | Faja M shows 19 versus 17 physically. L is described with 8 and 10, but the direction is unclear. User initially says M/L were entered backwards, then finds M recorded and retracts that explanation. An adjustment on day 22 also appears. | Preserve uncertainty. Do not force these balances or assume user error. Confirm the month/year of day 22. |
| E4 | Purchase/receipt involving 89 units has an inflated value; Nikolas says the total is 5474.58 for the 89. | Summary's “article 89” is unreliable. Neither an item ID nor the final inventory balance is established. The amount is a receipt total, not automatically today's inventory value. |
| E5 | User must click through opaque movement codes to understand what happened and repeatedly asks for names. | Confirmed usability request. Item names and source/customer context should be readable; stable IDs remain available. |
| E6 | A garment is visible in an agenda hover/pop-up but missing in the opened event view. Nikolas acknowledges that view needs adjustment. | Reported cross-surface product visibility gap, independent of whether stock actually posted. |
| E7 | PDB/PDV custom space combines sell, clients and marketing; agenda is missing. Requested for the operations user and Coli. | Explicit configuration request. Resolve actual space/user IDs and current configuration before changing it. |
| E8 | Receivables count discussed as 280 → 186 after free consultations were excluded. Remaining rows may be old unvalidated, unbilled or incomplete events. | Meeting-time numbers, not current telemetry. Historical operational cleanup needs classification, not mass marking paid. |
| E9 | Cash reportedly left open Thursday–Saturday when staff were absent; user says they otherwise close it daily. | Operational follow-up; no demonstrated close-register defect or agreement to auto-close. |
| E10 | Client tags such as “modelo” belong on the CRM profile; event tags describe individual events. User is shown existing tags and Editar Diseño. Nikolas mentions Instagram handles/fields and interface improvements. | Preserve existing profile tagging and verify discoverability. Exact missing fields and desired redesign are not settled. |
| E11 | App installed during call; user should use personal credentials rather than generic customer service. Coli should have a personal account too. WhatsApp is disconnected; user explicitly defers linking it. | Onboarding verification and deferred integration, not evidence of a new messaging bug. |

### Current source findings

1. [`pos.service.ts:797`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos.service.ts#L797) `resolveIssueLines` already skips ordinary services awaiting scheduling and booking-linked services; physical products, unlinked redemptions and bundles have separate sale-time rules. A blanket “stop all stock at payment” change would damage valid product sales.
2. [`pos.service.ts:1065`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos.service.ts#L1065) `postTicketStock` recovers entries under `('pos', ticketId)`. [`stock-accruals.service.ts:350`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock-accruals.service.ts#L350) `realizeAccruals` finds entries by its supplied source/sourceId. Per-source idempotency alone does not prove cross-source ownership for historical POS/booking records.
3. The [`completion route`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/scheduling/bookings/%5Bid%5D/complete/%2Bserver.ts) commits completed status before attempting stock realization; failures return `ok: true` with `stockWarning`. Therefore “completed” does not prove consumption posted. Check warnings, drafts, open accruals and ledger, including the grouped completion handler.
4. [`stock/items/[id]/PageBody.svelte:335`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/items/%5Bid%5D/PageBody.svelte#L335) defines the ledger columns; the entry cell renders `ENT-{entryHumanId}` at line 1072. The page heading already names the item. The gap concerns movement/source comprehension as well as item labels; confirm the exact screen before specifying columns.
5. [`entry-lines.ts:54`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/entries/new/entry-lines.ts#L54) already distinguishes unit and total rate modes and converts total ÷ quantity server-bound input. [`stock.service.ts:679`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.service.ts#L679) permits edits only to draft entries. Inspect the actual persisted receipt and mode; adding another rate toggle is not an established fix.

## TO-BE

Payment stays on its actual receipt date and appointment stays on its scheduled date. Each actual fulfillment has one auditable stock effect, with the correct item, variant, quantity and UOM. Reservations, payments, expected consumption and posted consumption remain distinguishable. Physical products handed over at sale retain their valid sale-time deduction.

The operations user can reconcile named movements without opening each code. Event hover and detail views agree on products and consumption state. Both intended users can open the agenda from their custom space, subject to existing permissions. CRM profile tags persist independently of event tags.

Historical corrections preserve source records and provide an explicit before/after report. Do not equate a correct receipt total with current remaining stock value: later consumption and moving-average valuation must be evaluated.

## DELTA and acceptance ledger

Priorities below are investigation recommendations; they are not claims of reproduced defects.

| Item | Priority / type | Exact work | Completion evidence |
|---|---|---|---|
| F1 | P0 / investigation, prevention and repair | Match affected appointments, payment dates, ticket lines, package/grant/redemption links, stock accruals, drafts, submitted entries, cancellations, adjustments and ledger rows. Explain duplicate, missing and display-only cases separately. Implement the proven ownership/retry repair and propose historical corrections. | Synthetic advance-payment D1 → appointment D2 regression; split payments; ordinary service and package; M/L products and UOM; repeated/concurrent completion/retry; cancellation/rescheduling/void. One net issue per delivered unit; payment date unchanged; linked records and bin/ledger reconciliation for each approved real correction. |
| F2 | P0 / data correction | Identify the receipt for 89 units and verify its invoice total S/5,474.58, stored unit rate, currency and item. Produce a dry-run correction showing all later valuation effects. | Receipt amount and quantity agree with source document; four-decimal unit rate approximately 61.5121; cent rounding yields 5474.58. Recalculate downstream value/COGS where required, preserve stock quantity, and report current remaining value separately. Approved repair is idempotent and bins agree with ledger. |
| F3 | P1 / correction workflow | Define a supported way to correct a submitted receipt or past consumption, with reason, permission and audit trail. Evaluate existing cancellation/replacement/reposting mechanisms before adding a new path. | Wrong M/L changes once to the intended variant with an auditable reverse/replacement; retries cannot duplicate it; original record remains discoverable; quantity-only and value-only mistakes are handled; payment amounts and dates stay unchanged. Closing-period policy is explicit rather than an invented cutoff. |
| F4 | P1 / usability | In the reported stock tables show item/variant name and understandable source/counterparty context, with code as secondary reference and a working detail link. | User can identify what and whose movement it is without opening every entry. Item detail and global entries/ledger surfaces are checked separately; search supports names and codes; tenant/field masking applies to added customer labels. |
| F5 | P1 / consistency | Trace the booking projection behind garment visibility; show the same product/variant/quantity in hover and opened event, distinguishing expected from posted consumption. | An appointment with one Faja M and one without a product render consistently in both surfaces. A stock-post failure is visible and retryable without claiming stock has posted. |
| F6 | P1 / configuration | Resolve the PDB/PDV custom space, operations user and Coli; add the existing agenda view alongside sell, clients and marketing. | Each personal account sees the agenda after reload; navigation and authorization work; no duplicate business records or broader permissions are introduced. First verify whether the in-call promise was already completed. |
| F7 | P2 / receivables audit | Classify remaining old rows as genuine debt, paid but unlinked, free, cancelled/no-show, unused reservation or stale lifecycle state. | Row-level explanation and totals reconcile; free appointments remain excluded; paid rows are linked without collecting twice; true debt remains collectible; no bulk paid/completed mutation from transcript numbers. |
| F8 | P2 / CRM follow-up | Verify personal-account profile tagging, persistent “modelo” classification, layout discoverability and the request to record Instagram handles. Specify missing behavior only after checking existing fields. | Profile tag survives reload and is independent of event tags; intended staff permissions work; existing Instagram fields are reused or a specific gap is documented; user-facing labels make the distinction clear. |

## Existing work to reconcile before implementation

- [POS package semantics](2026-10-12-hub-pos-package-semantics.md) records a package's own recipe overlapping its included service recipe. That is a separate plausible duplication mechanism, not a proven explanation for this meeting. Check current mappings and cleanup status; do not assume its historical production notes are current.
- [Duplicate booking charge guard](2026-11-03-hub-pos-no-server-guard-against-recharging-a-booking.md) concerns billing duplication. Check current source before treating this older proposal as an outstanding defect. Duplicate payment, duplicate consumption and duplicate display are different outcomes.
- Preserve prior inventory true-ups and linked invoice consumption when planning F1/F2. Historical backfill boundaries require live verification; replaying all invoices can duplicate consumption already incorporated into an adjustment.

## Operational follow-ups and deferred scope

- Cash: inspect the actual open/close history and staff workflow if the discrepancy persists. Do not add automatic closure or impose a midnight rule from this discussion.
- App/accounts: verify the installed app works for the operations user's personal account. The owner confirmed on November 16 that Coli is not provisioned yet; verify Coli after separate account provisioning. Installation was demonstrated; restart/login/monitoring behavior was not verified in this investigation. General performance claims are unproven.
- WhatsApp: explicitly deferred by the user. Linking requires the owner and phone, plus a discussion of their backup concern. Do not enable, relink, send messages or promise historical chat recovery under this proposal.
- Price-field issue: transcript explicitly corrects an apparent inability to type the price; do not file it as a confirmed defect. A later vague “blocks” comment has no deterministic reproduction; retain only as context if a reproducible report arrives.
- New catalog item creation was demonstrated, not established as broken. Password-strength reduction and unrelated visit scheduling are outside scope.

## Delivery sequence and completion criteria

1. Establish the data timeline and F1/F2 dry-run reports; confirm exact record IDs and receipt evidence. Give the user a comprehensible reconciliation rather than requiring further manual arithmetic.
2. Write slice-specific specs and complete two review passes. Data/security-tagged slices retain human approval and merge gates. Reproduce the actual failure in local QA before editing product code.
3. Implement F1/F2 prevention and approved corrections; complete F4/F5 visibility and F6 configuration so staff can verify the outcome. Scope F3 by existing correction capabilities; F7/F8 follow afterward.
4. Validate UI changes with design/token gates and browser evidence on local QA. Verify the actual release and affected records before reporting that user stock now reconciles.

This investigation introduces no product-code changes. Existing source `TODO(handoff)` comments remain untouched; the backlog above records investigative and product follow-ups without adding speculative defect comments to unrelated working files. None of F1–F8 is marked fixed, deployed or runtime-verified.


## Existing valuation-display follow-up outside F4 movement scope

Status: **open; separate scoped spec and owner approval required before code**. F4's movement projection fixes raw unverified-denomination display only in its selected movement cells/export. It does not qualify historical stock denomination for other stock valuation displays.

AS-IS evidence at pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`: `src/lib/utils/format.ts:75` defaults formatMoney to PEN; `src/routes/(app)/stock/items/[id]/PageBody.svelte:1032` formats the item-bin rate with fmtMoney and its valuation-total section also uses that helper. `src/routes/(app)/stock/PageBody.svelte:26` formats the total-valuation KPI, while lines69/72 format the valuation chart axis/tooltip as money. The stock rows do not establish historical denomination merely through a current display currency. These callsites remain unchanged in this documentation-only task and are not covered by F4's completed-fix claim (there is no completed product fix).

TO-BE: choose a reviewed provenance contract for those valuation surfaces, or explicitly display unverified stock scalars with the proper current permission/availability state. Billing currency must not be relabeled as historical stock currency. Preserve exact stored values, charts' actual scope, stock arithmetic, original history and independent source permissions.

DELTA/qualification: a future scoped implementation must inventory these and any other relevant existing valuation callsites, select the denomination/unknown rendering contract, test contrary billing/display currencies and actual omitted/denied states, and qualify browser/route-data behavior. It must not silently broaden F4's current movement diff into a global formatter or ledger rewrite.

Required source handoff annotation when that product edit is authorized: `TODO(handoff): qualify historical stock denomination before currency formatting; see proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md, Existing valuation-display follow-up.` Place it at each affected source callsite that remains open. **No such code comment has been inserted yet** because owner approval before product code is still pending under the active constitution; this proposal and F4's valuation-display contract retain the exact sites and the deferred source-annotation requirement. No unimplemented follow-up is presented as verified or released.

## F8 open ends (implementer, 2026-11-17)

- `GET /api/crm/contacts?fresh=1` is an uncached whole-org rank with no rate limit (TODO(handoff) at the route).
- Unreviewed read paths that may still expose raw identity values to masked principals: gateway `query`, `search-crm-conversations`, `channel-identities`, and the contact timeline `sender_handle`.
- No mounted test for the customers merge host (latch, `loading` flag after fresh read) or `page.instagram.mounted.test.ts`: DataTable virtualization hid the merge dialog in happy-dom (TODO(handoff) in `customers/PageBody.svelte`).
- Native suite T017/T021/T012 blocked on F7 `installOperatorNativeAuthFixture`.
- Profile editor DNI/dob keys preservation is tested only at the helper level (`pickStoredKeys`), not through the mounted editor.
