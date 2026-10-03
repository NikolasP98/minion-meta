# FACES production recon and mutation ledger

The user requested a second Sol recon against the FACES production backend and connected services, with all real-data tests logged and reversed. The implementation program remains active while this round runs.

## Access and scope

Start read-only: exact runtime identity, health, configured integration presence, authenticated read contracts, tenant/permission boundaries, sync state, operational errors, representative UI reads and performance. Retain redacted evidence; do not copy customer message bodies or credentials into the repository. Bound query volume and timeouts.

Any necessary test write must have a unique test marker, target and owner, before-state, precise request, observed result, compensation and post-cleanup verification recorded before the task can finish. Prefer disposable local replicas for concurrency/fault injection. A write is not performed if its irreversible external effects cannot be bounded and reversed. Real outbound messages, payments and external publication are not implicit test fixtures.

## Production identity receipt

Read-only preflight at 2026-10-03T02:31:24Z: FACES `/health` returned `ok:true`, protocol3. The service image was `ghcr.io/nikolasp98/minion-ai@sha256:26ca10558b46b902085fb828c1db928e77eab5eb4bed9b85c2fc316d65787bbb`. This proves service health and image identity only; authenticated workflows remain to be examined.

## Mutation ledger

No production mutation has been performed. The ledger must be updated before the first mutation, then reconciled against cleanup receipts at the end of each test.
