---
spec: 2026-08-17-gw-shells-lifecycle-stubs-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set the spec to pass 2 with approved status/verdict — the correctness issues were resolvable without a product decision.
- Narrowed the owner-surface claim to runtime behavior and allowed required `proposals/` handoff files — the original absolute claim contradicted S2/S3 and the repository handoff rule.
- Qualified `@minion-stack/shared` as read-only only on the implementation branch — branch R explicitly authorizes documentation edits there.
- Changed “four mutable fields” to “four contractual patch keys” — the contract also requires per-status rejection of otherwise listed keys.
- Corrected `shells.wake` to retain its documented asynchronous `ShellsWakeResponse` — the original synchronous `online` requirement contradicted the published response comment.
- Recast wake as one coordinator with a start result and shared completion promise — this lets the RPC return `provisioning` while archived invoke safely waits for restore.
- Required `shell.online` to be delayed until restore completes on wake and added recon of current emission timing — register-time emission would expose an unrestored shell to consumers.
- Corrected the RPC-error evidence — `remediation` belongs to `ShellErrorPayload` events, while RPC failures use the generic `ResponseFrame.error` envelope.
- Added recon of existing RPC error codes/details and online-event behavior, expanding the required recon report from six to eight answers — the spec must reuse verifiable conventions rather than invent wire semantics.
- Replaced invented wake-required/busy error shapes with stable existing error-envelope conventions — no shell-specific RPC error type is present in the shared contract.
- Added a stop condition when existing error conventions cannot express wake-required, busy, and timeout outcomes — resolving that would require an out-of-scope wire-contract decision.
- Replaced the nonexistent `netcup-gateway-swarm-deploy` citation with `2026-07-13-minion-gateway-swarm-cutover` — that checked-in spec supports the one-replica-per-organization premise.
- Removed the instruction for implementation to flip this spec's status — artifact reconciliation belongs to the gate/reconciler, not the runtime change.
- Made branch R reuse an existing not-implemented code instead of assuming `NOT_IMPLEMENTED` exists — only the generic string error code is proven by the shared type.
- Corrected the live `shells.update` examples to include both `shellId` and `patch` — the original commands did not match `ShellsUpdateParams`.
- Removed the invalid “online wake returns current summary” requirement and made non-archived status behavior recon-driven — `ShellSummary` is not a valid `ShellsWakeResponse`.

## Human flags

None. If recon finds no existing stable RPC error conventions for the three required outcomes, stop condition 6 requires a separate human wire-contract decision before implementation.
