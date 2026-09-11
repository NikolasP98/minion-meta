---
phase: 10-durable-jobs-stock
plan: "09"
status: gaps_found
source_scope: independently_verified
requirements_completed: []
---

# Shared manifest independent verification

Root inspected the schema, additive904 migration, shared service and native tests, and independently passed27 unit/25 native foundation cases. The foundation executor independently inspected root-owned brain changes and passed30 native/43 unit cases; its evidence is10-05-VERIFICATION.md. Exact source hashes and original-to-final behavior are in10-09-SUMMARY.md. Each implementation was reviewed by someone other than its author.

The new migration preserves existing head/received-vector rows, rejects malformed or effect-row manifests and fails on a partial preexisting catalog. Shared binding serializes under current job/head ownership; missing binding with historical effects is not inferred. Bound admission/commit require matching hash. Actual prepared provider identity is checked synchronously and its private request survives later environment/caller mutation. Received-result persistence reasserts the hash. A missing batch cannot be admitted after the locked domain becomes ready, while an admitted uncertain remote result remains indeterminate.

Brain modes all bind the full ordered chunks/pipeline/provider plan. Final replacement requires complete batches/vectors and shares the receipt/progress transaction. Actual mutable-module, disabled/empty, duplicate retry, source reset/delete, provider-switch, SQL rollback and late URL failure cases pass. Loader cancellation, manual redirects, access semantics and original unit behavior remain covered. No provider request is real.

## Aggregate current-source check

`bun run check` passed with0 errors and0 warnings in `/tmp/minion-360-check-10-09`, using a fresh2416-file source/config snapshot with no application.env and a cleared child environment containing only PATH, empty public PostHog bindings and LANG. Snapshot SHA-256 `ef6654794ba04713b540f04e835fa5149540e27e737345a91a97e70ea2f48e91`; log `/tmp/minion-360-check-10-09.log`; attached execution67208 exited0. Installed dependency manifest/lock were unchanged; node_modules was the existing installed set.

After this snapshot, the brain native fixture gained only its Qdrant qualification TODO, and the contained tracer gained only its reaper-RSS TODO. Comparison against the current source found exactly those two comment differences at check completion. Later test-lane/profile work has its own validation and does not retroactively become part of this snapshot.

## Standards and remaining acceptance

No production migration, source release, package bump, paid calls, branch changes or cleanup occurred. Tenant RLS/grants and previous903 remain. Current-head hash is not immutable historical manifest storage. Corpus adoption, actual Qdrant generation/outbox triggers, driver failure settlement, canonical finance/brain native-lane admission, release catalog/drain, package/build acceptance and operator recovery/retention remain open. The test-suite preflight also discovered a differently named legacy test loading application environment; its separately admitted10-08 quarantine must be verified before broader default-suite execution.

These gates keep the phase and requirements open. Local source truth is stronger; no production or full-platform certificate is issued.
