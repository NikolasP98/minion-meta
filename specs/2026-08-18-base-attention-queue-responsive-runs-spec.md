---
id: 2026-08-18-base-attention-queue-responsive-runs-spec
title: Base UI-004/011 — mobile attention queue, focused stages, responsive runs
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-18-base-attention-queue-responsive-runs
verdict: pending
repos: [minion-base]
relationship: depends-on
related: [2026-08-18-base-ui-primitives-and-shell-spec]
---

# Base UI-004/011 — mobile attention queue, focused stages, responsive runs

## 0. Product

The approved proposal states the problem and desired outcome as follows:

> **AS-IS:** five fixed columns behind horizontal scroll at 390px (7,500px tall
> pages); runs are a seven-column table. **TO-BE:** mobile default = attention
> queue (decision_required/blocked/risk/stale/running/completed groups, sticky
> headers, counts filter); stage selector renders ONE stage at a time (URL-
> persisted, position shown "2 of 5"); URL-serialized filters in a bottom
> sheet; WorkItemCard (state-first line, action sentence, risk, evidence count,
> one contextual action routing to detail); runs become mobile cards (state,
> stage, elapsed, work-item links, lazy logs). Desktop keeps lanes with sticky
> headers + collapsible empty stages. **DELTA:** AttentionSummary →
> StageSelector → WorkItemCard/List → filter sheet → runs cards → desktop lane
> polish.
>
> **DoD:** no page-level horizontal scroll 320–430px; all stages reachable via
> visible controls; filters shareable; empty states recoverable; gates green.

This work makes the board useful as a mobile decision cockpit rather than compressing the desktop
kanban. It inherits the program hierarchy **Decision → Risk → Proof → Detail → History** and the
rule that a board card may navigate to detail but may not perform a consequential mutation.

## 1. Relationship recommendation

**Recommended classification: `depends-on`.**

- `2026-08-18-base-ui-primitives-and-shell-spec` — the attention queue and run cards must consume
  its `Status`, `RiskMark`, `Disclosure`, bottom-sheet/popover behavior, touch-target, safe-area,
  and layer contracts; duplicating them here would create two mobile interaction systems.

The required search of `specs/index.json` and `proposals/index.json` covered `minion-base`, board,
mobile, attention, stage, filter, card, and run terms. The approved
`2026-08-18-minion-base-mobile-hitl-ux-plan` is the program authority that this spec implements,
not a competing draft. `2026-08-18-base-workdetail-summary-first-spec` owns the destination detail
experience and explicitly leaves UI-004/UI-011 out of scope. Earlier Base kanban, auto-refresh,
deploy-status, and reconciliation specs own data correctness or lifecycle state; none provides the
mobile queue, URL state, focused stages, or responsive run presentation requested here.

Implementation may begin only after the dependency's exported contracts and shell tokens exist on
the implementation branch. This recommendation does not approve, merge, retire, or modify the
related artifact.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified behavior, anchors, and known unknowns

The `minion-base` checkout is not present in this planner workspace. These anchors are corroborated
by the approved proposal, approved UX program, related specs, and operator memory, but the
implementer must recheck them against `minion-base/main` before editing:

- `src/routes/kanban/+page.server.ts` derives board data from GitHub and committed meta indexes.
  `src/routes/kanban/+page.svelte` renders five fixed lifecycle columns. At 390px the board is
  horizontally scrollable and produces a roughly 7,500px-tall page.
- `src/lib/state/filter.svelte.ts` owns the shipped per-repository selection. Existing visible-tab
  auto-refresh and refreshed-at behavior must survive any new URL filter state.
- `src/routes/kanban/[kind]/[...ref]/+page.svelte` is the internal detail destination for current
  work-item kinds. UI-001 removed board-level gates, so cards must link there and must not call a
  transition endpoint.
- The existing runs route is expected at `src/routes/runs/+page.server.ts` and
  `src/routes/runs/+page.svelte`, where the proposal records a seven-column table. The exact loader
  fields, log source, and authenticated factory proxy must be confirmed before Slice 4. A missing
  authenticated, run-scoped log-read capability is a behavioral contradiction requiring a spec
  revision; it is not permission to expose the factory or credentials to the browser.
- `src/lib/design/tokens.css`, `DESIGN.md`, and `scripts/lint-design.mjs` are Minion Base's own
  design-governance surfaces. The dependency is expected to add the mobile shell, semantic marks,
  bottom-sheet/disclosure behavior, and `--touch-target`, `--safe-bottom`, and `--layer-*` tokens.

Slice 1 starts with this fail-loud recon and records the resolved anchors in the PR:

```bash
test -f src/routes/kanban/+page.server.ts
test -f src/routes/kanban/+page.svelte
test -f src/lib/state/filter.svelte.ts
test -f src/routes/runs/+page.server.ts
test -f src/routes/runs/+page.svelte
rg -n "columns|stages|filter|repo|refreshed|setInterval|visibilitychange" src/routes/kanban src/lib/state
rg -n "table|logs|elapsed|stage|runId|factory" src/routes/runs src/routes/api src/lib
rg -n "Status|RiskMark|Disclosure|safe-bottom|touch-target|layer-" src/lib src/routes DESIGN.md
```

Path-only drift may be substituted with the recon-resolved equivalent and documented in the PR.
Missing dependency contracts, missing log authorization, or materially different data semantics
must stop implementation and return this spec for revision.

### TO-BE — target behavior and invariants

1. At 320–430px, `/kanban` defaults to an attention queue ordered into
   `decision_required`, `blocked`, `risk`, `stale`, `running`, and `completed` groups. A work item
   appears in exactly one group using a pure, exhaustive precedence function; unknown or missing
   fields cannot silently become safe, completed, verified, or low risk.
2. `AttentionSummary` displays group counts and exposes visible, keyboard-operable count filters.
   Sticky group headings retain group name and visible count. Zero-count groups can be omitted from
   the list only while their count/filter remains discoverable in the summary.
3. The mobile stage view renders exactly one of the five lifecycle stages at a time. A visible
   `StageSelector` provides previous/next and direct stage selection, displays position as
   “N of 5,” disables only the unavailable direction, and makes every stage reachable without a
   horizontal gesture.
4. Repository, attention group, stage, and other existing supported filters have a canonical URL
   representation. Parsing is allowlisted, deterministic, and order-stable; invalid values fall
   back safely and are removed on the next serialization. Back/forward restores the same view,
   reload preserves it, and copying the URL reproduces it. Empty/default values are omitted.
5. Mobile filters open in the dependency's accessible bottom-sheet/popover contract. Apply writes
   one canonical history entry; Reset returns to documented defaults; Cancel changes neither URL
   nor committed filter state. The trigger shows the active-filter count outside the sheet.
6. `WorkItemCard` uses this DOM/information order: semantic state line, action sentence, risk,
   evidence count/availability, then one contextual link to internal detail. It uses the
   dependency's status/risk primitives, never invents evidence, never puts meaning only in a
   tooltip/color, and contains no approve/reject/retry mutation.
7. A zero-result queue or stage explains why it is empty and provides a visible recovery action:
   reset filters, select another stage, or return to the attention summary as applicable.
8. At desktop breakpoints the five lanes remain. Lane headings are sticky within the actual page
   scroll container, include counts, and empty lanes are collapsible with an accessible
   `aria-expanded` control. Non-empty lanes do not collapse implicitly, and existing stage menus,
   links, auto-refresh, and repository filtering remain functional.
9. At 320–430px, `/runs` presents cards rather than a squeezed table. Each card shows semantic
   state, current stage, elapsed time, internal work-item links where resolvable, and a
   `Disclosure` for logs. Opening the disclosure performs the first log request for that run;
   repeated toggles use the successful in-page result, concurrent duplicate requests are
   suppressed, and loading/empty/error/retry states remain explicit.
10. Log reads are authenticated server-side, run-id allowlisted, bounded, text-only, and escaped by
    Svelte. No runner credential, arbitrary upstream URL, secret value, or unbounded log history is
    sent to the client. Closing a disclosure does not cancel or corrupt another card's request.
11. `PUBLIC_ATTENTION_QUEUE_V2=1` and `PUBLIC_RESPONSIVE_RUNS_V2=1` are exact opt-ins. Unset,
    empty, `0`, or any other value retains the current board/runs rendering. Both flag paths consume
    the same loader data and preserve route URLs; rollback requires no data migration.
12. No page-level horizontal scrolling exists from 320 through 430px. The implementation fixes
    grid/flex/table intrinsic sizing (`minmax(0, 1fr)` and `min-width: 0` where needed); it does not
    hide the defect with root `overflow-x: hidden` or `clip`. Sticky headings are proved while
    scrolling, not inferred only from computed CSS.
13. Desktop behavior at 768, 1280, and 1920px remains readable. The graphite/ember/ivory scene,
    semantic-token rule, 44px coarse-pointer targets, safe-area clearance, fail-closed auth,
    lifecycle request semantics, and gateway/factory protocols remain unchanged.

### DELTA — numbered transitions, slices, and proof

1. **Ad hoc board items → one exhaustive attention/stage projection and canonical URL state** —
   Slice 1; proved by table-driven unit tests for precedence, unknown data, stable serialization,
   invalid query values, defaults, back/forward inputs, and zero-result projections.
2. **Five-column mobile scroll → attention summary, grouped queue, and decision-oriented cards** —
   Slice 2; proved by component tests plus browser tests at 320, 390, and 430px for group order,
   count filtering, semantic card order, internal-only contextual action, recoverable empties, and
   `scrollWidth <= clientWidth`.
3. **All stages rendered concurrently on mobile → one visible, URL-persisted stage plus filter
   sheet** — Slice 3; proved by browser tests for direct/previous/next stage access, “N of 5,”
   apply/cancel/reset, canonical copied URL, reload, and history restoration.
4. **Static desktop lanes → sticky counted lanes with accessible empty-stage collapse** — Slice 3;
   proved at 768, 1280, and 1920px by collapse-state tests and a scroll test comparing heading
   rectangles before/after page movement while existing menu/link/refresh tests remain green.
5. **Seven-column mobile runs table → state-first responsive run cards** — Slice 4; proved by
   component/browser tests at 320–430px and desktop regression checks for state, stage, elapsed,
   work-item links, ordering, empty state, and absence of page overflow.
6. **Eager or inaccessible log presentation → bounded, authenticated, per-run lazy logs** — Slice
   4; proved by server tests for auth/id validation/bounds/upstream failure and browser request-count
   assertions proving zero requests before expansion, one request on first expansion, cache reuse,
   duplicate suppression, explicit retry, and escaped hostile text.

## 3. Approach — vertical slices

Each slice is independently reviewable and sized for roughly 4–8 focused hours. A slice must ship
its tests and flag-off compatibility in the same change. No slice may add a board mutation.

### Slice 1 — attention projection and shareable view state (4–6 h)

**User-visible outcome:** behind the off-by-default flag, board state has one deterministic answer
for “what needs me, in which stage, under which shareable filters?”

**Exact files to touch:**

- `src/lib/kanban/attention.ts` (new)
- `src/lib/kanban/attention.test.ts` (new)
- `src/lib/kanban/view-state.ts` (new)
- `src/lib/kanban/view-state.test.ts` (new)
- `src/lib/state/filter.svelte.ts`
- `src/routes/kanban/+page.server.ts`
- `src/routes/kanban/+page.svelte` (flag boundary and projected data wiring only)

**Machine-checkable definition of done:**

- A typed attention-group union and explicit precedence table assign every fixture to exactly one
  group. Tests include combined decision+blocked+risk, absent risk/evidence/timestamps, stale
  boundary values, running, completed, and unknown states.
- Query parse/serialize round trips are idempotent and stable; duplicate, unknown, empty, and
  malformed values cannot reach application state. Default serialization is the clean `/kanban`
  URL.
- Existing repository-selection fixtures, refreshed-at behavior, and loader result shape remain
  green with the flag off.
- `bun test src/lib/kanban/attention.test.ts src/lib/kanban/view-state.test.ts` and
  `bun run check` exit 0 with no warnings.

### Slice 2 — attention queue and one-action WorkItemCard (6–8 h)

**User-visible outcome:** a phone opens to a grouped, countable queue whose cards explain state,
risk, and available proof before offering one route to detail.

**Exact files to touch:**

- `src/lib/components/kanban/AttentionSummary.svelte` (new)
- `src/lib/components/kanban/AttentionGroup.svelte` (new)
- `src/lib/components/kanban/WorkItemCard.svelte` (new)
- `src/lib/components/kanban/WorkItemList.svelte` (new)
- `src/lib/components/kanban/attention-queue.test.ts` (new)
- `src/routes/kanban/+page.svelte`
- `tests/kanban-responsive.spec.ts` (new)

**Machine-checkable definition of done:**

- Fixture counts equal rendered group/card counts; selecting a count filter changes the list and
  canonical URL without reclassifying an item.
- Each card's DOM order matches TO-BE 6, missing evidence renders as unavailable rather than `0`,
  and its sole contextual action resolves to an internal `/kanban/...` detail URL. No transition
  request is possible from the card DOM.
- Every empty condition renders an explanation and a focusable recovery control. Sticky group
  headers retain label/count during measured scrolling.
- With `PUBLIC_ATTENTION_QUEUE_V2=1`, Playwright at 320/390/430px proves no page overflow, no
  clipped text, 44px coarse-pointer controls, keyboard operation, and group ordering. With the flag
  off, the existing board snapshot/behavior remains unchanged.

### Slice 3 — focused stages, filter sheet, and desktop lane polish (6–8 h)

**User-visible outcome:** every lifecycle stage is directly reachable on a phone without sideways
scrolling, filters are shareable/recoverable, and desktop lanes remain efficient.

**Exact files to touch:**

- `src/lib/components/kanban/StageSelector.svelte` (new)
- `src/lib/components/kanban/FilterSheet.svelte` (new)
- `src/lib/components/kanban/DesktopLane.svelte` (new)
- `src/lib/components/kanban/stage-filter.test.ts` (new)
- `src/routes/kanban/+page.svelte`
- `tests/kanban-responsive.spec.ts`
- `DESIGN.md`

**Machine-checkable definition of done:**

- At 320/390/430px exactly one stage region is visible; direct, previous, and next controls reach
  all five stages and announce both stage name and correct “N of 5.”
- Apply/cancel/reset semantics, active count, reload, copied URL, and browser back/forward are all
  asserted. A filtered-empty stage provides both reset and stage-selection recovery.
- At 768/1280/1920px all five lanes remain, empty lanes alone can collapse, controls expose
  `aria-expanded`, and sticky headings are verified by rectangle position during scroll. Existing
  KebabMenu, card-detail links, repository filters, and auto-refresh tests remain green.
- No root `overflow-x: hidden` or `clip` is introduced. `bun run check` and
  `DESIGN_LINT_BASE_REF=origin/main bun run lint:design` exit 0.

### Slice 4 — responsive run cards and authenticated lazy logs (6–8 h)

**User-visible outcome:** phone users can scan a run's state/stage/time and selectively inspect its
logs without downloading every run's history.

**Exact files to touch:**

- `src/lib/runs/presentation.ts` (new)
- `src/lib/runs/presentation.test.ts` (new)
- `src/lib/components/runs/RunCard.svelte` (new)
- `src/lib/components/runs/RunLogDisclosure.svelte` (new)
- `src/lib/components/runs/run-card.test.ts` (new)
- `src/routes/runs/+page.server.ts`
- `src/routes/runs/+page.svelte`
- `src/routes/api/runs/[id]/logs/+server.ts` (new; authenticated same-origin proxy to the
  recon-confirmed existing run-log read capability)
- `src/routes/api/runs/[id]/logs/logs.test.ts` (new)
- `tests/runs-responsive.spec.ts` (new)

**Machine-checkable definition of done:**

- At 320/390/430px the seven-column table is absent and each fixture card exposes state, stage,
  elapsed value, resolvable internal work-item links, and a labeled log disclosure without page
  overflow. Desktop retains an efficient table or enhanced wide layout with the same data.
- The log endpoint rejects unauthenticated requests, malformed/unrecognized ids, arbitrary
  upstream targets, and oversized requests. It applies a documented line/byte ceiling and maps
  timeout/not-found/upstream failure to non-secret error responses.
- Browser request counts prove no log request before expansion, one request on first expansion,
  no duplicate while pending, successful cache reuse, and one new request after explicit retry
  from failure. `<script>` and ANSI/control-character fixtures render as inert bounded text.
- `PUBLIC_RESPONSIVE_RUNS_V2` is exact opt-in; flag-off route tests remain unchanged. Targeted unit,
  endpoint, and browser tests plus `bun run check` and design lint exit 0.

## 4. Cross-repo impact assessment

Per the root `AGENTS.md` Cross-Project Impact Zones, this work changes no gateway protocol,
channel extension, database schema, agent-definition format, shared auth, workshop/pixel-office,
or Paperclip adapter. `repos: [minion-base]` is intentionally narrow.

- **Minion Factory read surface — alert:** lazy logs depend on an existing authenticated,
  run-scoped read capability. Mitigation: Base adds only a bounded same-origin server proxy; it
  does not change factory endpoints or expose factory credentials. If the capability is absent or
  cannot enforce run scope, Slice 4 stops for a follow-up proposal/spec rather than expanding this
  repo list implicitly.
- **WorkDetail destination:** cards route to existing internal detail pages, including the issue
  route when the approved WorkDetail spec supplies it. Mitigation: unresolved kinds render a
  truthful unavailable-detail state, not a fabricated URL or external-only action.
- **UI primitives/shell dependency:** this spec imports the dependency's semantic marks,
  disclosure/bottom-sheet behavior, safe-area, touch, and layer tokens. Mitigation: no local fork;
  implementation is blocked until those contracts are present.
- **Existing board correctness:** repo filters, current lifecycle derivation, possibly-shipped
  warnings, deploy-branch CI semantics, auto-refresh, and detail routing are adjacent shipped or
  approved behavior. Mitigation: project existing loader records without changing their source
  semantics, and retain flag-off regression tests.
- **Deployment/CI alert:** operator memory records that Base's required GitHub check is only
  `poke`, not meaningful CI. The PR must attach full local gate and browser transcripts; this spec
  does not broaden into CI infrastructure.

Memory shaping these decisions:

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records the ★★★ mobile HITL constraints:
  Decision→Risk→Proof→Detail→History, no board-level one-click approval, truthful evidence,
  revision-safe semantics, and exact microcopy.
- `/memory/MINION/minion-base-lifecycle-dashboard.md` anchors the board routes, repo filter,
  auto-refresh, Base-specific design governance, Svelte 5 rules, and fail-closed authentication.
- `/memory/MINION/overflow-hidden-kills-sticky.md` requires intrinsic-width fixes instead of root
  clipping and requires sticky behavior to be measured while scrolling. The vague prior-session
  observation search returned no proposal-specific result, so no unsupported observation was used.

## 5. Explicit out of scope

- Any approve, reject, retry, requeue, promote, or other consequential action on a board/run card.
- UI-005/006/007 detail adapter/layout work, UI-008 guarded decision workflows, UI-009 evidence
  manifest/artifacts, or UI-010 durable event timeline.
- New factory log storage, a new factory public API, runner/factory authentication changes, live
  log streaming, websockets, or unbounded log downloads.
- Changes to lifecycle derivation, proposal/spec indexes, GitHub write APIs, database/schema,
  gateway protocol, auth policy, repo registry, deploy pipeline, or Base CI.
- A mobile drag-and-drop kanban, horizontal swipe as the only stage control, cross-device saved
  preferences beyond URL state, or server-side user preference storage.
- Redesigning the detail page, adding a second card action, inventing evidence/risk/action copy,
  or treating an unknown state as completed/safe.
- Replacing desktop lanes with the mobile queue, removing existing stage menus, or altering route
  URLs. No gradients, glass, decorative status color, raw colors outside tokens, or hub/site token
  imports.

## 6. End-to-end verification

From a clean Minion Base worktree based on `main`, with both dependency and this spec's slices
present:

```bash
bun install
bunx svelte-kit sync
bun test src/lib/kanban/attention.test.ts src/lib/kanban/view-state.test.ts
bun test src/lib/components/kanban/attention-queue.test.ts src/lib/components/kanban/stage-filter.test.ts
bun test src/lib/runs/presentation.test.ts src/lib/components/runs/run-card.test.ts
bun test 'src/routes/api/runs/[id]/logs/logs.test.ts'
bun run check
DESIGN_LINT_BASE_REF=origin/main bun run lint:design
# Run the repo-established Playwright command scoped to:
# tests/kanban-responsive.spec.ts tests/runs-responsive.spec.ts
```

Run the browser suite twice: first with both flags absent, proving the current board/runs
experience and existing tests are unchanged; then with `PUBLIC_ATTENTION_QUEUE_V2=1` and
`PUBLIC_RESPONSIVE_RUNS_V2=1`.

The flagged E2E scenario must begin at a copied `/kanban` URL at 320px, verify summary counts and
exclusive group assignment, filter to an empty result and recover, visit all five stages through
visible controls, confirm “N of 5,” apply/cancel/reset filters, reload, and use back/forward. It
must open a card's internal detail route and prove no mutation request originated on the board.
Repeat layout checks at 390 and 430px; at each width assert
`document.documentElement.scrollWidth <= document.documentElement.clientWidth` and measure sticky
heading rectangles before and after scroll.

At 768, 1280, and 1920px, verify all desktop lanes, sticky headings, accessible empty-lane
collapse, stage menus, repo filtering, links, and refresh behavior. Then open `/runs` at 320px,
verify state/stage/elapsed/work-item links, assert zero log requests, expand one run, assert exactly
one bounded request and escaped text, close/reopen without another request, and exercise a failed
request followed by explicit retry. Confirm another run remains independent. Recheck `/runs` at
390, 430, 768, 1280, and 1920px with no clipped or page-overflowing content.

Attach viewport screenshots, accessibility results, request-count evidence, sticky-position
measurements, and the unpiped command transcript to the PR. Any missing log authorization,
dependency mismatch, invented evidence, card mutation, inaccessible stage, or horizontal overflow
is a release blocker.
