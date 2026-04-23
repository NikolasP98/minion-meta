---
phase: 8
slug: polish-automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 8 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | GitHub Actions logs + pnpm scripts + manual timing |
| **Quick run command** | `pnpm lint-all 2>&1 | tail -5` |
| **Full suite command** | `pnpm lint-all && pnpm typecheck-all && minion doctor` |
| **Estimated runtime** | ~30 seconds automated; ~10 min human dry-run |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 08-01-T01 | 01 | 1 | POLISH-01 | file | `test -f .github/workflows/ci.yml && grep -q "lint-all" .github/workflows/ci.yml` | ⬜ pending |
| 08-01-T02 | 01 | 1 | POLISH-01 | script | `pnpm lint-all && pnpm typecheck-all` | ⬜ pending |
| 08-02-T01 | 02 | 2 | POLISH-02 | file | `test -f .github/workflows/release.yml && grep -q "changesets/action" .github/workflows/release.yml` | ⬜ pending |
| 08-03-T01 | 03 | 2 | POLISH-03 | cli | `minion doctor 2>&1 | grep -q "auth\|db\|shared"` | ⬜ pending |
| 08-04-T01 | 04 | 3 | POLISH-04 | grep | `grep -c "minion-shared" CLAUDE.md` = 0 (stale refs removed) | ⬜ pending |
| 08-05-T01 | 05 | 4 | POLISH-05 | manual | Timed clone-to-minion-dev dry-run < 10 min | ⬜ pending |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clone-to-dev in <10 min | POLISH-05 | Requires human timing on fresh shell | Follow README.md from scratch; time from `git clone` to `minion dev` running |
| CI green on PR | POLISH-01 | Requires GitHub Actions to run | Open a test PR and verify all checks pass |
| Release workflow publishes | POLISH-02 | Requires merge + npm token configured | Merge a changeset PR and verify npm shows updated version |

## Validation Sign-Off

- [ ] All tasks have automated verify or manual runbook
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set when complete

**Approval:** pending
