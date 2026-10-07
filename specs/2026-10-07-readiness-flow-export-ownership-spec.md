---
id: 2026-10-07-readiness-flow-export-ownership-spec
title: Flow export toggles are owned by the (flow, variable) pair they were written for (HC-040)
stage: dev
status: implementing
pass: 2
verdict: pending
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub]
tags: [ui, logic, test]
type: fix
proposal: 2026-10-07-hub-readiness-state-integrity-followups
findings: [HC-040]
pr: pending
---

# Flow export ownership (HC-040)

## 0. Product

`FlowExports.svelte` is the "Exported variables" panel inside an agent's flow window
(`AgentWindowLayer.svelte`, mounted by `routes/(app)/agents/autonomous/+layout.svelte`). Each
row is a `role="switch"` rendered through the shared Button that PATCHes
`/api/flows/[flowId]/exports` with `{ varKey, enabled }`. The same component instance is
re-pointed at another flow by prop replacement, and a write's reply may arrive after that
replacement. HC-040 (`2026-10-02-hub-gateway-production-readiness-recon`, approved proposal
`2026-10-03-readiness-flow-export-ownership`): a reply for flow A must never alter flow B, a
second activation must not dispatch a second write, and reloaded data must beat stale memory.

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc040-flow-export-ownership.md`).

## 1. AS-IS (hub `master` `802a62d0`)

`src/lib/components/flow-editor/FlowExports.svelte`:

- L19 `let localToggles = $state({ ...toggles })` — the committed prop is copied **once**; later
  prop values are never read again.
- L35 optimistic flip and L44/L48 rollback both write `localToggles[varKey]` with no notion of
  which flow the write was dispatched for.
- The switch is never `aria-busy`/blocked while a write is in flight, so a second activation
  dispatches a second write on the same variable.
- Failure is silent (visible revert only, no toast).

Mounted regressions (`flow-export-ownership.mounted.test.ts` against the old component,
`evidence-hc040/vitest-red-prefix.log`, **4 failed (4)**):

| Case | Scenario | Expected | Observed |
|---|---|---|---|
| (a) replacement | mount flow A `{report:true}`, rerender flow B `{report:false}` | `aria-checked="false"` | `"true"` (A's snapshot retained) |
| (b) late failure | A `{report:false}` → click (→ true, in flight) → rerender B `{report:true}` → A's reply rejects | B stays `"true"`, 1 error toast | B flips to `"false"` (A's rollback applied to B) |
| (c) re-entry | click Report twice while the first write is in flight | 1 request, `aria-busy="true"` | 2 requests, no busy state |
| (d) fresh data | accepted write, then rerender with reloaded `toggles` that differ | reloaded value shown | local snapshot shown |

The 2026-10-03 recon reproduced (a) and (b) with synthetic requests only; (c) and (d) are new.

## 2. TO-BE

| # | Invariant |
|---|---|
| 1 | **Ownership fence.** Every write is keyed by the pair it was dispatched for: `own = JSON.stringify([flowId, varKey])`, captured before the first `await`. Its optimistic overlay, rollback and accepted value live under that key only; the panel renders the key of the flow it currently shows, so a reply can never alter a different flow. |
| 2 | **One in-flight write per pair.** While `own` is pending the switch renders through the shared Button `loading` state (`aria-busy="true"`, native `disabled`, spinner) and `toggle()` returns early. Ordering is enforced at dispatch — the only sound order for an API that answers `{ ok }` without echoing the stored value (two concurrent writes on one pair with out-of-order `{ ok }` replies are undecidable client-side); a monotonic op id is subsumed by serialization. Different pairs stay independent. |
| 3 | **Fresh selected-flow data wins.** The committed value is always read from the live `toggles` prop. An accepted write is remembered as `{ base, value }` (`base` = prop value at dispatch) and shown only while the prop still equals `base`; reloaded data that differs replaces it immediately. **Ceiling:** reloaded data equal to `base` after an accepted write is indistinguishable from the stale prop and keeps showing the accepted value until the next differing reload or a remount (§6). |
| 4 | **Shared action contract.** Pending = `createOptimistic().run` overlay + Button `loading`; rejected or thrown = overlay cleared (visible revert) + `toastError(m.flow_exports_update_failed())`; accepted = remembered under the pair key, no reload required. `role="switch"`, `aria-checked`, accessible name (`aria-label` = variable label; `title` keeps the description), `disabled={!canEdit}` and the touch floor (`--control-height-touch` hit area on coarse pointers) hold in every state. |

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `localToggles` replaced by `shown = $derived.by(...)` overlaying `accepted` (base-fenced, a `SvelteMap`) and `inFlight` (`createOptimistic`) on the live `toggles` prop, keyed by `own(flowId, key)` | (a), (d) mounted |
| 2 | `toggle()` captures `own`, `base`, `path` before awaiting; returns early when pending; `inFlight.run(own, next, commit)`; `true` → `accepted.set(own, {base, value})` inside the commit (no stale flash); `false` → `toastError` | (b), (c) mounted |
| 3 | Button gets `loading={inFlight.isPending(own)}` and `aria-label={v.label}`; coarse pointers get a `--control-height-touch` row height and a matching `::after` hit area; the existing `:disabled` dim rule untouched | (c) mounted; Chromium 390×844 coarse |
| 4 | New message `flow_exports_update_failed` (en/es, appended) | (b), (c) assert one toast |
| 5 | `TODO(handoff): HC-040` left at `FlowExports.svelte:30` naming the `depends()` gap (§6) | ledger row in the proposal |

Nothing changes in `AgentWindowLayer`, the API route, the exports store or the shared
`createOptimistic` primitive. Staged diff: 8 files, +487 / −17 (component, mounted test,
`tests/fixtures/flow-export-ownership/{Fixture.svelte,build.mjs,main.ts,ui.ts}`, `messages/{en,es}.json`).

## 4. Verification

- `bun x vitest run src/lib/components/flow-editor/flow-export-ownership.mounted.test.ts
  src/lib/components/flow-editor/record-path-panels.mounted.test.ts src/lib/utils/optimistic.test.ts`
  → red **4 failed (4)** on the old component (`evidence-hc040/vitest-red-prefix.log`), green
  **3 files, 9 passed (9)** after (`vitest-green-postfix.log`).
- Chromium (headless, static fixture built from `tests/fixtures/flow-export-ownership/`,
  synthetic fetch only, no session/production data; `evidence-hc040/hc040-native-proof.json`
  fixture v2): **9 cases, allOk** — replacement, pending-a, double-activation-blocked,
  late-failure-b-unchanged (1 toast), reversal-a, recovery (fresh data), a11y-and-permission
  (role/name/aria-busy/canEdit inert), mobile-390x844-coarse (44px hit area), mobile-recovery.
  PNGs `01`–`07` in the same directory.
- `bun run lint:design && bun run lint:tokens` before/after — debt not increased
  (`lint-*-{before,after}.log`); `svelte-check --threshold error` → `svelte-check.log`;
  `i18n-compile.log` for the new key.

## 5. Implementation record

- Hub branch `fix/readiness-hub-state-integrity` (base `master` `802a62d0`), worktree
  `~/.cache/claude-tmp/hub-ui2-wt`. Change **staged, commit pending signing** (commit signing
  temporarily unavailable); message prepared at `~/.cache/claude-tmp/hc040-msg.txt`
  (`fix(flow-editor): fence export toggle writes to the flow and value they were dispatched for`).
  No PR yet (`pr: pending`); it will share a PR with HC-037.
- Tests: mounted red 4/4 → green 9/9 across three files; native 9/9 cases.
- Note: `messages/{en,es}.json` in this staged change also carry the six `workshop_*` keys
  appended by the sibling HC-037 change on the same branch (stated in the commit message).
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-hc040/`.

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-state-integrity-followups.md`.

- `TODO(handoff): HC-040` at `src/lib/components/flow-editor/FlowExports.svelte:30` —
  `agents/autonomous/[id]/+page.server.ts` declares no `depends()` key for flow toggles, so a
  targeted `invalidate()` cannot replace the accepted-value memory (the list page already
  declares `agents:autonomous`).
- Accepted-value memory ceiling (TO-BE 3): a reload equal to the dispatch base after an accepted
  write is indistinguishable from the stale prop; removed only by the `depends()` key above or
  by the PATCH reply echoing the stored value.
- Server echo of the stored value in the PATCH reply (would also remove the ceiling) — API
  change, not made here.
