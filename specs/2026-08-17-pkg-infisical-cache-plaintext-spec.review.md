---
spec: 2026-08-17-pkg-infisical-cache-plaintext-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review — Infisical cache plaintext fix

## Changes made

1. **Frontmatter** — advanced the spec to pass 2 and set the verdict to approved.
2. **Legacy purge semantics** — made cleanup run even with `noCache:true` or cache mode `off`, resolving the contradiction between “purge on first use” and “no read/write” while preserving bypass semantics for cache content.
3. **Cache identity** — required domain and a canonicalized allowlist in the cache key so entries cannot cross Infisical domains or return the wrong narrowed result.
4. **S1 verification** — added cases proving bypass cleanup and cache-key isolation/canonicalization.
5. **External-key validation** — required strict canonical base64 validation because Node's decoder alone accepts malformed strings.
6. **Concurrent key creation** — replaced unsafe last-writer-wins key creation with exclusive creation and winner reread, preventing two processes from encrypting with different machine keys.
7. **Existing key permissions** — required enforcement of `0600` on a pre-existing valid key file, matching the spec's at-rest permission claim.
8. **Decrypt-failure wording** — clarified that an unauthenticated encrypted file is ignored but retained as evidence, consistent with the preceding no-delete rule.
9. **S2 verification** — added a two-process key-creation race case that verifies both processes converge on the same key.
10. **Doctor timing** — made `cacheStatus()` perform fetch-free initialization and required doctor to call it before rendering the meta row, so `legacyRemoved` is truthful even with no cloned subproject.
11. **Operator impact** — corrected the claim that a sealed cache is always recreated; recreation depends on disk mode and a successful cacheable fetch.
12. **End-to-end prerequisites** — stated the Infisical CLI/auth/fetch prerequisite for assertions that require the cache to be resealed.

## Flagged for the human

None. The remaining machine inventory and exposure findings are execution-time inputs with explicit handling and do not require a design decision before approval.
