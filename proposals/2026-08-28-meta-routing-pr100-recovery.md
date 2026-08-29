---
id: 2026-08-28-meta-routing-pr100-recovery
title: Recover tag-routing WIP from stale Meta PR 100 without merging its old base
status: review
created: 2026-08-28
updated: 2026-08-28
repos: [minion-meta, minion, minion_hub, minion_site, minion_plugins, paperclip, pixel-agents, minion-factory, minion-base]
tags: [infra, security, logic, test]
source: supervised-stale-wip-cleanup-2026-08-28
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Recover tag-routing WIP from stale Meta PR 100

Meta PR #100 contains a substantial but non-mergeable implementation of work-type
routing, per-slice tags, generated labeler configuration, and remote drift checks.
Closing the PR without a durable recovery record would hide useful implementation
evidence; merging it would overwrite current planning projections and reintroduce
known gate defects.

## Verified state

- PR #100 is based at `697e1aceaaebe1e6b53dcaf5ce09f1c23b5e776f` and its preserved head is
  `e2444a73525bfa7742c59b92e96e4362851d9bd2` on
  `factory/091c7d5c-earlier-slices-may-already-be-me`.
- Relative to current `dev` at cleanup time, the branch was 120 commits behind and
  12 commits ahead. Its merge-base diff spanned 44 files, 3,437 insertions, and
  1,095 deletions.
- The run exhausted its $12 lineage cap after repeated independent review failures;
  its final fix harness crashed. The current hosted `verify` check is red.
- The latest review identified four merge blockers: an incomplete isolated
  `spec-index` fixture dependency, conflicting schemas for domain topics versus
  work-type tags, stale generated indexes, and regex-based remote labeler checks
  that can certify comment-only or duplicate-key YAML.
- The branch and every implementation commit remain on GitHub. Important recovery
  anchors are `eb22baf` (taxonomy/generator), `69ec572` through `f6bc88d`
  (validation hardening), and `559ba20` (fleet installation attempt).

## Recovery plan

1. Reimplement the routing projection on current `dev`, giving work-type routing a
   field distinct from the existing domain-topic taxonomy unless an atomic schema
   migration proves that unification is safe.
2. Port tests before behavior: isolated index fixtures, malformed dates and slice
   tag separators, exact union checks, and parsed-YAML workflow/config validation
   with duplicate-key rejection.
3. Land Meta source-of-truth and generated artifacts in one reviewable PR. Regenerate
   indexes from the live corpus; do not copy the stale projections from PR #100.
4. Roll out fleet files as per-repository PRs, preserving each repository's existing
   labels and workflow permissions. Verify actual PR-event label application, not
   only file presence.
5. Add a scheduled authenticated remote-drift check, then remove temporary
   exceptions only after each external repository is empirically green.

## Definition of done

- Current Meta CI and all routing fixtures pass on the merged tree.
- Domain topics and work-type routing have one documented, non-conflicting contract.
- Remote verification parses YAML and fails closed on comments, duplicate keys,
  missing permissions, missing triggers, or inactive labeler steps.
- Each owned fleet repository has a reviewed installation and one observed labeler
  run; external upstream limitations are recorded explicitly.
- PR #100 can remain closed as historical WIP because all reusable intent, evidence,
  and commit anchors are discoverable from this proposal.
