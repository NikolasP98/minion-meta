---
spec: 2026-08-28-factory-browser-verification-stage-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-28
score_slice_size: 9
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 review — factory browser-verification stage

Reviewed the spec against the approved proposal, root `AGENTS.md`,
`2026-08-18-factory-topic-capability-manifest-spec`,
`2026-08-18-factory-worker-containment-spec`, and live
`minion-factory@9dc06488683fd700e6e2a11d83bc6ccbcc0ad2d0` sources read through the GitHub API.
No correctness issue still requires a human product decision, so the corrected spec is approved.

## Changes made

1. Updated pass/verdict frontmatter to pass 2 / approved because every identified defect was resolvable from the approved proposal and shipped contracts.
2. Made production `FACTORY_CONTAINMENT_V2=1` a hard final-activation prerequisite because the legacy path cannot schedule a new `WorkerPhase`.
3. Replaced the ambiguous prose browser playbook with a runner-owned executable `.mjs` profile because deterministic Playwright actions and assertions need a defined execution contract.
4. Replaced the port-only repo shape with the proposal's explicit preview command + validated loopback base URL + browser profile contract.
5. Added controller-owned phase-specific image selection because the live runner currently passes one general agent image to every phase.
6. Added mandatory `/out/phase-result.json` alongside `/out/browser/*` because the live phase closer cannot seal evidence without the generic artifact.
7. Distinguished gate failures from infrastructure crashes so flow/axe failures enter the bounded develop-fix loop instead of consuming crash retries.
8. Added per-run profile snapshots and image identity to the profile hash because evaluating against mutable current config would invalidate reproducibility and automerge binding.
9. Defined fixed verdict inputs, CDP AX capture, exact evidence paths, numeric size/count ceilings, and bounded DB summaries so the evidence DoD is machine-checkable.
10. Replaced the ambiguous `chrome-devtools-mcp` “or library” choice with exact installation/smoke-test requirements while keeping deterministic Playwright/CDP execution and no model loop.
11. Split the former 8-hour image/driver and runner/evidence bundles into eight independently testable 4–8 hour slices, following the ★★★ slice-scoped-run constraint in `/memory/MINION/MEMORY.md` and `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
12. Added late manifest re-read coverage because monotonic post-push classification can add `ui` after initial queue resolution.
13. Removed the unverifiable claim that `/out/browser` is visible on a draft PR; the corrected contract keeps full files in runner-owned attempt storage and DB-bounds only hashes/summary.
14. Resolved `ui` versus `ux` in favor of `ui` only because the shipped topic-manifest spec names `ui` as the extension point and `ux` remains a distinct canonical topic.
15. Named the fleet-wide refusal impact on `minion-base`, `minion-site`, `minion-ai`, `minion-meta`, and `minion-factory` instead of describing the hub-only profile as behavior-compatible.
16. Added an explicit AGENTS.md impact-zone audit showing no gateway protocol, channel, shared DB, agent-format, auth, workshop, pixel-office, or paperclip-adapter contract is entered.
17. Required the browser image reference to be a named manifest digest and required `deploy.sh` to emit it, following the ★★★ wholesale `.env` rewrite constraint in `/memory/MINION/index-archive.md`'s archived `minion-factory-agent-pipeline` entry.
18. Preserved `FACTORY_AUTOMERGE=0`, controller-owned truth, inert page content, reviewer read-only authority, and applier re-verification per `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and `/memory/MINION/index-archive.md`.
19. Expanded the owner-surface inventory to include manifest, test, driver, lockfile, and environment files required by the corrected slices so implementation cannot omit a touched contract.
20. Bound phase closure to the controller's existing generic artifact seam and forbade page text from manufacturing a pass, consistent with `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md`'s anti-perma-pass findings.
21. Required current candidate/profile/image identities at scheduling and automerge boundaries, consistent with `/memory/MINION/factory-moving-origin-strategy-implementation.md`'s controller-owned immutable-snapshot strategy.

## Human flags

None. The explicit `bridge` escape hatch remains a documented residual risk and per-repo profiles
beyond the `minion-hub` pilot remain separately scoped; neither is an unresolved decision inside
this spec.

The required read-only observation search returned no past-session observation specific to this
factory browser-stage contract; no database observation shaped a decision.
