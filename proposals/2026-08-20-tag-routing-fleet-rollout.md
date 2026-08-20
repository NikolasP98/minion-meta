---
id: 2026-08-20-tag-routing-fleet-rollout
title: Roll the generated labeler configs out to the fleet + close the tag-routing open ends
status: draft
created: 2026-08-20
updated: 2026-08-20
repos: [minion, minion_hub, minion_site, minion_plugins, paperclip, pixel-agents, minion-factory, minion-base, minion-meta]
tags: [infra, docs]
source: handoff-ledger
---

# Roll the generated labeler configs out to the fleet

Follow-up to slice 8 of `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` (§4b),
which landed the taxonomy in minion-meta only. This proposal carries the open ends
that slice deliberately left, so they are written down rather than assumed.

## AS-IS (verified in this repo, 2026-08-20)

- `routing.yml` declares the 9-value tag enum and per-repo glob → tag rules for all
  9 fleet repos; `scripts/routing.mjs validate` gates it, `scripts/routing.test.mjs`
  covers the glob dialect, the derivation and the CLI.
- `scripts/spec-index.mjs` and `scripts/proposal-index.mjs` reject an unknown tag
  and a scalar (unbracketed) `tags` value. Proven red-before/green-after against the
  pre-change script.
- `generated/labeler/<repo-id>.yml` is written for every fleet repo — but **no fleet
  repo consumes it**: none has `.github/labeler.yml` or a labeler workflow, so PR
  labels (the "authoritative" derivation in §4b) do not exist yet.
- `routing.yml`'s `legacyTags` allowlist still carries 9 pre-taxonomy values
  (`handoff-sweep`, `edge-case`, `unwired`, `hardcoded`, `todo`, `duplication`,
  `board`, `ux`, `crm`) used by 36 tag occurrences across ~30 cards. The factory's
  handoff sweep keeps writing `tags: [handoff-sweep]`, so that entry cannot expire
  on its own.
- Spec **slice-level** tags (§4b: "the slice is the routable unit, not the spec")
  live in the body's slice table and are unparsed — only the spec-level list is
  validated. `TODO(handoff):` markers sit at both sites (`scripts/routing.mjs`,
  `scripts/spec-index.mjs`).

## TO-BE

1. Each fleet repo has `.github/labeler.yml` copied verbatim from
   `generated/labeler/<id>.yml` plus a labeler workflow on `pull_request_target`,
   so every PR carries derived work-type labels.
2. A meta-side check fails when a repo's committed `labeler.yml` drifts from the
   generated artifact (the same "generated is truth" contract as `repo-policy.json`).
3. minion-factory reads `generated/routing.json` to compose the per-tag dev loop and
   the per-facet reviewers (slice 9 of the phase-gates spec) instead of re-deriving
   tags; the handoff sweep writes `source: handoff-sweep`, freeing that legacy entry.
4. `legacyTags` shrinks to empty as the ~30 legacy cards are retagged during their
   next triage pass; the validator already fails on an entry that has gone unused.
5. Slice-level tags are machine-checked (either a parsed slice table or a per-slice
   frontmatter block), and a declared-vs-derived mismatch is a G4 finding.

## DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | Copy 9 generated configs + add labeler workflow per repo | a PR in each repo shows the labels applied |
| 2 | Meta drift check for installed labeler configs | mutate a copy → check fails |
| 3 | Factory consumes `generated/routing.json`; sweep writes `source` | a handoff proposal with no `handoff-sweep` tag |
| 4 | Retag legacy cards, delete allowlist entries | `pnpm run routing:validate` fails on an unused entry |
| 5 | Slice-level tag validation | a spec whose slice tags disagree with its diff is rejected |

## Out of scope

Changing the taxonomy itself, the gate rubrics (slices 1–7, 9, 10 of the phase-gates
spec), and any board rendering of tags.

## Definition of done

`gh api repos/<owner>/<repo>/contents/.github/labeler.yml` returns the generated
content for all 9 fleet repos, the drift check is wired into meta CI, and
`routing.yml`'s `legacyTags` is empty.
