# Implementation Plan: Safe default-on JIT tool selection for hub personal agents

**Branch**: `006-jit-tool-selection-on` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-jit-tool-selection-on/spec.md`

**Repo note**: the spec lives in `minion-meta` (this worktree); the code it describes lives in
the independent `minion` subproject repo (gateway), currently read at
`~/.cache/claude-tmp/gw-ro` (`origin/DEV`). This plan's paths are `minion`-repo-relative
(`src/agents/...`); none of this feature's code paths exist inside `minion-meta` itself. Per
`AGENTS.md` repo-policy, `minion`'s dev branch and PR base are both `DEV`, package manager `pnpm`.

## Summary

Four correctness fixes to the gateway's JIT tool-selection gate (`applyJitToolGate` and its
helpers), landed as independent slices, followed by a fifth slice that flips
`tools.selection.mode`'s default from `"shadow"` to `"on"` once the first four are merged and
tested: (1) rank on the user's message with the hub's context envelope stripped, and serve the
full permission-filtered set on an all-zero score vector; (2) scope the relevance index per
caller's own catalog instead of one global slot; (3) let `load_tools` accept any id in the
caller's current index, not only static-registry ids; (4) make `search_tools` say selection is
disabled when `mode` is `"off"`, instead of returning silently empty. All four are pure-logic
changes to existing modules in `src/agents/tool-search/` and `src/agents/tools/meta/`; none adds a
new service, dependency, or storage.

## Technical Context

**Language/Version**: TypeScript, Node 22+ (`minion` repo standard; `tsdown` build, no new build
target needed — these files already compile into the existing gateway bundle).

**Primary Dependencies**: None new. Reuses `typebox` (existing tool parameter schemas),
the existing `memory/embedding` provider abstraction (`createEmbeddingProvider`,
unchanged), and `tool-governance` (`TOOL_REGISTRY`, `expandToolGroups`, unchanged).

**Storage**: N/A — the relevance index is in-process memory (`Map`), as it is today; FR-003 changes
its *keying*, not its storage medium (still no hub/pgvector round-trip, preserving the audit's D2
"gateway-local vectors" property).

**Testing**: `vitest`, co-located `*.test.ts` files next to the modules under test (this repo's own
convention — confirmed via `src/agents/tool-search/*.test.ts`, `src/agents/tools/hub/*.test.ts`).
Gate command: `pnpm vitest run src/agents/tool-search src/agents/tools/hub` (same command the audit
used; per `AGENTS.md` "⛔ NEVER full gw test suite" — a scoped run is both faster and the
house-standard gate for this subsystem).

**Target Platform**: Node.js server process — the gateway (self-hosted / Docker / Fly.io per
`AGENTS.md` deployment table). No client, no browser, no mobile surface.

**Project Type**: Single project — an internal module inside the `minion` pnpm monorepo's gateway
package (not a new package, not a UI, not a public API).

**Performance Goals**: No new performance target; must not regress the existing bound — ranking
stays O(catalog size) (~55–150 tools) with no network round-trip, matching today's `tool-index.ts`
header comment ("the catalog is tiny… there is no hub/pgvector round-trip").

**Constraints**: Gateway-only change (per spec Clarification Q1 — no hub release required); must
not alter what the *model* sees as the full prompt (envelope still reaches the model, FR-001 only
changes the ranking input); must not change L1 permission-gate semantics (FR-008); per-agent
`tools.selection` config overrides must keep working unchanged (Edge Cases).

**Scale/Scope**: ~55+ registry tools + N org-published custom tools per hub-linked agent; `k=20`
shortlist; unchanged by this feature (no change to `k` or `alwaysOn` defaults, only to `mode`'s
default and the four correctness fixes).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — unchanged, see note.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec before code | **PASS** | This plan follows `spec.md`; no code has been touched by the audit or this process (read-only worktrees only). |
| II. AS-IS→TO-BE→DELTA, with evidence | **PASS, with a format gap** | The spec's evidence (file:line anchors, exact code excerpts) lives in the *feature description* (carried into spec.md's Input block) and in Assumptions/Clarifications, not under literal `AS-IS`/`TO-BE`/`DELTA` headings — the spec-kit template has no such headings. Content-wise the mapping holds: each User Story's prose is AS-IS (quotes the defective code path), its Acceptance Scenarios are TO-BE + the DELTA test. Flagged as a template gap in `sdd-notes.md`, not a blocker — every numeric/behavioral claim in spec.md traces to a read file:line in `audits/2026-10-15-agent-harness/C-tool-feeding.md` or direct source reads done for this plan, none is asserted without a source. |
| III. Slice-scoped delivery | **PASS** | See Project Structure / slice table below — 5 slices, each its own PR against `minion`'s PR base `DEV`, from an isolated worktree, gated by the scoped vitest command before PR open. |
| IV. Required build steps | **N/A for this feature** | No hub/site UI, no new route/endpoint/nav link, no new user-facing string. This feature touches only internal gateway ranking logic; the design-token, RBAC-wiring, Paraglide, and route-contract requirements are not triggered. (`search_tools`/`load_tools` are *agent-facing* tool-call contracts, not hub routes — covered instead by the `contracts/` artifacts below.) |
| V. Security and data work keeps human gates | **APPLIES — gates merge, not drafting** | This feature is security-*adjacent*, not a security feature itself: FR-003/FR-004 fix a defect where `search_tools` can list another agent's permitted catalog (a correctness/information-disclosure-adjacent bug, though L1 execution-time gating is unaffected per the audit's own verdict — "not a hard permission bypass"), and FR-009 changes production tool-exposure behavior globally. Per Principle V this requires **owner approval of this spec before implementation, and owner merge** of at least slices 2 (index scoping) and 5 (default flip). Slices 1, 3, 4 are pure bug fixes with no RBAC/tenant-scoping surface and could use the repo's normal review, but are kept in the same gate for simplicity since they share a PR-sequencing dependency on slice order (see Complexity Tracking — no violation, just a note). |

**Result**: No unjustified violations. Principle V names the one gate that blocks *shipping*
(owner sign-off before code, owner merge) — it does not block this plan artifact from existing.

## Project Structure

### Documentation (this feature)

```text
specs/006-jit-tool-selection-on/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── contracts/
│   ├── tool-selection-config.md
│   ├── search-tools-tool.md
│   └── load-tools-tool.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks output (not this command)
```

### Source Code (repository: `minion`, not `minion-meta`)

Single project — no frontend/backend split, no new package. Real paths, all inside
`minion/src/agents/`:

```text
src/agents/
├── tool-search/
│   ├── apply-selection.ts     # L1/L2 gate entrypoint — Slice 1 (query-strip + all-zero
│   │                          #   fallback wiring), Slice 3 (off-mode marker passthrough)
│   ├── select-tools.ts        # pure ranking/sort — Slice 1 (all-zero detection helper)
│   ├── tool-index.ts          # index build/rank/list — Slice 2 (per-catalog keying),
│   │                          #   Slice 3 (off-mode state marker read by search_tools)
│   ├── strip-envelope.ts      # NEW, small — Slice 1 (gateway-owned anchor-pattern stripper)
│   ├── strip-envelope.test.ts # NEW — Slice 1
│   ├── apply-selection.test.ts      # NEW (none exists today — audit C §6 names this gap)
│   ├── tool-index.test.ts           # NEW (none exists today — same gap, covers Slice 2/4)
│   └── select-tools.test.ts   # existing — extended, Slice 1 (all-zero case)
└── tools/meta/
    ├── load-tools-tool.ts     # Slice 4 (accept any indexed id)
    └── search-tools-tool.ts   # Slice 3 (explicit disabled-selection result)

src/config/
└── types.tools.ts             # Slice 5 only: default value of `mode` in
                                #   resolveSelectionConfig/DEFAULT_MODE (apply-selection.ts)
```

**Structure Decision**: Everything lives in the `minion` gateway repo's existing
`src/agents/tool-search/` and `src/agents/tools/meta/` directories — no new directory, no new
package, no new service boundary. Tests are co-located `*.test.ts` files per this repo's own
convention (not a separate `tests/` tree, which is the spec-kit template's generic default and
does not match this codebase — see `sdd-notes.md` §3). Two test files are genuinely new
(`apply-selection.test.ts`, `tool-index.test.ts`); the audit (§6) explicitly flagged their absence
as why defects D1/D4/D5 were invisible to the green suite.

### Slice table (Principle III)

| Slice | Fixes | Files touched | PR base | Depends on |
|---|---|---|---|---|
| 1 | FR-001, FR-002 (US1) | `strip-envelope.ts` (new), `apply-selection.ts`, `select-tools.ts`, their tests | `DEV` | none |
| 2 | FR-003, FR-004 (US2) | `tool-index.ts`, new `tool-index.test.ts` | `DEV` | none (independent of 1) |
| 3 | FR-006 (US4) | `tool-index.ts` (off-mode marker), `search-tools-tool.ts`, `apply-selection.ts` (pass mode through) | `DEV` | none (independent of 1, 2) |
| 4 | FR-005 (US3) | `load-tools-tool.ts` | `DEV` | none (independent of 1–3) |
| 5 | FR-009 (US5) | `apply-selection.ts` (`DEFAULT_MODE`), config docs/CHANGELOG | `DEV` | **1, 2, 3, 4 merged** + SC-001–SC-006 evidence |

Slices 1 and 4 touch no file any other slice touches. Slices 2 and 3 both touch `tool-index.ts`
(Slice 2: per-agent keying of `STATE`/`BUILDING`/`rankTools`/`getIndexedEntry`/`listIndexedIds`;
Slice 3: a mode-aware marker those same lookups need to read) and Slice 5 touches the same
`DEFAULT_MODE` constant in `apply-selection.ts` that Slice 1 adds a branch next to — real overlap,
not zero. Resolve it the way this workspace already requires for any parallel-PR file collision
(`memory` gotcha "N parallel PRs… conflict at EVERY merge"): land Slices 1 and 4 in parallel
worktrees freely, land Slice 2 before Slice 3 (chain-rebase Slice 3 onto Slice 2's merge rather than
branching both off the same base), and land Slice 5 last, rebased onto all four.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.* The only candidate complexity —
keeping slices 1/3 in the same file (`apply-selection.ts`) without merging them into one PR — is
resolved by sequencing (either order is safe; both only add code paths, they don't touch the same
lines) rather than by any architectural exception, so no justification row is needed.
