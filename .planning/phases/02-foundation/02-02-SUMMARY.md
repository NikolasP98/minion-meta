---
plan: 02-02
phase: 02-foundation
status: partial
requirements: [FOUND-01, FOUND-03]
completed_at: 2026-04-19
pending_user_action: npm org create
---

# Plan 02-02 Summary: npm scope + GitHub remote

## Objective
Stand up external state (npm `@minion` org + `NikolasP98/minion-meta` GitHub repo) so Waves 3–6 can publish and push.

## What was built (autonomous portion)

**GitHub side (complete):**
- Repo created: [github.com/NikolasP98/minion-meta](https://github.com/NikolasP98/minion-meta) — public, wiki disabled
- Added `origin` remote at `git@github.com:NikolasP98/minion-meta.git`
- Pushed `main` to remote — branch now tracks `origin/main`
- First push included all prior meta-repo commits plus the Wave 1 scaffold

**npm scope availability:**
- Public probe: `@minion` scope + `@minion/cli` + `@minion/env` all return 404 → scope is available
- Decision locked: use `@minion` as the scope; fallback `@nikolasp98` documented but not needed
- No npm publishing has happened yet — all 4 package skeletons remain `private: true`

**Decision artifact:** `.planning/phases/02-foundation/02-02-NPM-SCOPE-DECISION.md`

## Pending human action (non-blocking until Wave 3)

Run at your convenience before `/gsd-execute-phase 2 --wave 3`:

```bash
npm login
npm org set minion --role owner NikolasP98   # or create via https://www.npmjs.com/org/create
npm access list packages @minion             # should not error with ENOSCOPE
npm profile enable-2fa auth-and-writes       # recommended
```

Once done, FOUND-03 is fully satisfied and Wave 3 can ship `@minion/tsconfig`, `@minion/lint-config`, `@minion/env`.

## FOUND requirement status

| REQ | Status | Notes |
|---|---|---|
| FOUND-01 (meta-repo at remote) | ✓ COMPLETE | Repo + push done |
| FOUND-03 (`@minion` scope usable) | ⏳ PENDING USER | npm org create — instructions in NPM-SCOPE-DECISION.md |

## Verification

- [x] `gh repo view NikolasP98/minion-meta` succeeds
- [x] `git remote get-url origin` returns `git@github.com:NikolasP98/minion-meta.git`
- [x] `git push origin main` succeeded; `main` tracks `origin/main`
- [x] `curl` probes on `@minion` scope return 404 (available)
- [ ] `npm access list packages @minion` — pending user `npm login` + org creation

## Self-Check
PARTIAL PASSED — autonomous work is complete (GitHub remote live, scaffold pushed). npm org registration deferred as a user-runnable one-liner; it doesn't block Waves 1-2 or 7-8 and has a clear unblock path for Wave 3.
