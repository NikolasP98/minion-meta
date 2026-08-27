---
id: TEMPLATE
title: Spec Template
stage: spec
status: parked
pass: 1
created: 2026-08-13
updated: 2026-08-13
repos: [minion-meta]
---

# Spec Template

Copy this file to `specs/YYYY-MM-DD-<slug>.md`. The YAML frontmatter is machine truth —
`scripts/spec-index.mjs` validates it and regenerates `specs/index.json` (committed; the
base.minion-ai.org board reads that one file). Run the script after adding or editing a spec.

## Frontmatter fields

Flat scalars and string arrays only — no nesting (the parser is deliberately tiny).

| Field | Required | Values |
|---|---|---|
| `id` | yes | filename sans `.md`; stable forever, the join key for links |
| `title` | yes | card label, no need to parse the H1 |
| `stage` | yes | `proposal` `spec` `dev` `test` `deploy` `done` — the kanban column |
| `status` | yes | `draft` `review` `approved` `implementing` `merged` `flag-ready` `shipped` `superseded` `rejected` `parked` `unknown` |
| `pass` | yes | integer, 1-based; bump each review→revise cycle. Pass > 1 renders below the board divider |
| `created` / `updated` | yes | ISO dates; `updated` = last substantive change (board sorts by it) |
| `repos` | yes | target repo ids: `minion` `minion_hub` `minion_site` `minion_plugins` `minion-meta` `minion-base` `minion-factory` `paperclip` `pixel-agents`. Empty (`[]`) only for a plan-of-record (`type: decision`) that milestone specs cite instead of implementing |
| `revises` | no | spec id this is a re-pass of (pass-2 links its pass-1) |
| `supersedes` | no | spec id this replaces — also flip the old spec's `status: superseded` (link both directions; never encode the link inside the status string) |
| `proposal` | no | source proposal id once the request pipeline exists; absent = human-authored |
| `verdict` | no | latest review roll-up: `pending` `approved` `changes_requested` `rejected` `revision-required`. Full review text lives in a sidecar `<id>.review.md` or the PR thread, never inline |
| `pr` | no | PR number when the spec is gated via GitHub — a pointer; PR state stays the canon |
| `type` | no | `feature` `fix` `infra` `decision` `research` (default `feature`) |
| `slice_tags` | yes (see below) | **per-slice** work types from `routing.yml`, not `specs/topics.json` — the slice, not the spec, is what a dev run routes on. One entry per slice in slice order: `slice_tags: [1:logic+test, 2:ui, 3:logic+infra+docs]`. Slice numbers run `1..N`; tags are canonical (no legacy values) and in the taxonomy's own order (`ui logic data infra docs test security perf deps`). Required for every spec `created` on or after `routing.yml`'s `sliceTagsRequiredFrom` unless its status is `superseded`/`rejected`/`retired`/`parked`; older specs are retro-tagged as they are triaged. If the body carries a `| # | Slice | … |` table, its row count must match. A spec that carries `slice_tags` must have `tags` equal their union **exactly** — canonical values only; a legacy value carried over from the source proposal (`handoff-sweep`, `edge-case`, …) is rejected there and belongs on the proposal instead. Validated by `scripts/spec-index.mjs` via `scripts/routing.mjs` |
| `merge_sha` / `merged_pr` / `merged_at` / `evidence` | no | controller-owned merge evidence; a verified merge moves work out of executable `stage: spec` |
| `release_flag` / `release_state` | no | release gate and current state; disabled flags use `stage: deploy`, `status: flag-ready` |
| `possibly_shipped` | no | evidence URL for a medium-confidence shipment match, written by minion-factory's G0 backward-staleness sweep (`2026-08-17-sdlc-phase-gates-scoring-spec` §3); rendered as an amber warning on the board; cleared only by a human confirm-shipped/reject disposition |
| `link_review` | no | G0 note about an ambiguous `revises`/`supersedes` link; blocks shipment dispositions until resolved |
| `reconcile_ignore` | no | `true` = G0 must skip this spec (written by a human `reject` disposition); read from spec markdown by the factory sweep only — deliberately NOT projected into `specs/index.json` |
| `relationship` | no | spec-intake classification vs existing artifacts: `new` `extends` `merges-drafts` `supersedes` `depends-on` `conflicts-with` `already-satisfied`. The spec agent RECOMMENDS; lifecycle changes are applied by the resolver/human, never unilaterally |
| `related` | no | ids the `relationship` refers to (specs or proposals), with a one-line reason each in the body |
| `tags` | no | routing/classification labels, e.g. `[logic, test]`; every value must resolve (as a canonical name or an alias) via `specs/topics.json` — `scripts/spec-index.mjs` rejects an unknown tag, naming the file and tag; `security` and `data` keep human gates at approval AND merge |

`repos`, `tags`, and `related` are the only array fields — always bracket syntax, always
strings (`tags: infra` is a scalar and fails the gate). Everything else is a scalar; bracket
syntax on a scalar field fails the gate too.

## Body convention

Keep the existing house style: `# Title`, then `## 0. Product` (what and why, in the user's
words), numbered sections, explicit **out-of-scope**, and an end-to-end verification step the
implementer can run. Slices sized "junior dev, 4–8 focused hours" with a machine-checkable
definition of done.

**AS-IS → TO-BE → DELTA (required):** AS-IS = current verified technical
behavior (code anchors, existing tests, constraints, known unknowns). TO-BE =
target behavior with invariants, compatibility requirements, and what must
remain unchanged. DELTA = the numbered transitions, each mapped to a slice and
to the test/evidence that proves it. A slice that doesn't trace to a DELTA
entry is scope creep; a DELTA entry with no proving test is an open end.

`scripts/spec-index.mjs --check` (the meta CI gate) enforces the `## 0. Product`, out-of-scope,
and verification sections by heading/keyword lint, plus date formats, field shapes, `repos` ids, and
`revises`/`supersedes` link integrity (a `supersedes` target must exist and carry
`status: superseded` — one-way links are a CI failure). Specs that predate this check are
grandfathered in `scripts/spec-heading-lint-baseline.json`; every new or hand-edited spec must
comply. The AS-IS → TO-BE → DELTA convention above is a review expectation, not a lint rule.

**Per-slice topics (required):** every `### Slice ...` heading must be followed, before the next
heading, by a `**Topics:** \`topic-a\`, \`topic-b\`` line whose entries each resolve to a
*canonical* name in `specs/topics.json` (an alias there is a lint error naming the canonical
replacement). `scripts/spec-index.mjs --check` enforces this for every spec id not in
`specs/topics.json`'s `sliceTopicValidation.grandfatheredSpecIds` — that exemption list is by
exact id only, never by `created` date, so a new spec cannot backdate its way out of the check.
