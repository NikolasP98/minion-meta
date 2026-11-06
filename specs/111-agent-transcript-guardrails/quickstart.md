# Correction validation guide

Use the isolated source repositories and supported Node 22. Keep fixture identities/effects synthetic; never load shared production credentials into test fixtures.

1. Gateway gate: reproduce the five approved failures, then run real admission/extraction/TTS/persistence boundary regressions and nearby controls. Use actual emitted/persisted output rather than source-text matches.
2. Run the declared Gateway check/typecheck/build and configured suites at the corrected source. Capture the exact commit and commands; distinguish new results from the frozen 253-case prototype.
3. Hub: retain the gate's 91-case HR/finance verification and request-to-SQL evidence, including negative controls that restore the old bugs. Preserve recovered test/doc work in signed follow-up commits and run required final checks.
4. Confirm actual PR bases and scoped diff before publication. Meta PR954 is documentation-only; a dev-channel Gateway build is not production.
5. After required owner review/merge, execute [production-verification-plan.md](../../audits/2026-11-06-agent-transcript-review/egm/production-verification-plan.md). Record source/deployment/image identity, safe auth/health checks and verified test URL.

Source commands must be run by the active gate while it owns that branch. Do not initialize, abort, push or edit around a live gate from a validation-phase agent.
