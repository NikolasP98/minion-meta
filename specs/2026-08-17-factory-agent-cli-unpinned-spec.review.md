---
spec: 2026-08-17-factory-agent-cli-unpinned-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set the spec to pass 2, approved status/verdict, and the required update date because all identified issues were correctable without a product decision.
- Added `minion-meta` to `repos` and qualified the owner-surface claim because the ship gate requires a proposal file in that repository.
- Named the required runner-image follow-up proposal and made it a prerequisite because the prior wording required an unspecified cross-repo artifact only at the final ship gate.
- Clarified that any deliberate harness-version bump is a later, separately reviewed PR because the previous “first exercise” wording contradicted the explicit no-version-change scope.
- Specified that contract probes run inside the selected image and securely forward one supported credential because the live-envelope DoD was otherwise implementation-ambiguous.
- Split npm and Bun release-source requirements because `npm view <pkg> repository.url` cannot provide metadata for Bun.
- Required absent npm dist-tags to be reported explicitly because not every package is guaranteed to publish both `stable` and `latest`.
- Corrected “bogus build argument” to “nonexistent-version build argument” because the existing negative control tests a bad value for a valid argument, not an unknown argument.
- Renamed the pin negative-control claim because it proves exact override/fail-closed installation, not that the separate post-install comparison itself fired.

No human decisions are required.
