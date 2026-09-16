---
phase: 11-agent-lifecycle
plan: "07"
reviewed: 2026-09-09
status: amendments_required
plan_sha256: 579b253c6431ae9543788a8875f84878b572f5bb4ec855e9ac77dec1bb9763b4
scope: independent read-only plan and source review
implementation_verified: false
---

# 11-07 independent plan review

The five-file foundation is feasible and keeps production wiring outside its boundary. Require the two narrow clarifications below before dispatch; neither requires another dependency, source file or service. The six root amendments resolve the earlier ambiguity about process ownership, trusted paths, persisted capacity policy, digest construction, durability evidence and actual emitted-package resolution.

## Required amendments

| ID | Exact plan seam and failure allowed by an incomplete implementation | Minimum amendment and proof |
| --- | --- | --- |
| R1 | Task2, lines 102–104: “exact expected tables/indexes” and “unknown tables” do not explicitly enumerate other executable schema objects. A store can retain expected table/index names while gaining a trigger, view, unexpected index or altered constraint. Header/version/shell checks alone would admit that altered store. This is a schema validation requirement, not a claim that such a store exists today. | Define the complete expected `sqlite_schema` object set, including the deliberate treatment of SQLite-owned autoindexes. Validate actual table constraints and index definitions, and reject unexpected triggers/views/indexes before writable journal setup. Repeat the relevant validation within the write transaction. Add native fixtures for an unexpected trigger and a weakened same-name schema/constraint, asserting refusal and unchanged existing database bytes. A fixed schema comparison or structural inspection is sufficient; no generic migration engine. |
| R2 | Task2, lines 100–106: uncertainty/cancel observation persistence has no explicit storage shape or finite history policy. `maxRuns` plus one bounded terminal does not bound an append-only cancellation/uncertainty history for an indefinitely unresolved run. | Store a finite set of bounded per-run observation fields, with repeated observations idempotent or replacing bounded observational metadata; alternatively specify an explicit persisted observation cap and safe saturation behavior. Prefer the fixed representation. No raw error/result payloads or unbounded arrays. Add repeat-cancel/repeat-uncertainty fixtures proving bounded representation, unchanged admission reservation and terminal monotonicity. This remains a logical bound, not a disk quota. |

## Confirmed contract choices

- **Terminal vocabulary:** `packages/shared/src/gateway/shells.ts:432` defines `final | aborted | error`, optional `stopReason`/`errorMessage`, `durationMs`, and optional opaque usage. Root amendment 4 retains the first fields, deliberately rejects usage/raw results in the new durable record, and leaves the legacy shape unchanged. No incompatible state rename is needed.
- **Digest:** the fixed ordered array includes shell/run/session/invocation/input/event identities and every proposed terminal payload field. SHA-256 belongs to Node owners; the shared normalizer/canonical text remains browser-safe. Excluding receiver-generated receipt identity/time avoids a circular digest. UTF-8 byte limits and lone-surrogate rejection prevent replacement-character ambiguity. Tests should include omitted optional fields versus their normalized representation, `-0` versus `0` normalization or rejection, Unicode boundaries, tampered content with an unchanged supplied digest, and fixed cross-owner digest vectors. No locale ordering or generic JSON canonicalizer is required.
- **Admission:** exact replay must be checked before capacity rejection, including at full capacity. Identity uniqueness must cover the shell-bound invocation and run identities, with a unique terminal event identity and one unresolved slot. A reused invocation with another run/session/input must conflict; changed invocation under an existing run must also conflict. These are direct fixtures for the plan's existing identity promise.
- **Transaction result:** admission reserves capacity; terminal/outbox insertion and slot release commit together. An oversized observation preserves the reservation. A successful method response must follow COMMIT. The amended plan correctly distinguishes rollback after a statement failure from an actually exercised COMMIT failure; an unexercised failure claim must remain unverified.
- **ACK:** matching event/run/shell/digest binds the acknowledged terminal; the digest transitively binds session/invocation/input. Repeated identical ACK remains usable at full capacity. Persisted receipt identity must not be silently replaced by conflicting replay. This proves local identity validation only. Remote authentication, receiver COMMIT, socket ownership and lost-ACK replay need the later receiver/sender fixtures.
- **Capacity:** persisted policy prevents a second opener changing the admitted reservation. Tombstones count toward capacity. Terminal persistence and ACK do not require another admission slot. No pruning policy, live operational size choice or filesystem exhaustion guarantee is inferred.
- **Paths:** the trusted private parent and rejection of linked database/sidecar paths are explicit assumptions. Validate the intended regular-file/private-directory policy and preserve handles on rejected foreign state. The plan correctly disclaims arbitrary same-UID path replacement resistance; database revalidation cannot turn pathname checks into a race-free filesystem capability.

## Actual runtime mapping and deferred integration

The current bridge does **not** already satisfy durable execution certainty. `bridge.ts:331–334` maps every rejected ACP promise to legacy `error` and releases its active run. `acp-client.ts:96–99` rejects a local timeout without stopping the harness; `acp-client.ts:147–148` also turns an ACP error response into an ordinary Error. Those values cannot be classified as observed terminal merely by testing `instanceof Error` or parsing its message. The decision's explicit unresolved classification and the unwired foundation boundary are therefore necessary. Sender/ACP adoption needs typed source provenance and actual generation ownership before it calls the terminal API.

`bridge.ts:381–395` maps notifications by session alone. Journal identities cannot repair late ACP updates or prove an old process stopped. `acp-client.ts:115–126` can return from stop after five seconds without an exit observation. Generation fencing, quarantine/reconciliation and confirmed local exit remain later lifecycle work. Two journal handles test SQL contention; they do not enforce a single live bridge process.

`bridge.ts:253–261` does not advertise a durable capability today. `pendingBridgeRpc` is not socket-owned, and send can drop frames while disconnected. The new capability, ACK and query types must stay inert until receiver14-12 and sender11-03 qualify the corresponding paths. Gateway uses its own `minion/src/shells/shared-types.ts` shim; canonical shared edits do not update that deployed contract.

## Runtime and artifact qualification

The bridge manifest presently requires `>=22.0.0`, while the proposed foundation requires the narrower no-flag floor. Root's supplied primary-source Node documentation is evidence for selecting the floor, not an executed minimum-runtime check. This review did not browse, download or execute Node/SQLite.

The source image manifest pins Node22.23.1 and bridge0.1.4. The amendment's available local22.23.1 executable is a runtime candidate, not proof of the pinned image's complete package contents. Minimum22.13.0 remains unavailable in the supplied evidence. Source/native work can proceed after amendment and root admission; Task3 and release claims remain partial until their exact runtime/artifact lanes pass.

The package's `exports` exposes only `.`; `src/index.ts` invokes `main()` and therefore is not an inert journal import. The amendment correctly selects the emitted private `run-journal.js` path for fixtures. The isolated bridge must resolve the freshly built shared package before native tests start. Do not import its active CLI entrypoint or treat a source alias/stale installed shared dist as emitted-package proof.

## Inspected evidence

| File | SHA-256 |
| --- | --- |
| `packages/shared/src/gateway/shells.ts` | `40cad5e97be00713f590092aabfc46c46e522dee747b20e890fd749983c872b1` |
| `packages/shells-bridge/src/bridge.ts` | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` |
| `packages/shells-bridge/src/acp-client.ts` | `93787e790834054cdac87d48a95c347a5d37a1d9c157a1093b5934e5d1a303b0` |
| `packages/shells-bridge/package.json` | `63cf520c4051fe62881fc2cd1b36089b2b53691d2918850b0dc40a3d2b9b0ad9` |
| `packages/workstation-image/manifest/versions.json` | `e0db02537a585515d41e09d05998230f1c3d24de94b3ce5ebfec4025652c4fe1` |
| `11-DURABLE-OUTCOME-DECISION.md` | `083cc6ce46b295d483c16ff2d48877c81b8c3d41683451f75d716f7e3d3ff3e7` |

Read the plan including its root amendments, canonical types/barrel, bridge lifecycle/ACP/config/entrypoint, bridge manifest/tsconfig, image manifest and decision. Scoped `rg`, `sed`, `cat`, `nl` and `sha256sum` only. One initial read used nonexistent `src/acp.ts`; corrected to actual `src/acp-client.ts`. No runtime test, native SQL, build, download, source or global planning mutation occurred.

**Standards:** review ownership and shared-tree constraints preserved. **Spec:** two bounded clarifications remain before implementation; no broad design change requested. This is plan readiness review, not implementation verification or AGT-04/phase11 closure.
