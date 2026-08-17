---
spec: 2026-08-17-gw-msteams-large-upload-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness and consistency review

- Set the spec frontmatter to pass 2 and `changes_requested` because the gateway upload ceiling still requires an explicit human policy decision.
- Made S1–S3 a single ship unit because S1's former standalone ship rule depended on cancellation implemented only in S2 and omitted S3 caller safety.
- Corrected the small-file request comparison from three requests to at least two because the terminal chunk response already carries the drive item and no separate item read is specified.
- Replaced the undefined "implausibly short" expiry warning with an already-expired check so the requirement is objectively testable.
- Made the transfer module accept an optional `AbortSignal` while limiting caller wiring to an existing signal, resolving the conflict between conditional implementation and the mandatory abort test.
- Added the session-creation module/test to S2's file impact because one-time session recreation cannot be implemented solely in the transfer module unless creation is explicitly coordinated there.
- Required an explicit human-selected `MAX_UPLOAD_BYTES` and distinguished it from the external service limit because the previous routing table and DoD used an undefined gateway memory policy.
- Corrected the minion-repo diff allowlist to `extensions/msteams/**` because meta-repo `proposals/**` cannot appear in that subproject's diff.
- Rewrote the production-caller diff check without an unsupported default-regex negative lookahead so the verification command is executable with `rg`.
- Included status/retry/cancel calls in the external-request impact count because the earlier formula understated the specified behavior.
- Clarified that cancellation after expiry/revocation is best-effort and that cleanup can be service-owned, avoiding an impossible guarantee that DELETE succeeds on an invalid URL.
- Updated the final ship gate to require all three slices and the chosen upload ceiling, consistent with the corrected slice dependency.

## Flagged for human

- Choose and record an explicit byte value for `MAX_UPLOAD_BYTES`, no greater than the verified destination limit and acceptable as a per-upload gateway heap bound under expected concurrency. The implementation and numeric routing-table DoD are not fully decidable until this policy value is supplied.
