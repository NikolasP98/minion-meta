# Notification Slice5 v10 parent review

Date: 2026-10-03
Reviewer: root orchestrator
Verdict: PASS for the creator-role protocol contract and its bounded experiment; production migration source is not yet accepted.

Reviewed spec SHA256: 167f99e8c32859a2f392d39ecd592981f082acebb8774493faa0b04df4e8c762
Reviewed recon SHA256: 2de62fb4bd1d33ada33ac44d408185884c7d0b3099bdd0524ae713d576e8bae3
Reviewed evidence JSON SHA256: 25dafe4fffc45d2270ffb51ecd650a0a66f71ecdb6fae16efff42f9a45b53d98
All 14 evidence leaf hashes match the JSON manifest. Recon authorRevision binds these exact spec bytes.

The initial-membership bridge avoids the directly reproduced PostgreSQL17 second-grant/revoke crash. It does not claim that a finalizer exists before its initial bridge edge. The complete initial graph is classified against the exact four-row PG17/two-row PG18 contract; the persistent platform subset is frozen and compared after the bridge is dropped. Extra members, grantors and option changes are not accepted.

Executable SQL asserts the temporary graph, bridge absence, exact function owner, removal of schema CREATE and complete persistent graph. PG17 additionally denies SET/USAGE for its nonsuperuser migration actor. Both versions deny SET/USAGE for an ordinary restricted role. The PG18 superuser is not used as proof of denied privilege. The successful transaction commits, observes the resulting catalog and then explicitly removes its probe function/roles. The separate injected failure occurs after an ownership transfer, rolls back, and shows no surviving probe objects. PG17 container cleanup is recorded. These probes cover role-transfer mechanics for one harmless function; native adoption of the actual three-function migration remains mandatory.

The source-policy rewrite, source ACL catalog, RLS parity, complete runtime fingerprint and recipient authority requirements remain those of v8. This delta does not relax the inaccessible finalizer's persistent membership boundary. Actual migration implementation still needs independent source review, PG17/18 adoption, mutation controls, policy consumer parity, cancellation/pool-state cleanup and complete projection runtime qualification.

Primary syntax was checked against PostgreSQL17 CREATE ROLE documentation: https://www.postgresql.org/docs/17/sql-createrole.html. Runtime observations come from the attached local SQL receipts, not an inference from that reference.
