# Research: Safe default-on JIT tool selection for hub personal agents

No Technical Context fields were left as `NEEDS CLARIFICATION` (all resolved directly from reading
the existing gateway source — this is a fix to code that already exists, not new technology
adoption), so this phase is a set of implementation-approach decisions rather than ecosystem
research.

## Decision 1: Where to strip the envelope (FR-001)

**Decision**: Add `src/agents/tool-search/strip-envelope.ts` exporting `stripContextEnvelope(text:
string): string`, a gateway-owned regex anchored on the same markers the hub's
`stripAssistantContext` already uses (`/^\s*\[In-app assistant context[\s\S]*?Don't restate this
context\.\]\s*/`, read from `~/.cache/claude-tmp/hub-ro/src/lib/services/gateway/chat-rpc.ts:147`).
Call it once, inside `applyJitToolGate`, only to build the string passed to `rankTools` — the
`prompt` field used elsewhere (e.g. logged, or forwarded to the model attempt) is untouched.

**Rationale**: The gateway repo cannot import a SvelteKit hub module (`minion` and `minion_hub` are
independent repos, different package managers per `AGENTS.md` Project Map). The anchor pattern
is already proven (the hub ships a test for it — `strip-assistant-context.test.ts`) and the hub's
own comment confirms the message ordering (text first, envelope last) a position-based stripper
could also rely on as a secondary signal, but the anchor alone is sufficient and more robust to the
mid-message edge case in spec.md's Edge Cases.

**Alternatives considered**:
- *Hub sends the envelope in a separate `chat.send` field the gateway excludes from `params.prompt`
  by construction.* Rejected for this feature: requires a hub release + a gateway RPC-shape change,
  a larger, two-repo slice than the feature's evidence scope (`tool-search/**`, `attempt-env.ts`)
  implies, and the spec's Clarification Q1 already resolved toward the gateway-only fix.
- *Position-based stripping only (split on the first `"\n\n"`).* Rejected: the hub's own comment
  says envelope is appended last specifically so truncation-from-the-end never cuts user text, but
  nothing guarantees the user's own message never contains a literal blank line — the anchored
  regex is unambiguous where a positional split is not.

## Decision 2: All-zero score detection (FR-002)

**Decision**: Add a check in `select-tools.ts` (or immediately before calling `selectTools` in
`apply-selection.ts`) for "every candidate score is exactly `0`"; when true, return the full
L1-permitted set directly instead of calling `selectTools`'s top-k/tie-break path at all.

**Rationale**: `lexicalScore` is documented range `[0, ~1.5]`; `0` has one meaning — zero token
overlap and zero substring bonus — never a legitimate "weak but real" relevance signal. Embedding
cosine similarity can be legitimately near-zero but is extremely unlikely to be *exactly* `0.0` for
every candidate simultaneously (that would require every tool's embedding to be orthogonal to the
query, essentially impossible for real text against real tool descriptions) — so treating
exact-zero as "no signal, not a bad score" is safe for both scorer backends without distinguishing
which one is active.

**Alternatives considered**:
- *Lower the fallback threshold instead of requiring exact zero (e.g. "scores all below some
  epsilon").* Rejected as unnecessary complexity for the lexical scorer (its zero is exact, not
  noisy) and risky for the embedding scorer (a real epsilon would need tuning against production
  data this feature does not yet have — SC-006's shadow-log comparison is the intended place to
  discover if `0` needs to become an epsilon later).

## Decision 3: Per-caller index keying (FR-003/FR-004)

**Decision**: Replace the single module-level `STATE`/`BUILDING` pair in `tool-index.ts` with a
`Map<string, { state: IndexState | null; building: Promise<IndexState> | null }>` keyed by
`agentId` (the parameter `ensureToolIndex` already receives and currently only uses for embedding
provider resolution, not for state keying). `rankTools`, `getIndexedEntry`, and `listIndexedIds`
each take the same `agentId` key to read the right map entry.

**Rationale**: `agentId` is already threaded through every call site (`apply-selection.ts` passes
it to `ensureToolIndex` today, just unused for keying); keying by `agentId` rather than by the
catalog-text signature alone fixes the concurrency drop (`if (BUILDING) { await BUILDING; return;
}`) because two different agents now have two different map entries and never contend on the same
`BUILDING` promise. The existing signature-based fast-path ("catalog unchanged → keep vectors")
is preserved *within* each agent's entry.

**Alternatives considered**:
- *Key by catalog signature instead of `agentId`.* Rejected: two different agents can coincidentally
  produce the same signature only if their catalogs are byte-identical, which defeats the purpose
  only probabilistically; `agentId` is the caller's actual identity and is already available.
- *Make the index fully synchronous/per-call (no caching at all).* Rejected: throws away the
  "rebuild only when catalog text changed" optimization the module's own header comment calls out
  as the reason this is viable without a hub/pgvector round-trip; unnecessary given the map-keyed
  fix is equally correct and far smaller.

## Decision 4: `load_tools` accepting indexed custom-tool ids (FR-005)

**Decision**: In `load-tools-tool.ts`, change the `known`/`unknown` split from `id in TOOL_REGISTRY`
to `id in TOOL_REGISTRY || getIndexedEntry(agentId, id) !== undefined` (using the per-agent index
from Decision 3). `getIndexedEntry` is already imported and used later in the same file (for
title/description) — this reuses an existing read path, not a new one.

**Rationale**: Smallest possible diff; `getIndexedEntry` already holds every tool — registry and
custom — that was in the caller's own L1-gated catalog when the index was last built, which is
exactly the "caller's current tool index" the spec requires. No new state needed.

**Alternatives considered**:
- *Add custom tools to `TOOL_REGISTRY` itself.* Rejected: `TOOL_REGISTRY` is generated
  (`scripts/generate-tool-registry.ts`) from static tool definitions; custom tools are
  user-authored and synthesized at runtime (`custom-tools.ts`) — mixing them would break the
  registry/custom-tool separation the audit explicitly says is "the documented reason
  `CUSTOM_TOOL_INFO` exists."

## Decision 5: Explicit "selection disabled" result (FR-006)

**Decision**: Thread `mode` into `search_tools`'s execute function (it currently has no access to
selection config at all — `createSearchToolsTool()` takes no params). When `mode === "off"`, return
`{ results: [], disabled: true, message: "Tool selection is off for this agent; the full
permitted tool set is already active." }` without calling `rankTools`/`listIndexedIds`.

**Rationale**: Matches FR-006 exactly; avoids touching `tool-index.ts`'s empty-state semantics at
all (an empty index legitimately returns `[]` for a real zero-match query in `on`/`shadow` mode —
Edge Cases explicitly preserves that). The disambiguating signal belongs in the tool's own
response, which is the layer that knows which mode is active.

**Alternatives considered**:
- *Make `tool-index.ts`'s `STATE` carry a disabled flag.* Rejected: conflates "index was never
  built" (true in `off` mode today, by design — `ensureToolIndex` is never called) with "index was
  built but found nothing," reintroducing ambiguity at a lower layer than necessary.

## Decision 6: Default flip mechanics (FR-009)

**Decision**: Change `DEFAULT_MODE` in `apply-selection.ts` from `"shadow"` to `"on"` as the final,
fifth slice, gated on slices 1–4 being merged and on running (a) the extended/new test files listed
in Project Structure and (b) a one-time manual comparison of pre-flip `[jit-select]` shadow logs
against the fixed ranking (SC-006) — not a staged percentage rollout (per spec Clarification Q2).

**Rationale**: Smallest correct change — one constant — once its preconditions hold; per-agent
`tools.selection.mode` overrides already exist for any agent/operator that needs to opt back into
`shadow` or `off` immediately after the flip, so the change is reversible per-agent without a
gateway release.

**Alternatives considered**: see spec Clarification Q2/Q3 — a staged rollout and/or an agent-type-
scoped default were both considered and explicitly deferred to the owner rather than assumed.
