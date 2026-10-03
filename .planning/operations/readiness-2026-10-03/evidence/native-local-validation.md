# Disposable PostgreSQL validation

All fixtures used owned loopback PostgreSQL 18.6 on port 55461, database marker
`minion-360-disposable:v1` where required. No FACES/customer database was written.
The container provenance is recorded in `native-runtime.json`; cleanup follows
completion of the remaining native lanes.

- Deposit classifier: 5 passed, zero skips; exact lane report validator passed.
- CRM pagination: 31 passed, zero skips; exact lane report validator passed.
  The initial run exposed a real fixture mismatch with the void-invoice finance
  correction. The fixture now includes invoice status and a void-only invoice
  regression, and the exact-name admission requires that regression.
- Initial combined jobs run: 161 passed, 3 failed. This is not a passing receipt.
  Two failures exposed Meta SQL Date handling, including a production media
  supersession defect. Both were corrected. One 4-second transport barrier timed
  out under concurrent work; isolated diagnostic passed in 2245ms without a
  timeout change. The isolated diagnostic skipped unrelated cases and is not
  counted as complete lane qualification.
- Stable Meta fixture after subsequent parent review corrections: 16 passed,
  zero skips. Before/after owned source hashes match. It covers cancel/steal,
  stale publication, connection CAS, late object puts, immutable digest keys,
  tombstone cleanup, RLS and foreign keys. Final combined lane remains separate.
- Marketplace ownership: 14 passed, zero skips. Uses distinct native backends,
  real operational migration, rejected tenant/browser privileges, expired leases,
  rollback after final-guard expiry, row savepoints, infrastructure abort, paging,
  commit-response loss, stale hydration, lock timeout and legacy marker invalidation.
- Combined 7-file / 178-behavior jobs qualification is running. No final passing
  claim is made until its exact report validator succeeds.

The private local JSON reports are under the implementation run's
`native-parent-proof/` directory. Hosted CI and production migration/release are
not represented by these local receipts.
