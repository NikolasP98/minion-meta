---
spec: 2026-08-17-site-member-gateway-swallowed-errors-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

Changes made:

- Set `status: approved`, `pass: 2`, and `verdict: approved` so the lifecycle fields agree after this correctness review.
- Limited the sink invariant to promises the module consumes or starts fire-and-forget, avoiding duplicate logging for promises intentionally returned to callers.
- Defined observer failure behavior so a throwing `onFailure` cannot create an unhandled rejection or a false second gateway failure.
- Clarified the module sweep to distinguish genuinely unhandled fire-and-forget promises from returned promises whose rejection belongs to the caller.
- Removed the unverifiable `server` classification because the shared client represents server responses and unrelated connected failures as indistinguishable bare `Error` instances.
- Made unmatched connected failures `unknown` and updated classifier tests, UI severity mapping, copy, and the server-response probe consistently.
- Replaced the single global failure slot with per-operation active failure state plus a deterministic latest-active aggregate, preventing one operation's success from hiding another operation's ongoing failure.
- Defined deduplication and recovery per operation, including behavior when an active operation's kind or message changes.
- Added multi-operation recovery assertions so the degraded-state definition is machine-checkable.
- Reworded transient UI copy so a timeout does not falsely claim that reconnection is occurring.
- Removed the typed-error `TODO(handoff)` and unrelated append to the `onEvent` proposal; typed provenance is an explicit coarse-classification boundary, not incomplete work required by this fix.
- Changed the hub audit from a mandatory mirrored-proposal side effect to a recorded impact-zone check, keeping a separate repo's remediation outside this site's ship gate.
- Scoped the static empty-catch gate to `member-gateway.svelte.ts`, matching the explicit exclusion of empty catches elsewhere in the site.
- Made the mid-poll socket-kill probe deterministic by requiring an in-flight delayed `sessions.list` request instead of stopping an idle socket and waiting for a later poll.
- Tied recovery verification to the next successful operation and required the strip to remain while any other operation is still failed.
- Updated the upstream reconnect-swallow gate to require disclosure and owner linkage without making that separate shared-client fix block this consumer fix.

Human flags: none.
