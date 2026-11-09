# Feature Specification: Hub assistant JEV turn router — follow-up defects

**Feature Branch**: `007-jev-router-followups`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Finish the hub assistant's JEV turn router after the shipped
gate fix (hub #540 fixed D1 D2 D4 D6). Remaining defects from the 2026-10-15 audit: D3 the
`brain` noul is not a usable signal (true 0.57–0.92 vs false 0.08–0.85; loaded on 24/46 probe
turns, needed on ~4) — the question wording must change, not the threshold; D5 the
anti-hallucination rule cites 'NO MODULE HERE' markers that render only inside the gated page
list, and the recovery tool `hub.pages` returns weak matches with no marker; D7 the classifier
sees one turn with no history, so 'sí' / 'viernes 3pm' / '12' mid-form-fill get core-only
context — carry the prior turn's mode; D8 `/api/assistant/route` has no rate limit; D9 the two
1500 ms budgets are nested so the server never gets its own; D10 calibration has no data (5
production turns in 3 days) — commit the 46-case live probe as an opt-in test (pattern:
`prompt-contract.live.test.ts`) and calibrate from it, keeping the PostHog `assistant_route`
event for drift. Not security tagged."

## Clarifications

### Session 2026-10-15

No interactive user was available for this run (per this workspace's audit brief); each
question is answered here from the evidence named in the question, and tagged as an assumption
for the owner to confirm.

- Q: D7's audit names two different mechanisms — (a) feed the prior turn's mode into the
  classifier's `state` text and still call it, or (b) skip the classifier entirely and reuse
  the prior decision verbatim when the new text has no verb / is under ~4 tokens. Which one? →
  A: (a) — feed it into `state` and still classify. The audit found the classifier handles
  multi-intent and typos well; one more line of state is smaller and strictly more informative
  than a verb/length heuristic that can misfire on a genuine topic change phrased briefly (e.g.
  "cancel"). **(ASSUMPTION — owner to confirm.)**
- Q: D8's fix is "worth one line" but names no limit, and this endpoint fires on every
  user-typed chat turn — a limit tuned for a login form would throttle a user legitimately
  chatting fast. What limit/window should gate `/api/assistant/route`? → A: reuse the hub's
  existing `checkRateLimit` keyed per authenticated user, windowed and sized wide enough that
  normal rapid chatting never trips it (ponytail default: 20 calls / 60 s per user — well above
  any observed or plausible human typing-and-sending cadence, and the existing primitive's own
  default of 5/min was sized for a login form, not a chat composer); when hit, the endpoint
  fails open (`{decision: null}`, still HTTP 200) rather than rejecting the send.
  **(ASSUMPTION — owner to confirm the exact number.)**
- Q: D9's audit gives two options — lower the server's own budget to 1200 ms, or just document
  the nesting in a comment and leave both at 1500 ms. Which? → A: lower it to 1200 ms, the
  audit's own suggested number. Measured p50 is ~225 ms with no live impact today, so there is
  ample room, and an enforced budget is strictly more correct than a comment that can rot.
  **(ASSUMPTION — owner to confirm the exact number.)**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A knowledge question gets the business/data context it needs, not a brain tangent (Priority: P1)

A user asks the in-app assistant a plain business question ("¿cuántas facturas pagó Ana este
mes?", "what do customers complain about most?"). Today the `brain` manifest fires on roughly
half of all turns (24/46 in the audit's probe set) because its question ("does this need the
organization's own knowledge, history or past conversations?") is true of almost any business
question, so it adds ~700 wasted characters to turns that never needed it, while still not
reliably firing on the handful of turns that genuinely do need semantic search over past chat
(two real production turns about prior conversations were starved core-only because `brain`
scored 0.39 and 0.18).

**Why this priority**: This is the headline remaining defect — the only `noul` the audit found
structurally unusable (no threshold separates true from false), and it is already the majority
failure mode in the five real production `assistant_route` events logged so far.

**Independent Test**: Reword the `brain` question to name the mechanism (semantic search over
past chat messages/documents vs. a direct database lookup) and re-run the committed probe set
(User Story 3) without touching any other manifest; confirm the true/false score ranges for
`brain` now separate at some threshold, and confirm the turns that only needed `data`/`pages`
no longer carry `brain` as a wasted manifest.

**Acceptance Scenarios**:

1. **Given** a turn that asks about live business data only ("how much did we invoice last
   month?"), **When** it is classified, **Then** the `brain` noul scores low enough that
   `brain` is not loaded (no wasted manifest).
2. **Given** a turn that asks what a customer said in a prior conversation ("¿qué me dijo Ana
   sobre el precio la última vez?"), **When** it is classified, **Then** the `brain` noul
   scores above its threshold and `brain` loads.
3. **Given** the 46-turn probe set, **When** scored with the reworded question, **Then** the
   number of turns where `brain` loads but is not needed drops from the audit's baseline of 6,
   and no turn that genuinely needed `brain` drops below threshold.

---

### User Story 2 - A mid-form-fill follow-up keeps the context of the task it is answering (Priority: P2)

A user is filling out a booking or a form through conversation. The assistant asks a question,
and the user replies with a short, context-dependent answer: "sí", "viernes 3pm", "12". Today
the classifier sees only that one short reply with no history, scores every manifest low, and
the turn gets core-only context — right when the user is mid-task and the context (the form,
the page) is exactly what is needed to keep going.

**Why this priority**: Second-highest-impact defect in the audit (3/46 probes starved this
way, a distinct and reproducible failure bucket), but smaller blast radius than User Story 1
(it only affects turns that are already mid-flow, not every knowledge question).

**Independent Test**: Send a two-turn sequence through the classifier (a turn that routes to
`record_action`/`forms`, then a short reply with no verb) and confirm the second turn's
classification carries forward at least the first turn's manifest, verifiable without any UI
changes by calling the classifier service directly with the prior mode set.

**Acceptance Scenarios**:

1. **Given** a turn classified as `record_action` with `forms` loaded, **When** the next turn
   from the same user is a short reply ("12", "viernes 3pm") with no history otherwise
   supplied, **Then** the classifier's input carries the prior turn's mode and the resulting
   manifest set for the follow-up is no longer core-only.
2. **Given** the very first turn of a session (no prior mode), **When** it is classified,
   **Then** behavior is unchanged — classification proceeds exactly as it does today.
3. **Given** a follow-up turn that is short but is actually a new, unrelated request (e.g. the
   user abandons the form and asks "cancel" / "nevermind"), **When** it is classified with the
   prior mode carried into state, **Then** the classifier may still land on a different mode —
   carrying the prior mode is additional context for the classifier, not a forced override.

---

### User Story 3 - Engineers can recalibrate the five thresholds without waiting months for production traffic (Priority: P3)

The router's five thresholds were set from 12 live probes on 2026-10-12 and have not moved
since; production has logged only 5 `assistant_route` events in 3 days, so the proposal's own
"re-derive from ~200 real turns" plan is roughly four months out. The audit's 46-turn probe set
is the only practical calibration instrument that exists today, and it currently lives only in
a markdown report, not in the repository.

**Why this priority**: Lower urgency than US1/US2 (it doesn't change any turn's behavior by
itself) but it is the only way future changes to the five questions or thresholds — including
the ones made by this feature — get verified before they ship, rather than discovered by
regression days later (as happened to the `changelog` threshold, D4, which the audit caught at
0.61 against a 0.6 bar).

**Independent Test**: Run the committed test on demand; it reports, per manifest, the current
true/false score ranges from the 46-turn fixture and whether each threshold still separates
them — runnable and readable without opening the audit markdown file.

**Acceptance Scenarios**:

1. **Given** the 46-turn probe set committed as fixtures, **When** the opt-in test is run (it
   is not part of the default CI gate, matching the existing `prompt-contract.live.test.ts`
   pattern because it calls the live classifier and costs real money), **Then** it reports a
   pass/fail per manifest threshold and the measured score ranges.
2. **Given** a future change to a question's wording or a threshold, **When** the opt-in test
   is run against it, **Then** a regression that narrows or closes the separation margin is
   visible in the report, not just in a future production incident.
3. **Given** the PostHog `assistant_route` event already in production, **When** this feature
   ships, **Then** that event keeps logging every turn's mode and five probabilities unchanged
   — it remains the drift signal; the probe set is the calibration instrument, not a
   replacement for it.

---

### User Story 4 - The anti-hallucination rule has evidence to point to even when the page list is withheld (Priority: P4)

The agent's rule (5) says a module that does not exist should be named as such, citing
evidence "only listed after 'NO MODULE HERE for'" — but that marker is only rendered inside the
full page list, which the router may withhold on the exact turns (navigation/"where is X")
that most need it. When the agent falls back to its `hub.pages` recovery tool, that tool
returns a same-shape "match" for a page whose only hit was a weak/module-does-not-exist keyword
(e.g. "planilla" → `/team`, which merely carries `~planilla` as a near-miss, not a real
payroll feature) with nothing distinguishing it from a true match.

**Why this priority**: Narrower than US1/US2 — it only matters on the subset of navigation
turns where `pages` was withheld AND the user named a module that genuinely doesn't exist —
but its failure mode is a confident wrong answer, not a missing one.

**Independent Test**: Call the `hub.pages` recovery tool with a query that only weak-matches a
page (e.g. "planilla de sueldos") and confirm the result marks that hit as a near-miss rather
than returning it indistinguishable from a strong match.

**Acceptance Scenarios**:

1. **Given** a query whose only hits are weak (`~`-prefixed keyword) matches, **When**
   `hub.pages` is called, **Then** the returned result flags those hits as not a real match for
   the named module (the same "NO MODULE HERE" signal `describePages` already renders for the
   full list).
2. **Given** a query with at least one strong match, **When** `hub.pages` is called, **Then**
   strong and weak hits remain distinguishable from each other in the result.

---

### User Story 5 - The router call is cheap to misuse and never starves itself of its own time budget (Priority: P5)

Two small defects bundled as one deployable slice because each is a one-line-sized fix with no
user-facing behavior change on the happy path: `/api/assistant/route` has no throttle at all
(an authenticated user could loop it, each call costing OpenRouter real money), and the
client's 1500 ms round-trip budget and the server's own 1500 ms call to OpenRouter are nested,
so the server's "budget" is never actually enforceable within the client's.

**Why this priority**: Lowest priority — the audit found no live impact from either (measured
latency 200–501 ms, no abuse observed) — but both are cheap to close now rather than carry as
permanent risk.

**Independent Test**: Call the route endpoint more than the configured limit within its window
from the same authenticated user and confirm later calls still return HTTP 200 with
`{decision: null}` (fail open — the send is never blocked) rather than calling the classifier;
separately, confirm the server's own timeout value is strictly less than the client's.

**Acceptance Scenarios**:

1. **Given** a user who has already made the limit's worth of classifier calls within the
   window, **When** they send another turn, **Then** the endpoint returns `{decision: null}`
   without calling OpenRouter, and the turn still sends with the full envelope (unchanged
   send flow).
2. **Given** normal chat usage (a user sending turns at a human typing pace), **When** they use
   the assistant for an extended session, **Then** they never observe the limit (no dropped
   classifications under ordinary use).
3. **Given** the server's classifier call, **When** it is timed, **Then** its own timeout is
   strictly smaller than the client's round-trip timeout, so the server can always finish (or
   give up) inside the client's own budget.

### Edge Cases

- A session's very first turn has no prior mode to carry (User Story 2) — classification
  proceeds exactly as it does today; this is not a regression, it is the no-history case the
  feature cannot improve on.
- A short follow-up turn is a genuine topic change, not a continuation ("cancel" after being
  asked to confirm a booking) — carrying the prior mode is additional classifier input, not an
  override, so the classifier remains free to land on a different mode; this is an accepted,
  bounded imprecision, not a defect.
- The reworded `brain` question (User Story 1) still measures imperfectly on some turn — the
  acceptance bar is "the probe set shows a real improvement in separation," not "perfect
  separation," since the audit found no threshold-only fix works for the old wording.
- The rate limit (User Story 5) is reached by a legitimate user in a genuine burst (e.g.
  rapid-fire chatting) — the fallback is the pre-router full envelope, not a blocked send or a
  visible error; the user never knows the limit was hit.
- `hub.pages` (User Story 4) is called with a query that has no hits at all — existing
  "no page matches" behavior is unchanged; the new near-miss flag only applies when a hit
  exists but is weak-only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The classifier's `brain` question MUST be reworded to name the mechanism it is
  actually trying to detect (semantic search over past chat messages/documents) instead of its
  current wording, which is true of almost any business question.
- **FR-002**: The reworded `brain` question MUST be verified against the committed probe set
  (FR-008) before this feature is considered complete, confirming an improvement in true/false
  score separation over the audit's measured baseline (true 0.57–0.92 vs false 0.08–0.85, no
  separating threshold).
- **FR-003**: The classifier's input state MUST carry the prior turn's winning mode (not its
  raw text) when the conversation has a prior routed turn, by including it as one additional
  line in the classifier's `state` text — the classifier still runs on every turn; this is not
  a short-circuit that skips classification (resolved in Clarifications, Q1).
- **FR-004**: The first turn of a session (no prior mode available) MUST classify exactly as it
  does today — carrying prior-turn context is strictly additive, never a precondition for
  classification to run.
- **FR-005**: The page-search recovery tool (`hub.pages`) MUST distinguish a weak/keyword-only
  match (the "a module that does not exist, this is only the nearest page" case the full page
  list already marks with "NO MODULE HERE for") from a genuine strong match, and MUST surface
  that distinction in its result so the anti-hallucination rule has evidence even when the full
  page list manifest was withheld.
- **FR-006**: `POST /api/assistant/route` MUST enforce a per-authenticated-user rate limit on
  calls to the classifier, reusing the hub's existing rate-limit primitive
  (`checkRateLimit`/`src/server/auth/rate-limit.ts`) rather than a new mechanism. When the limit
  is hit, the endpoint MUST still return HTTP 200 with `{decision: null}` — never reject or
  delay the send — so a user who hits the limit silently falls back to the full envelope. The
  limit is 20 calls per 60 seconds per authenticated user (resolved in Clarifications, Q2).
- **FR-007**: The server-side call to the external classifier MUST use a timeout strictly
  smaller than the client's own round-trip timeout, so the server's budget is never
  unenforceable inside the client's. The server's timeout is lowered to 1200 ms (client stays
  at 1500 ms) (resolved in Clarifications, Q3).
- **FR-008**: The 46-turn live probe set used throughout the 2026-10-15 audit MUST be committed
  to the repository as an opt-in test (not run by default CI, matching the existing
  `prompt-contract.live.test.ts` pattern, since it calls the live classifier and spends real
  money).
- **FR-009**: The committed probe-set test MUST report, per manifest, the measured true/false
  score ranges and whether the configured threshold currently separates them, so a future
  change to a question or threshold can be checked before it ships rather than caught by a
  production regression.
- **FR-010**: The existing `assistant_route` PostHog event MUST continue to log every routed
  turn's mode and five manifest probabilities unchanged — it remains the drift signal; the
  probe set (FR-008/FR-009) is the calibration instrument, not a replacement for production
  logging.
- **FR-011**: All invariants already shipped by the turn router (fail-open on any classifier
  failure or non-`enforce` mode; the core envelope is never gated; the winning mode always
  earns its own manifest; the user's typed text never reaches the classifier's logged output)
  MUST remain unchanged by this feature. This feature only touches: the `brain` question
  wording, the classifier's input state, the `hub.pages` recovery tool's result shape, the
  route endpoint's rate limiting, the server-side timeout value, and the addition of a
  committed probe-set test.

### Key Entities *(include if feature involves data)*

- **Route decision**: unchanged shape (mode, per-mode probabilities, per-manifest probabilities,
  latency, cost) — this feature changes what feeds into producing one (FR-001, FR-003), not its
  shape.
- **Probe case**: one fixture entry (locale, request text, the manifests judged "needed", and
  — once the test runs — the live decision for comparison); the 46 cases already enumerated in
  `audits/2026-10-15-agent-harness/B-jev-router.md`.
- **Rate-limit key**: the authenticated user id, scoped to the `/api/assistant/route` endpoint
  only (does not share a bucket with any other rate-limited endpoint in the hub).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Re-running the 46-turn probe set after the `brain` rewording shows a threshold
  that separates true from false turns (or a documented, measured improvement over "no
  threshold works"), down from the audit's baseline of `brain` loading on 24/46 turns while
  being needed on ~4.
- **SC-002**: The three audited follow-up turns ("sí", "viernes 3pm", "12") no longer classify
  core-only when preceded by a routed turn, verified by the committed probe-set test running a
  two-turn sequence.
- **SC-003**: The `hub.pages` recovery tool, called with a query that only weak-matches, marks
  the result as not a genuine match for the named module, verified by a test case using the
  audit's own "planilla de sueldos" example.
- **SC-004**: `/api/assistant/route` never exceeds its configured per-user rate limit without
  falling open to `{decision: null}` (HTTP 200, no classifier call, send unaffected), and no
  normal single-session chat usage observed in manual testing trips the limit.
- **SC-005**: The server's own timeout to the classifier is measurably smaller than the
  client's round-trip timeout (both values are named constants, diffable in the same review).
- **SC-006**: The committed probe-set test runs on demand (not in default CI), completes, and
  reports a pass/fail with measured score ranges for all five manifests without requiring
  anyone to open the audit markdown file to interpret the result.
- **SC-007**: Every existing unit test for the turn router, the classifier service, and the
  assistant context builder continues to pass unchanged in shape (new cases may be added; no
  existing case's expected outcome changes), proving none of the five shipped invariants (D1,
  D2, D4, D6, and the fail-open paths) regressed.

## Assumptions

- Owner directive (task description) explicitly marks this feature "Not security tagged" even
  though FR-006 touches abuse/cost control — Constitution Principle V's human-gate requirement
  for security/data work is therefore read as not triggered by this feature; if the owner
  disagrees, FR-006 escalates to the gated path on review.
- The rate-limit number (FR-006: 20/60s per user) and the reduced server timeout (FR-007:
  1200 ms) are resolved in Clarifications as owner-confirmable defaults, not firm requirements —
  the audit names the tradeoff but not a number, and this endpoint sits on the hot path of
  every chat turn.
- The probe-set test (FR-008) depends on `OPENROUTER_API_KEY` being present in the environment
  it runs in, the same precondition the live classifier service already has; it is not expected
  to run in an environment without that key (it is explicitly opt-in, same as
  `prompt-contract.live.test.ts`).
- "Carry the prior turn's mode" (FR-003) is scoped to the mode label only, never the user's
  prior text — consistent with the shipped router's existing rule that the user's typed text is
  never logged or reused beyond the single request it was sent in.
- This feature ships as its own slice(s) against `minion_hub`'s registered PR base, independent
  of and after hub #540; it does not reopen or amend that merged PR.
