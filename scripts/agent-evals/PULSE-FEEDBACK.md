# Optional Pulse feedback import

`screen.mjs --input FILE --labels FILE --feedback EXPORT.jsonl` reads the explicitly named local export from Digest's `GET /api/pulse/feedback/export`. It makes no Hub or provider request. Ordinary runs need no Digest export.

The supported JSONL format has a `pulse-feedback-v1` header with `automaticLearning:false`, at most 100 grouped feedback records, and a final `nextCursor` record. The complete file must be at most 256 KiB. Records preserve owner, actor, organization, card/content revision, digest run, source revisions/hashes, policy revision, action UUID, server payload hash and immutable correction pointers. Comments permit 500 Unicode code points; unpaired surrogates and invalid UTF-8 are rejected. Duplicate keys, records, actions, conflicting provenance, correction cycles and two successors are rejected. For unredacted rows the importer recomputes the server-defined canonical action payload hash. A redacted comment cannot be reconstructed from its retained hash.

`factual_errors` contains user-reported, unadjudicated `fact_error` records. `preference_relevance` contains the other five reasons. Neither becomes a gold label, policy weight or training update. File validation does not authenticate a user or prove a factual claim. Gold labels and review selection remain the separate evaluation inputs.

The result retains `nextCursor` and `hasMore`. Every import reports `historyCompleteness:'not_asserted'`: even a final page alone is not evidence that all earlier pages were supplied. A predecessor outside the supplied page is listed under `unresolvedPredecessors`, and correction verification is `partial_page`. Present predecessor links must match owner/card/content/source/policy binding. No missing history is invented.

The earlier local JSON `{version:1,revision,records}` format is accepted for compatibility and marked `legacy_unverified`; it cannot gain authority from the new parser. Its supported reasons remain `factual_error`, `relevance` and `preference`.

`fixtures/pulse-feedback/actual-export.jsonl` came from the actual SQL-backed E export route against marked disposable PostgreSQL. `producer-receipt.json` pins its bytes, schema and producing service, route and migration source hashes. The comments and owner identities are synthetic fixtures. `pulse-feedback.test.mjs` runs that file through the public screen CLI and verifies that scoring, labels and review selection remain unchanged.
