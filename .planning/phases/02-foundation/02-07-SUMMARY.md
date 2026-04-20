---
phase: 02-foundation
plan: 07
subsystem: infra
tags: [infisical, netcup, paperclip, minion-gateway, renaming, memory, production]

# Dependency graph
requires:
  - phase: 02-foundation
    provides: Wave 4 CLI (@minion-stack/cli) + env hierarchy (@minion-stack/env) that consume Infisical project slugs
provides:
  - Infisical projects all named per `minion-<name>` convention
  - Production services (bot-prd gateway, paperclip container) observed healthy post-rename with zero config edits (UUID-targeting preserved)
  - Authoritative inventory of old-name references in meta-repo + subprojects + Netcup + memory (DISCOVERY.md)
  - Step-by-step executed runbook with rollback notes (RUNBOOK.md)
  - Validation transcript of automated + Netcup checks (VALIDATION.md)
  - 6 memory files updated with rename footers
affects: [02-08, Phase 3 adoption plans, any future plan referencing Infisical project slugs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UUID-first Infisical targeting — `--projectId <uuid>` in production ExecStart lines, slug only for human readability"
    - "Dashboard-driven rename path (Infisical CLI v0.43.76 has no `projects` subcommand — documented in DISCOVERY §1)"

key-files:
  created:
    - .planning/phases/02-foundation/02-07-RENAME-DISCOVERY.md
    - .planning/phases/02-foundation/02-07-RENAME-RUNBOOK.md
    - .planning/phases/02-foundation/02-07-RENAME-VALIDATION.md
    - .planning/phases/02-foundation/02-07-SUMMARY.md
  modified:
    - .planning/phases/02-foundation/deferred-items.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/reference_infisical_setup.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/project_paperclip_netcup_deployment.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/project_paperclip_infisical_integration.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/project_twilio_voice_call_secrets.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/reference_voice_call_deployment.md
    - ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/reference_paperclip_gateway_access.md

key-decisions:
  - "Dashboard-only rename path (Infisical CLI has no `projects` subcommand — B3 Option (a) executed via Infisical web UI, not CLI)"
  - "UUID-based zero-edit Netcup — paperclip docker-compose + bot-prd systemd unit use `--projectId <uuid>` so slug rename required zero production edits (Discovery §7 prediction confirmed)"
  - "Gateway project consolidated: `minion-gateway-prod` renamed to `minion-gateway` with dev+prod envs inside, replacing the original dual-project split in D10"
  - "`minion-hub` and `minion-site` already correctly named with live dev secrets — no action needed (D10 was outdated on this point)"
  - "Voice-call smoke test deferred per user 2026-04-20 — automated /voice/webhook 401 + healthy systemd + 2-day uptime deemed sufficient; deferred item tracked for future belt-and-suspenders run"

patterns-established:
  - "Three-artifact execution pattern for production-touching plans: DISCOVERY (grep inventory) → RUNBOOK (executed state + rollback) → VALIDATION (automated + on-host checks)"
  - "Tailscale-SSH re-auth fallback: when on-host verification is blocked by auth, downgrade the check to a user-driven checkpoint rather than a hard block"

requirements-completed: [FOUND-11]

# Metrics
duration: ~90 min (across multiple sessions 2026-04-19 → 2026-04-20)
completed: 2026-04-20
---

# Phase 02 Plan 07: Infisical Rename Cascade Summary

**Seven Infisical projects renamed/created to `minion-<name>` convention (ai-providers → minion-core, paperclip → minion-paperclip, +5 new placeholders + 2 already-correct) via dashboard; zero Netcup edits required because production services target Infisical by UUID, not slug.**

## Performance

- **Duration:** ~90 min (distributed across 2 sessions: 2026-04-19 discovery + 2026-04-20 mutation + validation + closure)
- **Started:** 2026-04-19T23:59Z (plan read) / 2026-04-20 (execution window)
- **Completed:** 2026-04-20T19:50Z
- **Tasks:** 6 of 7 (Task 6 voice-call smoke test deferred per user; all other tasks complete)
- **Files modified:** 4 planning docs + 6 memory files + deferred-items.md = 11 file changes

## Accomplishments

- **7 Infisical projects** now named per D10 mapping: `minion-core`, `minion-gateway`, `minion-paperclip`, `minion-hub`, `minion-site`, `minion-plugins`, `minion-pixel-agents`.
- **Zero-downtime rename** achieved — both production services (bot-prd gateway systemd + paperclip docker container) targeted Infisical by UUID, which is stable across slug changes. The Discovery §7 prediction ("Low risk — UUID-based clients unaffected") was confirmed on-host.
- **6 memory files** updated with rename footers so future AI-assisted work sees the current naming.
- **Three planning artifacts** (DISCOVERY, RUNBOOK, VALIDATION) committed as a reusable pattern for future production-touching plans.
- **FOUND-11 requirement satisfied.**

## Task Commits

Each task / phase was committed atomically:

1. **Task 1 (DISCOVERY)** — `1c13c61` `docs(02-07): Infisical rename cascade — discovery report` + `2b81544` `docs(02-07): partial progress — discovery done, dashboard + smoke test pending`
2. **Task 2 (CHECKPOINT — user decision)** — no commit (user replied `proceed-now`)
3. **Task 3 (MUTATION — Infisical dashboard ops + RUNBOOK)** — `200396e` `docs(02-07): Infisical rename cascade — dashboard ops complete, CLI verified`
4. **Task 4 (Memory updates)** — `acb183a` `docs(02-07): Infisical rename cascade — runbook + memory updates (Task 3+4 complete)` (memory files themselves are outside git; footer edits are inline)
5. **Task 5 (CHECKPOINT — Netcup verification)** — covered by `5a155f4` (orchestrator ran SSH verification after user restored Tailscale auth)
6. **Task 6a (Automated health checks)** — `5a155f4` `docs(02-07): Infisical rename cascade — validation draft (Netcup + automated checks)`
7. **Task 6b (Voice-call smoke test)** — **DEFERRED** per user 2026-04-20; no commit, tracked in `deferred-items.md`

**Plan closure commit:** (this commit) `docs(02-07): close Infisical rename cascade — smoke test deferred per user` — bundles VALIDATION.md finalization + SUMMARY.md + deferred-items.md entry + STATE.md + ROADMAP.md + REQUIREMENTS.md.

## Files Created/Modified

### Created

- `.planning/phases/02-foundation/02-07-RENAME-DISCOVERY.md` — Grep inventory across meta-repo, subproject CI, memory, Netcup; CLI rename-capability investigation; D10 target state + risk assessment.
- `.planning/phases/02-foundation/02-07-RENAME-RUNBOOK.md` — Executed state: which projects were renamed/created, via which method (dashboard), UUIDs preserved, secret counts verified, rollback notes.
- `.planning/phases/02-foundation/02-07-RENAME-VALIDATION.md` — Netcup verification transcript, `minion doctor` output, gateway health probes, deferred-smoke-test justification, ready-for-02-08 signal.
- `.planning/phases/02-foundation/02-07-SUMMARY.md` — This file.

### Modified

- `.planning/phases/02-foundation/deferred-items.md` — Added "02-07 voice-call smoke test (deferred per user 2026-04-20)" with rerun procedure.
- 6 memory files under `~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/` — Rename footers added; old slug references updated to `minion-*` convention; UUIDs preserved for stability.

## Decisions Made

- **Dashboard rename path.** Infisical CLI v0.43.76 has no `projects` subcommand (confirmed in Discovery §1). Option (a) from the plan (CLI rename) was infeasible, so the rename was executed through the Infisical web dashboard at `http://100.80.222.29:8080`. Captured in RUNBOOK as `minion-core-strategy: renamed` + method `dashboard`.
- **UUID-based zero-edit Netcup.** Discovery §5/§7 predicted that both paperclip docker-compose and bot-prd systemd unit target Infisical by `--projectId <uuid>`, which is stable across slug renames. On-host verification (Task 5) confirmed: `INFISICAL_PROJECT_ID=99490998-...` in paperclip's `docker-compose.deploy.yml`, `infisical run --projectId 5d7bbcef-...` in bot-prd's ExecStart. No edits were needed on Netcup.
- **Gateway project consolidation.** Original D10 specified two parallel gateway projects (`minion-gateway` dev + `minion-gateway-prod` prod). User chose to consolidate into one project `minion-gateway` with dev+prod envs inside, matching Infisical's native env-per-project convention. RUNBOOK §"NOTE vs original D10 mapping" records the deviation.
- **Voice-call smoke test deferred per user.** User replied "skip voice-call smoke tests for now" on 2026-04-20. Deemed safe because automated proof-of-life (`/voice/webhook → 401`), healthy systemd uptime (2 days post-rename), and UUID-based client targeting all redundantly cover what the smoke test would uniquely exercise. Tracked in `deferred-items.md` for future belt-and-suspenders run.

## Deviations from Plan

### [Rule 3 — Blocking] Infisical CLI has no `projects` subcommand

- **Found during:** Task 1 (Discovery)
- **Issue:** Plan's Task 3 assumed the Infisical CLI could perform project creation + rename via `infisical projects create|update`. CLI v0.43.76 returns `Error: unknown command "projects" for "infisical"` for any `projects` subcommand.
- **Fix:** Switched to dashboard-only rename path. Recorded `minion-core-strategy: renamed` (B3 Option (a) executed via web UI, not CLI). User performed the dashboard operations.
- **Files modified:** `02-07-RENAME-DISCOVERY.md` §1, `02-07-RENAME-RUNBOOK.md` §Step 1 Method
- **Verification:** `infisical secrets --projectId <uuid> --env <env>` post-rename confirmed secret counts preserved (6 in minion-core, 19 in minion-paperclip, 17 in minion-gateway-prod env).
- **Commit:** `1c13c61` (discovery), `200396e` (dashboard ops complete)

### [Rule 1 — Correction] Task 6 gateway-ping URL misdirected

- **Found during:** Task 6 automated checks
- **Issue:** Plan line 651 specified `curl http://100.80.222.29:8080/ping` as the gateway health probe. Port 8080 on Netcup is the Infisical dashboard, not the gateway.
- **Fix:** Substituted `https://netcup.donkey-agama.ts.net/voice/webhook` (Tailscale funnel path). Returned `401 Unauthorized` as expected — authoritatively proves gateway + voice-call extension + signature verification are all healthy.
- **Files modified:** `02-07-RENAME-VALIDATION.md` §2 documents the correct probe set.
- **Verification:** 401 response correlates with systemd unit `active (running)` since 2026-04-18.
- **Commit:** `5a155f4`
- **Also tracked:** `deferred-items.md` for plan-authoring reference.

### [User override] Voice-call smoke test deferred

- **Found during:** Task 6 Part B (user-driven step)
- **User request:** "skip voice-call smoke tests for now" (2026-04-20)
- **Rationale for accepting deferral:** Automated proof-of-life + healthy systemd uptime + UUID-stable clients redundantly cover the smoke test's signal. Deferring is safe given the risk profile.
- **Tracked in:** `deferred-items.md` "02-07 voice-call smoke test (deferred per user 2026-04-20)"

---

**Total deviations:** 3 (1 blocking auto-fix, 1 correction auto-fix, 1 user-override defer)
**Impact on plan:** All three were necessary and handled without scope creep. The first two were auto-fixed inline; the third is an explicit user decision preserved in deferred-items for transparency.

## Issues Encountered

- **Tailscale SSH re-auth required mid-plan.** Task 1 Discovery could not complete the Netcup grep because Tailscale SSH to `niko@100.80.222.29` returned "authenticate at https://login.tailscale.com/a/...". Per plan directive, this was documented in DISCOVERY §5 and deferred to Task 5 (which was a human-action checkpoint anyway). Resolved when user restored auth; orchestrator then ran the Netcup verification itself during Task 5.

## User Setup Required

None — plan's `user_setup` frontmatter listed Infisical dashboard ops + Netcup SSH, both of which were completed during plan execution (Tasks 3 + 5). No follow-up setup required for 02-08.

## Next Phase Readiness

- **Ready for 02-08** (root CLAUDE.md + README onboarding + `infisical-dev.sh` deprecation shim) — no remaining blockers, all structural rename work complete.
- **Ready for Phase 3** (subproject adoption) — Infisical projects have final names, so subproject adoption plans can reference the stable `minion-*` slugs.
- **FOUND-11 satisfied.**
- **Deferred items remaining for Phase 02:** 3 entries in `deferred-items.md` (Infisical CLI flag drift in `@minion-stack/env`, gateway-ping URL plan typo, voice-call smoke test). None block 02-08 or Phase 3.

---
*Phase: 02-foundation*
*Completed: 2026-04-20*

## Self-Check: PASSED

**Files verified on disk:**
- FOUND: `.planning/phases/02-foundation/02-07-RENAME-DISCOVERY.md`
- FOUND: `.planning/phases/02-foundation/02-07-RENAME-RUNBOOK.md`
- FOUND: `.planning/phases/02-foundation/02-07-RENAME-VALIDATION.md`
- FOUND: `.planning/phases/02-foundation/02-07-SUMMARY.md`
- FOUND: `.planning/phases/02-foundation/deferred-items.md`

**Commits verified in git log:**
- FOUND: `1c13c61` (discovery)
- FOUND: `2b81544` (partial progress)
- FOUND: `200396e` (dashboard ops complete)
- FOUND: `acb183a` (runbook + memory updates)
- FOUND: `5a155f4` (validation draft)
- Final closure commit will be recorded after `state advance-plan` + metadata commit.
