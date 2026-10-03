# FACES production recon and mutation ledger

The user requested a second Sol recon against the FACES production backend and connected services, with all real-data tests logged and reversed. The implementation program remains active while this round runs.

## Access and scope

Start read-only: exact runtime identity, health, configured integration presence, authenticated read contracts, tenant/permission boundaries, sync state, operational errors, representative UI reads and performance. Retain redacted evidence; do not copy customer message bodies or credentials into the repository. Bound query volume and timeouts.

Any necessary test write must have a unique test marker, target and owner, before-state, precise request, observed result, compensation and post-cleanup verification recorded before the task can finish. Prefer disposable local replicas for concurrency/fault injection. A write is not performed if its irreversible external effects cannot be bounded and reversed. Real outbound messages, payments and external publication are not implicit test fixtures.

## Production identity receipt

Read-only preflight at 2026-10-03T02:31:24Z: FACES `/health` returned `ok:true`, protocol3. The service image was `ghcr.io/nikolasp98/minion-ai@sha256:26ca10558b46b902085fb828c1db928e77eab5eb4bed9b85c2fc316d65787bbb`. This proves service health and image identity only; authenticated workflows remain to be examined.

## Mutation ledger

No production mutation has been performed. The ledger must be updated before the first mutation, then reconciled against cleanup receipts at the end of each test.

## Backend round completed

The Sol backend report is retained in `evidence/faces-backend-recon.json` and `.md`. Five new source/operations findings are registered as FACES-001..005. The deployed gateway tree exactly matches the initial audit tree, even though the commit IDs differ. The mutation ledger remains zero. The second perspective round is complete below. A bounded Hub PostgreSQL read-only transaction confirmed two active Meta connections (Instagram Login and Facebook Login for Business), two enabled Instagram assets, one page and one ad account. The Instagram token expiry is November 7, 2026; token validity and service workflows still require separate read-only qualification. Receipt: `evidence/faces-hub-meta-preflight.json`. No customer bodies or credentials were exported.

## Product and integration round completed

The second Sol dossier is `evidence/faces-product-recon.json` and `.md`. It ran
21 bounded read-only database probes, unauthenticated HTTP boundaries and a
Vercel deployment read. FACES-PROD-001..005 record Ads cursor replay, hidden
freshness boundaries, historical heuristic attribution, incomplete collection
reported as success, and unbounded operator error payloads. The deployed Hub
source SHA was not exposed, so source causality is explicitly an inference.
No authenticated browser behavior or Meta provider token validity is certified.
The mutation count remains **zero**; there are no test writes to reverse.
