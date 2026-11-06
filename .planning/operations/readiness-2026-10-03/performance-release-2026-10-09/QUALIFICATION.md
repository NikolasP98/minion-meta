# Performance release qualification — public ledger

Updated 10 October 2026. This ledger publishes source and gate state only. Raw database output, host and container identifiers, local paths, memory observations, and operational receipts remain private.

| Lane | Canonical source reference | Verified state | Remaining gate |
|---|---|---|---|
| Hub notification compatibility and optimized policies | [Hub PR455](https://github.com/NikolasP98/minion_hub/pull/455), merge `304a63a5b0d667696925cbbd26905ef5f1f37fd4` | Merged and deployed successfully on 10 October 2026 after hosted checks and disposable PostgreSQL 17/18 qualification. A bounded read-only PostgreSQL 17.6 query verified migration `20261007120000` and the exact six-policy optimized catalog; it performed no notification write or send. Worker generation and admission remain zero, and the worker retains no access to the `auth` schema or its tables. | Worker activation is a separate proposal and remains disabled. |
| Gateway lifecycle ownership | Gateway DEV `eb40b998c45d305385d5dbfcb37537545a10f226` | Hosted build and the merged lifecycle checks passed. Read-only DEV observation matched the exact build and showed a healthy zero-restart runtime with HTTP 200, WebSocket 101, and the expected challenge. | Production promotion remains a separate held gate. |
| Windows durability and script-tree qualification | [Gateway PR307](https://github.com/NikolasP98/minion-ai/pull/307) (access-controlled repository), candidate `bde87a` | Source review preserves strict file durability errors and bounded termination uncertainty. Native probes identified the exact Windows directory-sync phase; focused native coverage passes 133 tests with five skips. The broader native run reported 250 passed, 51 failed and 34 skipped. | Backup-file flush and script exit-versus-close corrections are under review. Native Windows qualification and production promotion remain held. |
| Disabled notification worker artifact | [Hub PR456](https://github.com/NikolasP98/minion_hub/pull/456), candidate `3a8173d0426e2a85e624f1ef6c1f19876503767e` | Source review confirms the disabled artifact includes the PR455 runtime without resolution drift. The hosted disabled-artifact gate passed; the service remains disabled and receives no production credentials. A fail-closed repository-privacy guard blocks build, attestation and upload from the public Hub repository. No artifact has been published. | Final exact-source builds and hosted qualification remain in progress. A reviewed private archive store and supported provenance mechanism are also pending; private-repository attestation entitlement is not established. |

## Release boundaries

- Green source or CI is not deployment proof.
- The Hub web deployment does not start the adapter-node notification worker.
- No production notification worker activation, provider send, queue replay, or ad hoc SQL is authorized by this ledger.
- Production SQL verification is read-only and records catalog/admission state only.
- Gateway production promotion remains held until the DEV runtime and native Windows gates pass.
- Artifact completion stages an immutable disabled unit only; activation requires the separate approved lifecycle.

## Documents

- `proposals/2026-10-09-performance-release-qualification.md`
- `specs/2026-10-09-delivery-upgrade-fence-spec.md`
- `specs/2026-10-09-notification-performance-qualification-spec.md`
- `proposals/2026-10-09-hub-notification-worker-production-activation.md`
- `specs/2026-10-09-notification-worker-disabled-artifact-spec.md`
- `proposals/2026-10-09-gateway-native-formatter-reproducibility.md`
- `proposals/2026-10-09-native-formatting-coverage.md`
- `proposals/2026-10-09-windows-release-qualification.md`
- `proposals/2026-10-09-gateway-startup-heap-profiling.md`
