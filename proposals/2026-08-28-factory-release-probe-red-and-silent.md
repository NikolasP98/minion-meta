---
id: 2026-08-28-factory-release-probe-red-and-silent
title: "Factory release probe can omit the required posture MCP call and force a full replay"
status: draft
created: 2026-08-28
updated: 2026-09-02
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

## Update — intermittent posture-call omission (2026-08-28 15:42Z)

The earlier silent-failure problem is resolved: current logs identify the exact
failure as `[release-probe] posture MCP call missing`, and the supervised path
remains the only sanctioned production route.

New exact evidence shows the remaining failure is intermittent and can waste a
whole workflow replay:

- Release run `33186231907`, attempt 1, bound candidate
  `341fa832e1f2af5d29bb3b3fb0882cc461ec780d`, passed candidate resolution,
  immutable identity, and candidate tests, then stopped before production
  mutation after both bounded model turns omitted `factory_s2_posture_v1`.
- The sealed rerun of the same workflow id and unchanged candidate passed the
  posture call, production supervision, exact deploy, health verification, and
  main compare-and-swap. Candidate code was not the cause.
- minion-factory PR #147 raises the bounded in-job allowance from two attempts
  to three. The posture MCP call remains mandatory and fail-closed; only the
  cheaper retry occurs before replaying the full release workflow.

Remaining ask: record posture-call omission counts and per-attempt provider
metadata without response-body leakage, then replace the incident-derived retry
bound with a measured policy. Do not turn a missing call into a passing probe.

## Merged: handoff-sweep marker for the same open end

`handoff-minion-factory-1015683775` (handoff-ledger sweep, `NikolasP98/minion-factory@dev
scripts/promotion/authenticated-boundary-probe.sh:51`, checked 2026-09-02) flagged the exact
in-code marker this proposal's "Remaining ask" already tracks — "replace this incident-derived
bound with measured omission". Merged into this proposal as its `status: merged` tombstone.

## 2026-09-12 recurrence: broker error classification

Factory promoter34715953488 attempts1/2 failed the initial candidate /turn with broker-assigned502 UPSTREAM_FAILURE after candidate tests and readiness passed. No deployment occurred. The exact configured model id exists in the public registry; that does not establish account authorization, credit, endpoint compatibility or the actual failure cause.

The broker maps SDK error/turn-failure events and arbitrary exceptions into one code. Probe cleanup removes diagnostic state; the shell then validates empty stdout and emits a secondary JSON error. This obscures the actionable cause without supplying a safe artifact.

Bounded ownership: broker error classification and probe failure-artifact capture/cleanup, plus their existing focused tests. Add allowlisted error class/status and always-retained failure metadata. Never persist raw provider errors, prompts, tokens, credentials or environment dumps. Add deterministic redaction tests, preserve failure exit semantics and keep bounded artifact retention. Root must approve the exact metadata schema and trusted-controller integration before implementation. This is not permission to change providers, model, billing, activation flags or skip release gates.

Respect trusted-main controller promotion ownership. Complete with diagnostic evidence that identifies a subsequent actual failure, or an authenticated exact-candidate probe followed by normal verified promotion. Current production remains02900306a1fcc7b182bae726a24260d08467f81e; candidate467906db88f51476e2ca5fb561c2c4a79459e268 is dev-only. No additional paid probe was issued for diagnosis.

Evidence: .planning/operations/360/priority-delivery-2026-09-12/factory-release-blocker.json and PRIORITY-DELIVERY-2026-09-12.md. Existing source TODO in the production-probe script points to this proposal identifier.
