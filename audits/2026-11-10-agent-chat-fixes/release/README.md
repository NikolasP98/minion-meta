# Verified live release record

[release.md](../release.md) and [release.json](../release.json) record the completed bounded Hub/Gateway software release. Production source834 and immutable channel prd imagede25 match both running gateways, with health, deployment and read-only runtime checks passing. The November16 refresh verifies Hub source16def retains the fixes and passes all five bounded reads; the count window is November15 in America/Lima. Install Smoke passes, including its root/non-root step.

WhatsApp remains stopped/disconnected on both gateways. The independent Cloudflare worker failure is tracked by a draft proposal and comments-only unmergedPR376. Main npm's automatic job succeeded but skipped core latest publication under its existing version gate; no new latest package is claimed.

[release-receipts.json](../release-receipts.json) freezes private receipt hashes without copying chats, credentials, business identities, rows/counts or ephemeral links. `RELEASE-SHA256SUMS` binds these additive files. The original [README.md](../README.md), [qualification.json](../qualification.json), original `SHA256SUMS`, historical manifests and four signed contracts remain unchanged.

[PR998](https://github.com/NikolasP98/minion-meta/pull/998) is the authority for this record's publication and CI. Its final delivery evidence is tracked externally; this frozen record asserts no own future commit or merge.
