---
spec: 2026-08-17-hub-distinct-visit-dates-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set pass 2 and `changes_requested` because booking-status semantics still require a human decision when no authoritative attended state exists.
- Added `minion-meta` to `repos` because required open-items ledger appends change the meta-repo.
- Recast `crm-visits.ts` as side-effect-free/no DB execution rather than “pure/no DB,” because its required `SQL` helper is database-library-aware.
- Required authoritative scheduling status semantics in addition to enumerating stored values; observed labels cannot prove attendance.
- Corrected the Lima timezone fixture from 20:00/22:00 to 18:00/20:00 so it actually straddles UTC midnight and detects the specified bucketing bug.
- Made the Loyal threshold unambiguously `2`, matching the proposal’s “2+ dates” acceptance test; a conflicting existing threshold now blocks reconciliation.
- Narrowed “manual wins” to the verified `lifecycle_override` pin; `_funnel` has no specified provenance distinguishing human and automatic writes.
- Made roster parity a ship prerequisite; documenting a known disagreement no longer counts as an alternate S3 definition of done.
- Renamed mixed “machine-checkable” criteria where manual mutation or EXPLAIN review is also required.
- Updated consolidated-file, repository, A1, A6, and end-to-end text to agree with the corrected requirements.

## Human decision required

- If scheduling has no authoritative completed/attended status, decide whether a past `accepted` booking is sufficient evidence of a visit. The spec remains blocked until that rule is recorded; otherwise it cannot claim bookings represent attendance rather than intent.
