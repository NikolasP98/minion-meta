---
spec: 2026-08-17-gw-defaces-crm-tools-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set the spec frontmatter to pass 2 and approved because all correctness issues were resolvable from the proposal and referenced architecture.
- Separated the generic rendered profile from the legacy PE matcher fallback so zero-config query behavior can remain unchanged without contradicting the requirement for locale-neutral descriptions.
- Required fixing the generator instead of hand-editing generated output, restoring consistency with the repository's generated-file rule.
- Removed the alternative of deferring a broken generator because it contradicted the slice's clean-codegen definition of done.
- Corrected the parity-fixture wording: the profile literal belongs in test code, while the `.txt` fixture contains only expected output.
- Removed operator-supplied raw regex configuration and replaced it with enum-validated, code-owned locale presets, eliminating an unnecessary ReDoS surface that the proposed timing test could not reliably verify.
- Defined profile precedence as a field-wise merge so sparse org overrides have deterministic behavior.
- Made unknown locales schema errors and separately specified fail-soft behavior for malformed values injected past validation.
- Replaced the invalid “await must type-error” sync test with a compile-time result-type assertion, since JavaScript permits awaiting non-Promise values.
- Replaced timing-based regex checks with deterministic locale-enum and arbitrary-regex-rejection tests.
- Narrowed the source denylist to exact pre-change tenant identifiers and procedure literals so valid configurable nouns and the guard's own fixtures do not trigger false positives.
- Made a hub config mirror a conditional blocking impact rather than an optional follow-up, because a validator that drops the new block would prevent the proposal's definition of done.
- Updated the A3 analysis, file table, out-of-scope language, and end-to-end invalid-config check to match the corrected locale-only design.

## Human flags

None.
