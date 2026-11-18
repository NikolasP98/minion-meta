# Implementation Plan: FACES receivables and pending-work audit

**Branch**: Not created | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

## Summary

Implement an operator-only read-only row audit explaining the two canonical pending-work components, settlement/funding evidence, historical uncertainty and per-currency financial facets. Generate exact repair proposals for owner review; no apply flag, payment/stock mutation or mass lifecycle cleanup. Preserve reader differences as residuals.

## Technical Context

**Language/Version**: strict TypeScript under Hub Bun; application service aliases use the qualified Vite SSR loader selected in contracts/operator-bootstrap.md, after target/principal admission.
**Primary Dependencies**: PostgreSQL/Drizzle, org transaction scope, pos/accounts canonical identity and eligibility, existing money decimal parsers, a nonlocking fresh RBAC snapshot adapter.
**Storage**: Read-only PostgreSQL; local protected JSONL subjects, summary JSON, proposal JSON and SHA-256 manifest. No new DB tables.
**Testing**: Vitest pure classifier and runner tests, real SQL integration using synthetic multi-org fixture.
**Target Platform / Project Type**: Hub operator CLI and internal server service; no page, route or nav addition.
**Performance Goals**: Stable keyset batches (default 250, configurable 1–1000), constant-memory output; query/statement timeout aborts the entire run with incomplete status. No partial success or fixed latency guarantee.
**Constraints**: One repeatable-read read-only snapshot for all subjects/control totals, org/profile scoped app_ledger role, no credential logging, no date-driven writes.
**Scale/Scope**: One owner-approved organization; all-date controls, optional explicit date cohort; no all-tenant mode.

## Constitution Check

Pre-research: specify→plan→tasks through private F7 driver; anchored AS-IS/TO-BE/DELTA; future feature PR against registry Hub master; no UI/new web surface, so design/token and page route gates not applicable unless scope changes; data spec approval and human merge pending. Post-design: all principles covered, no waiver. Review results are recorded under egm/; owner approval remains pending. Product implementation remains blocked by pending owner spec approval. Production read execution needs exact authorized scope, not a general feature plan.

## Project Structure

[implementation-inventory.md](implementation-inventory.md) is the single complete list of Hub-relative file actions (create, modify, unchanged dependency) for this slice. In outline: `src/server/services/pos/accounts/audit.ts`, `audit.logic.ts` and `audit.types.ts` hold the transaction-accepting inventory, the pure classifier/canonicalization and the exact DTOs; `scripts/faces-receivables-audit.ts` is the operator CLI; `scripts/lib/operator-principal.ts`, `scripts/lib/operator-service-loader.ts` and `scripts/operator-bootstrap.smoke.ts` are the shared operator bootstrap; `rbac.service.ts`, `src/server/auth/active-operator-principal.ts` and the authority-bridge migration are the authority foundation; the native fixture, QA manifest/report and UUID helper changes complete the list. Existing canonical readers (`pos/accounts/unbilled.ts`, `list.ts`, `resolve.ts`, `identity-key.ts`, `pos-accounts.service.ts`) are reused read-only; their predicates do not change.

Docs live in this feature directory. A later paid-link repair is a separate approved slice and executable design, not an unchecked flag hidden in this script.

## Implementation slices

### S1 — Complete row inventory and controls (US1)

CLI requires explicit `--org`, the exact approved scope/evidence contract, private output directory and optional date cohort. The authoritative interval is booking.start_time for booking subjects and parent ticket.submitted_at for paid-unscheduled lines, inclusive --after/exclusive --before local midnight; approved-scope containment and controls are fully specified in contracts/audit-cli.md. Concrete principal verification follows contracts/audit-cli.md using the existing GoTrue access token and auth.getUser before the business snapshot; a supplied profile ID alone never proves caller identity. Verify approved principal/org binding and current active membership plus fresh pos:view and finance:view authority. For the financial export require unrestricted organization review (no owner-only scope or sensitive-field restriction); otherwise exit 2 before inventory. There is no scoped-report mode. Resolve capabilities in the same snapshot using a deliberately nonlocking query adapter sharing the existing fresh resolver role semantics; the current `resolveFreshCapabilitiesInTransaction` uses `FOR SHARE` and MUST NOT run in a read-only transaction. Implement `resolveFreshCapabilitiesReadOnlyInTransaction(tx,orgId,profileId):Promise<FreshCapabilitySnapshot>` with the exact shared return alias and role composition in contracts/audit-cli.md, and test parity, preserving the locking default for existing callers; no fabricated request locals. Credentials come only from approved resolver/environment, never CLI args or output.

Own a dedicated DB connection/transaction outside ambient web tx. Start `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` before business queries, apply org/profile GUC and app_ledger role, assert current org/role/read_only and capture transaction timestamp + snapshot. SQL can run SET LOCAL/SELECT only; no mutation functions/advisory workflows from normal service wrappers. All inventory and totals use this CoreTx; reuse canonical predicate/query fragments rather than invoking wrappers opening separate transactions.

Create complete keyed inventories: (a) paid service lines with no booking/plan from non-void/non-voided tickets, including identityless lines that badge can count; (b) eligible unbilled bookings with required identity; (c) review-only excluded/old booking cohort showing free/inactive/funded/linked facts; (d) relevant wallet balances/plans by currency. Use tuple key `(subjectKind,id)` and stable ID keyset pages inside same snapshot. Report complete U totals, C and U-minus-C separately (terms in [research.md](research.md#terms-used-across-this-package)); whole-org all-date controls exist only for unbounded U. Never widen finite U for a financial closure or proposal; do not compare a limited client display or subset directly with whole-org badge.

Compute distinct controls matching **each** current reader exactly: badge paid-unscheduled + unbilled; list-style pending scheduling (only void excluded and identity required); list-style unbilled grouped by canonical client key; account display capped clients versus complete clients; identityless paid lines and legacy voided residuals. Explain row versus client counts; shared subject may carry multiple nonadditive facets.

### S2 — Evidence classification and uncertainty (US2)

Validate and admit the exact optional external evidence manifest in contracts/evidence-and-proposals.md; missing evidence remains unresolved. Gather explicit booking status/date/group, price resolution and active flag, line/plan/grant/redemption/invoice refs, tender/refund/void facts, canonical customer identity and available delivery/contract evidence. Retain stored monetary decimals/currencies; no floating point summation or cross-currency netting. Current active catalog price is labelled current, not historical agreed charge. `paid` boolean is a linkage fact; a ticket line alone is not proof the full requested service/quantity is settled.

Both exhaustive ordered classifiers are normative in contracts/evidence-and-proposals.md. Global identity/source/evidence conflicts win first. Booking order is inactive → positive historical-charge closed-settlement evaluation → current-free only without positive history → exact unused → exact stale → unresolved. Define unused/stale using admitted booking-only predicates, snapshot observed status and explicit overlap decisions; no vague existing conditions or new lifecycle status. A paid_unscheduled_line has its own inactive/known-zero/fully-settled-one-line/unresolved table and never becomes debt/unused/stale. Every branch emits its selected reasonCodes, uncertainty and next action. Valid unused+stale chooses unused/review with both reasons; unused+delivery or stale-observation mismatch is global conflict; observed==claimed==actual is no-change, not stale. Positive historical charge plus a current catalog price of `0` never falls through to free; retain canonical free badge exclusion separately.

`loadAuditFinancialClosure` selects only two positive money shapes under unbounded owner U: (A) real active canonical party with usable document, admitted identity+historical charge+delivery and complete zero stored POS/finance/wallet/funding closure gives `settledMinor = "0"` and `remainderMinor` = historical charge; (B) exactly one submitted same-client ticket with exactly one positive service line, 1–20 ordinary positive payments summing its whole total, no other money/allocation/fiscal/funding/finance/wallet involvement, proves the stored line fully settled. An exact owner-admitted matching pair may use B for a booking/proposal; without the full pair a positive paid line is only paid-but-unlinked/review. Multiple ordinary tenders may sum a whole one-line ticket; no line/partial/invoice/refund/wallet allocation is inferred. Normalize actual stored method definitions through pos/settings.ts normalizeMethods; require unique resolved drawsOnCredit=false and requiresCreditDecision=false, with no hardcoded names or missing-settings defaults for settlement.

Financial closure reads all same-canonical-party POS tickets/lines/payments, bound fin_clients, exact document-number uncertainty probes, explicit/provider/client invoice and finance-payment provenance, signed client ledger, plans/grants/redemptions and source refs under the same CoreTx. Dedup by table+primary ID, never providerRef or matching amount; preserve provenance edges. Exact document-only finance matches never create booking links or settlement. Any partial/refund/wallet/invoice/alternate-client-money/unknown identity shape is unresolved/null settled/null remainder. Finite approved U skips all-date closure entirely and emits settlement_scope_incomplete; C may narrow within unbounded U, but both proposed pair subjects must be in C. Read no out-of-U subject to make the proof. Methods/amounts use exact supported-currency BigInt minor units, never Number or cross-currency sums. Combined closure budget is 10,000 deduplicated rows per subject/pair including account controls, and the existing 256 MiB output and 300 s deadline limits apply; limit+1 aborts incomplete, never fake empty closure. Exact queries, DTO and reason codes are in the evidence contract.

Separate exhaustive primary-class counts per subject kind from independent financial buckets. `sum(primary classes)=inventory subjects`; `badge contributors=component inventory`; `currency totals=matching stored decimal sums`. Every residual subject is streamed as a `ResidualRecord` to `residuals.jsonl`; the summary carries per-control counts, a 100-ID sample and a digest ([audit-cli.md](contracts/audit-cli.md#residual-output)). Unknown financial amount is null with reason, not zero.

### S3 — Exact repair proposals (US3)

Only propose a payment-line→existing-booking link when approved external evidence plus same-org canonical identity, same actual service/quantity, currency and settlement amount prove the pair. Read all existing explicit booking/invoice/grant/plan links first using contracts/invoice-linkage.md. Never rely on bookingTicketLinks for invoice coverage. Cases with reused line, partial/split amount or qty, void/refund, mismatched identity, fiscal issue or uncertain stock ownership are unresolved; grouped bookings require exact member not anchor guess.

Use the exact canonical LinkIntent, SHA-256 preimage and fixed-namespace UUIDv5 identity in contracts/evidence-and-proposals.md; keep run metadata and private paths outside approval identity. Proposal includes immutable before snapshots, expected versions/fingerprint, exact proposed link, reviewer evidence refs, monetary/stock/lifecycle zero-change assertions, predicted **both** badge-component deltas plus exact typed wallet/list controls in HASHED LinkIntent.effects and accountControlSha256, and SHA-256 approval identity. Pure projectLinkEffects clones the complete same-client canonical control projection and changes only this line.bookingId. It recomputes list pendingScheduling/pendingInvoice, logical account-key union, current-currency display balance and canonical badge deltas. Exact empty ledger yields wallet[]; all signed per-currency wallet rows are unchanged display evidence (not settlement). Logical client row can disappear when the pair were its only key sources; capped/sorted rendered-row presence is always null/not_predicted_limit_or_sort. A current-free booking has an unbilled delta of `0` even with a historic settled charge. The control source includes other same-client subjects, wallet/open plans/active grants and relevant policy and selected source sets; its hash changes proposal identity when those business facts change. No proposal changes DB. A future repair executor must revalidate all refs and concurrency under locks, be idempotent, dry-run by default, carry exact owner approval and provide conditional inverse-link undo; this audit does not introduce that executor. `bookAndLinkTicketLine` is explicitly prohibited because it creates scheduling records.

## Failure, retry, concurrency and output

Incomplete connection/page/money decode/permission or timeout errors abort one snapshot; close connection in finally. Write a private staging directory mode 0700 and files 0600 without following symlinks, checksum each sorted output, atomically rename the manifest only after controls pass; on failure keep the staging directory labelled incomplete with no manifest ([audit-cli.md](contracts/audit-cli.md#snapshot-bounds-and-files)). Retry starts a fresh run/snapshot and never appends to an earlier completed report. For unchanged fixtures canonical subject/proposal content hashes match; run timestamp/snapshot metadata naturally differ. A changing production snapshot may yield a different report without implying inconsistency. No DB writes means no business-data undo is needed; read-only transaction rollback/release always runs. Capture input/output hashes and row-count/hash invariants, not SQL statement counts.

## Security and authority

Exact org comes from approved run scope and is checked against DB GUC; no default first org. Verify app_ledger RLS and active profile membership. Require pos and finance view plus unrestricted export approval; owner-filter/field-level restrictions cannot be bypassed by operator flags. Minimal private artifacts use IDs/codes by default, authorized display labels only when needed, no phones/email/credentials. Full raw evidence remains protected, summary may be redacted for sharing. No server-token endpoint, public API or frontend auth changes. Any future UI/API requires separate route manifest, RBAC/nav/field-level/design/i18n design before implementation.

## Validation and release

Run synthetic matrix from quickstart including >500 clients, party/contact identity bridging, deleted/missing identities, identityless paid lines, voided discrepancy, all free/null/inactive/plan/grant/invoice/partial/refund states, multiple currencies and concurrent writes between page reads. SQL read-only denial and before/after business table hashes prove no mutation; repeated unchanged report proves deterministic core output. Focused pure/runner suites, the complete admitted qa-native SQL lane and its semantic report validator, then Hub check/test/build and relevant architecture checks. Human spec approval precedes code, human merge follows independent review/CI. Approved live read is a report result, not repair or deployment proof.

## Complexity Tracking

No new business data tables/UI/remote job framework; one bounded authority-function security migration is required. One dedicated snapshot connection is required because multiple ordinary service calls may observe different commits or truncate clients. A classification service and operator wrapper are sufficient; universal fuzzy repair engine rejected.

## Exact contract dependencies and file scope

[contracts/audit-cli.md](contracts/audit-cli.md) owns principal/readonly authority, cohort timestamps, scope intersection/refusals, time/resource limits and exits. [contracts/evidence-and-proposals.md](contracts/evidence-and-proposals.md) owns typed owner-attested assertions, exact positive/blocked proposal envelope and stable approval hash/UUID. [contracts/invoice-linkage.md](contracts/invoice-linkage.md) owns same-snapshot invoice coverage, provider ambiguity and no-proposal guards. audit.types.ts implements those exact types; audit.logic.ts implements only pure validation/classification/canonicalization; audit.ts performs every source/evidence match under the same CoreTx and returns safe evidence rows. These are selected contracts, not design choices delegated to implementation.

Stage shared bootstrap without a future-root cycle: T005–T009 implement/qualify actual authority/principal/foundation loader only, excluding audit registry key/type and audit runner/registration; these results are foundation_checks_passed, not bootstrap qualification. T011 adds actual audit.ts and its registry/type; T014 finishes real runner/streaming/package registration and real positive --phase audit smoke after T011–T013. Qualify F7-owned operator-principal/nonlocking authority extraction and that full [standalone service bootstrap](contracts/operator-bootstrap.md), plus required native bridge proof, before dependent F1/F2 previews. The bootstrap smoke proves actual Svelte/dependency imports and injected qualified clients with application dotenv/config/credentials absent; ordinary mocked unit tests do not establish this. F1/F2/F3 mutation admission uses the new resolveFreshOperatorCapabilitiesForWriteInTransaction adapter under the shared guard. Only unrelated legacy callers retain resolveFreshCapabilitiesInTransaction and its existing row adapter. Production reports still need exact owner scope and must never be run from these documentation commands. All implementation tasks remain unchecked.

## Transaction-accepting orchestration interface

The selected audit.ts export is:

```ts
export function runReceivablesAudit(tx:CoreTx,
  input:{orgId:string;profileId:string;scope:AuditScope;cohort:AuditCohort;
    batchSize:number;evidence:AdmittedEvidence|null},
  sink:AuditSink):Promise<AuditSummary>;
```

The CLI owns connection, transaction, guards/deadline and publication; the service starts no transaction or application pool. `AuditSink.writeSubject`, `writeResidual` and `writeProposal` are awaited `Promise<void>` callbacks with backpressure. `AuditSummary` contains coverage/control/class/currency counts and the per-control residual summary `{count,cohortCounts,sampleIds,idsSha256}` from [audit-cli.md](contracts/audit-cli.md#residual-output); it holds no subject list and no residual ID array beyond the 100-ID samples.

1. Before the first subject, build only the bounded approved-assertion/pair index (at most 1000 assertions) and conflict sets. Stream U in (subjectKind,id) order: update controls and write residual records for every U member, and emit subject records only for C members.
2. For each subject, read and release one bounded canonical-party financial closure only when U is unbounded. Evaluate all relevant approved pair gates/counterfactuals before deciding propose_link, apply the exact classification table, then emit that one final subject. Never emit a provisional next action that a later proposal pass changes.
3. Process admitted settlement pairs in (ticketLineId,bookingMemberId) order, retaining only the bounded evidence map and current source batch; emit proposals in that order. Conflicting one-line/multiple-member or one-member/multiple-line assignments produce unresolved candidates, never arbitrary selection. Re-evaluate each bounded pair in this immutable snapshot and compare its retained small eligibility/hash receipt; mismatch is integrity failure.
4. Retain no whole-org subject map, unbounded result array or all closure objects/intents. Closure and account-control arrays share one 10,000-row budget with table/id deduplication, and are released before the next subject/pair. Financial source DTO and account-control hash remain the exact selected contract types, not new stored allocation tables.


## Evidence actor admission

Admission is defined once in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#executing-actor-and-attestation-authority). Qualify capable-reviewer/evidence-null, capable-reviewer/evidence-present denial, actual owner positive, owner with only custom realRoles keys, revoked owner, deficient effective authority and wrong-verifier cases using the actual read-only capability snapshot.


## Exact file-action scope

implementation-inventory.md distinguishes F7-created code/tests/bootstrap/principal/UUID utility, extraction-only seed wrapper and native/QA/package/validation actions from existing canonical reader fragments and F3/F2-owned dependencies. No UI/Delete/business-table/locale/mutable-paid path is introduced; the explicit authority-function migration is the sole schema change. A file not in implementation-inventory.md requires updating that inventory before the file is added.


## Prerequisites and normative contracts

This section is the single statement of the cross-cutting prerequisites; other artifacts in this package link here.

- **Authority bridge.** [authority-bridge.md](contracts/authority-bridge.md) defines this slice's one security migration, the new operator adapters and the baseline-preserving proof. It is a prerequisite for the read-only audit and for the dependent F1/F2/F3 correction consumers.
- **Snapshot principal and historical charge.** Every artifact applies the snapshot principal contract in [audit-cli.md](contracts/audit-cli.md#principal-and-same-snapshot-authorization) and the historical-charge precedence in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#booking-decision-table). Excluding a booking from the badge because its current catalog price is `0` grants no historical debt forgiveness and does not establish whether a historical charge was settled or waived.
- **Native auth baseline.** [native-auth-prerequisites.md](contracts/native-auth-prerequisites.md) and the test-only files `src/server/test-utils/operator-native-auth-fixture.ts` and `src/server/test-utils/fixtures/operator-native-auth.sql` (functions `installOperatorNativeAuthFixture` and `assertOperatorNativeAuthFixture`) are created and qualified by T003 and T005. They prepare the child auth schema, `auth.users`, `auth.uid()` owner and ACL, JWT settings and the profile foreign key before the public fixtures and the bridge migration, on the CI `pgvector/pgvector:0.8.6-pg18` controller database `minion_qc_vectors` plus an owned child database. F8 (specs/129) reuses this fixture. No permissive grant or auth simulation replaces the GoTrue standalone smoke.
- **Exact assertion count.** The audit suite registers with `exactAssertions: true` and `minimumAssertions: 8` under [native-exact-count.md](contracts/native-exact-count.md).

Implementation, qualification and owner approval of all four remain pending.
