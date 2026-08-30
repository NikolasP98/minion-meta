---
spec: 2026-08-17-hub-reserva-keyword-config-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set the spec to pass 2, approved status, and approved verdict so its lifecycle fields agree with this review.
- Split tolerant read parsing from strict write validation and defined deterministic read-side truncation, resolving the contradiction between “malformed falls back” and “40 stored keywords cap to 20.”
- Corrected the cross-repo/API impact claim: the REST body and response are additive contract changes even though shared packages and WebSocket frames are unchanged, and required discovery/testing of typed consumers.
- Made the settings write contract explicit, scoped unknown-key rejection to the deposit object, and aligned the invalid-request examples with the documented nested body.
- Defined `staleDerived` from a precisely named row count, removing ambiguity for the zero-stale-row case.
- Removed the claim that the explicitly excluded UI editor requires an open-items-ledger proposal; an intentionally excluded feature is not an unfinished implementation in this scope.
- Distinguished the hub and meta-repo comparison bases in the no-DDL command so the meta-repo check is executable against a valid commit range.
- Required an invoice fixture containing the default keyword for the manual E2E check, making the promised before/after difference verifiable.

No human decision is required.
