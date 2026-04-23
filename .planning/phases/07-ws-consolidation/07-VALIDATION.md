---
phase: 7
slug: ws-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 7 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsc --noEmit (packages/shared), bun run check (hub + site), pnpm typecheck (paperclip) |
| **Quick run command** | `cd packages/shared && tsc --noEmit` |
| **Full suite command** | `cd packages/shared && tsc --noEmit && cd ../../minion_hub && bun run check && cd ../minion_site && bun run check` |
| **Estimated runtime** | ~45 seconds |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01-T01 | 01 | 1 | WS-01 | file | `test -f specs/ws-duplication-audit.md` | ⬜ pending |
| 07-02-T01 | 02 | 2 | WS-02 | build | `cd packages/shared && tsc --noEmit && npm pack --dry-run` | ⬜ pending |
| 07-02-T02 | 02 | 2 | WS-02 | publish | `npm view @minion-stack/shared version` = 0.3.0 | ⬜ pending |
| 07-03-T01 | 03 | 3 | WS-03 | typecheck | `cd minion_hub && bun run check` | ⬜ pending |
| 07-03-T02 | 03 | 3 | WS-03 | typecheck | `cd minion_site && bun run check` | ⬜ pending |
| 07-03-T03 | 03 | 3 | WS-03 | typecheck | `cd paperclip-minion && pnpm typecheck` | ⬜ pending |
| 07-04-T01 | 04 | 4 | WS-04 + WS-05 | grep + manual | grep -r "new WebSocket\|GatewayWsClient\|class.*WebSocket" src/ hub site paperclip | ⬜ pending |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E2E gateway session (paperclip → gateway → hub) | WS-05 | Requires live gateway + running services | Start gateway, connect hub, trigger paperclip agent, confirm event received in hub dashboard |
| Zero duplicate gateway-frame implementations | WS-04 | Requires human judgment on what "duplicate" means | Grep for frame-type strings across repos; review any that remain |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for type-check commands
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
