# FACES meeting follow-ups: execution record

Owner request: proceed thoroughly with Spec Kit and EGM for each of F1–F8.
The original meeting and intake are linked from the
[proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md).

## Verified observations

- Live read-only PostgreSQL inspection verified FACES SCULPTORS. The detailed case
  observation at 2026-11-16T19:20:30.051Z used a repeatable-read, read-only transaction,
  the `app_ledger` role and the explicit organization GUC.
- Faja M currently has a one-unit recipe pointing at FAJA-L. Both reported tickets
  contain Faja M, while their submitted issues deduct FAJA-L. Correcting the customer's
  selected product would not address this mapping defect.
- Receipt `STE-2026-00559` contains 89 units at a stored unit rate of 5474.58,
  giving 487237.62. The meeting states an intended total of 5474.58. Seventeen later
  issue rows used the affected valuation. This identifies a correction candidate;
  the owner/source-document gate and downstream cost treatment still apply.
- The observed internal bin/latest-ledger comparison has zero mismatches and no
  negative bins. Internal agreement does not establish physical stock correctness.
- The `pdv` custom section has no agenda link. CRM and event Modelo tags exist
  separately. Matching Instagram/modelo custom-field definitions were not found by
  the bounded label query; that is not a complete field-catalog audit.
- The current canonical accounts pending-work projection counts 184 items:
  one paid service awaiting scheduling plus 183 unbilled bookings. No collectible
  debt total has been established.

Evidence: [initial summary](evidence/database-read-summary.json) and
[case summary](evidence/meeting-case-read-summary.json). Raw database extracts,
database credentials and diagnostic working files are not part of this review package.

## Item ledger

| Item | Review target | Intended result | Current delivery state |
|---|---|---|---|
| F1 | [Stock reconciliation](../../specs/122-faces-stock-reconciliation/design-review.md) | Explain duplicate/missing/wrong-variant cases, prepare exact approved mapping and historical repair | Spec Kit ready; EGM running |
| F2 | [Receipt valuation](../../specs/123-faces-receipt-valuation/design-review.md) | Receipt and downstream value/cost correction with source approval | Spec Kit ready; EGM running |
| F3 | [Correction workflow](../../specs/124-stock-correction-workflow/design-review.md) | Audited, narrowly scoped corrections using existing swap/repost mechanisms | Spec Kit ready; EGM running |
| F4 | [Readable movements](../../specs/125-stock-readable-movements/design-review.md) | Named, searchable movement context with existing field permissions | Spec Kit ready; EGM running |
| F5 | [Product consistency](../../specs/126-booking-product-consistency/design-review.md) | Distinguish sold products from planned/consumed products consistently | Spec Kit ready; EGM running |
| F6 | [Operations agenda](../../specs/127-faces-operations-agenda/design-review.md) | Add existing POS agenda to the shared operations space without changing role grants | Spec Kit ready; EGM running |
| F7 | [Accounts backlog](../../specs/128-faces-receivables-audit/design-review.md) | Read-only classification and count reconciliation; no bulk paid-state mutation | Spec Kit ready; EGM running |
| F8 | [CRM profiles](../../specs/129-crm-profile-followups/design-review.md) | Qualify persistent profile tags and a permitted Instagram field; protect masked viewers | Spec Kit ready; EGM running |

## Workflow and authority

Each item has separate Spec Kit spec, plan, tasks, research, data model, contract,
quickstart, requirements checklist and combined EGM target. Private Spec Kit driver
state preserves the workspace's pre-existing active feature. Product source was
inspected from an isolated checkout pinned to Hub
`c6c2d5739572356239c4048c0f564f40b0768adc`; the shared working checkout was not edited.

EGM uses native fresh-context specialists, the installed persona/standard files,
five sequential stages and per-item versioned reports. A reviewer not completed
cannot count as a clean result. EGM review approval and owner approval are distinct.

No product implementation, production mutation, merge, release or publication has
occurred under this execution record. The meta-repo remote is public; business
evidence and this approval package remain local. Public code delivery must exclude
private meeting/customer evidence.

Data/security implementation retains the owner spec-approval gate in
[the local constitution excerpt and source hash](evidence/workflow-authority.md). The review package will
be made concrete before that approval is requested. The owner confirmed that Coli is not provisioned yet. Agenda qualification uses
the existing operations account; Coli's access proof remains pending until a
separately authorized provisioning step creates that account. The original receipt
evidence remains an unresolved data-correction input; no cost basis is inferred.

## Validation currently recorded

- Eight new board stubs pass scoped frontmatter, enum, topic, heading and field-shape validation; see evidence/scoped-spec-validation.json.
- Proposal index check passes. Full shared-workspace spec-index check fails on17 errors in unrelated pre-existing local specs; log evidence/global-spec-index-check.txt. No unrelated specs were rewritten to make this work appear green.
- Review report search,26 local document links, desktop layout and390px expanded-detail layout were checked; no document overflow.
- Shared .specify/feature.json retains its initial hash; product source clone remains unchanged.
- F2 offline hypothetical arithmetic assertions pass (no DB calls), with a separately reported Bun internal directory diagnostic. This is not repair execution or financial qualification.


## Spec Kit provenance

[Per-item driver receipts](evidence/speckit-driver-receipts.json) record all eight
separate template/plan/task/prerequisite outputs. F3/F7 template resolution was
reverified read-only after initial authoring and is labeled accordingly. No setup
script was rerun to overwrite a reviewed plan. Private driver feature state does
not replace the shared active feature. Receipt existence is not implementation
or independent-review proof.
