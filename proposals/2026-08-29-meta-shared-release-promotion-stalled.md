---
id: 2026-08-29-meta-shared-release-promotion-stalled
title: "minion-meta dev→main promotion has no owner — 13 changesets unpublished, @minion-stack consumers blocked"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta]
tags: [deps, infra]
---

# `minion-meta` dev→main promotion has no owner, and it is blocking consumer work

Filed by the pass-3 re-review of `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`,
whose Slice 0 is a hard gate on a real npm publish. That gate has been red for ten days and the
spec's §7 explicitly says chasing it is *not* that spec's job — so it is filed here instead of being
retried inside a blocked spec.

## AS-IS

`@minion-stack/*` publishes from `main`: merging a feature PR carrying a changeset into `main` opens
the automated "Version Packages" PR, and merging *that* runs `changeset publish`. Two merges, both
to `main` (`AGENTS.md` → CI & Release Automation; `.github/workflows/release.yml`).

Observed 2026-08-29 (all commands run against `NikolasP98/minion-meta`):

| Evidence | Value |
|---|---|
| `.changeset/` on `dev` | 13 pending changesets (oldest touched by work merged 2026-08-19) |
| `.changeset/` on `main` | `README.md` + `config.json` only — nothing queued for release |
| newest `chore: version packages` PR | **#18**, merged 2026-08-13 |
| `npm view @minion-stack/shared versions` | ends at `0.10.0`, published 2026-08-13 |
| `packages/shared/src/gateway/client.ts` on `main` | no `onEventError` / `onReconnectError` / `onSocketError` |

So the *first* of the two merges has not happened. This is not a slow second merge or a failed
publish workflow — nothing has been promoted from `dev` to `main` since 2026-08-13.

The `2026-08-13-request-to-deploy-sdlc-pipeline-spec` §6 promotion train (Saturday 21:00
America/Lima) names a promotion rule for the gateway, hub and site. It names **no rule for
`minion-meta` itself**, which is the one repo whose promotion is also an npm release. Operator memory
(`sdlc-board-triage-and-phase-gates.md`, 2026-08-20) records the promotion as a human's declared
"next step" that then did not happen; memory index also carries a standing caution that a dev→main
merge fires changesets, i.e. the merge is deliberately not routine. Whether the current state is an
intentional hold or an unowned stall is **not determinable from the artifacts** — that ambiguity is
the actual defect.

Blast radius today: every consumer-adoption item that depends on a published `@minion-stack/*`
version. Confirmed blocked: `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`
(S0 red → S1–S3 must not start; hub and site still pin `^0.9.0`). Twelve other pending changesets
ship nothing until the same merge happens.

## TO-BE

`minion-meta`'s promotion to `main` has a written owner and a stated cadence, so a pending changeset
has a knowable publish date and a blocked consumer spec has a knowable unblock date. Either:

- **(a) it joins the train** — an explicit promotion rule for `minion-meta` alongside gw/hub/site,
  with the release workflow's success (not the merge) as the completion signal; or
- **(b) it stays manual by design** — recorded as such, with the trigger condition ("promote when a
  consumer needs a published hook"), so an agent reading a red Slice-0 gate knows whom to ask instead
  of re-polling npm.

Invariant either way: publication is proven by a successful `release.yml` run **plus** registry
inspection of the exact version, never by a merged Version-Packages PR alone (that workflow has
failed on npm auth before).

## DELTA

1. A human decides (a) or (b) and records the decision in this proposal.
2. The current 13-changeset backlog is promoted (or explicitly deferred with a reason), and the
   resulting published versions are recorded here.
3. If (a): the train's promotion rule gains a `minion-meta` row, and a spec is spawned for it.
   If (b): the trigger + owner are written into `AGENTS.md`'s release section so it is discoverable
   from the repo, not only from memory.
4. Blocked consumer specs are notified by re-running their own Slice-0 gates — this proposal does not
   edit them.

## Out of scope

- Merging anything to `main` or publishing to npm from an agent run. Promotion is a human gate
  (`AGENTS.md`: never commit directly to a default or release branch), and this proposal only asks
  for the decision to be recorded.
- Auditing the other 12 pending changesets for release-readiness — that is the promoter's review, and
  batching it here would turn a governance gap into an unbounded task.
- Any consumer-side wiring; that work is owned by
  `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`.

## Definition of done

- This proposal names the owner and the cadence/trigger for `minion-meta` → `main` promotion.
- `npm view @minion-stack/shared versions` shows a version newer than `0.10.0`, and its registry
  tarball's `dist/gateway/client.d.ts` declares all three lifecycle hooks — or the proposal records
  the dated reason the backlog is intentionally held.
- The gateway-client consumer-adoption spec's Slice 0 can be re-run to a green result (or its block
  has a named owner and date).
