---
phase: 15
slug: structured-output-notification-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts (workspace root) |
| **Quick run command** | `pnpm test --run src/agents/llm-tools/ src/auto-reply/heartbeat` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~15 seconds (unit) |

---

## Sampling Rate

- **After every task commit:** Run quick unit test for the changed file
- **After every plan wave:** Run full `pnpm test --run` unit project
- **Before `/gsd-verify-work`:** Full suite must show no new failures vs baseline (42 TS errors baseline)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 15-01-T01 | 01 | 1 | OUT-01 | unit | `npx vitest run --project unit src/agents/llm-tools/forced-tool-call` | ⬜ pending |
| 15-02-T01 | 02 | 2 | OUT-02 | unit | `npx vitest run --project unit src/auto-reply/heartbeat.structured` | ⬜ pending |
| 15-02-T02 | 02 | 2 | OUT-02 | unit | `npx vitest run --project unit src/auto-reply/heartbeat.structured` | ⬜ pending |
| 15-03-T01 | 03 | 2 | OUT-03 | unit | `npx vitest run --project unit src/auto-reply/reply/notification-eval` | ⬜ pending |
| 15-03-T02 | 03 | 2 | OUT-04 | unit | `npx vitest run --project unit src/auto-reply/reply/notification-eval` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/agents/llm-tools/forced-tool-call.test.ts` — stub tests for OUT-01 (forcedToolCall utility)
- [ ] `src/auto-reply/heartbeat.structured.test.ts` — stub tests for OUT-02 (structured heartbeat)
- [ ] `src/auto-reply/reply/notification-eval.test.ts` — stub tests for OUT-03/04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heartbeat suppression end-to-end | OUT-04 | Requires live gateway + channel | Trigger a heartbeat with empty HEARTBEAT.md; verify no message is sent to Telegram/Discord |
| Cron run with "no change" result | OUT-04 | Requires live cron scheduler | Schedule a cron job that returns empty status; verify user channel is silent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
