---
spec: 2026-08-17-gw-whatsapp-cloud-template-fallback-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Updated the spec frontmatter to pass 2 with matching `status`/`verdict: approved`; all correctness issues were resolvable without a product decision.
- Made the red-state test refer to the S0-verified window code instead of prematurely fixing the uncertain remembered value `131047`.
- Split authoritative error-code verification in S0 from live-body confirmation in the ship gate, removing the circular claim that S0 already has the body produced later by §6.
- Added a stop condition when Meta's authoritative reference does not establish a numeric window-closed code, preventing message-text matching or remembered constants from shipping.
- Removed configurable `errorCodes` because arbitrary operator codes contradicted the spec's precise-detection rule and its explicit promise never to fall back on auth, rate-limit, or unrelated errors.
- Required the dedupe guard to reserve synchronously before awaiting the template send, closing the concurrent multi-block race that could produce several billed messages.
- Defined capacity behavior for the bounded guard: purge expired entries, then fail closed without evicting live reservations, preserving the stated at-most-once guarantee.
- Clarified that a failed template attempt retains its reservation for the interval, making “one attempt” objectively testable.
- Added concurrent-send and full-capacity tests to verify the strengthened at-most-once contract.
- Removed dynamic message excerpts and their underspecified “declares a body parameter” condition; the fallback now passes configured components unchanged and never invents a mapping from free-form content.
- Corrected the docs requirement: local startup validation cannot establish Meta approval, so an unapproved template fails when attempted rather than merely disabling at startup.
- Replaced “byte-for-byte today's behavior” with the narrower, consistent promise that send/failure semantics remain unchanged while logging improves.
- Changed live verification to stop and reconcile a code mismatch instead of using a runtime override that no longer exists.

## Human flags

- None. S0 must still verify the Cloud API window-closed numeric code from an authoritative Meta source, and §6 must confirm it against a captured real error before shipment.
