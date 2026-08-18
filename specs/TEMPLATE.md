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
| `status` | yes | `draft` `review` `approved` `implementing` `shipped` `superseded` `rejected` `parked` `unknown` |
| `pass` | yes | integer, 1-based; bump each review→revise cycle. Pass > 1 renders below the board divider |
| `created` / `updated` | yes | ISO dates; `updated` = last substantive change (board sorts by it) |
| `repos` | yes | target repo ids: `minion` `minion_hub` `minion_site` `minion_plugins` `minion-meta` `minion-base` `minion-factory` `paperclip` `pixel-agents` |
| `revises` | no | spec id this is a re-pass of (pass-2 links its pass-1) |
| `supersedes` | no | spec id this replaces — also flip the old spec's `status: superseded` (link both directions; never encode the link inside the status string) |
| `proposal` | no | source proposal id once the request pipeline exists; absent = human-authored |
| `verdict` | no | latest review roll-up: `pending` `approved` `changes_requested` `rejected`. Full review text lives in a sidecar `<id>.review.md` or the PR thread, never inline |
| `pr` | no | PR number when the spec is gated via GitHub — a pointer; PR state stays the canon |
| `type` | no | `feature` `fix` `infra` `decision` `research` (default `feature`) |

## Body convention

Keep the existing house style: `# Title`, then `## 0. Product` (what and why, in the user's
words), numbered sections, explicit **out-of-scope**, and an end-to-end verification step the
implementer can run. Slices sized "junior dev, 4–8 focused hours" with a machine-checkable
definition of done.

`scripts/spec-index.mjs --check` (the meta CI gate) enforces the three required sections above
by heading/keyword lint, plus date formats, `repos` ids, and `revises`/`supersedes` link
integrity (a `supersedes` target must exist and carry `status: superseded` — one-way links are
a CI failure). Specs that predate this check are grandfathered in
`scripts/spec-heading-lint-baseline.json`; every new or hand-edited spec must comply.
