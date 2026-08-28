---
spec: 2026-08-21-handoff-minion-ai-4278431509-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-21
score_slice_size: 10
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved`; the corrections leave no unresolved design choice.
- Replaced the claim that meta issue #85 was unverifiable with its actual disposition: a one-off Bun runtime-budget outlier followed by passing `DEV` runs, not an owned architect-pipeline correctness defect.
- Added the unchanged architect-pipeline test to the targeted gate because it exercises the same `createMinionTools` factory this slice changes.
- Cited `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for both the original #219 suspicion and issue #85's recorded pipeline context; the live issue's closing comment supplied the later exonerating evidence.
- Made the resolver's config parameter optional so the supported `createMinionTools()` zero-config call does not require an invalid partial `MinionConfig` cast.
- Defined “one warning” as exactly one warning per resolver invocation, removing an ambiguous logging requirement.
- Added missing resolver proofs for field-wise precedence, trimming, empty-string removal, ordered example deduplication, schema caps, and locale rejection.
- Corrected the custom-profile assertion: all three renderers must show a unique configured noun, while only search and insight must show `businessName`, because the existing query renderer intentionally does not emit it.
- Replaced the invalid zero-config comparison to the explicit FACES fixture with equality to the existing direct-factory default outputs; retained the FACES fixture only as its existing explicit-profile regression proof.
- Required `DEFAULT_CRM_PROFILE` to disappear entirely from `minion-tools.ts`; keeping an import-only occurrence would contradict resolver-owned fallback.
- Folded the 30-minute recon into the single 5–7 hour implementation slice so every scheduled slice satisfies the 4–8 hour G2 convention from `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Fixed the resolver path as `src/config/crm-profile-resolver.ts` and its test path, removing non-executable filename placeholders from the verification commands.
- Added a preflight check for Hub gateway-config pass-through; the canonical spec already identifies key-dropping/reconstruction as the conditional cross-repo impact.
- Split the impact table's blanket “no Hub impact” claim into a conditional Hub transport impact and separately verified no protocol/shared-package/DB impact.
- Replaced negative greps that returned a success-like transcript but no explicit failure branch with executable `if ...; then exit 1` guards.
- Replaced the `<base>` command placeholder with the declared `origin/DEV` base reference so the forbidden-file checks are directly runnable.
- Removed `tools.status` as proof of per-call profile wiring because canonical S3 owns that generic metadata republisher; the `createMinionTools` integration test is the deterministic proof.
- Replaced the unsafe FACES-instance smoke with a disposable-dev config patch/readback/restore smoke and a no-throw turn check.
- Removed the impossible “empty diff outside `minion/`” ship gate across independent repositories; Hub pass-through and absence of a shared typed mirror now prove the no-consumer-change conclusion.
- Corrected stale slice/section references and renumbered the body sections consecutively.

## Human flags

- None required for pass-2 approval. During implementation, stop and revise the relationship, `repos`, and DELTA if the preflight finds a competing resolver, a newly threaded orgId, or a Hub config path that rejects/drops `gateway.crm`; those findings would materially change the approved slice.

## Review context

- Read `/memory/MINION/MEMORY.md` and the matching topic file `/memory/MINION/sdlc-board-triage-and-phase-gates.md`; the latter's ★★★ slice-scoping constraint shaped the slice consolidation.
- Read-only SQLite FTS queries for architect-pipeline, CRM profile, and minion-tools terms returned no observation that superseded the raw-memory and live-code evidence. No semantic memory-search MCP tool was exposed in this session.
