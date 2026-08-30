---
id: 2026-08-17-hub-brain-org-all-scope
title: brain-vector org_all scope: implement or narrow the type
status: in-spec
spawned_spec: 2026-08-17-hub-brain-org-all-scope-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, edge-case]
value: 4
effort: M
source: debt-sweep-2026-08-17
---

# brain-vector org_all scope: implement or narrow the type

## Problem

brain-vector-client.ts:307 throws 'org_all vector scope is not implemented' while the type union (line 27) advertises it — runtime failure where the compiler could catch it.

## Definition of done

Either implemented (org-RLS-scoped, no sourceIds filter) with a success-path test, or the type narrowed to source_list only.

## Out of scope

New retrieval features.

## Open items (spec pass 2, 2026-08-29)

The spec's code-level DoD is shipped on `minion_hub` PR #195: `BrainVectorSearchFilters` no longer
represents `org_all`, the `not implemented` runtime throw is gone, a necessary `@ts-expect-error`
proves the compile-time rejection, and recon found no reachable production `org_all` caller and no
untyped `scopeMode` ingress (the sole client call site,
`src/server/services/brain-hybrid-retrieval.service.ts:1036`, constructs a literal `source_list`).

**Blocked — needs a spec amendment, not a code fix.** Spec §3 "Tests" also requires the emitted
`source_list` body to pass `isBrainVectorSearchRequestV1` *imported from `@minion-stack/shared`*.
That import cannot resolve inside the approved diff scope: the Hub pins
`@minion-stack/shared@^0.9.0` (`package.json:24`), and the published 0.9.0 tarball ships no
`brain-vector` export at all — the validator first appears in published 0.10.0, which adds both a
`./brain-vector` subpath and root re-exports. Spec §1 recorded the validator as verified "in the
current meta-repo checkout", i.e. against `packages/shared/src/`, not against the version the Hub
actually consumes; §3 "Files" and §4's diff-confinement clause exclude `package.json`/`bun.lock`.

Three implementation rounds have now oscillated on this one item: bumping the range to `^0.10.0`
was rejected twice by review as an unauthorized dependency/scope widen, reverting the bump
reinstates the missing-validator finding, and hand-copying the validator into the test would
assert against a reimplementation instead of the shipped contract. No Hub-scoped change can close
it. The Hub test therefore freezes the exact wire body `searchBrainVectorApi` emits, which catches
Hub-side drift but not Hub/shared drift. `TODO(handoff)` left at
`src/server/services/brain-vector-client.test.ts`, on the `emits a canonical source_list request
body on the wire` test.

**Unblock (needs an approver with meta scope; the slice is `security`-tagged, so its human gate
applies):** amend `2026-08-17-hub-brain-org-all-scope-spec.md` to add `package.json` and `bun.lock`
to §3 "Files", authorize `@minion-stack/shared@^0.10.0`, and record the blast radius in §5 (0.10.0
widens the package *root* export surface, not only the new subpath). The Hub can then bump the
range, import the published validator, assert the captured body passes it, and add a discriminating
negative control. This entry records the block; it does not grant that authorization.
