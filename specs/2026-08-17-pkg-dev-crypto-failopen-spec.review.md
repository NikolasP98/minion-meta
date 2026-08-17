---
spec: 2026-08-17-pkg-dev-crypto-failopen-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review — package dev-crypto fail-open fix

## Changes made

1. **Frontmatter** — advanced `pass` from 1 to 2 and `verdict` from `pending` to `approved`; `updated` already matched the required date.
2. **S1 red-state requirement** — replaced the impossible claim that every matrix case must fail on old code with a targeted no-key/no-opt-in failure; compatibility cases legitimately pass before the fix.
3. **Existing-suite setup** — required setting the test key before the first crypto call and stopped treating the already-green roundtrip suite as proof of red-state TDD.
4. **S2 barrel exports** — distinguished the root barrel, which currently has no crypto exports, from the PG barrel, which already exports `sealSecret`/`openSecret`, and made the required exports explicit for each path.
5. **Anti-recurrence guard** — removed the unverifiable source-text “branch reachability” assertion; the env matrix now proves control flow while the static guard checks only literal and derivation-site uniqueness.
6. **At-rest audit scope** — changed “every non-production database” to every database used by a fallback-capable process, including production-named databases reached under a misconfigured `NODE_ENV`.
7. **Audit confidentiality** — explicitly prohibited logging sampled plaintext during test decryption.
8. **S3 rollout sequencing** — made A1/A3 classification precede secret changes so a real key is not provisioned over unreadable dev-key ciphertext.
9. **Affected-environment handling** — corrected the contradictory instruction to keep the opt-in alongside a real key: configured keys take precedence, so the safe default is no consumer bump until rotation; any separately authorized compatibility deployment requires `ENCRYPTION_KEY` unset plus the opt-in.
10. **Shared-database impact** — replaced “none from this change” with the accurate coupled rollout impact: no structural/layout change, but hub and site must use the same mode and configured key per shared database.
11. **A3 and ship-gate wording** — aligned the caveat and final evidence requirement with the corrected rollout and targeted red-state proof.

## Flagged for the human

None. The remaining A1–A3 unknowns are explicit execution-time recon/audit inputs with safe stop conditions; they do not require a design decision to approve this spec.
