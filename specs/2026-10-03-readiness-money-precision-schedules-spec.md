---
id: 2026-10-03-readiness-money-precision-schedules-spec
title: Exact decimal boundaries and reconciled payment-plan schedules
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Exact decimal boundaries and reconciled schedules

## 0. Product

A cashier entering 1.005 must get the declared 1.01 result, independently of binary
floating-point multiplication. Client and server must agree on the ticket's money.
A payment-plan schedule must account for its entire principal, and a partially paid
installment must suggest only the amount still owed.

This bounded slice addresses HS-028 and HS-017. The user approved every finding;
local implementation is authorized after the two review passes. Production data
migration and merge remain later gates. This is a product arithmetic policy, not
an assertion about legal tax treatment or an exchange-rate recommendation.

## Out of scope

Tax emission semantics, FX policy, stock valuation, grant residual persistence,
transactional overpayment prevention and historical data repair remain separately
tracked findings. No incidental change to those contracts belongs in this slice.

## AS-IS

- `src/server/services/pos-accounts.logic.ts:15` and `pos.service.ts:124` use
  `Math.round(n * 100) / 100`. `1.005` becomes `1.00`; negative ties have an
  asymmetric direction. Several frontend checkout helpers independently convert
  totals/tenders with the same binary multiplication.
- `computeTicketTotals` multiplies quantity and unit price before rounding, then
  accumulates Number values. Its client callers can repeat that arithmetic.
- `createPlan` validates positive schedule rows and a date-shaped regex, but never
  reconciles the schedule sum with principal. An impossible date can pass.
- `parseDueSchedule` silently drops invalid legacy rows; `nextDueInstalment`
  returns the full installment after partial payment, and the checkout prefill
  uses that whole amount even when less remains.
- Only client-ledger `amount`, plan `totalAmount` and grant `unitValue` use
  numeric(12,2); ticket, line and payment fields use unconstrained numeric. A
  generic scale helper must not imply that persistence supports a different
  business currency scale. Current POS business adapters remain scale 2.
- The open Hub PR #340 (commits `79a0175a`, `29eea501`) is not in this checkout's
  ancestry. It covers related booking/void flows; it is evidence to review for
  later transactional work, not silently imported into this slice.

## TO-BE

1. One pure browser/server decimal module owns parsing, exact sum/product,
   quantization, integer-minor-unit allocation and checked numeric conversion.
   Inputs remain decimal strings until the boundary; Number input means its
   finite canonical decimal spelling, never a promise to recover precision
   already lost before entry.
2. Quantization rounds an exact halfway remainder away from zero. Negative zero
   serializes as zero. No epsilon heuristic or binary multiplication determines
   a tie. No NaN, Infinity, malformed text or overflow becomes monetary zero.
3. Ledger amount, plan principal and grant unitValue adapters enforce the exact
   numeric(12,2) range after scale-2 quantization. Ticket/line/payment fields do
   not gain this arbitrary bound: their compatibility Number outputs require
   safe integer minor units and a canonical decimal round-trip. The pure helper
   accepts scales 0 through 6 without changing persistence currency support.
4. A new nonempty due schedule contains at most 365 positive, cent-exact rows
   with real Gregorian date keys, in stable ascending date order, and sums exactly
   to the normalized principal. Missing/null/empty means no schedule; existing
   no-schedule behavior remains available. Sub-cent rows are rejected rather than
   silently rounded into a different agreement. Equal dates are allowed and
   retain input order. There is no auto-charge.
5. Reading a legacy invalid or mismatched schedule preserves the plan and exposes
   a typed `scheduleIssue`. It does not synthesize a repaired financial history.
   `nextDue` is null for an invalid schedule; UI says the schedule needs correction
   and retains the separately computed outstanding balance.
6. For a valid partially paid schedule, nextDue.amount is the unpaid remainder
   of the next row, capped by the plan's remaining principal. It becomes null
   when the principal is paid. Checkout never prefills a negative or excess
   amount for a settled/overpaid legacy plan.

### Rounding table (normative)

| Decimal input | Scale | Result |
|---|---:|---|
| 1.005 | 2 | 1.01 |
| -1.005 | 2 | -1.01 |
| 1.0049 | 2 | 1.00 |
| -0.004 | 2 | 0.00 |
| 2.5 / -2.5 | 0 | 3 / -3 |
| 1.2345 / -1.2345 | 3 | 1.235 / -1.235 |
| 0.1 + 0.2 | 2 | 0.30 |
| 0.335 × 3 | 2 | 1.01 |
| 9999999999.99 / -9999999999.99 | 2 | accepted signed numeric(12,2) boundary (positive-only domain rules still apply) |
| 9999999999.995 / -9999999999.995 | 2 | rejected after rounding exceeds numeric(12,2) |

The generic integer allocator conserves positive and negative totals exactly,
divides by truncation toward zero, then assigns one minor unit with the total's
sign to the first `abs(remainder)` slots in stable order. Thus -0.05 split by 2
is [-0.03, -0.02], and 0.05 is [0.03, 0.02]. It never expands an unbounded slot count. Grant persistence and session-specific residual ownership
are a separate HS-016 slice; merely adding the allocator does not close HS-016.

## DELTA

### M1. Decimal core and POS adoption (HS-028)

Add `src/lib/money/decimal.ts` with no server/environment/browser dependencies.
Use bounded coefficient/exponent parsing and BigInt integer arithmetic (or an
already qualified decimal dependency if one is discovered before implementation).
Initial contract: strings <=80 characters, <=40 significant digits, decimal
exponent magnitude <=18, scales 0..6; reject unsupported values before allocating
large powers or loops. Allocation count is an integer in 1..10000; a sum accepts 0..10000 operands.
Internal arithmetic and minor-unit formatting cap intermediate coefficients at
128 digits; no caller-supplied exponent can request an unbounded power. Public Number
conversion requires exact safe minor units and validates finite output. Export
only the operations production callers use. The following grammar is normative:

- Trim surrounding ASCII whitespace only; reject remaining whitespace, empty
  text, separators, hexadecimal, underscores and non-ASCII digits. A leading
  `+` or `-` and leading zeroes are allowed. `.5`, `1.` and exponent forms
  `1e2`, `1E+2`, `1e-2` are accepted. Exponent digits must represent an integer
  with magnitude <=18; raw input length is checked before trimming. Negative
  zero is canonical zero. The coefficient digit budget counts every digit,
  including leading/trailing zeroes, so padding cannot bypass bounds.
- Decimal inputs are string or finite number. Numbers are interpreted as
  `String(value)`; null/undefined/boolean/object are invalid. Export a typed
  `DecimalInputError` with reason `invalid_decimal`, `decimal_limit`,
  `invalid_scale`, `invalid_count` or `unsafe_number`. Core operations throw it;
  UI drafts catch it into an explicit invalid state. This is never a zero.
- A checked unrounded Number conversion must round-trip back to the same exact
  decimal value through String(number); a checked money Number conversion must
  round-trip to identical integer cents. Safe integer cents alone are not a
  promise that every cent near MAX_SAFE_INTEGER round-trips after division.
- Keep the existing numeric JSON contracts for these POS routes. Client raw
  input remains text until checked conversion. Preserve exact decimal values
  such as 0.335 and 1.005 until line multiplication; do not quantize unit price
  before multiplication. Over-precise text that cannot round-trip is an invalid
  draft, not silently truncated. Direct callers' existing finite Number inputs
  retain their canonical spelling interpretation. Database writes use canonical
  fixed-scale strings. No breaking wire union is introduced in this slice.

Mutation error mapping is stable: quantity parser/range failure => `invalid_qty`;
price parser/range failure => `invalid_amount` (valid nonpositive price continues
`zero_price` except legitimate zero redemption); line/order discount failure =>
`invalid_discount`; payment/principal/ledger parser, range or rounded-zero failure
where disallowed => `invalid_amount`; cash-tender failure => `invalid_tender`;
schedule structural/row/range/sum failure => `invalid_due_schedule`. The core
reason may be attached as safe structured details, with no customer values in
logs. Existing HTTP structural Zod failures keep the documented validation error
shape; valid JSON numeric fields are domain-validated before mutation. Service
entry points enforce the same rules for non-HTTP callers.

For stored data, replace `toAmount`'s fallback-to-zero with strict parsing. An
invalid stored required monetary value becomes `PosError` code
`invalid_stored_amount`, and the existing API error path visibly fails that
financial read. A genuinely empty ledger sums to zero; SQL `sum` over no rows
may explicitly coalesce to zero. Invalid/null existing rows cannot masquerade
as zero. Schedule invalidity is handled by the separate advisory classification
below and must not fail otherwise valid principal/balance reads.

Use the core in POS account balance/progress, ticket line multiplication, subtotal,
discount/payment comparison, reversal and checkout tender/schedule allocation.
Do not first multiply/sum Number operands and then ask the helper to repair their
result. Convert each operand independently, compute exactly, and quantize once at
the documented line/subtotal/payment boundary. Existing wire/output number shapes remain compatible using the checked
conversion above; database decimal strings remain canonical. No unconstrained
ticket field receives the narrower numeric(12,2) policy by implication.

Inventory all production consumers of `computeTicketTotals`, `round2`,
`tenderedCents`, `capDiscount`, `fitTendersToTotal`, `planProgress`, `ledgerBalance`
and `planDueSchedule`. Characterize public invalid-input contracts. UI helpers may
return a deliberate disabled/empty draft result; domain mutation helpers reject
invalid values with stable `PosError` codes before a write. Do not turn unknown
legacy data into a plausible zero balance. Preserve read error visibility.

Explicit client adoption includes `PlanOpenForm.svelte`, `SellCart.svelte`,
`PaymentPanel.svelte`, `PaymentStep.svelte`, `/pos/sell/+page.svelte`,
`ClientAccountDrawer.svelte`, `BookingDetailDrawer.svelte` and
`checkout-money.ts`. Price, quantity, discount, payment and tender event handlers
must feed raw text into checked conversion; intermediate invalid drafts retain
visible entered text, expose field/form error, and disable submission. Replacing
an invalid entry with zero or stale previous valid money while permitting submit
is forbidden. `SellCart.lineCents` uses the same exact-product-once boundary as
the server. The page's total/paid/credit guards share the same integer units.

Comparisons are exact at each boundary: plan isPaid iff paidMinor >=
principalMinor (99.99 is not 100.00); tender sums equal ticket totalMinor exactly;
for a same-currency balance, credit is sufficient iff balanceMinor >= drawMinor; cash tenderedMinor must be
>= amountMinor. Remove the 0.01/0.005 tolerances. For a line, grossMinor = quantize(exact(qty)*exact(unitPrice),2). A discount
must be cent-exact and nonnegative, and discountMinor <= grossMinor. The line
total is grossMinor - discountMinor; never round unit price before multiplication
and never subtract a discount from an unquantized gross. For gross 1.005, the
displayed gross is 1.01: discounts 1.00, 1.01 and 1.02 respectively yield 0.01,
0.00 and invalid_discount. A sub-cent discount is invalid_discount. This policy
permits a full displayed discount without creating a negative half-cent result. The order
discount is quantized once and cannot exceed summed line cents. UI discount validation uses the same limit and arithmetic. Replace the current
`capDiscount` silent-rewrite behavior at input handlers with a typed validation
result; a helper computing the maximum display value is not an input sanitizer.
Raw 1.02 and sub-cent discount drafts stay visible and block submission when the
gross is 1.005. Mounted tests must assert that text, error and disabled submit,
then the successful 1.01 correction. Valid client previews equal server results.
The existing shift expected-cash path is mandatory M1 scope: migrate
`computeExpected`, `paymentsByMethod`, `shiftSummary`, opening/closing floats and
shift read DTO conversion coherently. Test exact opening float + cash payments
minus change and count/close deltas. This scope cannot be left as a vague follow-up
while claiming HS-028 complete.

### M1a. Currency scale and stored-value conversion boundaries

This slice enforces the currently persisted two-minor-unit POS policy rather than
silently applying it to every currency code. Add a pure currency policy boundary:
trim/uppercase input, require exactly three ASCII letters, membership in the
runtime-supported ISO currency list (`Intl.supportedValuesOf('currency')`), and
resolved standard currency fraction digits exactly two. Unknown codes and ISO
zero-/three-minor-unit currencies fail with `unsupported_pos_currency`. The
configured runtime ICU policy and representative PEN/USD/EUR acceptance,
JPY/KRW/KWD/BHD rejection are characterized in browser/Node tests. The arithmetic
core itself remains currency-independent with explicit scale 0..6 for other
future adapters; this does not claim production support for those currencies.

Enforce policy in `PUT /api/pos/settings`, POS ticket/shift creation and settlement,
manual credit adjustment, plan creation and package grant monetary writes,
including direct service entry points. Plan/topup currency overrides cannot bypass
it. Existing settings read must remain available to correct an unsupported legacy
configuration: return its canonical value plus a typed currencyIssue rather than
silently coercing to PEN/USD. The settings read returns the server-authoritative supported currency list. The
settings form displays currencyIssue and restricts new selections to that list;
browser ICU must not independently decide admissibility. Business operations and financial
DTO reads involving an unsupported legacy currency return a visible stable
`unsupported_pos_currency` error without changing historical values. This is a
compatibility change requiring a read-only pre-release inventory of distinct
stored POS currencies; unknown/unsupported rows must be explicitly qualified,
not relabeled, rounded or silently skipped. Local fixtures prove the behavior;
no production currency rewrite is authorized.

Exact credit comparison in M1 is an arithmetic guarantee on same-currency input.
The separate HS-009 slice must isolate balances by currency and qualify legacy
mixed-currency data; this spec does not claim the nominal mixed-currency defect is
fixed by exact cents. Preserve that explicit dependency in the final finding ledger.

Inventory every monetary DTO projection before coercion: `listSellables` stored
`unit_price`, `listClientAccounts` balance/principal totals, shift rows and
`paymentsByMethod`/`shiftSummary`, plan/grant/ledger reads and checkout settings.
Replace raw `Number(storedDecimal)` before any summing/rendering with the checked
canonical round-trip conversion. Required malformed/null/unsafe stored decimals
return `invalid_stored_amount`; they never become zero or a nearby valid price.
The regression corpus must carry stored `90071992547409.91` through the sellable
projection and assert explicit rejection instead of displaying/reusing
90071992547409.9. Ordinary stored 0.335 remains exact through cart and server line
math. SQL aggregate values are checked before Number DTO conversion as well.

`/api/gateway/actions/pos-sale` is an explicit preview/submit consumer: wrap its
money computation in the same domain error mapping as submit, so decimal/range
failures return stable PosError responses rather than an uncaught 500. Preview
and confirmed submission must use the same validation, price and discount policy.

This step includes client/server checkout parity. It does not change emitted tax
XML, legal document policy, valuation order or historical FX; inventory those
other decimal sites in the review and route them to HS-025/MR-OP-003 or a dedicated
emission compatibility step. No existing golden XML may change as an accidental
side effect of a utility import.

### M2. Schedule validation and honest collection (HS-017)

Extract schedule validation from `createPlan` into a pure module beside the
account math. Write validation rejects impossible dates, nonfinite/zero/negative
rows, sub-cent row amounts, >365 rows and any under/over-sum. It canonicalizes
ordering but never fills a missing principal residual on the server. The client
schedule builder uses the exact allocator, so ordinary generated schedules pass.
Keep the client builder's existing calendar-date behavior outside this money
slice; organization-date migration remains with the temporal/calendar workstream.

Add the same bounded schema shape to POST /api/pos/plans. Service-level validation
remains mandatory for non-HTTP callers. Validation finishes before `withOrgCore`
starts mutation. A linked booking failure still rolls back the plan insert.

`PlanDetail` adds a nullable typed `scheduleIssue` (`invalid_rows`,
`principal_mismatch`, `too_many_rows`) and calculates nextDue only from a valid
schedule. Classification precedence is: null/undefined/[] => canonical null, no
issue; non-array => invalid_rows; array length >365 => too_many_rows; otherwise
any invalid Gregorian date/row/amount (including sub-cent, nonpositive or
unrepresentable amount) => invalid_rows without dropping any row; otherwise
exact sum != principal => principal_mismatch; otherwise stable ascending dates
with input-index tie break, no issue. Invalid legacy rows remain visible through
safe error copy in ClientAccountDrawer, BookingDetailDrawer and /pos/sell; their principal/paid/remaining values remain available.
The UI must not claim no amount is due simply because the schedule is invalid.
A correction workflow is not silently invented; the existing manual collection
option may use the positive remaining balance with the schedule warning.

`instalmentPrefillAmount` returns `number | null`: null for invalid/nonpositive
remaining; for a valid positive nextDue it returns min(nextDue, remaining); for
no schedule or an invalid schedule it returns positive remaining, accompanied
by scheduleIssue warning for the latter. `/pos/sell` Account type carries
scheduleIssue; its openPlans list, pending-plan effect, action buttons and
`addInstalment` refuse nonpositive/overpaid rows rather than creating a zero or
negative cart line. All three UI consumers distinguish no schedule, invalid
schedule, and fully paid; invalid schedules still permit intentional manual
collection of the positive balance.

For paidToDate=40, schedule [60,40], principal100: nextDue.amount=20. At paid=60:
nextDue=40. At paid=100: null. At legacy paid=110: nextDue null; progress still
reports the -10 overpayment for audit rather than clamping history, while the
payment action is disabled. Preventing new overpayment is HS-013's transactional
slice, not established by the read calculation.

## Blast radius and verification

| Boundary | Required proof |
|---|---|
| exact decimal core | independent BigInt oracle/property corpus; positive/negative ties, exponent bounds, malformed and nonfinite values, negative zero, max value and scale 0/2/3 |
| line × quantity − discount | adversarial decimal operands, fractional quantities, half-cent gross with partial/full/excessive and sub-cent discounts, multiple lines; client preview equals server persisted subtotal/total |
| payments/credit | same-currency sums and comparisons use integer cents; no tolerance admits a one-cent underpayment; prior reversal restores exact balance |
| allocation | exact sum equals normalized total for positive/negative corpus and counts; no dropped residual; bounded counts fail before loop |
| plan creation | under/over-sum, impossible Gregorian date, zero/negative/sub-cent/nonfinite rows rejected before DB write; no schedule still succeeds |
| plan reads | legacy invalid/mismatch stays explicitly flagged; partial next installment and settled/overpaid cases truthful |
| UI | mounted account/plan behavior renders schedule warning; prefill <= positive remaining; shared design/token checks |
| native DB | actual createPlan round-trip and rejected transactions under owned PostgreSQL; no production data, report admitted names added to manifest |
| neighbors | existing POS tickets/packages/accounts/checkout/shift/assistant-preview/emission golden suites pass; no blanket expected-value replacement |

Tests asserting `round2(1.005) === 1.00`, lost allocation residuals or excessive
prefill are replaced with normative behavior, never deleted without replacement.
Use a deterministic independent integer oracle rather than computing expected
values with the same new function. Do not add tests that merely inspect source.

## Review and release

Standards pass 1: Sol hub_client_fixes approved the final decimal, discount,
schedule and M1a currency/UI contracts after corrections. Spec pass 2: Sol
gateway_fixes approved the full amended contract after enforcing currency scale,
stored DTO conversion, mandatory shift arithmetic and assistant preview errors.
The settings UI consumes the server-authoritative currency list. Root may now
implement M1 and M2 as separately reviewed commits; all local qualification and
release gates remain required. No production write or historical money rewrite
is authorized by this local slice.
