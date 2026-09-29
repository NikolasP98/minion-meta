---
spec: 2026-09-28-hub-formula-column-variables-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-quick-add
created: 2026-09-28
---

# Formula column variables specification review

Specification: `2026-09-28-hub-formula-column-variables-spec.md`.

- Standards/security/data review: independent Sol agent `guardians_dob`, APPROVED after revisions. The accepted contract separates actor-visible authoring from canonical validation, evaluates primary dependencies before auxiliary variables, preserves legacy conversion, freezes UUIDv5 identity, fingerprints referenced state, and bounds aggregate work without excluding legal scalar formulas.
- Requirements/UI review: independent Sol agent `quick_add`, APPROVED after revisions. One variable is unnamed; complex variables require unique names. Stable IDs preserve formatting under rename/reorder. Preview diagnostics/results identify the variable. Visual per-variable controls, primary sorting selection, accessible reorder, legacy repair states and partial-quality behavior are specified.
- User confirmations: visual controls per variable; formula variables only. Existing session authorization covers implementation, independent review, verified merge and deployment.

Implementation review and release evidence will be recorded after qualification; specification approval alone is not release proof.
