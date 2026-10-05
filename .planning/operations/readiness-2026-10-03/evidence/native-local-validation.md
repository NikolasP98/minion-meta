# Disposable PostgreSQL validation

All nine native lanes pass locally: **330 named cases across 23 files, zero skips**.
`native-nine-lanes-final.json` records the exact behaviors and SHA-256 of each full
private report. The manifest validators accepted each final report.

| Lane | Files | Passed |
|---|---:|---:|
| crm-deposit | 1 | 5 |
| crm-pagination | 3 | 31 |
| crm-concurrent | 1 | 7 |
| attachments | 2 | 47 |
| principal | 1 | 8 |
| custom-properties | 1 | 1 |
| formula | 2 | 8 |
| qa-native | 5 | 44 |
| jobs | 7 | 179 |

Marked fixture lanes used owned loopback PostgreSQL 18.6 on port 55461. Full-schema
lanes used the separately owned Supabase QA runtime on ports 54421/54422, with a
fresh baseline plus current migrations. Its latest bootstrap reports 87 restored
migration rows, zero pending migrations and a valid QA marker. Synthetic seed
coverage is 206/206. The pre-existing developer QA volume was preserved. The
pgvector fixture used a separate owned marked database. No FACES/customer database
was written. Both runtimes remain explicitly owned for subsequent money tests.

Initial failures remain in the private run directory. They found SQL Date handling
in Meta media supersession, a stale CRM fixture missing invoice status, unsafe
normal-env selection in the mixed business-persistence fixture, a missing pgvector
fixture setup, and a lease-test admission deadline that prevented its handler from
running. Each was corrected and its full lane rerun. A later expanded marketplace
fixture selected an unspecified row; its query was corrected before the final
179-case jobs run. None of those failed/partial runs is counted as passing.

The ordinary CRM parity fixture now includes a void-only invoice and requires it
not to promote the customer. The business-persistence fixture uses the explicit
loopback test database selector. Marketplace native cases include paired
verification constraints, SHA-256 content provenance, legacy loaded-marker
invalidation, publication fences and commit-response loss. Meta cases include stale
ownership, cancel/steal, fresh token CAS, immutable media and cleanup fencing.

These are local disposable receipts. Hosted CI, production migration, deployment
and live behavior are separate gates. Private full receipts remain under the
implementation run's `native-parent-proof/`; sanitized summaries are committed here.
