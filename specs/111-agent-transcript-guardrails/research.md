# Correction decisions

Existing EGM reports and the independent gate reviews provide the design evidence; no new technology choice or unresolved technical research requires a separate research agent.

- Decision: restrict device-free JWT to operator connections. Rationale: owner approved F1; trusted node methods must retain paired/shared-auth admission. Rejected: granting JWT-only nodes assignment authority implicitly.
- Decision: classify malformed protocol before destructive extraction and preserve invalidity through visible/speech selection. Rationale: owner approved F2/F6. Rejected: independent clean speech overrides restoring a success claim.
- Decision: normalize supported interaction controls before visible/spoken sanitization. Rationale: F3 must preserve quick replies and directive-only interactions. Rejected: stripping controls as unrendered text before their parser sees them.
- Decision: redact supported credentials before destructive size limits and retain the final post-transform guard. Rationale: F4's quoted secret can lose its terminator at a cap boundary. Rejected: only redacting the already shortened string.
- Decision: preserve existing gate commits and canonical DEV/master/dev PR bases. Rejected: global default changes, daemon DB edits, resets that discard fixes and wholesale promotion of unrelated DEV work.

Remaining runtime and sink/bypass boundaries are the declared handoff ledger, not hidden assumptions.
