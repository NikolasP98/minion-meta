# Document disposition and integration packet

Date: 2026-09-09. The inventory covers678 current Markdown files across the working checkout and the separate `minion-meta/` reference checkout, including templates/reviews. There are56 divergent same-ID bodies. Both inspected indexes match their own current bodies on presence/title/status. This does not establish agreement between checkouts, source implementation, deployed status, or exhaustive historical Git revision review.

The reference checkout is `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`. The inventory records the working checkout independently. Neither directory is overwritten or aligned by this operation.

## Reviewed relationships

| Prior work | Current disposition and requirement relationship | Evidence boundary |
|---|---|---|
| NATS event-plane implementation | Retired reference; JOB-01/02 and CAP-02 reuse transactional outbox and bounded-worker requirements. A broker cutover requires a fresh architecture decision. | Reference frontmatter is retired with a reason; its old body still says approved. Working copy still declares approved. Current runtime having NATS does not revive the remaining plan. |
| Factory worker containment | Reuse as the owner of OPS-03 and parts of AGT-06. It explicitly retains the socket risk and requires exact reviewed source, separate review runtime and stripped credentials. | Reference body and current runtime audit show why an approved spec is not activation evidence. No deployment gate is waived. |
| Factory durable state/outbox | Reuse implementation concepts for JOB-02/AGT-04; its source owner is the Factory runner, so it does not satisfy Hub job or Shells durability. | Reference declares implementing and changes_requested; body lists runner-owned files. |
| Hub load/navigation performance | Reuse existing dependency chain for UI-04/05, OBS-01/03 and CAP-01/02; avoid a second competing performance program. | Reference body explicitly folds CRM pagination and earlier performance work. Draft status and old measurements require current-source/runtime refresh. |
| Hub UI coherence spec and execution log | Reuse design-token authority and existing fixtures for UI-01/03/05/06. | Current tokens/native dialog fixtures were checked separately. Declared shipped does not establish every route/browser/assistive-technology claim. |
| Gateway Shells lifecycle stubs | Keep separate from bridge request correlation, durable outcomes and ACP conformance in AGT-03/04/05. | Gateway manager stubs do not implement the bridge-owned paths repaired in11-02 or pending11-03/04. |
| Stock reconciliation follow-ups | Preserve append-only physical ledger and item-specific UOM semantics for STK-01/02 and DATA-01/03. | The source10-02 retry/index patch is independently verified; production preflight/migration and separate-connection tests remain distinct. |

## Concrete status patch to prepare on the selected integration candidate

Target: `specs/2026-07-25-nats-jetstream-event-plane-implementation-spec.md`.

Precondition: preserve the current reference `status: retired` and `retired_reason`. Its body SHA is recorded in18-DISPOSITIONS. Replace the stale visible status with:

> **Status:** Retired. Only the infrastructure portion shipped. The remaining text is a historical design and does not authorize application cutover; re-propose that work against current architecture.

Keep the historical technical content and retirement reason. Validate the candidate's own spec frontmatter/index tooling; the old working checkout's status enum does not yet support `retired`, while the current reference tooling does. Copying only the lifecycle field into the old toolchain would create a false convergence and a lint failure.

This exact body/index update requires a bounded child plan against the selected integration source before DOC-02 closure. The packet is not a source change or renewed execution approval. Other56 divergent documents need their own evidence/disposition; a newer timestamp alone is insufficient. The whole Git history and removed/archive-only documents remain a separate history-review boundary.

## Validation and remaining gates

- Ten deterministic mapper tests pass: conflicting histories/retirement, shipped-status limits, supporting artifacts, index drift, incomplete/duplicate manifests, unsafe paths/environment aliases, and missing reference snapshots.
- `node scripts/qc/proposal-requirement-map.mjs --check` verifies the generated current-source inventory and intra-snapshot index consistency. It deliberately reports `semanticClosure:false`.
- Requirement candidate links cover all49 requirement rows with explicit review-needed states. Keyword matches do not confer implementation authority or prove applicable coverage; every returned path remains available through the exported mapping API.
- Complete reviewed requirement relationships, per-document dispositions, orphan supersession resolution, heading-debt ratchet and exact status child plans before DOC-02 closure. Preserve current generated indexes while the selected source candidate is unresolved.
