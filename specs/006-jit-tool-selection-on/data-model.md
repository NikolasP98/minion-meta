# Data Model: Safe default-on JIT tool selection for hub personal agents

No persistent storage or schema changes — every entity below is an in-process TypeScript type,
already defined or minimally extended. Listed for traceability to the spec's Key Entities section.

## ToolCatalogEntry (existing, unchanged)

```ts
type ToolCatalogEntry = { id: string; title: string; description: string; groups: string[] };
```
Source: `tool-index.ts`. One per L1-permitted tool (registry or custom) for the current turn.
Built fresh every turn by `apply-selection.ts`'s `catalogEntryFor`. Not modified by this feature.

## IndexState (modified — Decision 3)

**Before**:
```ts
type IndexState = { signature: string; entries: Map<string, IndexedEntry>; provider: EmbeddingProvider | null };
let STATE: IndexState | null = null;
let BUILDING: Promise<IndexState> | null = null;
```

**After**:
```ts
type IndexSlot = { state: IndexState | null; building: Promise<IndexState> | null };
const SLOTS = new Map<string, IndexSlot>(); // keyed by agentId
```
Relationship: one slot per `agentId` instead of one global slot. `IndexState`/`IndexedEntry`
themselves are unchanged — only the container keying changes. Lifecycle: a slot is created lazily
on first `ensureToolIndex` call for that `agentId`; it is never evicted in this feature (no TTL/LRU
— out of scope; the catalog-signature fast-path already prevents unnecessary rebuilds, and the
number of concurrently active agents is small per the audit's scale numbers).

## ScoredTool (existing, unchanged)

```ts
type ScoredTool = { id: string; score: number };
```
Relationship: produced per-candidate by `rankTools` (now reading from the caller's own slot),
consumed by `selectTools`. FR-002's all-zero check inspects this array's `score` values before (or
instead of) calling `selectTools`.

## SelectToolsResult (existing, unchanged shape; new all-zero caller-side branch)

```ts
type SelectToolsResult = { activeIds: string[]; scores: Record<string, number> };
```
No field changes. FR-002 is implemented as a branch in the *caller* (`apply-selection.ts`) that
either calls `selectTools` as today, or (all-zero case) short-circuits to the full L1-permitted id
list — `SelectToolsResult`'s shape does not need to represent "no selection happened," since the
caller already has the alternative value (`l1Tools`) ready.

## SearchToolsResult (extended — Decision 5)

**Before** (implicit, not a named type): `{ results: Array<{...}>, hint: string }`.

**After**:
```ts
type SearchToolsResult =
  | { results: ScoredToolSummary[]; hint: string }
  | { results: []; disabled: true; message: string };
```
Relationship: the second variant is returned only when `tools.selection.mode === "off"`; see
`contracts/search-tools-tool.md`.

## LoadToolsResult (unchanged shape; widened acceptance test — Decision 4)

```ts
type LoadToolsResult = { loaded: Array<{ id: string; title: string; description: string }>; unknown: string[]; message?: string };
```
No field changes. `known`/`unknown` partitioning logic changes (widened to include indexed custom
tools); the result shape callers already handle is identical.

## ToolSelectionConfig (existing; one default value changes — Decision 6)

```ts
type ToolSelectionConfig = { mode?: "off" | "shadow" | "on"; k?: number; alwaysOn?: string[] };
```
No field changes. `DEFAULT_MODE` constant in `apply-selection.ts` changes from `"shadow"` to
`"on"` in Slice 5 only. Per-agent override merge behavior (`resolveSelectionConfig`) is unchanged.
