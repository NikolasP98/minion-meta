# Notification Slice5 v10 independent Spec review

- Date: 2026-10-03
- Reviewer: `/root/hub_client_fixes`
- Verdict: **PASS**
- Spec SHA-256: `167f99e8c32859a2f392d39ecd592981f082acebb8774493faa0b04df4e8c762`
- Recon SHA-256: `2de62fb4bd1d33ada33ac44d408185884c7d0b3099bdd0524ae713d576e8bae3`
- Owner-transfer evidence JSON SHA-256: `25dafe4fffc45d2270ffb51ecd650a0a66f71ecdb6fae16efff42f9a45b53d98`
- Owner-transfer evidence Markdown SHA-256: `ded2e014eab3d649c31c7970393e87e4b144063200fc2460fdc13eee455617c5`
- Source edits authorized by this review: none

## Narrow v10 verdict

V10 closes the four role-transfer evidence gaps that blocked v9.

1. Admission asserts the complete temporary membership graph, not selected positive rows: exactly
   four PostgreSQL 17 edges or two PostgreSQL 18 edges, including target, member, grantor and every
   ADMIN/INHERIT/SET option. The persistent subset is frozen from that graph by excluding every edge
   whose member or target is the exact bridge.
2. The committed transaction drops the bridge, proves exact function ownership and absent finalizer
   schema `CREATE`, checks a separately restricted runtime role has neither `SET` nor `USAGE`, and
   compares the complete finalizer graph with the frozen persistent subset both before and after
   commit. PostgreSQL 17 retains only the observed platform ADMIN-only edge; PostgreSQL 18 retains
   none.
3. A separate transaction injects failure after ownership transfer and schema-`CREATE` revocation but
   before bridge drop. Explicit rollback leaves the runtime probe, bridge, finalizer and function
   absent on both supported PostgreSQL versions. This proves partial-transfer rollback instead of
   treating the earlier PostgreSQL 17 crash as rollback evidence.
4. The exact post-commit outputs and cleanup are bound in the frozen JSON/Markdown receipt, with the
   PostgreSQL 17 image ID and repository digest, loopback-only disposable environment, no host mount,
   and zero residual probe roles/functions.

The evidence is deliberately a one-function role-mechanism experiment. It does **not** qualify the
production Slice5 migration. Implementation acceptance still requires the real migration runner to
transfer all three fixed definer functions, assert their exact owner/body/search-path/grants, retain
the complete policy and transitive membership admission, exercise both supported PostgreSQL role
graphs, and prove transactional adoption and cleanup. Those gates are already normative in v10
lines 1121-1135 and 1205-1241, so the narrower experiment is not being misreported as source or
migration PASS.

No remaining Spec blocker was found in the v10 role-transfer delta.
