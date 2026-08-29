---
id: 2026-08-17-base-kanban-possibly-shipped-surface
title: minion-base kanban never renders/acts on G0's possibly_shipped verification flags
status: in-spec
created: 2026-08-17
updated: 2026-08-18
spawned_spec: 2026-08-18-base-kanban-possibly-shipped-surface-spec
repos: [minion-base]
tags: [board, ux]
value: 5
effort: S
source: factory-review-fix-run-8303bc51
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# minion-base kanban never renders/acts on G0's possibly_shipped verification flags

## Problem

minion-factory's G0 backward-staleness reconciler (`agent/reconcile.sh`, spec
`2026-08-17-sdlc-phase-gates-scoring-spec.md`) walks active specs and, on a
medium-confidence shipment match, writes `possibly_shipped: <evidence-url>`
frontmatter (plus `evidence:` on high-confidence flips and `link_review:` for
ambiguous revises/supersedes links) without changing `stage`/`status` — by
design, a human is supposed to confirm with one click on the board rather
than the sweep guessing. `scripts/spec-index.mjs` (minion-meta) now
deterministically projects all three fields into the committed
`specs/index.json` that the board fetches.

minion-base's `SpecFile` type has no `possibly_shipped` / `evidence` /
`link_review` fields, and `src/routes/kanban/+page.svelte` neither renders an
amber "needs verification" state nor offers a one-click confirm/reject
action. Until this repo is updated, the fields are computed and projected
but completely invisible and unactionable to the human — the entire point of
routing medium-confidence matches through a human gate instead of
auto-flipping state is defeated, because there is nowhere to see or act on
the flag.

## Definition of done

- `SpecFile` (or wherever the board's spec type lives) gains
  `possibly_shipped?`, `evidence?`, `link_review?` fields matching
  `specs/index.json`'s shape.
- The kanban board renders a visibly distinct (amber) state on any spec
  carrying `possibly_shipped` or `link_review`, showing the evidence
  URL/link-review note.
- A one-click action lets a human dispose of the flag — confirm-shipped
  (writes back to the spec, e.g. flips `stage: done`/`status: shipped`) or
  reject (writes `reconcile_ignore: true` per `specs/TEMPLATE.md` so the next
  G0 sweep leaves the spec alone). Whichever write-back shape is chosen, it
  must go through the same PR/commit path the board already uses for other
  spec mutations, not a direct unreviewed write.

## Out of scope

- Any further change to minion-factory or minion-meta — both already emit
  and project the three fields; this proposal is scoped to minion-base's
  consumption of them.
- Redesigning G0's high/medium/no-evidence confidence classification.
