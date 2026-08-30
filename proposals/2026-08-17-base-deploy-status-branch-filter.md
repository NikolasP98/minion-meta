---
id: 2026-08-17-base-deploy-status-branch-filter
title: Board CI-green status computed across ALL branches, not the deploy branch
status: done
spawned_spec: 2026-08-17-base-deploy-status-branch-filter-spec
created: 2026-08-17
updated: 2026-08-18
repos: [minion-base]
tags: [logic, ui]
value: 8
effort: S
source: debt-sweep-2-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Board CI-green status computed across ALL branches, not the deploy branch

## Problem

src/lib/server/github.ts:168 actions/runs fetch lacks branch= filter; a green run on any PR branch paints the deploy branch healthy (and runs[0] vice versa).

## Definition of done

All three actions/runs fetches filtered by repo.branch; repo with red deploy-branch + green PR-branch shows red. 

## Out of scope

New status sources.
