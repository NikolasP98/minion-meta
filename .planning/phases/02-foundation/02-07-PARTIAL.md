---
plan: 02-07
phase: 02-foundation
status: partial
last_updated: 2026-04-20
---

# Plan 02-07 Partial Progress — Infisical rename cascade

## Completed (committed)

**Task 1: Discovery** ✓ `1c13c61`
- `.planning/phases/02-foundation/02-07-DISCOVERY.md`
- Headline findings: Infisical CLI v0.43.76 has NO `projects` subcommand → renames require dashboard or REST API. Scope smaller than plan assumed (2 renames + 3 new, not 5 new). Production consumers use UUIDs (slug renames are transparent). Subproject CI workflows are clean. Netcup SSH deferred pending Tailscale re-auth.

**Memory updates** ✓ (committed as part of this session)
- `reference_infisical_setup.md` — full rename table, UUID-unchanged note, CLI limitation captured
- `project_paperclip_infisical_integration.md` — slugs updated (paperclip→minion-paperclip, ai-providers→minion-core)
- `project_twilio_voice_call_secrets.md` — location slug updated

## Pending — user actions

**Infisical dashboard (http://100.80.222.29:8080):**
1. Rename project slug `ai-providers` → `minion-core` (UUID `dd71e710-4e1a-48f6-afea-5502bae5a574`)
2. Rename project slug `paperclip` → `minion-paperclip` (UUID `99490998-0582-4ddf-961b-bce71becba6b`)
3. Create new project `minion-gateway` (dev-side)
4. Create new project `minion-plugins` (placeholder)
5. Create new project `minion-pixel-agents` (placeholder)

**Netcup SSH (Tailscale re-auth needed first):**
6. Re-auth Tailscale at the URL surfaced by `ssh niko@100.80.222.29`
7. Re-run discovery Task 1 to surface on-host systemd/docker-compose references
8. Apply any updates found (per D10 runbook — UUIDs unchanged so likely just cosmetic slug refs in log lines or comments)

**Production validation:**
9. `curl -sSf http://100.80.222.29:8080/ping` — Infisical health
10. Voice-call smoke test (user places a test call through the gateway)

## Pending — autonomous (next session)

- Plan 02-07 SUMMARY.md (after smoke test passes)
- Mark 02-07 complete in ROADMAP
- Plan 02-08 (Wave 6 — docs): CLAUDE.md update (Edit, preserve subproject map), new README.md, `infisical-dev.sh` deprecation shim, phase-level `changeset status` check
- Phase 2 verification + completion

## Resume instructions (fresh session)

1. `/clear`
2. Confirm Infisical dashboard ops are done (reply with the 3 new project UUIDs)
3. `/gsd-execute-phase 2 --wave 5` — resumes from discovery, runs remaining tasks
4. Tailscale re-auth when prompted
5. Voice-call smoke test
6. After Wave 5 complete, run `/gsd-execute-phase 2 --wave 6` for 02-08 docs
7. Phase 2 verification closes the milestone

## Low-risk notes

- UUIDs unchanged → slug renames are cosmetic for all UUID-based consumers (bot-prd gateway, paperclip container, `@minion-stack/env` machine-identity flow)
- `infisical-dev.sh` is scheduled for deprecation shim in 02-08 anyway — no need to update it in 02-07
- Production downtime not expected during the rename; the 3-checkpoint plan structure is precautionary
