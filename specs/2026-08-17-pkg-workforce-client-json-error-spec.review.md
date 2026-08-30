---
spec: 2026-08-17-pkg-workforce-client-json-error-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

Changes made:

- Set `status: approved`, `pass: 2`, and `verdict: approved` so the lifecycle fields agree after a successful second-pass review.
- Added the missing `infra` top-level tag because S2 is explicitly tagged `docs` and `infra` and changes release infrastructure metadata.
- Reworded the owner surface because the slice changes the exported `WorkforceApiError` contract and a helper, not only one function.
- Limited the two-outcome guarantee to responses whose bodies were successfully read, resolving its contradiction with the requirement that `res.text()` failures propagate unchanged.
- Replaced “byte-identical” with “unchanged” because parsed JavaScript values do not define byte identity.
- Defined the 2048 limit as a cap on the final `raw` JavaScript string, including its marker, removing the prior acceptance criterion that allowed `2048 + marker`.
- Added exact-boundary truncation coverage so implementations can verify that a 2048-unit body is preserved and not marked truncated.
- Scoped the request-secret requirement to client-added error fields, because a client carrying the required raw response cannot guarantee that an upstream did not echo request data.
- Made the request-material test fixture independent of the request and required inspection of own error fields, turning an impossible blanket guarantee into a verifiable client responsibility.
- Changed the changeset existence check to target the new named file, avoiding false success from older workforce-client changesets already present in the repository.
- Anchored the changeset bump check to its exact frontmatter entry so prose containing “minor” cannot satisfy the definition of done.
- Updated the gate-conventions sentence and README boundary wording to match the corrected tag set and fetch/body-read contract.

Human flags: none.
