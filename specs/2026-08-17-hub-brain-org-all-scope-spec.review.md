---
spec: 2026-08-17-hub-brain-org-all-scope-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set pass 2 and approved because all correctness issues were resolvable from the proposal and cited architecture without a product decision.
- Reduced `repos` to `minion_hub`, matching the proposal and the corrected implementation boundary.
- Replaced the three-slice plan with one hub-only slice because shared binder tests, contract comments, changesets and proposal updates did not implement the proposal's chosen narrowing branch.
- Removed deterministic truncation of source lists above 512 because it contradicted architecture §8.1's required partitioning and the proposal's exclusion of new retrieval features.
- Made batching, partitioning, truncation and candidate merging explicitly out of scope so this fix cannot silently change authorized recall.
- Converted the unverified hub assumptions into mandatory recon and explicit stop conditions because `minion_hub` is absent from the review checkout.
- Required a stop and new cross-repo spec if a production caller can construct `org_all`, preventing this fix from deleting reachable behavior or partially implementing an authorization-sensitive mode.
- Required a stop if no hub-owned request-construction type exists, because deleting the throw alone would not satisfy the compiler-enforcement definition of done.
- Clarified that the shared type must remain unchanged and defined the hub-local subtype fallback when the shared union is imported directly.
- Limited runtime validation to proven untyped ingress points and required reuse of the existing degradation path, removing the ambiguous requirement to invent a new structured failure mechanism.
- Replaced broad source-scanning regression tests with a compile-time negative API test and a shared-validator compatibility test, which directly verify the proposal's DoD without coupling tests to source text.
- Made the red-state requirement verifiable by requiring the pre-change failure reason and a necessary `@ts-expect-error` directive.
- Replaced unsafe verification that modified and restored a test with a non-mutating definition of done.
- Corrected shell scope checks so no-match is success while a forbidden changed path fails the gate.
- Removed unverifiable fixed binder-case counts and root-wide build claims because the corrected spec does not modify the shared package.
- Consolidated the completion criteria into finite, observable outcomes and required zero-exit targeted tests, full tests and checks with no new skips.

## Human flags

None.
