# WorkItem admission data

## WorkItem

Existing identity/status/tags and the following required fields:

| Field | Constraint |
| --- | --- |
| id | Matches the canonical proposal filename; one unambiguous control value |
| source | Nonempty slug; descriptive provenance, not an authentication token |
| source_trust | `human`, `trusted-automation`, or `untrusted-external` |
| risk_class | `high`, `low`, or `unclassified`; equals current policy-derived risk |
| priority | `critical`, `high`, `medium`, or `low`; no scheduling effect |
| owner | Nonempty string, max 120 characters |
| status | Existing proposal lifecycle enum |
| tags | String array resolved through canonical topic policy; empty is unclassified |

Reject ambiguous control keys, wrong scalar/array types, unknown tags or enum
values, missing fields and risk mismatches. Unknown/unavailable policy is not
evidence that a record is valid or low risk.

## Admission decision

Validation yields either a complete normalized WorkItem or a bounded typed
reason. Automatic approval additionally requires trusted-automation, exact low
risk, draft status and existing duplicate/reopen conditions. Spec admission
requires approved canonical status plus existing manifest/scheduling gates.

## Existing execution

The run, manifest revision, queue priority and retry snapshots are persisted
authority. This slice neither rewrites them nor cancels or reorders them.
Creating a new retry is a fresh admission. Its canonical normalized topics,
derived risk and current policy hash must match inherited manifest/snapshot
authority before insertion. An incompatible retry stays held for renewed
review/fresh lineage. Compatible retries inherit the parent manifest unchanged.

## State transitions

Only the new approval/admission checks change. Legacy rejection/closure/retirement
must remain operable. No new revival edge or lifecycle enum is introduced.
