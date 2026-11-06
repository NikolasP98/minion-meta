# Contract: `search_tools` (agent-callable tool)

**Kind**: tool-call contract exposed to the LLM agent loop (not an HTTP endpoint).

## Request (unchanged)

```json
{ "query": "<natural language task description>" }
```

## Response — today

```json
{ "results": [{ "id": string, "title": string, "description": string, "groups": string[], "permission": object|undefined, "allowed": true }], "hint": string }
```
Always this shape, even in `off` mode (where `results` is silently `[]` — the defect, FR-006).
Also today: `allowed: true` is hardcoded and can be wrong under cross-agent index pollution (D4),
fixed by Slice 2, not a contract shape change.

## Response — after this feature

Two variants, discriminated by the new `disabled` field:

```json
// mode !== "off"
{ "results": [...], "hint": "Call load_tools with the ids you want to use." }

// mode === "off"
{ "results": [], "disabled": true, "message": "Tool selection is off for this agent; the full permitted tool set is already active." }
```

## Compatibility for the calling model

- `results` is always an array (never missing), so existing "iterate `results`" model behavior is
  unaffected whether or not `disabled` is present.
- `disabled` is a new, optional field — a caller that ignores unknown fields sees no change in
  `off` mode other than `results` staying `[]` as before; a caller (or this feature's own tests)
  that checks for it gets the explicit signal FR-006 requires.

## Verification

- `off` mode + any query → `disabled: true`, `results: []`, non-empty `message`.
- `on`/`shadow` mode + a query matching nothing → `results: []`, **no** `disabled` field (Edge
  Cases: this feature does not change the genuine-zero-match case).
- `on`/`shadow` mode, two concurrent agents with different catalogs → each agent's `results`
  contains only ids from its own catalog (Slice 2 regression guard, tested here as well as in
  `tool-index.test.ts`).
