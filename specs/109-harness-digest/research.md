# Digest research and source reconciliation

Date 2026-10-23. Hub base `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; D stacked commit remains an execution prerequisite. Frozen Bun 1.3.4 install and Node 22.23.3 were completed by the parent with unchanged lock; implementation must verify these receipts before claiming current qualification. No source poll or model inference was performed for this design.

| Decision | Evidence and rationale | Alternative rejected |
|---|---|---|
| Domain admission/run/source/feedback tables | Parent §7.3; `job-effects.service.ts:505+` revises request identity and is embedding-oriented. | Reusing it as dedup would rotate the logical run and permit recall. |
| Reuse D transaction and worker contracts | `../108-harness-pulse/contracts/shared.md`; existing `withOrgCoreTransaction` and `JobExecution.withOwnership`. | Separate commits for card/cursors/job cannot prove atomic publication. |
| Strict bounded official fetch helper | `ssrf-guard.ts` supports operator private-host bypass and resolves before a separate fetch. | Calling assertSafeUrl then ordinary fetch neither pins the connect address nor meets this pilot's strict boundary. |
| Use Node HTTPS with controlled DNS lookup and streaming cap | Node runtime is already server-side; per-request custom lookup can reject/pin public addresses at connection without a new service. Preserve HTTPS hostname/SNI/certificate validation; no global agent mutation. | Fetch image helper allows three redirects/10MB and buffers before enforcing actual size. |
| Existing metered provider, narrow opt-in transport options | `src/server/llm.ts` already centralizes OpenRouter and usage middleware. | A second unmetered provider factory or estimated usage as authoritative cost breaks accounting. |
| Generate text once, retain terminal receipt, then parse | Parent requires known response/bill before validation. Fixture actual wire request with retry/fallback disabled and 1024 output bound. | Structured-output auto-repair or SDK retries may make hidden second calls. |
| Stable budget namespace across policy revisions | Parent §7.3; one active slot under row lock is sufficient. | Per-run/per-policy-only budget allows revision/midnight reset. |
| Empty-queue collection belongs to tick | Existing global tick only advances stored work and explicitly skips by default. D provides Pulse route, E wires collection then selected drain. | A browser callback or CLI enqueue is not closed-client cold-start proof. |
| Add scoped feedback to existing Pulse page | D current receipts and action runtime support reconnect/error semantics. | A new dashboard/general learning service expands approved scope. |

The source list is repository-managed and disabled by default. Development creates an exact official endpoint manifest for dependencies found in the frozen package/lock snapshot and fixture copies with source provenance; it must not fetch arbitrary supplied URLs. No claim is made that a specific current upstream release was verified during this source-only SDD task. Policy activation validates endpoint ownership/provenance separately, with at most five sources.

Existing `user.service.ts:205–215,280+` removes memberships through Supabase administrative calls. D adds scoped cancellation hooks; E extends the same transaction to digest jobs and collection generations. Workers must still recheck current SQL authority, because external membership deletion can happen outside these hooks.

Spec Kit template resolution and setup scripts use absolute feature directory plus `SPECIFY_FEATURE_NO_PERSIST=1`. No `.specify/extensions.yml` exists. Direct source research follows task instruction forbidding child agents. Validation guide lives in `contracts/validation.md` instead of an additional quickstart file to respect the author's assigned path ownership.
