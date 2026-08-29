---
id: 2026-08-17-hub-dead-mirrors-cleanup
title: Delete satisfied-TODO dead mirrors: local secrets.ts + workspace-membership schema
status: in-spec
created: 2026-08-17
updated: 2026-08-29
spawned_spec: 2026-08-17-hub-dead-mirrors-cleanup-spec
repos: [minion_hub]
tags: [logic, unwired]
value: 5
effort: S
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Delete satisfied-TODO dead mirrors: local secrets.ts + workspace-membership schema

## Problem

src/lib/types/secrets.ts TODO says remove once shared >0.5.0 ships gateway/secrets — hub is on ^0.9.0 and the shared file exists; 4 importers still use the stale mirror. src/server/db/schema/workspace-membership.ts marks itself TEMPORARY, superseded by @minion-stack/db, zero real callers.

## Definition of done

Both files deleted; importers retargeted to @minion-stack/shared / @minion-stack/db; svelte-check green; grep returns no references.

## Out of scope

Any behavior change.

## Implementation ownership (2026-08-29) — the cleanup was implemented twice

Two open hub branches carry these slices. Recording the disposition here because neither branch can
edit the other, and without this record the board cannot tell which implementation is authoritative.

- **PR [#159](https://github.com/NikolasP98/minion_hub/pull/159)** (`orch/hub-small-trio`, open
  draft, green at `50428ae6`) bundles this cleanup with two unrelated specs (IGV S3 tests,
  brain-org-all narrowing). It deletes both mirrors, re-points the schema barrel and
  `scripts/backfill-workspaces.ts`, keeps `SECRETS_METHODS` as a locally re-declared hub constant,
  and adds a 48-line `no-dead-mirrors` grep guard.
- **PR [#196](https://github.com/NikolasP98/minion_hub/pull/196)**
  (`factory/8790bd35-implementing-spec-delete-two-sat`, open draft, green at `e86d429a`) implements
  the same two slices on their own. It imports `SECRETS_METHODS` as a *value* from
  `@minion-stack/shared` instead of re-declaring it (the spec §2.2 client-bundle trap was checked:
  the package's root and `./gateway` output contain no `ws`/`node:` import), and its guard also
  asserts the canonical replacements still match what the hub deleted — the seven exact `secrets.*`
  wire strings, and `workspace_membership`'s table name, four columns, composite PK, index, and
  cascade FK.
- PR [#138](https://github.com/NikolasP98/minion_hub/pull/138) was an earlier Slice 1 attempt and is
  **closed without merge** (`mergedAt: null`); it is not a third live claimant.

**Disposition — #196 owns both slices.** It is the single-purpose extraction of this proposal and is
not gated behind two unrelated specs, and its guard covers the package-equivalence half of the
spec's "prove equivalence before deleting" contract. When #196 lands, #159 must drop its dead-mirror
commits on rebase — `src/lib/types/secrets.ts`, `src/server/db/schema/workspace-membership.ts`, the
`src/server/db/schema/index.ts` and `scripts/backfill-workspaces.ts` re-points, and its copy of
`src/lib/no-dead-mirrors.test.ts` — and keep only its IGV / brain-vector / finance work.

If a maintainer prefers to merge #159 first, the disposition inverts: #196 becomes a no-op and
should be closed unmerged like #138. Either way **do not merge both** — they edit the same files and
the same guard with different `SECRETS_METHODS` strategies, so the second one to land conflicts.

The rebase (or the close) is a maintainer action; the matching `TODO(handoff)` lives at
`src/lib/no-dead-mirrors.test.ts` in minion_hub.
