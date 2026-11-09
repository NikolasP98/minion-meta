# Phase 0 Research: Hub assistant JEV turn router — follow-up defects

No open `NEEDS CLARIFICATION` markers remain in `spec.md` (all three resolved in
`/speckit-clarify`). This phase instead confirms the technical approach for each of the five
touched files against the already-shipped code (post hub #540, `origin/master`), since this is
a follow-up to an existing subsystem rather than new-ground research.

## D3 — reword the `brain` noul question

- **Decision**: Change `CONTEXT_MANIFESTS[brain].question` in
  `src/lib/assistant/turn-router.ts:106-115` from "Does this request need semantic search over
  the organization's own knowledge, history or past conversations?" to a version that names the
  *mechanism*, not the *topic* — the audit's own suggested rewording: "…require semantic search
  over past chat messages and documents, as opposed to a direct database lookup?"
- **Rationale**: The audit (D3) measured the current wording as true of almost any business
  question (true 0.57–0.92, false 0.08–0.85, no separating threshold exists). The fix must
  change what's being asked, not where the line is drawn — a threshold move was already ruled
  out by the audit's own measurement.
- **Alternatives considered**: Raising/lowering the threshold alone — rejected, the audit found
  no threshold separates the two distributions under the current wording. Removing the `brain`
  manifest's noul and inferring it only from `mode === 'knowledge_question'` — rejected, that
  throws away the "fires even when mode differs" multi-intent case the audit found valuable
  elsewhere (independent nouls over a softmax).
- **Verification plan**: Re-run the committed probe set (D10) after the wording change and
  confirm improved separation (SC-001). This is empirical — the question change must be
  measured against the same 46 cases, not assumed correct from reasoning alone.

## D7 — carry the prior turn's mode into classifier state

- **Decision**: `classifyAssistantTurn`'s `buildState()` in
  `src/server/services/assistant-router.service.ts:45-47` gains an optional `priorMode:
  RouteMode | undefined` parameter, rendered as one additional line (e.g.
  `prior_mode: <mode>`) in the `state` string when present. The client-side callers
  (`FloatingAssistant.svelte`, `(app)/home/+page.svelte`) pass their already-tracked last mode
  through `requestRouteDecision(text, locale, priorMode)` → `POST /api/assistant/route` body →
  `classifyAssistantTurn`.
- **Rationale**: `FloatingAssistant.svelte` already has `lastMode` as client state (line 217,
  `let lastMode = $state<RouteMode | null>(null)`) — it is set after every classification
  (line 237) and even shown in the UI's scope label (line 181), but never sent back into the
  next classification. The fix is wiring an existing value through, not introducing new state.
  `(app)/home/+page.svelte` has no equivalent variable yet and needs one added alongside its
  own `routing` state (line 639).
- **Alternatives considered**: Short-circuiting the classifier entirely for short/verbless
  follow-ups (the audit's alternative (b)) — rejected in Clarifications Q1: smaller, more
  informative to keep the classifier in the loop, and avoids a second heuristic (token-count/
  verb detection) that can misfire on a genuine topic change phrased briefly.
- **Scope boundary**: Only the mode label crosses into `state` — never the prior turn's text,
  preserving the shipped invariant that the user's typed text is never logged or reused beyond
  its own request (FR-011, Clarifications).

## D5 — `hub.pages` surfaces weak/module-missing matches

- **Decision**: `global-tools.ts`'s `hub.pages` tool (`execute`, lines ~76-94) currently calls
  `searchPages()`, which internally computes a weak-match flag per `rankPages()`
  (`site-map.ts:148-171`, the `weak` local var) but `searchPages()` throws that information away
  before returning plain `SitePage[]`. The fix exports a result shape from `rankPages` (or a new
  thin wrapper) that `hub.pages` can read, and adds a `moduleMissing: boolean` field to each
  returned hit when its *only* matched token(s) came from a `~`-prefixed keyword — mirroring the
  "NO MODULE HERE for" distinction `describePages()` already renders for the full list
  (`site-map.ts:224`).
- **Rationale**: `rankPages` already computes the strong-vs-weak distinction internally (the
  `weak` variable at `site-map.ts:160-168`); the fix surfaces existing information, not new
  logic. No duplicate matching algorithm.
- **Alternatives considered**: Teaching the agent's system prompt to always double-check
  `hub.pages` hits against the full page list — rejected, that reintroduces the exact dependency
  (needing the gated `pages` manifest) D5 exists to route around. Filtering weak-only hits out
  of `hub.pages` entirely — rejected, that regresses the "offer the nearest page" behavior
  `describePages()` deliberately keeps; the fix is to flag, not hide.

## D8 — rate limit on `/api/assistant/route`

- **Decision**: `+server.ts`'s `POST` handler calls `checkRateLimit(userId, 20, 60_000)` (reusing
  `src/server/auth/rate-limit.ts` unchanged) keyed on the authenticated user id from `locals`,
  before the `classifyAssistantTurn` call. On a `false` (limit hit), skip straight to
  `json({ decision: null })` — same response shape the function already returns for a missing
  key or empty text, so no new response branch for the caller to handle.
  `captureServerEvent` still fires with `assistant_mode: 'unavailable'` (the existing fallback
  for a `null` decision), so rate-limited turns are visible in the same PostHog event rather
  than silently invisible.
- **Rationale**: `checkRateLimit` is the hub's existing, already-tested primitive
  (`src/server/auth/rate-limit.test.ts`) for exactly this shape of problem (per-key sliding
  window, in-memory, one process). No new dependency, no new abstraction — reuse per Constitution
  Principle III's spirit (don't introduce a second rate-limiting mechanism).
- **Alternatives considered**: A Valkey-backed distributed limiter — rejected as over-scoped;
  the primitive's own comment already notes "move to Valkey if abuse ever matters," and nothing
  here indicates it does yet. Keying on IP instead of user id — rejected, the endpoint is
  already `requireAuth`-gated, so a user id is a cleaner, more precise key than IP (shared
  offices/NAT would otherwise throttle unrelated users together).

## D9 — un-nest the two 1500 ms budgets

- **Decision**: `assistant-router.service.ts:28`'s `TIMEOUT_MS` constant for the OpenRouter call
  drops from `1500` to `1200`; `turn-router.ts:150`'s client-side `TIMEOUT_MS` stays `1500`. The
  comment at `assistant-router.service.ts:27` ("Matches the client's AbortSignal budget") is
  corrected to state the new relationship explicitly.
- **Rationale**: Resolved in Clarifications Q3 — an enforced, strictly-smaller server budget is
  more correct than a comment, and the measured p50 (~225 ms) leaves ample room at 1200 ms.
- **Alternatives considered**: Leaving both at 1500 ms and only updating the comment — rejected
  per Clarifications Q3 (the audit's own second option, not chosen).

## D10 — commit the 46-case probe set as an opt-in test

- **Decision**: New `src/lib/assistant/jev-probe-set.live.test.ts`, following the existing
  `prompt-contract.live.test.ts` pattern (same directory, same opt-in gating — requires
  `OPENROUTER_API_KEY`, not part of the default `bun run test`/CI command). Fixtures are the 46
  `{id, loc, request, needed}` rows from `audits/2026-10-15-agent-harness/B-jev-router.md`'s
  probe table, extracted into a sibling JSON/TS fixture file. For each fixture, the test calls
  `classifyAssistantTurn` live, computes `gateManifests`, and reports (not necessarily
  hard-asserts, since live model output varies run to run) per-manifest score ranges split by
  "needed" vs "not needed," flagging any manifest whose true/false ranges now overlap its
  threshold.
- **Rationale**: This is the only way to verify D3 (SC-001) and catch a D4-style near-miss
  (the `changelog` threshold measured 0.61 against a 0.6 bar on 2026-10-15, discovered only by
  re-running the audit's probes) before it reaches production, given only 5 real
  `assistant_route` events exist after 3 days — "the only practical calibration instrument
  today" per the audit itself.
- **Alternatives considered**: Hard pass/fail assertions per probe case — rejected as flaky by
  construction (the audit's own data shows run-to-run drift, e.g. the `changelog` case scoring
  0.94 then 0.61 on different days for the identical prompt); a reporting test that flags
  threshold-separation regressions is the right strength of check for a probabilistic
  classifier, matching how `prompt-contract.live.test.ts` already treats live-model output.
- **Scope boundary**: This test does not change CI configuration. Verified by reading
  `vitest.config.ts` (`test.include: ['src/**/*.test.ts', ...]`) and
  `prompt-contract.live.test.ts:25,149` — **the file IS matched by the default glob**; "opt-in"
  is enforced at runtime, not by exclusion: `const LIVE = process.env.LIVE_LLM === '1'` gates a
  `describe.skipIf(!LIVE)(...)` block, so the file loads and immediately no-ops under the
  default `bun run test` / CI run (no `OPENROUTER_API_KEY` needed to not-run it) and only
  executes when invoked as `LIVE_LLM=1 bun run vitest run <file>`. The new
  `jev-probe-set.live.test.ts` follows the identical runtime-skip shape — see `quickstart.md`
  for the exact command to run it on demand.
