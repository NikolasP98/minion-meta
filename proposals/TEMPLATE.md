---
id: TEMPLATE
title: Proposal Template
status: closed
created: 2026-08-13
updated: 2026-08-13
repos: [minion-meta]
source: human
source_trust: human
risk_class: unclassified
priority: medium
owner: human
---

# Proposal Template

Copy to `proposals/YYYY-MM-DD-<slug>.md`. Proposals are the output of request-agent
conversations (or written by hand). Run `node scripts/proposal-index.mjs` after edits.

Every entry in `proposals/index.json` is a canonical **WorkItem** record (spec
[`2026-08-18-factory-workitem-handoff-schema-spec`](../specs/2026-08-18-factory-workitem-handoff-schema-spec.md) §2.1):
the six fields marked required below are validated by `scripts/workitem.mjs` and projected into
every index entry. `node scripts/proposal-workitem-retrofit.mjs` fills them in for a file that is
missing them, using an explicit provenance rule table — it fails and names the file rather than
guessing an unknown source.

## Frontmatter

| Field | Required | Values |
|---|---|---|
| `id` | yes | filename sans `.md` |
| `title` | yes | card label |
| `status` | yes | `draft` `review` `approved` `in-spec` `done` `rejected` `merged` `closed` |
| `created` / `updated` | yes | ISO dates |
| `repos` | yes | target repo ids (may be empty `[]` if the spec agent should decide) |
| `source` | yes | provenance slug — `human`, `ci-watch`, `monitor`, `audit-*`, … (lowercase, no spaces, ≤120 chars) |
| `source_trust` | yes | `human` \| `trusted-automation` \| `untrusted-external` — whether automation may act without human gate 1. Only `trusted-automation` + `risk_class: low` can auto-approve; `human` and `untrusted-external` always keep the gate |
| `risk_class` | yes | `high` \| `low` \| `unclassified` — **derived from `tags`**, never chosen: no tags → `unclassified`, any of `auth billing data infra migration(s) perms/permissions security` → `high`, otherwise `low`. A declared value that disagrees fails the index build |
| `priority` | yes | `critical` \| `high` \| `medium` \| `low` — triage metadata only; it does **not** change FIFO dequeue order, and it is not an alias of `value` |
| `owner` | yes | accountable person or role (`human` or `factory` by default), ≤120 chars |
| `merged_into` | no | proposal id this was merged into (file stays as tombstone) |
| `possibly_reopens` | no | closed proposal id this may be a revival of (reconciler + human decide) |
| `duplicate_candidate` | no | proposal id the reconciler suspects is the same idea |
| `spawned_spec` | no | spec id once the spec stage picks this up |
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
