# Contract: `load_tools` (agent-callable tool)

**Kind**: tool-call contract exposed to the LLM agent loop (not an HTTP endpoint).

## Request (unchanged)

```json
{ "ids": string[]?, "group": string? }
```

## Response shape (unchanged)

```json
{ "loaded": [{ "id": string, "title": string, "description": string }], "unknown": string[], "message": string }
```

## Behavioral change (Slice 4 / FR-005)

**Before**: an id is "known" iff `id in TOOL_REGISTRY`. Any `custom_<slug>` id is always reported
in `unknown`, even when it is present in the caller's own current tool index (i.e. it was offered
by `search_tools` moments earlier).

**After**: an id is "known" iff `id in TOOL_REGISTRY` **or** it is present in the caller's current
per-agent tool index (`getIndexedEntry(agentId, id) !== undefined`, Decision 3/4). A genuinely
unknown id (never in the registry, never indexed for this caller — e.g. typo'd, or a custom tool
unpublished since it was last indexed) is still reported in `unknown`; FR-005's Acceptance Scenario
2 is a direct regression guard for this.

## Compatibility for the calling model

- Request/response shapes are byte-identical; only the accept/reject decision for custom-tool ids
  changes, and only in the direction of previously-rejected ids now being accepted. No previously
  "known" id becomes "unknown."
- `markToolsLoaded` (session-loaded tracking) is called with the same `known` list as today, now
  correctly including accepted custom-tool ids, so `alwaysOn`-equivalent persistence (Edge Cases:
  session-loaded tools stay active) now actually works for custom tools too — this was silently
  broken before (an "unknown" id is never passed to `markToolsLoaded`).

## Verification

- A custom tool id present in the caller's index but not in `TOOL_REGISTRY` → `loaded` contains it,
  `unknown` does not.
- An id present in neither → `unknown` contains it (regression guard, Acceptance Scenario 2).
- A registry id → unchanged behavior (regression guard against breaking the existing path).
