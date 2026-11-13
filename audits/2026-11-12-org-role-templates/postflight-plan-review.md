# Planned native bootstrap postflight: independent final review

Reviewed UTC: 2026-11-13T18:41:48.920844+00:00.
Frozen helper: `/tmp/role113-native-postflight.ts`.
Helper SHA-256: `ef43256ac08238352fcc54f0f3a25274c033401a5dbb1d8faddb92d5d3b5dd78`.
Hub commit: `da51646cbe5bc4d03b52feec566a8be4a332217f`.
Hub tree: `6abb578eae04c69e9a220b97ab37bf02715de6b1`; clean at final fingerprint check.
Scope: owner-authorized T025 bounded synthetic native bootstrap postflight, with mandatory rollback. No helper execution or production SQL was performed by this reviewer. Parent reports dry inspection passed without `--run` and without SQL. This receipt assesses the plan; it does not claim the postflight passed.

## Verdicts

- **Standards: PASS for this exact operational helper plan.** The prior dependency/default provenance and missing-target holds are closed by executable guards before any SQL, plus independently checked source/artifact fingerprints.
- **Spec: PASS for the bounded native-bootstrap check.** This implements a deliberate synthetic organization bootstrap and retry check with rollback cleanup. It is narrower than full provisioning HTTP/E2E and is not, alone, complete T025 legacy/runtime qualification.
- Confirmed remaining plan blockers: **0**. No accepted unresolved source issue in this helper review scope.

Initial HOLD preserved at `/tmp/role113-postflight-plan-review-initial-hold.md`. This plan PASS supplements the prior feature and integration source reviews; it does not supersede their scope limits or authorize unrelated production actions.

## Provenance and target boundary

The helper checks expected Git HEAD and exact canonical bootstrap bytes. Both RBAC source and permissions source must exactly match the reviewed integration commit and the independently reviewed feature commit `99341e7074541360eadcf2dcd32e67494f3c65ad`.

The compiled RBAC chunk is pinned to SHA-256 `29223d55d19e0e9ccc1318f27ca4faaa469d3feb44fc75bb71940b75aacdf8b8`, independently observed during review. The fixed module and action inventories assert all 24 module names and all six action names/order. Independent per-module assertions check every Administrator action: overview is view-only, all other modules enable all six actions. Independent field expectations are 1 for CRM, Finance and Scheduling, otherwise 0. These assertions close the shared expected/actual oracle and transitive compiled field-map gap; the compared rule defaults cannot silently drift together.

A nonempty explicit database URL and PostgreSQL protocol are mandatory; missing configuration cannot use ambient PostgreSQL defaults. The URL username/hostname/port/path identity, excluding password, must hash to the parent-qualified Vercel-linked target SHA-256 `8c65ef68e4fe9d2a797ed0b2c10476124d987981c4451d96b7381dc94f0a88fe`. Inside the transaction, current database and user must both be `postgres` before bootstrap writes. The target digest's production association is attributed to the parent's preflight evidence; this reviewer did not inspect secrets or connect to validate it independently. The helper enforces that exact qualified identity and does not print credentials.

## Transaction and error proof

- The canonical bootstrap receives `{begin: fn => fn(tx)}`, so both bootstrap calls execute within the one actual postgres-js transaction. The byte-verified bootstrap performs no external RPC, provisioning call, independent transaction or child-client write.
- Successful shape/rule/retry verification always throws the same unique sentinel object. The installed postgres-js `begin` implementation rolls back callback errors before reaching its commit branch, then rethrows that object. Only that exact sentinel is accepted by the outer catch. Any validation/database/unexpected error rejects; it is not reported as PASS.
- Statement timeout 10 seconds and lock timeout 2 seconds bound individual SQL/lock operations. Existing creator state is share-locked after the lifecycle advisory lock and pending-deletion check. No existing profile, membership or grant is changed by this source path.
- Before writing, both migrations must be present and the notification worker runtime must have generation zero, no owner and no heartbeat. This checks current expected state; it does not itself qualify a worker artifact or authorize first activation.
- Unique synthetic ID/slug is used once. The shape check covers organization model/default, one local Administrator rank80/template1, one explicit assignment, one owner membership and 24 explicit canonical rules, including ownership/field values.
- Before/after retry snapshots compare complete organization, local role, rule, assignment and membership JSON plus audit count. The retry must return `created=false` and leave the entire synthetic shape unchanged.
- After the sentinel rollback, a new statement verifies no synthetic organization by ID or slug. PostgreSQL transaction rollback governs all child/audit rows written through the verified injected transaction. Connection failure or failed absence assertion cannot produce a PASS report. Pool shutdown runs in finally.

Rollback prevents persistent application rows; this remains a production write transaction with temporary locks and potential WAL/diagnostic effects. It must be described as a rollback-only native check, not as read-only. It performs no Workforce, gateway or workstation provisioning and does not modify activation flags.

## Evidence limits

A successful future execution may claim native canonical bootstrap, 24 explicit canonical rules, unchanged retry shape and verified rollback absence on the pinned target. It must not claim HTTP/auth admission, deployed endpoint execution, flag activation, external provisioning, committed role resolution or UI/E2E proof. Canonical overview remains view-only, so do not claim every module enables every action.

No legacy sample read occurs in this helper. Record the separate authorized read-only legacy sample and any deployed/runtime checks alongside T025. The helper's application source identity does not alone prove a deployed artifact's identity. Keep any remaining qualification description precise; no broader production mutation or external-resource cleanup is implied by this review.
