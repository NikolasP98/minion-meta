---
phase: 6
slug: auth-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `tsc --noEmit` (packages/auth), `bun run check` (hub + site) |
| **Config file** | `packages/auth/tsconfig.json` (extends @minion-stack/tsconfig/library.json) |
| **Quick run command** | `cd packages/auth && tsc --noEmit` |
| **Full suite command** | `pnpm build --filter @minion-stack/auth && bun run check` (hub) + `bun run check` (site) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/auth && tsc --noEmit`
- **After every plan wave:** Run full type-check in hub + site
- **Before `/gsd-verify-work`:** Staging shared-session smoke test
- **Max feedback latency:** ~30 seconds (type-check only; staging deploy is manual gate)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 06-01-T01 | 01 | 1 | AUTH-01 | typecheck | `cd packages/auth && tsc --noEmit` | ⬜ pending |
| 06-01-T02 | 01 | 1 | AUTH-01 | typecheck | `cd packages/auth && tsc --noEmit` | ⬜ pending |
| 06-01-T03 | 01 | 1 | AUTH-01 | typecheck | `cd packages/auth && tsc --noEmit && bun run check` (hub) | ⬜ pending |
| 06-02-T01 | 02 | 2 | AUTH-02 | build | `cd packages/auth && npm run build && npm pack --dry-run` | ⬜ pending |
| 06-02-T02 | 02 | 2 | AUTH-03 | typecheck | `cd minion_hub && bun run check` | ⬜ pending |
| 06-02-T03 | 02 | 2 | AUTH-03 | typecheck | `cd minion_site && bun run check` | ⬜ pending |
| 06-03-T01 | 03 | 3 | AUTH-04 | manual | Staging deploy + login smoke test | ⬜ pending |
| 06-04-T01 | 04 | 4 | AUTH-04 | manual | Production deploy + no forced logouts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (type-check via tsc/bun run check, no new test framework needed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login to hub → session valid on site | AUTH-04 | Requires live staging environment | 1. Deploy hub+site with new factory. 2. Login at hub URL. 3. Navigate to site URL. 4. Verify session cookie present and user is authenticated. |
| Production deploy — no forced logouts | AUTH-04 | Requires production environment | Coordinate deploy of hub+site simultaneously. Monitor error rates for 10 min. Confirm existing sessions still valid. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for automated checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
