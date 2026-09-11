---
phase: 18-docs-governance
plan: "02"
status: inventory_verified_semantic_disposition_pending
requirements_completed: []
---

# Current document history inventory and disposition packet

Implemented source-confined dual-snapshot inventory with SHA-256, declared lifecycle status, explicit review-needed states and49 requirement candidate rows. The current workspace/reference snapshots contain678 Markdown artifacts and56 divergent same-ID bodies. Both indexes are internally consistent for document presence/title/status.

Ten tests and the generated-file check pass. Tests cover unsafe paths and environment aliases, malformed/duplicate manifests, missing reference snapshots, index/body drift and the distinction between declared completion and independently verified behavior. Existing flat-frontmatter and source-confinement helpers are reused. No parser dependency or package changes were introduced.

The mapping reads complete current document bodies for candidate discovery; it does not semantically review every document or every historical Git revision. Lifecycle statuses never become approval in this tool.18-STATUS-PATCH-PACKET records seven manually reviewed relationships and the exact NATS retirement-body correction to prepare on a selected integration source. Current working and reference tooling differ on accepted lifecycle enums, so no status/index rewrite was applied.

## Pending completion

Task1 is implemented at the explicit inventory/review-needed boundary; manual applicability and source acceptance remain pending. Task2 has a concrete NATS packet, but exact child-plan admission, document mutations, remaining supersession references and heading-debt verification remain required. DOC-02 stays open. Independent review must assess this tooling and complete semantic dispositions before any full acceptance.

Source TODO plus platform QC proposal track unresolved disposition work. Root owns both indexes and preserved their pre-existing WIP; source/body and generated index changes require selected candidate ownership. No historical retired architecture was revived.

## Commands

- `node --test scripts/qc/proposal-requirement-map.test.mjs`:10passed.
- `node scripts/qc/proposal-requirement-map.mjs`:678documents,49requirements,56divergentIDs,0inventoryissues.
- `node scripts/qc/proposal-requirement-map.mjs --check`:pass, semanticClosure:false.
- Scoped `git diff --check`:pass.

## Candidate hashes

- `scripts/qc/proposal-requirement-map.mjs`: `cb70ff507fc3ad185cfd306e45d5c5ef3bb2965936049c58f46aa8b051601a06`
- `scripts/qc/proposal-requirement-map.test.mjs`: `f0369c62889e2a0843f76b2b9a57c26cf89eccb9187966a0f2cdb0c535f66fc3`
- `.planning/phases/18-docs-governance/18-DISPOSITIONS.md`: `e69f6e8e7f9813e12c446218991f9ae619ffa7b2b82616886e7c39c273a842be`
- `.planning/phases/18-docs-governance/18-STATUS-PATCH-PACKET.md`: `4a1527af6c246dfaa156ca64faad8851ba6d9f797fdce8575421066fbb9c3a08`
