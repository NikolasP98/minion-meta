---
phase: 16-observability
plan: "04"
requirements: ["OBS-01"]
requirements-completed: []
status: locally-qualified
---

# Server telemetry boundary repair — September 11

Candidate: `/home/nikolas/.cache/claude-tmp/hub-16-01-15-02`, branch `feat/observability-identity-finance-parser-bounds`, base99715f50109fe5785009d23544166e3d79bc0ce2. Exact ten-file manifest and before-images: `/tmp/minion-16-04-oxfrdibz/final-inputs.json` and `before/`. Root checked all ten current hashes and independently reviewed the wrapper, context and four actual producer changes.

Six fixed server event profiles retain typed route/release/HTTP/timing/cache/DB identity while dropping unknown fields, names, addresses and free-text catalog metadata. Request/run/resource correlation uses domain-separated bounded SHA256 pseudonyms. Valid W3C trace hints require nonzero trace and span IDs. Server-resolved organization/actor values remain authority; correlation headers do not.

Four actual producers use the private-client capture wrapper. Initialization is coalesced; accessors are not evaluated and proxy/SDK/flush errors are contained. Completed server creation and marketplace installation, layout responses, authorization refusals and provisioning SSE behavior remain intact when telemetry fails. Credential-bearing server creation diagnostics were removed. The actual server-timing producer's full field shape remains accepted; layout route access stays within its existing untrack boundary.

Root independent native replay: **50/50 passed**, four files, zero skips,1.93seconds (`root-replay.log`). Agent also passed50/50, all-ten-file scoped native TypeScript, formatting and diff checks. Test toolchain: Node22.23.2/Vitest4.1.10, one worker,1GiB heap, private cache, envDir:false and denied network. Exact commands and runtime identities are in HANDOFF.md, tool-inputs.json and runtime-cache.json. This is a scoped server check, not the full combined UI candidate's check.

Preserved baseline failures establish raw-field/getter/correlation defects, actual producer failure propagation and an unobserved native flush rejection. The cold-import concurrency baseline measured one constructor/one capture for four calls under Vitest; it does not prove multiple baseline client construction. Repaired code measures one constructor/four captures. Mock/config setup failures are separated in the handoff from product defects.

No package changes, credentials, live telemetry writes, database/provider mutations, index changes, commits or deployments. Parser work15-06 is disjoint. OBS-01 remains open for remaining producers and real delivery. Error-storm flush fan-out, serverless lifecycle, host log/Sentry scrub and agent trace coverage have exact source TODOs and `proposals/2026-09-11-hub-telemetry-boundary-followups.md`.
