---
spec: 2026-08-28-shared-db-encryption-key-convergence-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-28
score_slice_size: 7
score_dod_verifiability: 7
score_scope_containment: 9
score_impact_zones: 9
---

# Pass 2 correctness review

## Changes made

- Corrected the frontmatter to pass 2 and `changes_requested`; one rollout decision remains materially unresolved.
- Distinguished facts verified in the meta checkout from audit/memory evidence and recorded that Hub/Site are absent, preventing invented consumer paths.
- Corrected the schema contract from one ambiguous `key_id` per table to a field-specific companion per encrypted value.
- Removed the contradictory `NOT NULL-after-backfill` proof because unreadable preserved rows can legitimately retain a null legacy key id.
- Required the three production-only encrypted tables to receive an owner/helper disposition; missing ownership no longer counts as evidence that they are out of scope.
- Corrected S1's migration proof to run Hub's idempotent SQL runner twice, consistent with the Hub migration contract.
- Marked the `openSecret`/decrypt signature change as breaking and required a coordinated minor release plus complete consumer call-site migration.
- Removed the false claim that fresh-IV re-encryption proves idempotency; idempotency is now tested on committed database state in S5.
- Replaced peer “last recorded” attestation with a deterministic, operator-provisioned database-wide policy row that application boots can only read.
- Defined the attestation fingerprint algorithm and failure cases so the assertion is reproducible and testable.
- Split the oversized cross-repo attestation work into S3a (policy/schema/helper) and S3b (Hub/Site call sites and boot wiring).
- Corrected “both apps refuse” to the verifiable property that each mismatching process independently refuses startup.
- Moved the executable migration command to Hub, which owns the Supabase client and operator scripts; `@minion-stack/db` has no Postgres client or bin surface.
- Required S4 to authenticate active-key rows before classifying them active, preventing corrupt active-id rows from being silently skipped.
- Added duplicate-ring rejection and prohibited legacy key material in command-line arguments or reports.
- Corrected crash semantics: rolled-back encryption work may repeat, while committed rows and checkpoints must not be written twice.
- Added compare-and-swap updates so concurrent owner rotation cannot be overwritten by the migration.
- Required unreadable active-id rows to be preserved and quarantined instead of counted as already migrated.
- Expanded quarantine behavior to every retained credential type and split gateway behavior from conditional per-owner follow-up slices.
- Added the real Hub design-lint base override from operator memory so a missing `origin/dev` cannot produce a false green result.
- Replaced placeholder migration commands and the meta-only “end-to-end” gate with concrete Hub/Site/package commands and invariant assertions.
- Expanded the impact table to name the breaking npm surface, shared-policy DDL, Hub operator tooling, both boot paths, and every credential owner UI/runtime.
- Added explicit citations to `/memory/MINION/MEMORY.md`, `/memory/MINION/hub-local-qa-stack-recipe.md`, and `/memory/MINION/hub-deploy-workflow.md` where they shaped migration, QA, branch, and lint requirements.

## Human decision required

The proposal/spec currently requires all three of the following: reader compatibility before
migration, fail-closed behavior for a missing key id, and a legacy ring usable only by the
migration command. Existing null-key-id rows make those requirements mutually incompatible under
live traffic. The human approver must select and record one contract before development approval:

1. A maintenance cutover that quiesces both apps, backs up and migrates the DB, provisions the
   expected policy, deploys both new revisions, verifies, then resumes traffic; rollback restores
   both the backup and old revisions/environment keys.
2. A proposal/spec amendment authorizing a bounded runtime compatibility mode with exact key
   selection and removal tests.

No directly relevant past-session observation was returned by the read-only FTS searches; no
observation was used to justify a requirement.

## G2 readiness note

The development slices are now bounded to the 4–8 h convention, including separate attestation
and per-owning-repo quarantine work. The score is not higher because S5 remains at the top of the
range and S6b's concrete count depends on S0's production ownership inventory. Definitions of done
are substantially machine-checkable, but S7 cannot become executable until the human chooses the
cutover contract above.
