---
phase: 18-docs-governance
plan: "02"
verified: 2026-09-09T06:16:12Z
status: gaps_found
slice_status: passed
scope: Inventory tooling and review-needed packet only
score: 6/6 scoped tooling truths verified
requirements_completed: []
re_verification:
  previous_status: gaps_found
  previous_score: 3/6 scoped truths
  gaps_closed:
    - Nested Markdown inventory omissions
    - Requirement-description freshness blindness
    - Partial malformed requirement acceptance
    - Duplicate lifecycle frontmatter acceptance
  gaps_remaining:
    - Complete semantic document dispositions and requirement applicability
    - Task2 selected-source child-plan admission and status/body/index convergence
  regressions: []
gaps:
  - truth: Existing proposals/specs have reviewed requirement applicability and semantic dispositions.
    status: partial
    reason: Tooling supplies explicit review-needed candidates; seven packet relationships are not exhaustive per-document semantic or historical review.
    artifacts:
      - path: .planning/phases/18-docs-governance/18-DISPOSITIONS.md
        issue: 678 current Markdown records are inventoried, not semantically accepted.
    missing:
      - Complete body/source-backed dispositions and requirement applicability under reviewed source ownership.
  - truth: Selected stale statuses and supersession references are resolved through admitted exact changes.
    status: partial
    reason: The NATS patch packet is concrete but the selected-source child plan, mutations and debt-ratchet verification remain pending.
    artifacts:
      - path: .planning/phases/18-docs-governance/18-STATUS-PATCH-PACKET.md
        issue: Proposed patch is not an admitted or executed body/index correction.
    missing:
      - Selected integration-source ownership, bounded child plan, body/index updates and supersession/heading-debt validation.
---

# 18-02 inventory-tool independent verification

**Phase goal:** Active instructions and proposal dispositions lead the operator to supported behavior and remaining work.

**Result:** Corrected inventory tooling passes all six scoped truths. Full 18-02/DOC-02 acceptance remains open for semantic disposition and Task2 convergence. This review does not certify whole-history review, index mutations or Phase18 completion.

Root and reference-checkout instructions were read before their source inspection. The separate `minion-meta/` checkout remains a reference snapshot, not authority to overwrite the working checkout. Only this report was written by the verifier. Root repaired source/tests and regenerated the disposition artifact; no source, index, proposal or generated-output mutation was performed by this reviewer.

## Goal-backward truths

| Truth | Result | Evidence |
|---|---|---|
| Every current Markdown item is inventoried or explicitly excluded | Verified | Recursive physical-directory traversal records all 678 current Markdown files. Independent enumeration finds zero omissions. Nested artifacts have explicit review-needed states without invented top-level index membership. |
| Source reads use the existing confinement boundary | Verified within the local-workspace contract | Every index/body/requirement/check read uses safeSource. Physical directory traversal rejects directory symlinks and unsafe environment directories. An actual existing outside-root nested Markdown alias was independently denied; its synthetic sentinel remained unchanged. |
| Keyword matches and historical statuses never confer approval | Verified | Candidate disposition requires body/source review; declared complete is not reverified; retired remains no-new-authority; CLI reports semanticClosure:false. |
| Requirement acceptance text participates in generated freshness | Verified | Render includes actual descriptions and SHA-256 of REQUIREMENTS.md. Description-only changes alter output; independent probe and durable regression pass. |
| Reproduced malformed/duplicate metadata cannot silently narrow or alter inventory | Verified | Valid plus empty-description/missing-colon requirement declarations throw. Duplicate lifecycle frontmatter keys throw before the shared parser. Existing duplicate manifest/requirement-ID checks continue passing. |
| Packet separates inventory, semantic review and future mutations | Verified | Summary and packet retain manual applicability, selected-source child-plan and Task2 mutation gates. Mapper has no index-write path. |

**Score: 6/6 scoped tooling truths.** The roadmap also requires current instructions and full source/proposal handoff closure. DOC-01/03 are not recertified here; DOC-02 remains partially fulfilled rather than complete.

## Re-verification history

The original candidate at mapper SHA `5a4d9015f70304c9aba8819c61f9775ada3ccc1abaa39d34e7174ef222f42acb` passed six existing tests but failed independent probes:

1. A direct-directory scan omitted 18 nested current Markdown files while claiming every Markdown artifact was accounted for.
2. Requirement descriptions were absent from rendered evidence; changing acceptance text with the same ID produced identical output.
3. A malformed second requirement disappeared when another valid row existed.
4. Duplicate status keys selected the last value without an issue.

Root added recursive source-confined inventory, requirement source hashes/descriptions, mapper-local input prevalidation and four durable regressions. The shared source/parser helpers were not silently rewritten. All four findings were independently rechecked and are closed at the corrected hashes below.

The original generated-file check also failed after concurrent proposal-body updates. That was a freshness gate working correctly, not the same defect as missing requirement-description identity. Root regenerated after its ledger stabilized; the final check passes. Later source edits require another owner-run generation/check.

## Artifacts, wiring and data flow

| Artifact | Verification |
|---|---|
| scripts/qc/proposal-requirement-map.mjs | Exists, substantive and callable. CLI invokes build/render; actual requirements, indexes and all current Markdown bodies flow through confinement and metadata checks into evidence rows. |
| scripts/qc/proposal-requirement-map.test.mjs | Ten deterministic tests import the real builder/renderer and use disposable synthetic files; no tests skipped. |
| 18-DISPOSITIONS.md | 678 actual path/status/hash records, 49 requirement rows, 56 divergent IDs and zero reported top-level index/body presence/title/status issues. Requirement descriptions and source hash are rendered. |
| 18-STATUS-PATCH-PACKET.md | Seven reviewed relationships and one concrete NATS status-body correction; explicitly not an admitted child plan or applied source/index update. |

Nested supporting documents participate in inventory and candidate discovery but are not falsely claimed to belong to the top-level lifecycle indexes. Matching uses full document bodies by broad topic family; every requirement gets a review-needed candidate row. Only six candidate pointers per requirement are rendered, explicitly disclosed, while the exported build result retains all paths. Counts are not semantic coverage scores.

The mapper reads indexes and never changes them. Its only normal CLI write is the generated dispositions artifact; --check is read-only. Source-derived strings never execute historical instructions. Local Git identity is collected without package script execution and does not prove deployment. Confinement remains a trusted local-workspace source boundary, not hostile-process/filesystem isolation.

## Independent executed evidence

| Check | Result |
|---|---|
| node --test scripts/qc/proposal-requirement-map.test.mjs | 10 passed, zero failed/skipped; 126ms. |
| node scripts/qc/proposal-requirement-map.mjs --check | Passed: 678 documents, 49 requirements, 56 divergent IDs, zero inventory issues, semanticClosure:false. |
| Independent recursive enumeration versus buildDispositionMap | 678 records; zero omitted Markdown paths across specs/, proposals/ and corresponding minion-meta/ roots. |
| Disposable corrected regression probes using real exports | Nested coverage, changed-description rendering, partially malformed declaration and duplicate-key rejection all pass. |
| Existing outside-root target via nested Markdown symlink | safeSource rejects with Source escapes root; synthetic sentinel unchanged. |
| Scoped diff check | Passed. |

No server, provider, browser or production database was started or queried. Temporary fixture roots were removed by their own teardown. The verifier did not regenerate the inventory.

## Standards and spec boundaries

**Standards:** Source-confined reads, shared helper reuse, mapper-local validation, synthetic regressions, no dependencies and explicit nonapproval language pass this tooling review. The builder's TODO(handoff) links remaining semantic work to the platform QC proposal; root owns that ledger.

**Spec:** Task1 reaches its explicit inventory/review-needed boundary. It does not establish every historical relationship's applicability or per-document disposition. Task2 remains incomplete. The NATS reference actually has status retired at line5 and stale visible approval at line16; its parser supports retired while the working parser does not. The packet correctly preserves retirement and requires a selected integration source before any body/index change.

Remaining required work is concrete: reviewed semantic dispositions, requirement applicability, selected-source child admission, exact status/body/index patches, supersession-reference repair and heading-debt ratchet. Removed/archive-only Git revisions and whole-history review remain explicitly outside the current snapshot inventory. No human UI/runtime check is needed for these deterministic tooling tests; manual/source review remains required work, not a test result.

## Corrected candidate hashes

| Artifact | SHA-256 |
|---|---|
| scripts/qc/proposal-requirement-map.mjs | cb70ff507fc3ad185cfd306e45d5c5ef3bb2965936049c58f46aa8b051601a06 |
| scripts/qc/proposal-requirement-map.test.mjs | f0369c62889e2a0843f76b2b9a57c26cf89eccb9187966a0f2cdb0c535f66fc3 |
| 18-DISPOSITIONS.md | 862f0c3e8b60bf165ab78b6792a0277cf500df0dd722dd6f389f074b19ce576f |
| 18-STATUS-PATCH-PACKET.md | 4a1527af6c246dfaa156ca64faad8851ba6d9f797fdce8575421066fbb9c3a08 |

Root will refresh the worker-summary hash list against this candidate; the source hashes above are the independent review identity. A later summary-only update does not require re-running unchanged source behavior tests.

Independent GSD verifier. No source/index mutation or commit.
