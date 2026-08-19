---
spec: 2026-08-19-gateway-client-error-hook-consumer-adoption-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-19
---

# Pass 2 review

Changes made:

- Set `status: approved`, `pass: 2`, and `verdict: approved` so the lifecycle fields agree after a successful second-pass review.
- Repointed the lifecycle-swallow relation to its actual 2026-08-19 spec and removed the stale claim that no spec had been spawned.
- Corrected PR #29's state from “merged to main on 2026-08-17” to “merged to dev on 2026-08-19,” making promotion to `main` an explicit release prerequisite.
- Reconciled npm `0.10.0` with Version-Packages PR #18 and remote `main`, replacing the false claim that the registry version was unexplained.
- Distinguished a merged Version-Packages PR from a completed npm publish because `/memory/MINION/minion-meta-changeset-release-flow.md` (★★★) records prior publish-workflow failures after version merges.
- Made S0 verify `onEventError` on `main`, select an exact-title post-#29 Version-Packages PR, require a successful release workflow, and inspect the exact npm tarball declaration.
- Made absent Version-Packages PRs and absent successful workflow runs fail S0 instead of relying on `gh` list commands that exit zero with empty output.
- Added the proposal to S0's file list because S0's own DoD requires recording the verified version and release evidence there.
- Removed the implicit site rewiring follow-up because accepting the default is already a complete posture under the parent proposal.
- Required merged consumer PRs and post-merge evidence before closeout, since opened PRs cannot prove that consumers resolve the new package.
- Added manifest, lockfile, frozen-install, resolved-version/declaration, check/build, and applicable focused-test evidence for all three dependency bumps.
- Made wired-versus-default verification conditional in every consumer DoD, eliminating unconditional `onEventError` greps that contradicted the accepted-default path.
- Prevented Hub event-handler failures from being routed into connection-health state, which would falsely represent a healthy socket as disconnected.
- Removed the unused site `frame` parameter from the example and prohibited payload logging, matching the payload-safety invariant.
- Replaced Paperclip's broken `*minion_gateway*` glob and “zero leads” claim with the dated `packages/adapters/minion-gateway` and `onLog` leads from `ws-duplication-audit.md`, while retaining mandatory recon.
- Replaced Paperclip's non-executable focused-test placeholder with the audit's concrete server test command and an explicit recon rule if that dated path moved.
- Made Paperclip's crash-to-log change conditional and evidence-based, matching parent spec ⚠️ A3 instead of asserting an unverified crash outcome.
- Removed Express request middleware as a suggested Paperclip sink because an asynchronous WebSocket event is not necessarily on an Express request path.
- Required the closeout proposal to use `status: done` and include all three merged PRs, resolved versions, and final reporting postures.
- Corrected the approach heading from four to five slices and updated the cross-repo impact/file lists to include consumer lockfiles and conditional test/reporter files.
- Clarified that S0 is runnable in this checkout now and S4 becomes runnable after the three external consumer PRs, while S1–S3 remain externally executed.
- Updated end-to-end and ship gates to prove exact registry publication, merged adoption, conditional wiring, and the observed Paperclip process behavior.
- Updated the shared-package out-of-scope wording to match S0's read-only GitHub/npm checks rather than naming a removed `git show` command.

Human flags: none.
