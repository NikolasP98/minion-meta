---
id: 2026-10-21-windows-qualification-admission-independence
title: Separate native contract admission from product qualification protection
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra, test]
source: windows-kernel-containment-post-merge-integration
---

# Separate native contract admission from product qualification protection

## AS-IS

The owner merged Gateway #345 at `fb9a03f06c7dae71667f7ede6a8a265bc5b394b2` and meta #852 at `5dd374e275a51ac271545d5a1a2eef8332991407`. The shared classification arm in `.github/workflows/ci.yml` marks `test/ci/*workflow.test.ts` as both a native-contract trigger and a protected change to the product qualification policy. This prevents #342's three reviewed test files from receiving its required fixed-ten qualification, despite preserving every native helper/workflow file from DEV.

Local integration `379aacf882688bcf242327d34b6a2e3ef5634c20`, tree `1c25b77551bdf919d3610022c875f68422189078`, passed 43 portable contracts and 116 focused assertions (41 CI workflow, 74 outbound, one Teams), plus full repository check with zero errors and 57 existing warnings. Independent review found the admission conflict before this local commit was pushed. Passing these local tests does not qualify the blocked Windows lane. The initial infrastructure review failed to exercise this exact mixed three-file integration.

## TO-BE

Changes to workflow assertion tests trigger the native Windows infrastructure contract independently of product qualification selection, as required by section D of the approved kernel-containment specification. They do not themselves count as modifications to the executable qualification policy. Actual workflow/helper/validator/configuration/package changes remain protected. Unknown diff bases, deletion of the exact outbound test or formerly protected workflow tests, and fork inputs remain unable to qualify the fixed-ten lane.

The exact #342 combination must request both native contract proof and fixed-ten qualification. All ten runs, 74 assertions per run, unchanged deadlines, source binding, full Windows shards and final integrated DEV qualification remain mandatory.

## DELTA

Separate the native admission signal for `test/ci/*workflow.test.ts` from the protected-policy arm. Add actual Git/workflow-shell fixtures for #342's exact three paths, including native=true, fixed-ten=true and test-only=true, and retain negative cases for forks, deletion of the exact outbound test, exact-outbound changes combined with deleted current/future workflow tests, unknown diff bases and real protected changes. Native interop code, typed product tools and production configuration remain unchanged.

## Lifecycle and release boundary

This bounded CI correction implements the existing two-pass-approved `2026-10-21-windows-qualification-kernel-containment-spec.md` section D requirement for independent admission signals. It introduces no new qualification contract and bypasses no approved spec. The correction requires its own independent Standards/Spec review, native infrastructure PR CI and human merge before #342 is updated. A workflow-changing PR cannot qualify itself as the product test-only candidate. The original #342 conditional merge and production approvals persist after all gates pass; no production Gateway/FACES mutation is authorized by this proposal.

Independent review caught the newly unprotected mixed workflow-test deletion case before commit. The correction retains protection when a workflow-test path is no longer a file; two current/future path regressions failed before that guard and passed afterward. Unrelated pre-existing mixed deletions keep their current selector behavior and broader non-test-only checks. No broader deletion policy change is claimed.

## Prepared correction

Gateway [#346](https://github.com/NikolasP98/minion-ai/pull/346), head `857559d01161f53fa568cbb34747602e62cebfb2`, passed native/portable CI `39571506559`, independent Standards/Spec review and full local check. It changes exactly the workflow and its tests. All 17 native cases and required Linux artifact verification passed; source/run/tree-bound receipt is `audits/2026-10-18-assistant-capability-repair/windows-admission-857559d-qualification.json`. Human merge and subsequent #342 product qualification remain pending.
