---
phase: 09-security-containment
plan: "05"
status: gaps_found
slice_status: passed
requirements_completed: []
verified: 2026-09-09
---

# Independent shared-ledger restoration verification

The seven-file source restoration passes its conditional boundary. Root independently inspected initializer/profile/flow wiring, reran45 actual-engine ledger tests across4files and154 flow tests across8files, and ran the actual compiler-to-gateway/SQLite fixture (1call,1matched row,2retained rows,0model calls). Scoped whitespace checks passed. Executor's final gateway typecheck and six-file type-aware lint passed; no zero-file lint result was counted.

## Source and behavior

Receipt authority lives in a module-private WeakMap keyed by the actual constructed handle. Returned receipt views are frozen. Inspection checks the current global state object and handle identity, live main path/device/inode and supported profile. A new module cannot infer a receipt for an inherited global/HMR handle. Close/reset revoke the record before closing; failed initialization closes owned descriptors before publication.

The profile compares exact engine-produced canonical outbox catalog SQL and all five existing tuning values, with explicit writable_schema/query_only constraints. The legitimate json_extract delivery index and compatible missing-index upgrade pass. Extra objects, wrong table/index semantics, attachments/temp objects, closed/replaced handles and unexpected tuning fail. Exact catalog matching deliberately excludes alternate legacy DDL spellings; it does not rewrite history or sanitize unknown schemas.

Both data-handler writer paths use initializer inspection: shared CRUD resolution and consume preflight before even a zero-match read, followed by writer revalidation at marking. Path/device/inode/companion checks and connection anomaly checks remain mandatory. Fresh SELECT connections retain readOnly and disabled extensions and close in finally. No borrowed handle is closed to resolve a policy failure.

Real-handler fixtures verify shared CRUD/CTE/bindings, consume marks, nondefault configured file/default-file absence, immutable/foreign/HMR denial, persisted-row reopen, sidecars/hardlinks/sibling denial and a shared callback that a fresh reader cannot invoke. Full existing flow negatives for write-through-read, file management SQL and filesystem aliases still pass.

## Acceptance limits

All seven plan truths are supported within the declared trusted-process/source boundary. Private initializer history does not attest hostile raw-handle plugins, callback replacement, a compromised VFS or same-UID filesystem adversaries. Current raw getDb/SDK consumers retain that authority. Exact image/Node/SQLite/VFS, trusted processes/directories, persisted-schema/data lineage and temporary-storage qualification remain release gates; clean restart or temp_store=MEMORY alone do not satisfy them. Unknown profiles remain denied pending reviewed migration/profile admission.

No production files/DBs, migrations, runtime changes or provider calls were used. SEC-04/08 and phase09 remain globally open until broader authority/runtime/release gates are satisfied. This report does not certify general agent or filesystem sandboxing.

## Additional documentation finding

Root independently identified the pre-existing sqlite-pragmas.ts comment claiming unconditional power-loss durability and2x speed. A separately admitted comment-only correction cites SQLite's NORMAL-mode limitation and adds a17/19 durability/RPO handoff. Every PRAGMA value is preserved; that extra documentation file is outside the seven behavior hashes below.

## Candidate SHA-256

- `minion/src/infra/message-ledger.ts`: `60c0d9b047ef561fff115319c22d53aa21155867cc19c389920e61499bba8d62`
- `minion/src/infra/message-ledger-profile.ts`: `9fb95db39652824186d748c193ecc8bc7d1f1dac749dc9fbfb330f1eab008028`
- `minion/src/infra/message-ledger-provenance.test.ts`: `7e480ffd0dfa4ecc5cfaff2cc30663d2264aa5f3a3a1dcc4c43dce899d28524e`
- `minion/extensions/flows/src/data-nodes.ts`: `9bbb840f4896cedcb10da37dfccb4d4cffe34522c741474178e0996e7f27bd19`
- `minion/extensions/flows/src/data-ledger-provenance.test.ts`: `d2241003c85080bf481593d1454e8bdd1e46c7d4414c8267afa0a9a4cb058c65`
- `minion/extensions/flows/src/data-paths.test.ts`: `dd36a9f1cc36305e7eea5c20f829278ffbc8c48f6f320b1d65833a7de1948f5c`
- `minion/extensions/flows/minion.plugin.json`: `66e3da813967735924c9b5f2e0b02572af6ce469be73248961d6accefbc038f8`
