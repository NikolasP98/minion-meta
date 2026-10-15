# Phase 1 Data Model: Assistant Launcher Stays in Its Corner

No persisted data model — FR-004 requires nothing to survive a reload, and the position
state carries no identity beyond the current browser tab (spec.md Key Entities). This file
documents the one in-memory shape introduced, for traceability from spec entity to field.

## Launcher position state (spec.md Key Entities → this shape)

| Field | Type | Scope | Notes |
|---|---|---|---|
| `savedFrac` | `{ fx: number; fy: number } \| null` | Module-scope variable (`<script module>`); shared across every mount of the component within one page load; reset to `null` on every fresh module evaluation (i.e., every reload) | `null` = "default corner" (FR-001). Non-null = a dragged, edge-anchored position (FR-002/FR-003). `fx`/`fy` ∈ `[0, 1]`, the fraction of the free viewport area (viewport minus launcher size minus margins) along each axis. |
| `frac` | same shape as `savedFrac`, component-instance `$state` | Per-mounted-instance reactive state, seeded from `savedFrac` | Mirrors `savedFrac` so the component's `$effect` can react to it; every write to `frac` also writes `savedFrac` so the module-scope value stays current for the next mount. |
| `pos` | `{ left: number; top: number } \| null` (pixels) | Per-instance `$state`, derived | Rendered position. Derived from `frac` + current viewport size + measured launcher size whenever any of those three change (resize, remount, or initial measure) — never itself the source of truth once a drag has produced a `frac`. |

## Lifecycle

1. **Default** (`savedFrac === null`): `pos` is governed by the existing default
   bottom-right CSS anchor, not by the fraction math. This is FR-001's state on every fresh
   load.
2. **Dragged** (`snapToEdge()` sets `frac = savedFrac = {fx, fy}`): `pos` becomes derived —
   recomputed on every viewport/launcher-size change (FR-005/FR-006), and copied to each new
   component instance on client-side navigation (FR-003) because `savedFrac` outlives the
   remount.
3. **Reset to home** (`snapHome()` sets `frac = savedFrac = null`): same as Default.
4. **Reload**: the JS module re-evaluates; `savedFrac` is reinitialized to `null` regardless
   of its value at the moment of reload — this is the mechanism that satisfies FR-004.

No transition writes to `localStorage`/`sessionStorage`/any network store — that removal is
the core of the fix (plan.md AS-IS evidence).
