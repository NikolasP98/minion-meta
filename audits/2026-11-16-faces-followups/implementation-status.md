# Remaining implementation

Status at this checkpoint: **all eight product fixes remain unimplemented**. Investigation, Spec Kit artifacts and native EGM review are preparation. Review continues; no code, local product qualification, merge, deployment or production correction is claimed.

| Item | Remaining behavior | Implementation tasks |
| --- | --- | --- |
| [F1: Stock reconciliation](../../specs/122-faces-stock-reconciliation/tasks.md) | Explain sale/booking/ledger discrepancies; qualify product mapping and separately approved garment recovery. | 23 unchecked |
| [F2: Receipt valuation](../../specs/123-faces-receipt-valuation/tasks.md) | Diagnose the 89-unit receipt; qualify document/unit/currency evidence; atomically correct and replay the admitted downstream cost chain. | 22 unchecked |
| [F3: Correction workflow](../../specs/124-stock-correction-workflow/tasks.md) | Shared stock-write synchronization, immutable audit receipts, supported previews/apply, persistent unknown-outcome recovery and reviewed compensation. | 28 unchecked |
| [F4: Readable movements](../../specs/125-stock-readable-movements/tasks.md) | Explain quantities, units, source links and authorized costs in movement history. | 16 unchecked |
| [F5: Booking/POS consistency](../../specs/126-booking-product-consistency/tasks.md) | Separate planned/sold/consumed/payment facts; fix cross-visit product projections; guard stock recovery. | 16 unchecked |
| [F6: Operations agenda](../../specs/127-faces-operations-agenda/tasks.md) | Add the agenda link and verify actual navigation and dataset permissions for the existing operations account. | 17 unchecked |
| [F7: Receivables audit](../../specs/128-faces-receivables-audit/tasks.md) | Qualify shared operator authority and disposable audit harness; audit supported historical charges and isolate unresolved backlog. | 25 unchecked |
| [F8: CRM](../../specs/129-crm-profile-followups/tasks.md) | Fix tags and Instagram create/edit/merge behavior with current privacy permissions and uncertain-response recovery. | 16 unchecked |

Total: **163 unchecked implementation tasks**, not 163 independent user features. Tests, documentation and qualification are included.

## Sequence and prerequisites

1. Finish or explicitly resolve outstanding EGM gates, then obtain owner approval of the concrete data/security specifications before product code, as required by the [active constitution](evidence/active-constitution.md).
2. Implement and qualify F7 shared authority/audit foundations and F3 stock synchronization/correction foundations before dependent mutation tooling. Other independently bounded read/UI slices can follow their own declared prerequisites.
3. Implement each item with its specified tests and independent code review. Human merge, deployment and post-deployment verification are separate gates.
4. Apply production corrections only after fresh target-specific evidence and exact manifests are approved. The current receipt valuation and stock diagnosis do not authorize rewriting production history.

Coli is **not provisioned yet**, per the owner. Provisioning or inviting that account is outside the current authorization; its personal agenda-access check remains deferred. The existing operations account is qualified separately.

Review limitations remain visible in each feature's versioned `egm/` directory. Author repairs are not an independently clean round. This status file is a checkpoint, not the final EGM gate record.
