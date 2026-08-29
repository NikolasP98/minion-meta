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
| `value` | no | board scoring: relative payoff, integer |
| `effort` | no | board scoring: `S` `M` `L` — `scripts/proposal-index.mjs` rejects any other value |
| `source` | no | provenance of an auto-filed proposal, e.g. a review-fix run id |
| `tags` | no | routing/classification labels, e.g. `[logic, test]`; every value must resolve (as a canonical name or an alias) via `specs/topics.json` — `scripts/proposal-index.mjs` rejects an unknown tag, naming the file and tag |

## Body convention

Self-contained: problem in the user's words, motivation, sketch (Mermaid welcome),
explicit **out-of-scope**, and a testable definition of done. Ambiguity here is the
top failure cause downstream — freeze requirements at this boundary.

**AS-IS → TO-BE → DELTA (required):** state the current OBSERVABLE behavior
(with a reproduction or code/data anchor and evidence for the claim), the
desired observable behavior (plus invariants that must NOT change), and the
delta — the exact transitions between them. At proposal fidelity this is
user/product behavior; the spec deepens it to verified technical behavior.
A proposal whose AS-IS cannot be evidenced is a hypothesis, not a proposal —
say so explicitly.
