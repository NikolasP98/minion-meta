# Feature Specification: Safe default-on JIT tool selection for hub personal agents

**Feature Branch**: `006-jit-tool-selection-on`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Make the gateway's just-in-time tool selection safe to turn on for hub personal agents. Today `tools.selection.mode` defaults to `shadow` so nothing is hidden; with `on`, k=20 over ~55+ candidates and the relevance prompt is the whole ~4.3 KB hub context envelope (`chat-rpc.ts:305` → `attempt-env.ts:164`), not the user's text, so ranking is near-constant and on a vague turn the lexical fallback scores everything 0 → tie-break by `TOOL_ORDER` → top-20 is browser/web tools and not one hub tool. Also: `tool-index.ts:162` returns without indexing the caller's own catalog (cross-agent index pollution; `search_tools` can list another agent's set as allowed); `load_tools` rejects custom-tool ids so a dropped custom tool is unrecoverable; `mode: 'off'` silently makes `search_tools` return nothing. Deliver: rank on the user's message with the envelope stripped; all-zero scores ⇒ serve the full L1 set; per-key index built from the caller's own catalog; `load_tools` accepts any indexed id; `off` mode returns an explicit 'selection disabled' result; then flip the default to `on` behind measured tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ranking reflects what the user actually asked (Priority: P1)

A hub personal agent with `tools.selection.mode: "on"` receives a chat turn. The agent's active
tool set for that turn is chosen by relevance-ranking every permitted tool against a query. Today
that query is the whole `~4.3 KB` in-app context envelope the hub appends to every message, not the
user's words, so ranking barely varies turn to turn, and a vague or silent follow-up turn (envelope
only, no real intent) ranks every tool `0` and tie-breaks to a fixed static order that contains zero
hub tools. This is the root defect that makes `mode: "on"` unsafe to default to.

**Why this priority**: Every other fix in this feature is moot if the ranking input itself carries
no signal — this is the one defect that, left alone, guarantees hub tools go missing on ordinary
turns the moment `on` is the default.

**Independent Test**: Send a turn whose text is a concrete hub ask (e.g. "what's my next booking")
wrapped in the real envelope format and confirm the matching hub tool scores above generic
always-available tools. Separately, send a turn that is envelope-only (empty/whitespace user text)
and confirm every L1-permitted tool remains active rather than the static `TOOL_ORDER` prefix.

**Acceptance Scenarios**:

1. **Given** a hub turn whose message is `"<user text>\n\n[In-app assistant context …Don't restate
   this context.]"`, **When** the JIT gate ranks tools, **Then** the ranking query is `<user text>`
   with the envelope block removed, not the full concatenated string.
2. **Given** a turn where the stripped query yields an all-zero score vector (e.g. a silent
   follow-up turn, or a query of only stopwords), **When** the shortlist is computed, **Then** the
   active set is the full L1-permitted tool set for that turn, not the top-k of a tied, arbitrarily
   ordered list.

---

### User Story 2 - One agent's tool search never reflects another agent's catalog (Priority: P2)

Two different agents (different permission sets, different registered tools) can have chat turns
in flight at the same time. The relevance index is a single process-wide slot keyed only by a
catalog-text signature; a concurrent build request for a second, different catalog is dropped
(`if (BUILDING) { await BUILDING; return; }`), so that turn ranks and lists tools against the
*first* agent's catalog. `search_tools` then reports another agent's permitted tool set as
`allowed: true` to a caller who is not permitted to use it, and `mode: "on"` can silently drop a
tool that exists in the caller's own catalog but not the other agent's.

**Why this priority**: This is a correctness and access-signaling defect (not a hard permission
bypass — L1 still gates execution) but it actively misinforms `search_tools` callers and makes
shortlisting nondeterministic under concurrency, which blocks trusting shadow-mode measurements
for User Story 1.

**Independent Test**: Run two concurrent turns for agents with different tool catalogs; assert each
turn's `search_tools` results and `rankTools` scores are computed only against that caller's own
catalog, never the other's.

**Acceptance Scenarios**:

1. **Given** agent A and agent B with different permitted tool catalogs make overlapping
   `ensureToolIndex` calls, **When** both complete, **Then** each agent's subsequent `search_tools`
   call lists only tools from its own catalog.
2. **Given** the same concurrent scenario, **When** `mode: "on"` ranks agent A's candidates,
   **Then** every tool in agent A's own catalog receives a score (never silently excluded because
   it was absent from agent B's catalog).

---

### User Story 3 - A custom tool dropped from the shortlist can be brought back (Priority: P2)

`load_tools` only accepts ids present in the static `TOOL_REGISTRY`. Published custom tools
(`custom_<slug>`) are intentionally not in that registry — they live in `CUSTOM_TOOL_INFO` — so once
`mode: "on"` drops a custom tool outside the top-k, the agent's only recovery tool reports it as
`unknown` and refuses to reload it for the rest of the session.

**Why this priority**: Without this fix, flipping the default to `on` makes every org-authored
custom tool a potential permanent casualty of one bad ranking, with no in-session recovery — a
regression serious enough to block the default flip, but narrower in blast radius than User Story 1.

**Independent Test**: With `mode: "on"` and a catalog containing a custom tool outside the top-k,
call `search_tools` (finds it), then `load_tools` with its id, and confirm it becomes callable on
the next turn.

**Acceptance Scenarios**:

1. **Given** a custom tool id returned by `search_tools` that is not in `TOOL_REGISTRY`, **When**
   `load_tools` is called with that id, **Then** the tool is accepted (not reported as `unknown`)
   and is present in the active set on the next turn.
2. **Given** a genuinely unknown id (not in the registry and not in the caller's current index),
   **When** `load_tools` is called with it, **Then** it is still reported as `unknown` — the fix
   widens acceptance to "anything in the caller's index," not to arbitrary strings.

---

### User Story 4 - Turning selection off says so instead of going silent (Priority: P3)

When `tools.selection.mode` is `"off"`, `applyJitToolGate` returns before the tool index is ever
built, so `search_tools` — which lists `listIndexedIds()` — reports zero results with no
explanation. An agent or operator calling `search_tools` in this mode cannot tell "selection is
intentionally off" apart from "nothing matched" or "the index is broken."

**Why this priority**: Lowest severity of the four defects (it degrades a diagnostic/discovery tool,
not the active tool set), but it is explicitly in scope for this feature and is cheap to fix once the
index/selection code path is already being touched for User Stories 1–3.

**Independent Test**: With `mode: "off"`, call `search_tools` and confirm the result explicitly
states selection is disabled, distinguishable from a zero-match result in `on`/`shadow` mode.

**Acceptance Scenarios**:

1. **Given** `tools.selection.mode: "off"`, **When** `search_tools` is called, **Then** the result
   states selection is disabled for this agent/session rather than returning an empty `results` list.
2. **Given** `tools.selection.mode: "on"` or `"shadow"` with a query that genuinely matches nothing,
   **When** `search_tools` is called, **Then** the result is still an empty `results` list (this
   feature does not change that case) — only `off` mode's response changes.

---

### User Story 5 - The default becomes `on`, backed by evidence it is now safe (Priority: P1)

Once User Stories 1–4 are implemented, the feature's actual goal is reached: `tools.selection.mode`
defaults to `"on"` for hub personal agents instead of `"shadow"`, so the k=20 shortlist is
genuinely enforced (prompt economy achieved) without the four defects above making that unsafe.
The flip is gated on test evidence, not merely "the code changed" — see Success Criteria and
Clarifications.

**Why this priority**: This is the feature's reason for existing — "safe to turn on" is the whole
ask — but it is sequenced last because it is only safe once Stories 1–4 are proven, which is also
why it cannot be the *first* slice shipped even though it carries P1 value.

**Independent Test**: With Stories 1–4 merged, run the existing `tool-search` test suite plus new
tests asserting hub-tool presence on representative hub-turn fixtures under the new default, with
no config override, and confirm hub tools are no longer systematically absent.

**Acceptance Scenarios**:

1. **Given** a fresh gateway config with no explicit `tools.selection.mode`, **When** a hub
   personal agent takes a turn, **Then** `resolveSelectionConfig` resolves `mode: "on"`.
2. **Given** the same default, **When** the representative hub-turn regression fixtures from
   Stories 1–4 are run, **Then** all pass, and shadow-mode production logs captured before the flip
   (`[jit-select]`) show the new ranking would have kept the actually-called tool active at least as
   often as today's `shadow` (full-set) baseline.

---

### Edge Cases

- A turn's envelope appears mid-message rather than strictly after the user's text (defensive
  stripping must not depend on position, only on the anchored opening/closing markers the hub
  already uses in `stripAssistantContext`).
- A turn's user text is empty/whitespace after stripping (pure envelope, e.g. a silent follow-up
  turn) — covered by User Story 1's all-zero fallback.
- A query that is not empty but is entirely stopwords/punctuation — same all-zero fallback path.
- Two agents' `ensureToolIndex` calls race within the same tick (not just overlapping async turns).
- A custom tool is unpublished/deleted between being returned by `search_tools` and being requested
  via `load_tools` — remains correctly `unknown` (not a regression target of this feature).
- `tools.selection.mode` is overridden per-agent (agent config layer) to something other than the
  new global default — per-agent override still wins, unchanged from today's merge behavior.
- A non-hub agent (coding agent, subagent, CLI session) with no hub capabilities also goes through
  `applyJitToolGate` — the default-flip's blast radius on these agents is addressed in
  Clarifications (NEEDS CLARIFICATION 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The JIT relevance ranking query MUST be derived from the user's own message text with
  the hub's in-app context envelope block removed, not the full concatenated message the hub sends.
- **FR-002**: When the (post-strip) ranking query yields an all-zero score across every candidate
  tool, the system MUST serve the full L1-permitted tool set for that turn instead of a `TOOL_ORDER`
  tie-break top-k.
- **FR-003**: The tool relevance index MUST be scoped to the catalog of the caller that triggered
  its build (e.g., keyed per catalog signature or per agent), so a concurrent build for a different
  caller's catalog never serves ranks or listings against a catalog it does not own.
- **FR-004**: `search_tools` MUST only ever return tools present in the querying caller's own
  current catalog/index — never another caller's.
- **FR-005**: `load_tools` MUST accept any tool id present in the caller's current tool index
  (registry tools and synthesized custom tools alike), not only ids present in the static
  `TOOL_REGISTRY`.
- **FR-006**: When `tools.selection.mode` is `"off"`, `search_tools` MUST return a result that
  explicitly states tool selection is disabled, distinguishable from a genuine zero-match result.
- **FR-007**: The `alwaysOn` set (`message`, `search_tools`, `load_tools`) and any
  session-already-loaded tool ids MUST remain active in every mode, unchanged by this feature.
- **FR-008**: L1 permission gating (hard, fail-closed, every mode) MUST NOT change behavior as a
  side effect of this feature.
- **FR-009**: The default value of `tools.selection.mode` MUST change from `"shadow"` to `"on"`,
  and this change MUST ship only after FR-001–FR-006 are implemented and after the test/measurement
  evidence described in Success Criteria SC-001–SC-004 exists.

### Key Entities

- **Tool catalog entry**: a single tool's id, title, description, and groups, as fed to the
  relevance index; today built once per turn from the L1-permitted tool list.
- **Tool relevance index state**: the in-memory structure (embedding vectors or lexical fallback)
  the ranking step queries; today a single global slot, becoming caller-scoped under FR-003.
- **Selection config** (`tools.selection`): `mode` (`off`/`shadow`/`on`), `k`, `alwaysOn` — global
  and per-agent layers already exist; this feature changes only the global default of `mode`.
- **Session-loaded tools**: tool ids a session has pulled in via `load_tools`, kept active
  regardless of ranking; unaffected except that custom-tool ids now successfully register here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a hub turn whose text names a concrete hub capability (e.g. bookings, tickets,
  stock), the matching hub tool is present in the agent's active tool set, measured across a fixture
  set covering the hub's tool catalog, with no systematic gap by category.
- **SC-002**: On a turn where the ranking query carries no usable signal (empty, stopwords-only, or
  envelope-only), 100% of the L1-permitted tool set remains active — zero tools silently disappear
  to a tie-break ordering.
- **SC-003**: A custom tool excluded from one turn's shortlist can be restored to callable state via
  `search_tools` + `load_tools` within the same session, 100% of attempts, across a fixture set of
  custom tool ids outside top-k.
- **SC-004**: Under concurrent turns from two agents with different tool catalogs, `search_tools`
  results for each agent contain zero tool ids absent from that agent's own catalog, across a
  repeated-concurrency test run.
- **SC-005**: Calling `search_tools` with `tools.selection.mode: "off"` returns an explicit
  "selection disabled" result on 100% of calls, never an empty-but-unexplained result.
- **SC-006**: After the default flips to `"on"`, a sample of real hub-turn shadow-mode logs
  (captured before the flip, replayed through the fixed ranking) shows the tool the agent actually
  called would still have been in the active set at least as often as it was when `mode` was
  `"shadow"` (i.e., the full set) for that same sample — no regression in practice, not just in
  isolated unit tests.

## Assumptions

- The hub's message-composition order (`<user text>\n\n<envelope>`, envelope last so truncation-from
  -the-end never cuts the user's words — `chat-rpc.ts` comment, send flow) is stable and is what the
  gateway-side strip in FR-001 can rely on positionally, in addition to the envelope's own anchored
  open/close markers.
- The envelope's anchored markers (`[In-app assistant context` … `Don't restate this context.]`),
  already used by the hub's own `stripAssistantContext` for transcript display, are a stable,
  reusable boundary for a gateway-side equivalent stripper; the gateway cannot import the hub's
  SvelteKit module, so this feature re-implements the same anchor pattern gateway-side rather than
  sharing code across repos.
- Only the ranking *input* changes under FR-001; the full concatenated message (text + envelope)
  still reaches the model unchanged — this feature does not touch prompt construction for the model
  turn itself, only for the relevance-ranking call.
- No change to the embedding/lexical scoring algorithms themselves (`lexicalScore`, cosine similarity)
  is in scope — only what query reaches them (FR-001/FR-002) and how the index is scoped (FR-003).
- "Measured tests" in FR-009 means automated regression tests plus a shadow-mode log comparison
  (SC-006), not a live production A/B rollout; see Clarifications Q2.

## Clarifications

### Session 2026-10-15 (self-answered — no live user; see brief)

- **Q1: Should envelope-stripping be a gateway-owned regex (duplicating the hub's anchor pattern)
  or should the hub send the envelope in a field the gateway excludes from the ranking query by
  construction?**
  **A**: Gateway-owned regex, anchored on the same `[In-app assistant context …Don't restate this
  context.]` markers the hub's existing `stripAssistantContext` (`chat-rpc.ts:147`) already uses for
  an analogous purpose (cleaning a stored transcript). This keeps the fix inside the gateway
  (matches the feature's evidence scope: `tool-search/**`, `attempt-env.ts`) and needs no hub
  release to land. **(ASSUMPTION — owner to confirm)**: duplicating a regex across two repos is a
  drift risk; a follow-up could promote the pattern to `@minion-stack/shared` if other consumers
  emerge, but that is out of scope here.

- **Q2: What evidence is "measured tests" (feature description) for the default flip in FR-009 —
  a fixed automated test suite, or production shadow-mode A/B data?**
  **A**: Automated regression tests covering SC-001–SC-005 (deterministic, CI-gated) plus a one-time
  replay of existing shadow-mode `[jit-select]` logs against the fixed ranking logic for SC-006
  (comparison, not a live A/B). **(ASSUMPTION — owner to confirm)**: no live staged rollout
  (percentage ramp) is assumed; if the owner wants a staged production rollout instead of a
  synchronous default flip, that changes FR-009's delivery mechanics, not its test content.

- **Q3: Does the default flip in FR-009 apply to every agent that passes through `applyJitToolGate`
  (coding agents, subagents, CLI sessions), or only hub-linked personal agents, given the feature
  description's title scopes the ask to "hub personal agents"?**
  **A**: The global default in `resolveSelectionConfig` is shared code with no agent-type
  branching today (`tools.selection.mode` is one config key, optionally overridden per agent). This
  feature flips the *global* default, which affects every agent type, but mitigates the
  non-hub blast radius because FR-001–FR-006 are generic fixes (none are hub-specific) and
  non-hub agents' catalogs are typically smaller/non-RBAC-gated, where `shadow` already shows no
  starvation pattern. **(ASSUMPTION — owner to confirm)**: if the owner wants the flip scoped to
  only hub-linked (`agentId.startsWith("personal-")`) agents, FR-009 needs a per-agent-type default
  override instead of a global one — flagged here as a design choice for `/speckit-plan`, not
  resolved by guessing.
