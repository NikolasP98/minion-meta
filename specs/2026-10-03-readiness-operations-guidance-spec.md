---
id: 2026-10-03-readiness-operations-guidance-spec
title: Reconcile current planning and Hub contributor guidance
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion-meta, minion_hub]
tags: [docs, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Current planning and Hub guidance

## 0. Product

OP-001 and OP-002: current guidance must route contributors to the active branch/auth/data model and distinguish historical pending work from verified current source.

## 1. AS-IS

Meta `.planning/STATE.md` September12 checkpoint still lists attachment authority/lifecycle defects addressed by Hub PR272/274. Historical task counts describe a broader private implementation program and must not be replaced with the new97-finding denominator. Hub CLAUDE.md gives obsolete dev/main branch flow, nonexistent db:push/db:seed commands, SQLite-only setup and a first-tenant fallback example, despite current Supabase identity, Postgres CoreCtx and local QA workflows.

## 2. TO-BE

The current state points to this97-finding program and has an explicit disposition for previous attachment findings: source fixed/merged, with deployment and authenticated-runtime receipt tracked separately. Preserve the September report body as historical evidence with a dated update pointer. Hub contributor guidance reads canonical registry branch roles and current declared commands, describes both legacy SQLite compatibility and authoritative PostgreSQL domains, and requires authenticated tenant/core context without first-tenant fallback. Existing safety/review/design rules remain.

## 3. DELTA

### Slice 1: Current evidence and entrypoint guidance

**Topics:** `docs`, `test`

1. Publish a dated disposition document with exact source anchors/merge evidence for attachment authorization/lifecycle. Update current STATE pointer and blocker row, preserving previous counts/history.
2. Correct Hub workflow/setup/backend/API guidance from repo-policy.yaml, package.json, hooks/auth/context helpers and QA documentation.
3. Verify each referenced path/declared command and run meta instruction/index checks. Read-only source/merge receipts never imply runtime acceptance.

## 4. Out-of-scope

Production runner repair/alert closure OP-003, application code, branch switching, dependency installation in active original checkouts, deployment and production writes.

## 5. Verification

Check clean-clone package scripts and existing QA entrypoints without resetting the shared QA service. Run repository-policy/instruction parity and index checks in the isolated meta checkout. Independent peer review must verify state distinctions and removal of the unsafe fallback example.
