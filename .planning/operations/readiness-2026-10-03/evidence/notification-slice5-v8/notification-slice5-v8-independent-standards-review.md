# Notification Slice 5 v8 independent Standards review

- Verdict: **PASS**
- Review date: 2026-10-03
- Reviewer scope: policy-retarget and finalizer-creator delta from the previously approved v6 contract
- Source implementation: not reviewed or authorized by this receipt

## Frozen inputs

- `spec-notification-slice5-audience-projection.md`:
  `66a82e3faf77c567a2805591df9fcb6d563135df423c201497b66493ac2a8da6`
- `notification-slice5-recon.json`:
  `8716ed060d42493810f176cdade750d385818db4ae4ed97f2d936e6d34b91aef`
- `notification-slice5-v8-policy-inventory.json`:
  `74e3da957caa7470859736edd61348d9d7dd7d8cd527f39eb333f1b1bcf4cc83`
- `notification-slice5-v8-command-role-inventory.sql`:
  `489154021e0c0466d1726749209265407f805931ca566da5cef9e85d54f7bdb8`
- `notification-slice5-v8-command-role-inventory.log`:
  `f56a0836972a6c569d8c7a605931af14fc823230a7746459a0545ef3159243e3`
- `notification-slice5-v8-rls-repro.sh`:
  `20e937c27a73b24bbe83663346deb04def6e9722fa0029910eee8f2e183c5ff1`
- `notification-slice5-v8-rls-repro.json`:
  `30962fc551b1a60dc620b3948b28516c5dc467100ef240f4db1f37209b42cf00`
- `notification-slice5-v8-rls-recursive.log`:
  `105e1282da7eb1f12875170c2ba4b645232f0f35fc8e5d7eb49ac61899e6c7ae`
- `notification-slice5-v8-rls-rerun.log`:
  `e5c5ff67e80a561534e2ce73b35ce332a14720dc5febbcda534d4aa37d6f7e46`
- `notification-slice5-v8-vs-approved-v6.diff`:
  `48b4386c0afa6c877d7cc224b1b10c07fb67140653166ff727319950aba6782f`
- Bound Supabase PostgreSQL 17 creator-semantics receipt,
  `hub-bootstrap-pg17-postconditions.log`:
  `b707d6d9ca01c14e41ac5f424697fe30d321da3ce12b773ec6ef174f32afd377`

## Reviewed invariants

1. The migration removes `PUBLIC` only from the six inventoried source relations and retargets each
   legacy policy to the exact roles that currently have its command through table or column ACLs,
   plus the exact relation owner. It preserves policy command and `USING`/`WITH CHECK` expressions.
2. `app_ledger` is retained only where the frozen ACL inventory makes it command-capable. The two
   already role-specific `app_ledger` policies remain unchanged. Schema-only
   `app_assistant_ro` and `brain_vector_worker` remain excluded.
3. Each source relation receives one complete `FOR SELECT TO app_notification_worker` policy. No
   legacy policy reaches that worker through `PUBLIC` or membership. This removes the reproduced
   `42P17` `organization_members`/`profiles` recursion without adding a source-reading definer or
   mutation grant.
4. Migration and runtime admission compare the complete relation owner/RLS, table and column ACL,
   policy, membership, definer, trigger, and finalizer-creator tuple. An unknown grantee, membership
   edge, `PUBLIC` policy, expression/command change, or broader worker policy fails closed.
   The evidence query enumerates every direct table/column ACL grantee for the command rather than a
   fixed candidate-role allowlist; exact owners are added separately, and the full fingerprint owns
   transitive SET/USAGE rejection.
5. Plain PostgreSQL 18 admits zero membership rows targeting
   `notification_projection_finalizer`. Supabase PostgreSQL 17 admits only the platform-created row
   `member=postgres`, `grantor=supabase_admin`, `admin_option=true`,
   `inherit_option=false`, `set_option=false`, with `pg_has_role(..., 'USAGE')=false` and
   `pg_has_role(..., 'SET')=false`.
6. No worker, browser, service, assistant, ledger, coordinator, health, or ordinary application role
   may have an ADMIN, INHERIT, SET, USAGE, or transitive edge to the finalizer. The migration removes
   its temporary ownership-transfer edge while preserving only the exact Supabase platform creator
   edge.
7. Browser self/admin, service-role, `app_ledger` org-GUC and historical-JWT behavior, relation-owner
   behavior, and assistant/brain denials remain executable parity requirements. A future ACL grantee
   receives no former-`PUBLIC` policy access without a reviewed policy migration.

## Limits retained from the contract

- At most 32 supported routing tuples and 33 unsupported-complement probes.
- One production projection event per organization lease; general claim ceiling remains 250 for its
  separately reviewed path.
- At most 10,000 canonical recipients; 10,001 atomically quarantines with zero candidates/receipt.
- At most 8,192 UTF-8 body bytes per candidate and 81,920,000 aggregate candidate bytes.
- Authority bounds remain 256 role keys, 256 relevant rules, 32 explicit roles per recipient,
  100,000 assignment rows, 256 equivalence groups, 64 KiB per group, and 16 MiB per event bundle.
- Finalizer lock timeout remains 250 ms and the database-owned commit window remains three seconds.
- Revalidation remains one 10-second budget, at most eight SQL statements, per-statement timeout at
  most three seconds, 250 ms lock timeout, and five-second idle-in-transaction timeout.

## Required implementation proof

This Standards PASS does not replace the spec's PostgreSQL 17/18 migration tests. Implementation
must create the actual finalizer role and prove both admitted creator modes, all extra-edge
mutations, exact policy-role arrays, parity for every existing consumer, removal/restoration
negative controls, runtime fingerprint drift, forced-RLS behavior, and cleanup on disposable
databases. Production migration bytes were not edited or reviewed here.
