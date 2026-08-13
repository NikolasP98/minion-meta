---
id: TEMPLATE
title: Proposal Template
status: closed
created: 2026-08-13
updated: 2026-08-13
repos: [minion-meta]
---

# Proposal Template

Copy to `proposals/YYYY-MM-DD-<slug>.md`. Proposals are the output of request-agent
conversations (or written by hand). Run `node scripts/proposal-index.mjs` after edits.

## Frontmatter

| Field | Required | Values |
|---|---|---|
| `id` | yes | filename sans `.md` |
| `title` | yes | card label |
| `status` | yes | `draft` `review` `approved` `in-spec` `done` `rejected` `merged` `closed` |
| `created` / `updated` | yes | ISO dates |
| `repos` | yes | target repo ids (may be empty `[]` if the spec agent should decide) |
| `merged_into` | no | proposal id this was merged into (file stays as tombstone) |
| `possibly_reopens` | no | closed proposal id this may be a revival of (reconciler + human decide) |
| `duplicate_candidate` | no | proposal id the reconciler suspects is the same idea |
| `spawned_spec` | no | spec id once the spec stage picks this up |

## Body convention

Self-contained: problem in the user's words, motivation, sketch (Mermaid welcome),
explicit **out-of-scope**, and a testable definition of done. Ambiguity here is the
top failure cause downstream — freeze requirements at this boundary.
