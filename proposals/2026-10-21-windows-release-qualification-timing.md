---
id: 2026-10-21-windows-release-qualification-timing
title: Make Windows release qualification deterministic without weakening assertions
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [test, infra]
source: assistant-capability-production-adoption-2026-10-21
---

# Make Windows release qualification deterministic without weakening assertions

## AS-IS

Final assistant repair DEV commit `8dcbf5ce10fbbbae534de411627ff85f9e955200` passed full Linux, macOS TypeScript, build, check, protocol, Android and Windows smoke qualification. Full Windows shard 2 in [CI 39546077771](https://github.com/NikolasP98/minion-ai/actions/runs/39546077771/job/119050665628) failed four tests; its gateway test configuration never ran after earlier configuration failures. All three failing test files and their relevant runtime code are unchanged from production `12e03f7`. This proves unchanged source, not a prior observation of these exact failures.

- `extensions/msteams/src/conversation-store-fs.test.ts` uses a one-second real-clock TTL. The failed test took 2,244 ms; the runtime can correctly expire the supposedly active fixture during filesystem work.
- `test/ci/ci-workflow.test.ts` executes seven real Git/shell fixture setups in one 15-second TQ-016 admission test. The failed test took 20,922 ms.
- `src/infra/outbound/outbound.test.ts` timed out after 15 seconds while checking 51 legacy entries across two real recovery passes. Another test waits for a log with the default short polling budget after starting recovery, then can exit without releasing or draining that operation. An unhandled missing-file error in lease cleanup was observed; the orphaned-operation explanation is supported by the test structure but is not a proven exclusive cause.

## TO-BE

Keep every expiry, exact-path/repository admission, recovery exclusion, legacy count, restart, byte, metadata and privacy assertion. Use controlled semantic time for the TTL test while retaining real filesystem and lock timers. Give independently meaningful CI admission cases individual test identities. Use actual recovery readiness and guaranteed release/drain before temporary-directory cleanup. Any larger budget must be limited to the measured filesystem-heavy test and justified; no global timeout increase, skipped test, retry-to-green policy or smaller fixture is allowed.

## DELTA

1. Freeze only Date in the TTL test and restore it after the test. Exercise delayed filesystem access to show the active/expired/legacy contract is stable.
2. Parameterize all seven CI admission cases, retaining the actual workflow shell and Git fixtures.
3. Preserve the 51-entry two-restart scenario, document its scoped budget, and replace the recovery-owner polling race with explicit readiness plus finally cleanup.
4. Run focused test files, declared checks/build, and independent standards/spec review. Require a fresh full Windows qualification on the final merged commit before production promotion.

## Lifecycle exception and release boundary

This is a bounded test-only release hotfix. It bypasses a new standalone specification because the production failure reports identify existing test-harness assumptions and the correction preserves their contracts without changing runtime behavior. The assistant spec `2026-10-18-assistant-capability-failure-recovery-spec.md` explicitly excludes existing Windows debt; this proposal records that separate scope rather than expanding the approved runtime repair silently. The hotfix PR must repeat this exception and receive human merge approval. No production promotion, callback correction, gate bypass, runtime delivery-queue change or permission change is authorized by this proposal.

## Completion

A local focused pass does not close this item. Close only after independent review, approved merge and a complete successful full Windows report/aggregate for the final DEV source. Preserve any remaining failures as open findings rather than waiving them.

## Prepared hotfix

Gateway PR #342 at `cb754efea597038accc719d9b6ed6b7e672ef1a1` changes exactly the three test files. Focused suites pass 29 + 74 + 1 tests; controlled delayed-read reproduction fails before and passes after. Full `pnpm check` passes with 0 errors and 57 existing warnings. Independent standards/spec review passed. PR CI, human merge and final merged full Windows proof remain pending.
