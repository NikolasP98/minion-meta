---
phase: 09-security-containment
plan: "04"
verified: 2026-09-09T05:53:00Z
status: gaps_found
slice_status: passed
slice_score: 6/6 truths verified under admitted provenance conditions
requirements_verified_in_scope: [SEC-08, SEC-04]
requirements_completed: []
gaps:
  - truth: "Supported shared-ledger writes and consume operations have established initializer provenance."
    status: partial
    reason: "Borrowed shared writers intentionally fail closed; current global handle API supplies no immutable initializer receipt."
    artifacts:
      - path: minion/extensions/flows/src/data-nodes.ts
        issue: "Shared writer/consume denial and exact-site restoration TODO remain."
    missing:
      - "Separately admitted initializer-provenance restoration before enabling borrowed writes/consume."
  - truth: "The deployed filesystem and SQLite runtime satisfy the containment assumptions."
    status: partial
    reason: "Local checks and fixtures cannot attest trusted same-UID processes, clean persisted schema/functions, engine temporary storage or concurrent ancestor ownership."
    artifacts:
      - path: minion/extensions/flows/src/data-paths.ts
        issue: "Explicit trusted-writer deployment condition."
      - path: minion/extensions/flows/minion.plugin.json
        issue: "Operator conditions are documented, not certified in deployment."
    missing:
      - "Exact-runtime/image and trusted-writer/temp/schema evidence, or an OS-enforced isolation implementation."
---

# Phase 09, slice 04: Independent verification

**Phase goal:** Assistant and flow requests cannot gain unauthorized data or write authority, and server diagnostics do not expose credentials.

**Result:** Conditional source containment passes all six scoped truths. Full security acceptance remains open. This review does not establish a hostile-process sandbox, race-proof path resolution, all SQLite I/O confinement or deployment.

## Truths, artifacts and wiring

| Observable truth | Verification |
|---|---|
| Existing main/sidecar/output aliases cannot redirect an admitted operation under the stated trust conditions | Verified: lexical confinement before creation; canonical operator root; no symlink descendants; regular single-link files; effective UID/root ownership; non-writable-by-group/world directory policy. Known journal/WAL/SHM files are checked before fresh opens and cached reuse. |
| Missing reads stay missing and new writes remain under the root | Verified: read admission never creates a target. New directories are created one component at a time with0700; outputs use0600 and exclusive create. Tests cover absent leaf/ancestors and lexical escape rejection before root creation. |
| Default/configured ledger identity does not authorize siblings | Verified: configured ledger admits an exact resource; explicit external ledger remains usable, external sibling denied. Shared file path is obtained from main database identity for a fresh independent reader. In-memory shared ledger is denied. |
| Caller writer SQL cannot attach/change policy/export/apply trailing statements | Verified: API limits top-level input to INSERT/UPDATE/DELETE/REPLACE/WITH; actual prepared `sourceSQL` must equal submitted SQL before `.run`. ATTACH, PRAGMA, DDL, VACUUM INTO and appended SQL tests reject without external effects. WITH can perform a read; no stronger write-only grammar claim is made. |
| Bound reads/CRUD/owned consume/output retain contracts | Verified with rollback-journal and WAL fixtures, CTE/bind controls, literal semicolons and numeric/null values. Borrowed shared writes/consume are intentionally denied under the admitted provenance rule; they are not counted as restored behavior. |
| Documentation states the trust boundary | Verified: source and plugin descriptions explicitly require trusted filesystem writers, clean SQLite/schema/function provenance and controlled temporary storage, and disclaim concurrent ancestor replacement and all-I/O isolation. |

`data-paths.ts` is substantive and imported by `data-nodes.ts`. All DB paths use admitted files and known companion validation. File output uses the returned file identity and no-follow descriptor, verifies `fstat` against `lstat` and prior identity, then truncates/writes through that descriptor; no pre-validation O_TRUNC. O_NONBLOCK avoids a swapped nonregular target causing a blocking open. `finally` closes the descriptor.

The three installed gateway methods dispatch to the inspected handlers. Read queries open `DatabaseSync` with `readOnly:true` and `allowExtension:false`, then close in `finally`. The independent reader preserves shared main-file identity without borrowing writer state. Global cached handles require this module's WeakMap receipt plus matching inode/device. Unknown cached handles are denied without closure. Known handles recheck sidecars and connection policy on reuse.

Connection inspection rejects attachments, writable_schema, unexpected function/module fingerprints and trigger/view/virtual-table schema. It detects anomalies; it is not attestation of callback identity or a sanitizer. A reference connection is closed in `finally`. Borrowed writers are rejected before inspection could be mistaken for provenance, and consume rejects them before opening a reader. Existing attached/shared connections are not detached, reset or closed to make tests pass.

## Independent execution

| Command | Result |
|---|---|
| From gateway: `timeout 9s node node_modules/vitest/vitest.mjs run --config vitest.extensions.config.ts extensions/flows/src/data-paths.test.ts extensions/flows/src/data-nodes.test.ts` |60 tests /2 files passed,6.95s; includes final FIFO/O_NONBLOCK candidate. |
| From meta root: `timeout 9s node --import ./langgraph-server/node_modules/tsx/dist/loader.mjs scripts/quality/flow-sql-integration.mts` |PASS;1 gateway call,1 matching row,2 retained rows,0 model calls. |
| Scoped gateway `git diff --check` |Passed. |

Fixtures execute actual handlers and SQLite with disposable synthetic resources. Negative controls inspect outside sentinel bytes or absence of output, retained rows, borrowed handle usability and retained attachments. Positive controls cover exact external ledgers, owned connections, ordinary journal/WAL and bound SQL. The full worker run recorded129 tests/7 files before the final FIFO addition; that historical count is not summed with this final focused60-test run or represented as an independently repeated final full-suite result.

Level-4 visual data tracing is not applicable. Runtime data flow is compiler-bound input → registered handler → admitted file → prepared SQLite bind → returned row, exercised by the durable integration fixture. File-write output is exercised through actual descriptor writes in disposable roots.

## Remaining boundaries and review axes

**Standards:** No new scoped blocker. Existing package/runtime APIs are used; no undocumented SQLite flags, journal rewrites, production probes, dependency changes or source edits by the verifier. The narrow no-base-to-string lint exception preserves existing RPC coercion and does not conceal authorization logic.

**Spec:**6/6 scoped truths pass with the contract's explicit provenance assumptions. SEC-08 and full phase status remain open for the two structured gaps. The source TODOs point to the existing platform-QC proposal and runtime/initializer follow-up. Readonly SQLite can still have engine-level behavior beyond these filesystem checks; no broad I/O claim follows from SELECT/CRUD filtering.

The full Phase09 roadmap also requires assistant SQL, assignment and diagnostic controls and SQL-binding acceptance. Those criteria are not dropped, but this report does not recertify the separate slices. A9 caller-to-runner capability propagation remains separately owned; an admin credential alone does not establish trust in every flow author.

No human step is necessary to accept the local deterministic tests. Before release, operator/runtime evidence must establish trusted roots, same-UID writers, persisted schema/functions and temporary storage, or stronger isolation must replace that assumption. Restoring shared consume/writes needs a separately reviewed initializer receipt. These are active gates, not evidence delivered by this report.

## Candidate identity

Five implementation paths were stable at worker handoff; verifier modified none.

| File | SHA-256 |
|---|---|
| `minion/extensions/flows/src/data-paths.ts` | `c075e09ae32e4636763bb6c7003e23c29f754ff41c4d7f02af2a7d37bb0a2906` |
| `minion/extensions/flows/src/data-nodes.ts` | `942716fbef0e0c2d42f3fd9d20420ae88c9baedd294a88f11693cd9ca2954928` |

Independent GSD verifier. No commit or global phase/requirement mutation.
