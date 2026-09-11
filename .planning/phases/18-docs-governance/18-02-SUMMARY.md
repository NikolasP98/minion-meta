---
phase: 18-docs-governance
plan: "02"
status: partial
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/18-02-a4f19c2e/MINION
base: origin/dev a018d6722904825d1c12fcb82d978448cde0265a
reference: minion-meta 59c4b56c192a730dbd63bb8e51dd8305eb2ad424
owned_files:
  - path: scripts/qc/proposal-requirement-map.mjs
    before: cb70ff507fc3ad185cfd306e45d5c5ef3bb2965936049c58f46aa8b051601a06
    after: dd958b88075e95efe103a051208e08e27c2408f2c0f4b0c009b6b6bf122a0f61
  - path: scripts/qc/proposal-requirement-map.test.mjs
    before: f0369c62889e2a0843f76b2b9a57c26cf89eccb9187966a0f2cdb0c535f66fc3
    after: f27569bfa9e6c43fe49fd976ee2a88c259ba3be1508fa5e960e9d3e80ed62a9e
  - path: .planning/phases/18-docs-governance/18-DISPOSITIONS.md
    before: f60a2a88e9a5486769cc15363f1e009edb51cfb081761679f0dc2b741e0b4a9e
    after: 0998cb386e9d4b55ce205c7156e97c0dcd51486cd37bc952680105db3313703b
  - path: specs/index.json
    before: 3866cde144ce0cc5d6c304b0f7c1474c8e3a01647982163eb76221092a4cf079
    after: 3866cde144ce0cc5d6c304b0f7c1474c8e3a01647982163eb76221092a4cf079
  - path: proposals/index.json
    before: 9c574b81725a071de580531e64cd80a2167311844f8a3120c623207aea0c2e5b
    after: 9c574b81725a071de580531e64cd80a2167311844f8a3120c623207aea0c2e5b
  - path: .planning/phases/18-docs-governance/18-STATUS-PATCH-PACKET.md
    before: 4a1527af6c246dfaa156ca64faad8851ba6d9f797fdce8575421066fbb9c3a08
    after: 1d0b797e7f0f496084d4ecca335ed6a1a2627dffa7dbaa6b13a2598cb11081c9
---

# Semantic dispositions, status-patch packet and debt gate (continuation of 2026-09-09 inventory tooling)

Continued from the rate-limited 2026-09-11 attempt at `/home/nikolas/.cache/claude-tmp/18-02-a4f19c2e/`. That snapshot was sound (mapper extended with a validated `REVIEWED` link table, three new tests, two of six review receipts) but sat on `origin/dev` `d3aab3b1`; `origin/dev` had advanced to `a018d672` (eleven new/changed proposals, regenerated `proposals/index.json`, no script changes), so the same detached worktree was moved to `a018d672` and every gate was re-run there. The `before` hashes above are the plan's original before-image (`checks/before.txt`); `checks/before-continuation.txt` records the intermediate state at the continuation start. `proposals/index.json` `before` is the `a018d672` value (the earlier `50a28629` value was `d3aab3b1`'s).

## Task 1 — disposition index with evidence and ownership

Six read-only body reviews (receipts A–F under `checks/`) covered all 51 requirement IDs in `.planning/REQUIREMENTS.md` (49 + UI-07/SEC-09). Each link is `[path, disposition, evidence]` with a line/section pointer, encoded in `REVIEWED` inside the mapper: 231 links over 155 distinct documents; every requirement has at least two links; none is empty. The mapper validates the table on every run: links to missing documents, unknown dispositions, incomplete entries, unknown or unreviewed requirement IDs, retired documents labelled anything but `superseded`/`out-of-scope`, and declared-complete documents labelled `active-requirement` all throw. Requirement owner comes from the REQUIREMENTS.md traceability table (`ownersFrom`). Every non-support document also carries a mechanical disposition; two new classes were added this session and are listed in the packet: `declared-complete-with-reconcile-denial-review-needed` (7 specs on `origin/dev`) and `declared-complete-with-stale-body-status-review-needed` (23).

Limits: 666 non-support documents have no reviewed link — they are inventoried with hash and mechanical state, not semantically accepted (`semanticClosure:false`). Receipt line pointers were spot-checked (nine lines re-read), not exhaustively re-read. Whole Git history and removed documents remain outside the inventory. Dispositions are review results; none is implementation, verification or deployment evidence.

## Task 2 — stale statuses and debt ratchet

Both generated indexes already match their bodies on `origin/dev` (`spec-index --check` 204 specs, `proposal-index --check` 244 proposals, both exit 0), so no index edit was warranted and none was made; both index hashes are unchanged. Every status inconsistency found lives in a spec body or frontmatter outside this plan's `files_modified`, so each is an exact, validated child action in `18-STATUS-PATCH-PACKET.md`: P1 NATS stale visible status (one line), P2 five orphan supersessions with actual successor evidence (one real successor found: `runtime-aware-fleet-image-updates` L16), P3 heading-debt baseline preserved at 112 entries (all ids exist; not reset), P4 seven reconcile-denied complete specs plus one body-contradicting shipped spec, P5 23 stale body-status specs (two materially contradictory). The existing bounded child plan `specs/2026-08-26-spec-heading-lint-baseline-backfill-spec.md` (draft) owns P2/P3/P5; P1 and P4 need a sibling child plan or an extension of it.

## Gates (snapshot, `checks/*.log`)

| Gate | Result | Exit |
|---|---|---|
| `node --test scripts/qc/proposal-requirement-map.test.mjs` | 14 pass, 0 fail, 0 skipped | 0 |
| `node scripts/qc/proposal-requirement-map.mjs` | 966 documents, 51 requirements, 231 reviewedLinks, 155 reviewedDocuments, 666 unreviewedDocuments, 44 divergentIds, 0 inventoryIssues, semanticClosure:false | 0 |
| `node scripts/qc/proposal-requirement-map.mjs --check` | pass | 0 |
| `node scripts/spec-index.mjs --check` | 204 specs, index up to date | 0 |
| `node scripts/proposal-index.mjs --check` | 244 proposals, index up to date | 0 |
| `git diff --check` (tracked) + trailing-whitespace/conflict scan of the four untracked owned files | clean | 0 |

Pre-continuation state (`checks/0*-pre.log`): 13 tests pass, generate/check fail with "Requirement SEC-01 has no reviewed applicability entry" — red before, green after.

## Deviations

- Dependencies were not installed in the snapshot: every gate uses node builtins and sibling scripts only (recorded in `checks/freeze.json`).
- The snapshot worktree was advanced to the current `origin/dev` instead of being recreated; all pre/post gates were re-run at `a018d672`.

## Gaps and blocked items

1. Body/frontmatter edits P1–P5 are outside `files_modified`; they need root-granted ownership of the spec bodies plus `scripts/spec-heading-lint-baseline.json` (each body edit drops that spec's grandfather hash). Unblocks: root assigns a child plan (extend `2026-08-26-spec-heading-lint-baseline-backfill-spec` or a sibling).
2. 21 documents (19 proposals, 2 specs) exist only on the planning branch, including `proposals/2026-09-08-platform-qc-remediation.md` and the only SEC-04/05 prior work; their links cannot be added until they land on `origin/dev`. Unblocks: root integration of those files with index regeneration.
3. 666 documents lack per-document semantic review. Unblocks: a decision on whether DOC-02 requires per-document acceptance beyond per-requirement applicability.
4. The requirements-file and mapper themselves are untracked on `origin/dev`; root owns landing them.

DOC-02 stays open. Root alone applies roadmap/requirement status.
