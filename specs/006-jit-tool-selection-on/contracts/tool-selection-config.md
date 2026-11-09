# Contract: `tools.selection` config (global + per-agent)

**Kind**: internal gateway config schema (`src/config/types.tools.ts`'s `ToolSelectionConfig`,
merged by `resolveSelectionConfig` in `src/agents/tool-search/apply-selection.ts`).

## Shape (unchanged)

```ts
{
  mode?: "off" | "shadow" | "on";   // DEFAULT changes "shadow" → "on" in Slice 5
  k?: number;                        // default 20, unchanged
  alwaysOn?: string[];                // default ["message","search_tools","load_tools"], unchanged
}
```

## Behavioral contract per mode (post-feature)

| mode | L1 (permission gate) | L2 (relevance shortlist) | `search_tools` |
|---|---|---|---|
| `off` | applied (unchanged) | not computed (unchanged) | returns `{results: [], disabled: true, message}` — **new** |
| `shadow` | applied (unchanged) | computed + logged, full L1 set still served (unchanged) | returns ranked results from the caller's own index — **fixed to be caller-scoped** |
| `on` | applied (unchanged) | enforced: `alwaysOn ∪ sessionLoaded ∪ top-k(stripped query)`, **or** full L1 set if every score is `0` — **fixed** | same as `shadow` |

## Backward compatibility

- Any deployment with an explicit `mode` set (global or per-agent) is **unaffected** by Slice 5 —
  the default only applies when `mode` is omitted at every config layer.
- No field is added, removed, or retyped. A config file written against today's schema remains
  valid.
- Per-agent override precedence (`{ ...global, ...agent }` in `resolveSelectionConfig`) is
  unchanged.

## Verification

- `resolveSelectionConfig(undefined, agentId)` (no config at all) resolves `mode: "on"` after
  Slice 5 (today: `"shadow"`) — unit test in `apply-selection.test.ts`.
- `resolveSelectionConfig({ tools: { selection: { mode: "shadow" } } }, agentId)` still resolves
  `"shadow"` after Slice 5 — explicit override wins (regression guard for the flip).
