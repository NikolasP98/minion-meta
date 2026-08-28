---
id: 2026-08-28-factory-release-probe-red-and-silent
title: "Factory release train red: authenticated boundary probe fails every promotion — and fails silently"
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory]
tags: [infra, test]
---

# Release probe fails every promotion, with zero diagnostics

## Evidence (2026-08-28, UTC)

Every `promote-dev-daily.yml` attempt today failed, across two independent
dispatchers (the board supervisor at 05:44Z run `33145689614` and 06:41Z run
`33148799874`; the operator session at 06:40Z/06:42Z/06:49Z runs `33148745095`,
`33148854003`, `33149271729`):

- Runs `33145689614`, `33148799874`, `33149271729`: job **"Authenticated
  boundary probe and release supervision (scoped key only)"** fails after ~90s.
- Run `33148745095` failed earlier at `required CI refused: pending:in_progress`
  (correct gate behavior — candidate CI still running; not a defect).
- Run `33148854003` failed at main-ahead drift wanting `expected_live_sha`
  (correct gate behavior; recovered by re-dispatching with the live marker
  `34a3b21f6dbf465a4e06bf78f576d823232fc96f` — ancestry verified live⊆main and
  live⊆candidate before dispatch).
- On the recovered dispatch (`33149271729`): resolve ✅, identity ✅, candidate
  tests ✅ — the probe is the only remaining red.

**Defect 2 (observability):** the probe job log contains NOTHING between the
step header and `Process completed with exit code 1` — no stderr, no probe
stage marker. `authenticated-boundary-probe.sh` quiets its docker builds
(`docker build -q … >/dev/null`) and the failing stage emits no diagnostic that
reaches the Actions log. A red release train that cannot say why it is red
cannot be repaired by the pipeline that owns it.

## Reproduction attempts (both blocked, recorded for the next owner)

- Netcup box: `/opt/factory` clone cannot fetch the candidate (`x-access-token`
  HTTPS remote has no credential outside the runner) and the box `.env` has no
  `OPENROUTER_API_KEY`, so the probe cannot run there as-is.
- Operator workstation: docker socket is group-gated; session user not in the
  `docker` group.

## Context

The whole supervised-release surface is days old and actively moving
(`fix/promotion-main-ahead-recovery` merged to main as `66aa1719` at 06:25Z
today; proposal PR #217 "track supervised release defense in depth" open).
Box live marker: `34a3b21f`; box-poll self-update log ends 2026-08-23 —
deploys since then were manual or belong to the new promotion path, so the
promotion workflow is now the only sanctioned route to production. While the
probe is red, dev cannot promote at all.

## Asks

1. Make the probe loud: every stage prints a `[probe] <stage>` marker to the
   job log; on failure, dump the broker/tool-host container logs (bounded) and
   the receipt file path before exiting.
2. Root-cause the probe failure itself (with stage markers this becomes
   readable directly from the next failed run).
3. Decide the fallback: while the probe is red, is the manual box
   `self-update.sh` path still sanctioned for emergency deploys, or frozen?
