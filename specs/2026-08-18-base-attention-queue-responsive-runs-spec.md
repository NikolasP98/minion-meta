---
id: 2026-08-18-base-attention-queue-responsive-runs-spec
title: Base UI-004/011 — mobile attention queue, focused stages, responsive runs
stage: spec
status: review
pass: 4
created: 2026-08-18
updated: 2026-08-20
proposal: 2026-08-18-base-attention-queue-responsive-runs
verdict: pending
repos: [minion-base]
relationship: depends-on
related: [2026-08-18-minion-base-mobile-hitl-ux-plan, 2026-08-18-base-ui-primitives-and-shell-spec, 2026-08-18-base-workdetail-summary-first-spec]
---

# Base UI-004/011 — mobile attention queue, focused stages, responsive runs

## Pass 4 — the pass-3 stop is lifted, recon resolved against `minion-base@main`

Pass 3 stopped implementation because the board loader exposed no authoritative `decision_required`,
`blocked`, or `risk` facts and no item-level stale boundary, so the required six-group projection
could only be built by inference. Both dependencies have since merged and the missing contract now
exists. Every anchor below was re-verified on 2026-08-20 against `minion-base@main` at
`ee0648099272145890fc999b0a5f7a496536ac87` by reading the files through the GitHub contents API;
each claim in §2 names the file it came from.

What changed since pass 3:

- `2026-08-18-base-ui-primitives-and-shell-spec` merged (PR #25, `0513acb1`). `src/lib/components/index.ts`
  exports `Popover`, `Disclosure`, `Status`, `RiskMark`, `IntegrityMark`, `WorkItemMarks`,
  `WorkItemSurface`, `AppShell`, `BottomNav`, `AsyncButton`, `ActionOutcome`, `ContextHeader`,
  `ConsequentialActions`, `CopyableHash` and re-exports `./interaction`, `./app-shell`,
  `./semantic-marks`. `Popover.svelte` implements the focus trap, Escape and outside-pointerdown
  dismissal, `returnFocus`, and `aria-expanded` this spec's filter sheet depends on;
  `Disclosure.svelte` implements `aria-expanded` + `aria-controls`.
- `2026-08-18-base-workdetail-summary-first-spec` merged (PR #28, `805886e0`). It supplies the
  contract that pass 3 said was missing: `src/lib/work-detail/types.ts` defines
  `Availability<T> = available | missing(MissingReason) | unsupported(UnsupportedReason)` with
  typed `decision`, `blockers`, `readiness`, and `review` facts, and
  `src/lib/work-detail/adapters.ts` publishes `WORK_DETAIL_ADAPTER_MATRIX` — a closed per-kind
  table naming the source field behind every fact, or declaring it unsupported with a reason.
- Both release flags (`PUBLIC_MOBILE_SHELL_V2`, `PUBLIC_WORK_DETAIL_V2`) are set in the deployed
  environment. They gate rendering only; the module exports this spec imports are compile-time and
  are present regardless of flag state.
- The run-scoped log capability is confirmed and already in use, not merely expected. See §2.

Two contract changes this pass makes, both of which the pass-3 stop explicitly permitted
("identifies authoritative source fields for every predicate and the item-level stale boundary, or
changes the product grouping contract"):

1. **A residual `open` group is added** after `completed`. The approved proposal's six groups are
   not total over the board's card set: an open issue with no gate fact, no blocker fact, no risk
   fact, recent activity, and no run in flight matches none of them. Pass 3's implementation put
   exactly those items in `unclassified`, which is how "every real record" ended up there.
   `open` is the honest residual; `unclassified` is narrowed to genuine data defects (§2 TO-BE 1).
2. **`completed` is structurally empty on the board and populated in Factory view.** All five
   board columns filter to non-terminal work (`src/routes/kanban/+page.svelte` `P_ACTIVE`,
   `ACTIVE`, the open-PR filter, the running-or-failing run filter). Terminal items exist only in
   the Factory run history. The group therefore renders with a zero count and an explanation
   rather than being silently dropped.

Pass-4 review round 1 raised three findings against `minion-base@main`, all reproduced and all
fixed in this revision rather than argued:

1. **A Factory outage was being read as a human decision (High).** `loadActiveRuns` collapses
   unconfigured, non-OK, malformed, and thrown reads to the same `[]` a healthy empty listing
   returns, so "approved with no run in flight" could fire during a routine runner outage and tell
   users to start duplicate runs. The loader contract now carries availability
   (`loadActiveRunListing`), the two run-join predicates are listing-gated, and the outage path is
   visible instead of silent (§2 AS-IS "Active-run availability", TO-BE 1, DELTA 5).
2. **The 128-KiB log ceiling sat behind an unbounded buffer (Medium).** `factoryFetch` does
   `await res.text()`, so a single oversized log line was unbounded server-side no matter what the
   endpoint capped afterwards. A byte-bounded reader (`factoryFetchBounded`) is now specified and
   tested at the transport boundary (§2 AS-IS log capability, TO-BE 10, DELTA 8).
3. **Common terminal Factory states had no semantic mapping (Medium).** `passed`/`failed`/`error`/
   `canceled` are not `StatusValue`s, so the normal completed run would have rendered "Unknown
   status". An exhaustive, compile-time-checked Factory→`StatusValue` map is now part of the
   contract, with one additive `error` mark (§2 TO-BE 9, DELTA 6).

One open product parameter for the G2 reviewer to accept or set: `ATTENTION_STALE_AFTER_MS`
(§2 TO-BE 1). No staleness window is declared anywhere in `minion-base`, `minion-meta`, or
`2026-08-17-sdlc-phase-gates-scoring-spec`, so this spec must declare one rather than infer it. It
is a single named exported constant with a stated rationale, not a scattered heuristic.

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

- `2026-08-18-base-ui-primitives-and-shell-spec` — the attention queue and run cards consume its
  `Status`, `RiskMark`, `Disclosure`, `Popover`, touch-target, safe-area, and layer contracts.
  This spec owns the filter sheet's responsive presentation while preserving the dependency's
  focus, dismissal, and return-focus behavior; duplicating those behaviors would create two mobile
  interaction systems.
- `2026-08-18-base-workdetail-summary-first-spec` — its `Availability<T>` vocabulary and
  `WORK_DETAIL_ADAPTER_MATRIX` are the authority for which facts each work-item kind can have.
  The attention classifier reads that table rather than deciding support ad hoc, which is exactly
  the rule the adapter module states about itself.

Both dependencies are merged (`stage: deploy, status: done`), so the pass-1 precondition
"implementation may begin only after the dependency's exported contracts exist" is satisfied.

The required search of `specs/index.json` and `proposals/index.json` covered `minion-base`, board,
mobile, attention, stage, filter, card, and run terms. The approved
`2026-08-18-minion-base-mobile-hitl-ux-plan` is the program authority that this spec implements,
not a competing draft. `2026-08-18-base-kanban-possibly-shipped-surface-spec` owns the G0 warning
semantics this spec reads but does not change. Earlier Base kanban, auto-refresh, deploy-status,
and reconciliation specs own data correctness or lifecycle state; none provides the mobile queue,
URL state, focused stages, or responsive run presentation requested here.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified behavior and anchors

Verified 2026-08-20 against `minion-base@main` `ee0648099272145890fc999b0a5f7a496536ac87`. Paths
are exact unless marked otherwise.

**Board.** `src/routes/kanban/+page.server.ts` is 16 lines: it stamps `cache-control: private,
max-age=0`, awaits `loadGitHub(fetch)` and `loadActiveRuns()` in parallel, and returns
`{ repos, specs, proposals, generatedAt, hasToken, activeRuns, fetchedAt }`. It makes no per-item
fetch. `src/routes/kanban/+page.svelte` (661 lines) builds five derived column arrays — `proposal`
(proposals in draft/review/approved plus open issues), `spec` (specs in
draft/review/approved/implementing), `development` (open PRs), `testing` (runs not completed, or
whose latest completed run failed, capped at 4/repo), `deployment` (deploy-branch tips) — each
sorted by `sortPhaseItems` from `src/lib/board/sort.ts`. Its `Card` type carries `key`, `repo`,
`title`, `url`, `href`, `meta`, `age`, `state`, `repass`, `active`, `actions`, `links`, `tags`,
`warning`, `status`, `updatedAt`.

**Mobile defect anchor.** `.board` is `grid-template-columns: repeat(5, minmax(15rem, 1fr));
overflow-x: auto`, with the closing comment "The board NEVER stacks: on narrow viewports the fixed
column minimum makes the grid wider than the screen and overflow-x side-scrolls." The 15rem column
minimum is the exact cause; `.col` and `.rail > li` already set `min-width: 0`.

**Loader facts.** `src/lib/server/github.ts` `loadGitHub` returns `RepoData[]` (`reachable`,
`issues[]`, `prs[]` with `draft`, `commits[]`, `runs[]` with `status`/`conclusion`/`event`/`updated`,
and `ci: BranchCiResult` whose `status` is `passing|failing|running|no-runs|unknown`), `SpecFile[]`
projected from `minion-meta@dev` `specs/index.json` (`stage`, `status`, `pass`, `verdict`,
`updated`, `tags`, `possibly_shipped`, `evidence`, `link_review`), and `Proposal[]` from
`proposals/index.json`. `src/lib/server/factory.ts` `loadActiveRuns()` returns `ActiveRun[]`
(`kind`, `status`, `spec_id`, `proposal_id`, `pr_url`) filtered to `pending|queued|running`.

**Active-run availability is not observable today.** `loadActiveRuns` is fail-soft by construction
(`src/lib/server/factory.ts:39-52`, and its own comment says so): an unconfigured runner
(`FACTORY_URL`/`FACTORY_SECRET` unset), a non-OK upstream status, malformed JSON, and a thrown
`fetch` all collapse to the same `[]` that a healthy listing with nothing in flight produces. To
every caller, *“the runner says no run matches”* and *“we could not ask the runner”* are the same
value. Two callers consume it: `src/routes/kanban/+page.server.ts` and
`src/routes/kanban/[kind]/[...ref]/+page.server.ts`. The distinction is recoverable at the
transport boundary without any factory change: `factoryFetch` synthesizes its own 503/502
responses stamped with the `x-factory-transport-failed` header (`TRANSPORT_FAILED`,
`TRANSPORT_UNCONFIGURED`, `TRANSPORT_UNREACHABLE` — exported from `src/lib/server/factory-path.ts`
precisely so that “the request never left this process” is readable by a caller), while an upstream
non-OK status and a JSON parse failure are separately observable inside the loader. Only the
collapse to `[]` discards them.

**Warning semantics.** `src/lib/spec-warning.ts` is the single reading of the three G0 fields:
`specWarning()` returns non-null when `possibly_shipped` or `link_review` is present;
`canDispose()` is true only with `possibly_shipped` and no `link_review`; `disposeBlockedReason()`
states that an open `link_review` "blocks both shipment dispositions". Board disposal controls are
live (`FACTORY_DISPOSAL=1` on the deployed runner); the compact card renders the warning with
`controls={false}` and the decision is made on the detail page.

**Detail destination.** `src/routes/kanban/[kind]/[...ref]/+page.server.ts` (1,067 lines) resolves
all six kinds — proposal, spec, issue, pr, run, deploy — and `src/routes/kanban/all-kinds-work-detail.test.ts`
and `src/routes/kanban/issue-route.test.ts` cover them. Every kind currently on the board has an
internal detail route; the truthful unavailable-detail state below is a guard for future kinds, not
a state any current card reaches. `specDetail` emits `approve for dev` / `reject` gates exactly when
`status === 'draft' || status === 'review'`, and a recovery `start dev run` when
`status === 'approved'` and no `ActiveRun` matches the spec id; `proposalDetail` mirrors this.
Blockers are fetched per item there (`check_runs[].conclusion` and `mergeable_state` for PRs, `jobs`
for runs, `branchCi` for deploys) and are `null` for proposal, spec, and issue.

**Runs surface.** The Runs surface is the Factory view at `/kanban?view=factory`
(`src/lib/components/app-shell.ts` `activeDestination` maps exactly that URL to the `runs`
destination); there is no standalone `/runs` route. `src/lib/components/FactoryRuns.svelte` is a
146-line client component that fetches `/api/factory/runs` itself on mount and every 15s, sorts via
`sortFactoryRuns`, and renders a seven-column table (run · kind · target · title · status · links ·
age) with a `showLog(id)` toggle. The kanban loader does **not** supply Factory-view data.

**Log capability — confirmed, not assumed.** `FactoryRuns.showLog` already calls
`fetch('/api/factory/runs/${id}/log?n=80')`. That reaches
`src/routes/api/factory/[...path]/+server.ts`, which forwards to `factoryFetch` in
`src/lib/server/factory.ts`; `factoryPathAllowed` in `src/lib/server/factory-path.ts` admits it via
the `runs(\/|$)` allowlist entry after checking every segment against
`^[\w.-]{1,150}$` (`SPEC_ID_MAX` from `src/lib/spec-warning.ts`). The bearer secret stays
server-side and `src/hooks.server.ts` gates the route. Five gaps this spec closes: the line count
`n` is **client-chosen**, there is no byte ceiling, no control-character handling, no check that the
id appears in the authenticated run listing, and — the one no endpoint-side cap can fix —
`factoryFetch` is not a bounded reader. It returns `new Response(await res.text(), …)`
(`src/lib/server/factory.ts:83-93`), so the whole upstream body is decoded into server memory
before any caller sees a byte. A fixed line count bounds the number of lines, not the length of a
line, so one very large log line is unbounded on this path, and a ceiling applied to the string
`factoryFetch` already produced is a *response-size* bound, not a *resource* bound. `showLog` also
refetches on every toggle and has no loading, empty, error, or retry state beyond the literal
string `no log yet`.

**Design governance.** `src/lib/design/tokens.css`, `DESIGN.md`, and `scripts/lint-design.mjs`
are Base's own surfaces. Base's `lint:design` is a whole-tree raw-color scan over `src/` with no
git base ref — `DESIGN_LINT_BASE_REF` is a `minion_hub` variable and has no effect here.

**Commands.** `package.json`: `test` = `bun test src`, `test:e2e` = `playwright test`,
`check` = `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`,
`lint:design` = `node scripts/lint-design.mjs`. `playwright.config.ts` sets `testDir: './tests/e2e'`,
so browser specs live in `tests/e2e/`, not `tests/`. Unit tests are colocated `*.test.ts` files
under `src/`. Board logic lives in `src/lib/board/`; component clusters follow the
`src/lib/components/work-detail/` precedent.

**Feature flags.** There is no central public-flag parser. The shipped pattern is a per-feature
pair: `src/lib/work-detail/parse-feature-flag.ts` (`parseWorkDetailV2(value) => value === '1'`,
pure and unit-testable) and `src/lib/work-detail/feature-flag.ts` (reads `$env/dynamic/public`).
`.env.example` is the environment reference and documents each flag's off-value.

Slice 1 re-verifies these anchors before editing and records the result in the PR:

```bash
test -f src/routes/kanban/+page.server.ts
test -f src/routes/kanban/+page.svelte
test -f src/lib/board/sort.ts
test -f src/lib/components/index.ts
test -f src/lib/work-detail/adapters.ts
test -f 'src/routes/api/factory/[...path]/+server.ts'
rg -n "Popover|Disclosure|RiskMark|WorkItemSurface" src/lib/components/index.ts
rg -n "WORK_DETAIL_ADAPTER_MATRIX|Availability|MissingReason" src/lib/work-detail
rg -n "possibly_shipped|link_review|canDispose|disposeBlockedReason" src/lib/spec-warning.ts
rg -n "runs\\(|SEGMENT|SPEC_ID_MAX" src/lib/server/factory-path.ts
rg -n "showLog|/api/factory/runs|setInterval" src/lib/components/FactoryRuns.svelte
rg -n "loadActiveRuns|res.ok|await res.text\\(\\)" src/lib/server/factory.ts
rg -n "TRANSPORT_FAILED|TRANSPORT_UNCONFIGURED|TRANSPORT_UNREACHABLE" src/lib/server/factory-path.ts
rg -n "FACTORY_STATUS_ORDER" src/lib/board/sort.ts
rg -n "'success'|'failure'|'cancelled'|UNKNOWN_STATUS" src/lib/components/semantic-marks.ts
```

Path-only drift may be substituted with the recon-resolved equivalent and documented in the PR. A
**named source field that no longer exists** — any cell of the predicate table below — stops
implementation and returns this spec for revision. Missing dependency exports or a log capability
that cannot be run-scoped do the same.

### TO-BE — target behavior and invariants

1. **Attention projection.** At 320–430px, `/kanban` defaults to an attention queue evaluated over
   the existing five-column card set, using only fields `loadGitHub` and the active-run listing
   already return. Precedence, highest first: `decision_required`, `blocked`, `risk`, `stale`,
   `running`, `completed`, then the residual `open`. Each item appears in exactly one group. Every
   predicate cell is one of four states, and the implementation records which:

   - **bound** — a named board field decides it, and the fetch that supplies that field succeeded
     (table below).
   - **not-applicable** — `WORK_DETAIL_ADAPTER_MATRIX[kind][field].support === 'unsupported'`. The
     merged adapter contract declares the source has no such fact, so the predicate is definitively
     false. This is an answer, not a gap.
   - **detail-scope** — the matrix declares the field supported but only the per-item detail loader
     fetches it. The board makes no per-item fetch and this spec adds none.
   - **unavailable** — a bound source exists but the fetch that supplies it did not answer, so the
     fact is *unknown*, not false. Today only one board source can be unavailable: the Factory
     active-run listing (AS-IS above). An unavailable cell is never read as false and never
     silently promotes an item into a group.

   | Group | Bound source of truth | not-applicable | detail-scope |
   |---|---|---|---|
   | `decision_required` | spec `SpecFile.status ∈ {draft, review}`, or `canDispose(specWarning(spec))`; proposal `Proposal.status ∈ {draft, review}`. **Listing-gated arms** (bound only when `activeRunListing.state === 'available'`, else `unavailable`): spec `status === 'approved'` with no `activeRuns[].spec_id` match; proposal `approved` with no `activeRuns[].proposal_id` match | issue, pr, deploy (`decision: unsupported/not-applicable`) | run (`actions[0]` needs the CI-proposal join the board does not make) |
   | `blocked` | spec `link_review` present (`disposeBlockedReason`); deploy `RepoData.reachable === false` | proposal, issue (`blockers: unsupported`) | pr (`check_runs[].conclusion`, `mergeable_state`), run (`jobs`) |
   | `risk` | deploy `RepoData.ci.status === 'failing'`; testing card whose latest completed run has `conclusion === 'failure'` (the board's own testing-column predicate) | issue (`review`, `readiness`: unsupported) | pr, run (readiness vetoes) |
   | `stale` | every kind: `now - Date.parse(Card.updatedAt) > ATTENTION_STALE_AFTER_MS` — the same per-item source timestamp `comparePhaseItems` already sorts on. Never `data.fetchedAt` | — | — |
   | `running` | every kind: `Card.active` present (the `activeRuns` join — **listing-gated**, `unavailable` when the listing did not answer), or run card `status !== 'completed'`, or deploy `ci.status === 'running'` | — | — |
   | `completed` | board: structurally empty — all five columns filter to non-terminal work. Factory view: run `status ∈ {passed, failed, error, canceled}` per `FACTORY_STATUS_ORDER` (`src/lib/board/sort.ts:19`) | — | — |
   | `open` | residual: a classifiable item that matched no predicate above | — | — |

   Classification walks the chain and takes the first **bound** predicate that is true. A
   **detail-scope** or **unavailable** cell is skipped, never read as false, and the card renders a
   visible, named note ("blocked: not evaluated on the board — `check_runs[].conclusion`";
   "decision: not evaluated — Factory run listing unreachable"). `unclassified` is reserved for a
   genuine data defect in the item itself: an absent or unparseable `updatedAt`, or a `status`
   outside `statusValues` in `src/lib/components/semantic-marks.ts`. It renders as a separate
   visible group with the unavailable fields named and is never coerced into a normal group. A
   source outage is never an item defect: an unavailable listing puts *no* item in `unclassified`
   — it downgrades the affected cells and raises the board-level notice above.

   **Active-run listing carries its own availability.** `src/lib/server/factory.ts` gains
   `loadActiveRunListing(): Promise<ActiveRunListing>` with
   `ActiveRunListing = { state: 'available'; runs: ActiveRun[] } | { state: 'unavailable'; reason:
   ActiveRunUnavailableReason }` and
   `ActiveRunUnavailableReason = 'unconfigured' | 'unreachable' | 'upstream_error' | 'malformed'`.
   `unconfigured` and `unreachable` are read from the `x-factory-transport-failed` header
   `factoryFetch` already sets; `upstream_error` is any other non-OK status; `malformed` is a JSON
   parse failure or a payload whose `runs` is present but not an array. The `PLAYWRIGHT_FIXTURES`
   short-circuit stays `{ state: 'available', runs: [] }`, since a fixture run genuinely has no
   runner. The shipped `loadActiveRuns()` remains exported and keeps its exact current signature
   and fail-soft semantics as a thin wrapper (`listing.state === 'available' ? listing.runs : []`),
   so the detail loader and its tests are untouched by this spec. `src/routes/kanban/+page.server.ts`
   calls the listing form and returns `activeRunListing` in addition to today's `activeRuns` array;
   no existing key changes shape.

   **A missing run match is a fact only when the listing answered.** The `decision_required`
   arm “approved with no matching active run” — and the `running` arm that reads the `activeRuns`
   join — evaluate as **bound** only when `activeRunListing.state === 'available'`. When the state
   is `unavailable`, both cells are `unavailable`: the item is classified by its remaining bound
   predicates (an approved spec with no other signal therefore lands in `open`, never in
   `decision_required`), and the board renders one visible, non-dismissable notice naming the
   reason (“Factory run listing unavailable — unreachable; run state and decision-needed counts are
   incomplete”). This is the truthful/fail-closed predicate invariant applied to an outage: the
   product must never tell a user to start a second run because the runner could not be reached.
   Nothing about the unavailable path infers a run, hides an item, or blocks the queue.

   `ATTENTION_STALE_AFTER_MS` is a single exported constant in `src/lib/board/attention.ts`,
   proposed at 7 days: the promotion train runs weekly (Saturday 21:00), so an item untouched
   across a full train cycle has missed one. It is the only product parameter this spec introduces
   and the G2 reviewer may set it to any value; it must never be duplicated or overridden per call
   site.
2. `AttentionSummary` displays group counts and exposes visible, keyboard-operable count filters.
   Sticky group headings retain group name and visible count. Zero-count groups — including
   `completed` on the board — can be omitted from the list only while their count/filter remains
   discoverable in the summary, and `completed`'s emptiness is explained rather than implied.
3. Mobile has two mutually exclusive board modes. With no canonical `stage` query value it shows
   the default attention queue across all stages. Choosing a stage enters focused-stage mode and
   renders exactly one of the five lifecycle stages; clearing the stage returns to the attention
   summary. A visible `StageSelector` is reachable from the summary, provides previous/next and
   direct stage selection in focused mode, displays position as "N of 5," disables only the
   unavailable direction, and makes every stage reachable without a horizontal gesture. An
   attention-group filter is valid only in attention mode; canonical serialization removes it when
   a stage is committed.
4. Repository, attention group, stage, and other existing supported filters have one canonical URL
   representation. Parsing is allowlisted, deterministic, and order-stable; duplicate/invalid
   values fall back safely and are removed with `replaceState` during normalization. Committed
   count, stage, Apply, and Reset actions each add exactly one history entry; Cancel adds none.
   Back/forward restores the same mode and filters, reload preserves them, and copying the URL
   reproduces them. Empty/default values are omitted; `/kanban` is the unfiltered attention default.
   The serializer preserves the existing allowlisted `view=factory` value (written today by
   `setView` with `replaceState`) and unrelated route state; attention/stage state is inactive in
   Factory view rather than deleting that view value.
5. Mobile filters use a bottom-sheet presentation built on `Popover`'s focus trap, Escape/outside
   dismissal, and return-focus contract. Apply writes one canonical history entry; Reset returns to
   the unfiltered attention default; Cancel changes neither URL nor committed filter state. The
   trigger shows the number of non-default filter dimensions outside the sheet (multi-selecting
   repositories counts as one repository dimension). The shipped `RepoChips` remains the repository
   control and continues to write `src/lib/state/filter.svelte.ts`.
6. `WorkItemCard` uses this DOM/information order: semantic state line, action sentence, risk,
   evidence count/availability, then at most one contextual link to internal detail. It composes
   the shipped `WorkItemSurface`/`WorkItemMarks` rather than re-implementing marks. The action
   sentence is a lossless existing source field or an explicit unavailable state, never inferred
   copy. Risk uses `RiskMark`'s `unavailable` value wherever the cell is detail-scope. The card
   never invents evidence, never puts meaning only in a tooltip/color, and contains no
   approve/reject/retry mutation.
7. A zero-result queue or stage explains why it is empty and provides a visible recovery action:
   reset filters, select another stage, or return to the attention summary as applicable.
8. At desktop breakpoints the five lanes remain. Lane headings are sticky within the actual page
   scroll container, include counts, and empty lanes are collapsible with an accessible
   `aria-expanded` control. Non-empty lanes do not collapse implicitly, and existing `KebabMenu`
   stage menus, `StagePicker`, links, auto-refresh, and repository filtering remain functional.
   Mobile `stage` presentation state remains in the URL but does not remove desktop lanes; resizing
   back to mobile restores the selected focused stage.
9. At 320–430px, `/kanban?view=factory` presents run cards rather than a squeezed table. Each card
   shows semantic state, current stage, elapsed time, internal work-item links where resolvable,
   and a `Disclosure` for logs. Opening the disclosure performs the first log request for that run;
   repeated toggles use the successful in-page result, concurrent duplicate requests are
   suppressed, and loading/empty/error/retry states remain explicit. The existing 15s list refresh
   and `sortFactoryRuns` ordering are preserved.

   **The semantic state comes from one exhaustive Factory→`StatusValue` map.** Factory's run
   vocabulary is not Base's `Status` vocabulary: `src/lib/board/sort.ts:19` orders runs by
   `running | queued | failed | error | passed | canceled` (and `loadActiveRuns` additionally
   filters on `pending`), while `statusValues` in `src/lib/components/semantic-marks.ts` has no
   `passed`, `failed`, `error`, or `canceled`. Passing a raw Factory status to `statusMark` today
   returns the `UNKNOWN_STATUS` fallback (`semantic-marks.ts:120-125`), so the *normal completed
   run* would render “Unknown status”. `src/lib/runs/presentation.ts` therefore owns a total map,
   typed `Record<FactoryRunStatus, StatusValue>` where
   `FactoryRunStatus = (typeof FACTORY_STATUS_ORDER)[number] | 'pending'` — the existing constant
   in `sort.ts` is exported unchanged so the map is exhaustive at compile time, and a Factory state
   added later fails `bun run check` instead of silently rendering “Unknown status”:

   | Factory `status` | `StatusValue` | Rendered label · tone (from the shipped table) |
   |---|---|---|
   | `running` | `running` | Running · warn |
   | `queued` | `queued` | Queued · warn |
   | `pending` | `pending` | Pending · warn |
   | `passed` | `success` | Success · ok |
   | `failed` | `failure` | Failed · err |
   | `canceled` | `cancelled` | Cancelled · muted (spelling normalization only) |
   | `error` | `error` | Errored · err (**new member**, below) |

   `error` has no truthful counterpart in the shipped vocabulary and is not a synonym for `failed`:
   the runner records “the self-test failed” as `failed` and “the run itself could not complete” as
   `error`, so relabelling a harness crash as a failed test would be invented meaning. This spec
   therefore makes one **additive** change to `src/lib/components/semantic-marks.ts`: a new
   `'error'` member of `StatusValue` with `{ label: 'Errored', symbol: '!', tone: 'err' }`. No
   existing entry's label, symbol, or tone changes; the table's
   `satisfies Record<StatusValue, MarkDefinition>` keeps it exhaustive, and `statusValues` — which
   TO-BE 1 uses as the `unclassified` validity set — gains exactly that one member. A status
   outside the map is not silently normalized: the card renders the `unknown` mark *and* names the
   raw value (“Unrecognized run state: `<raw>`”). This map is the single reading of run state for
   both the run card and the Factory-view `completed` predicate in TO-BE 1; no component
   re-derives it.
10. Log reads are authenticated server-side and go through a new bounded endpoint rather than the
    generic factory proxy. It accepts only an opaque run id matching Base's existing segment
    grammar `^[\w.-]{1,150}$` (`SPEC_ID` / `SPEC_ID_MAX`, the same bound `factoryPathAllowed`
    enforces — a narrower local bound would reject ids the transport accepts, which is the exact
    failure mode `src/lib/spec-warning.ts` documents), and only when that id is present in the
    authenticated Factory run listing. It calls only the fixed upstream `runs/<id>/log` route, with
    the line count fixed **server-side**; a client-supplied line or byte bound is rejected.

    **The byte ceiling is enforced while reading, not after.** `factoryFetch` cannot deliver it: it
    buffers the whole upstream body (`await res.text()`, AS-IS above), so a cap applied to its
    result bounds only what Base sends to the browser while a single oversized log line still
    consumes unbounded server memory — a 200-line query bounds line count, never line length.
    `src/lib/server/factory.ts` therefore gains a byte-bounded sibling,
    `factoryFetchBounded(path, { maxBytes, … })`, which reuses the identical URL construction,
    bearer header, and `factoryPathAllowed` guard as `factoryFetch` (the path stays judged in
    exactly one place, as `factory-path.ts` requires) and then consumes `res.body` incrementally:
    it stops at the first chunk that reaches `maxBytes`, cancels the upstream reader so the
    remainder is never transferred, decodes with a streaming `TextDecoder` (`{ stream: true }`) so
    a multi-byte sequence split at the boundary cannot become a replacement character, drops the
    trailing partial line, and returns `{ text, truncated, status }`. Bytes held in memory never
    exceed `maxBytes` plus one upstream chunk, whatever the upstream sends. A missing `res.body` —
    the synthesized 503/502 responses — is its own case, not an empty log. The endpoint calls this
    primitive with `maxBytes = LOG_MAX_BYTES` (128 KiB, one exported constant) and then applies the
    200-line cap to the decoded text; disallowed control characters are removed while tabs/newlines
    remain, and Svelte renders the result as text. Truncation is stated to the user (“showing the
    last 200 lines, truncated at 128 KiB”), never silently implied. No runner credential, arbitrary
    upstream URL, secret value, or unbounded log history is sent to the client. Closing a
    disclosure does not cancel or corrupt another card's request.
11. `PUBLIC_ATTENTION_QUEUE_V2=1` and `PUBLIC_RESPONSIVE_RUNS_V2=1` are exact opt-ins, parsed by
    pure functions following the shipped `parseWorkDetailV2` pattern. Unset, empty, `0`, `true`, or
    any other value retains the current board/runs rendering. Both flag paths consume their current
    loader data and preserve `/kanban` plus the canonical `view=factory` query; rollback requires no
    data migration and is documented in `.env.example`.
12. No page-level horizontal scrolling exists from 320 through 430px. The implementation replaces
    the `repeat(5, minmax(15rem, 1fr))` intrinsic minimum on the mobile path and fixes grid/flex/
    table sizing (`minmax(0, 1fr)` and `min-width: 0` where needed); it does not hide the defect
    with root `overflow-x: hidden` or `clip`. `.board`'s own `overflow-x: auto` may remain for the
    desktop lane rail. Sticky headings are proved while scrolling, not inferred only from computed
    CSS.
13. Desktop behavior at 768, 1280, and 1920px remains readable. The graphite/ember/ivory scene,
    semantic-token rule, 44px coarse-pointer targets, safe-area clearance, fail-closed auth,
    `cache-control: private, max-age=0` on the board load, lifecycle request semantics, and
    gateway/factory protocols remain unchanged.

### DELTA — numbered transitions, slices, and proof

1. **Ad hoc board items → one exhaustive attention/stage projection and canonical URL state** —
   Slice 1; proved by table-driven unit tests for the seven-group precedence, the bound/
   not-applicable/detail-scope/unavailable state of every cell, fail-closed `unclassified` output,
   stable serialization, mutually exclusive attention/stage modes, invalid query values, defaults,
   back/forward inputs, and zero-result projections.
2. **Five-column mobile scroll → attention summary, grouped queue, and decision-oriented cards** —
   Slice 2; proved by component tests plus browser tests at 320, 390, and 430px for group order,
   count filtering, semantic card order, internal-only contextual action, recoverable empties, and
   `scrollWidth <= clientWidth`.
3. **All stages rendered concurrently on mobile → default attention mode or one visible,
   URL-persisted stage plus filter sheet** — Slice 3; proved by browser tests for attention→stage→
   attention transitions, direct/previous/next stage access, "N of 5," apply/cancel/reset,
   canonical copied URL, reload, and history restoration.
4. **Static desktop lanes → sticky counted lanes with accessible empty-stage collapse** — Slice 3;
   proved at 768, 1280, and 1920px by collapse-state tests and a scroll test comparing heading
   rectangles before/after page movement while existing menu/link/refresh tests remain green.
5. **A Factory outage indistinguishable from “nothing is running” → an availability-carrying
   listing** — Slice 1; `loadActiveRunListing` replaces the silent collapse to `[]`, proved by
   loader tests covering unconfigured, non-OK upstream status, malformed JSON, a non-array `runs`
   payload, and a thrown `fetch` (each asserting its own `reason`), by a `loadActiveRuns` wrapper
   test proving the shipped signature and fail-soft behavior are unchanged, and by classifier tests
   proving an approved spec/proposal with no matching run is `decision_required` only when the
   listing is available and lands in `open` with a named note plus the board-level notice when it
   is not.
6. **Seven-column Factory-view mobile table → state-first responsive run cards** — Slice 4; proved by
   component/browser tests at 320–430px and desktop regression checks for state, stage, elapsed,
   work-item links, ordering, empty state, and absence of page overflow, plus a table-driven test
   asserting every Factory status in `FACTORY_STATUS_ORDER` (and `pending`) renders its mapped
   label and tone rather than the “Unknown status” fallback, an unrecognized status renders the
   unknown mark with the raw value named, and every pre-existing `Status` fixture is unchanged by
   the additive `error` member.
7. **Client-bounded proxy log toggle → bounded, authenticated, per-run lazy logs** — Slice 4;
   proved by server tests for auth/id validation/listing membership/server-fixed bounds/upstream
   failure and browser request-count assertions proving zero requests before expansion, one request
   on first expansion, cache reuse, duplicate suppression, explicit retry, and escaped hostile text.
8. **Whole-body buffering at the factory transport → a byte-bounded reader** — Slice 4;
   `factoryFetchBounded` proved by transport tests that feed a synthetic `ReadableStream` far
   larger than `LOG_MAX_BYTES` — including a single line with no newline — and assert total bytes
   read never exceed the ceiling plus one chunk, that the upstream reader was canceled, that
   `truncated` is reported, that a multi-byte character split across the boundary decodes without a
   replacement character, and that a body-less synthesized 503/502 is handled as a transport error
   rather than an empty log.

## 3. Approach — vertical slices

Each slice is independently reviewable and sized for roughly 4–8 focused hours. A slice must ship
its tests and flag-off compatibility in the same change. No slice may add a board mutation.

### Slice 1 — attention projection and shareable view state (4–6 h)

**User-visible outcome:** behind the off-by-default flag, board state has one deterministic answer
for "what needs me, in which stage, under which shareable filters?"

**Exact files to touch:**

- `src/lib/board/attention.ts` (new — beside the shipped `sort.ts`)
- `src/lib/board/attention.test.ts` (new)
- `src/lib/board/view-state.ts` (new)
- `src/lib/board/view-state.test.ts` (new)
- `src/lib/board/parse-feature-flag.ts` (new — pure, mirrors `src/lib/work-detail/parse-feature-flag.ts`)
- `src/lib/board/feature-flag.ts` (new — reads `$env/dynamic/public`, mirrors the work-detail pair)
- `src/lib/board/parse-feature-flag.test.ts` (new)
- `src/lib/server/factory.ts` (add `loadActiveRunListing` + its types; `loadActiveRuns` stays
  exported with its current signature as a wrapper — no other export changes)
- `src/lib/server/factory.test.ts` (new — the loader's availability matrix)
- `src/routes/kanban/+page.server.ts` (call the listing form; return `activeRunListing` alongside
  the existing `activeRuns` key)
- `.env.example` (both flags, with their off-values and rollback note)
- `src/routes/kanban/+page.svelte` (flag boundary, projected data wiring, and the listing-unavailable
  notice)

Every other bound field in the TO-BE 1 table is already in the board loader's return value; the
loader change is confined to adding availability, and `src/routes/kanban/[kind]/[...ref]/+page.server.ts`
is deliberately not touched (it keeps the unchanged `loadActiveRuns` wrapper).

**Machine-checkable definition of done:**

- A typed attention-group union and explicit precedence table assign every classifiable fixture to
  exactly one of the seven groups and every defective fixture to `unclassified`. The test table
  records, per (kind, predicate) cell, whether it is bound (naming the loader field),
  not-applicable (naming the `WORK_DETAIL_ADAPTER_MATRIX` reason), or detail-scope. Fixtures cover
  combined decision+blocked+risk, absent `possibly_shipped`/`link_review`, the
  `ATTENTION_STALE_AFTER_MS` boundary on both sides, running via `activeRuns` join and via run
  status, an issue that falls to `open`, a `completed` Factory-view run, and an unparseable
  `updatedAt`.
- `loadActiveRunListing` returns `state: 'unavailable'` with the correct `reason` for each of:
  unset `FACTORY_URL`/`FACTORY_SECRET` (`unconfigured`, read from `x-factory-transport-failed`), a
  thrown/refused `fetch` (`unreachable`), any other non-OK upstream status (`upstream_error`), and
  invalid JSON or a non-array `runs` (`malformed`); it returns `state: 'available'` with the
  `pending|queued|running` filter applied on the healthy path, including the healthy-but-empty
  case. `loadActiveRuns()` still resolves to `ActiveRun[]` and still yields `[]` on every one of
  those failures, proved against the same fixtures.
- No classifier input is a raw array: a test asserts that with an unavailable listing, an approved
  spec and an approved proposal with no matching run are **not** `decision_required` (they fall to
  `open`), that their decision and `running` cells report `unavailable` with the reason named, that
  no item is moved to `unclassified` by the outage, and that the board-level notice is present.
  The mirrored available-listing fixtures still classify as `decision_required`.
- `ATTENTION_STALE_AFTER_MS` is exported once; a test asserts no other module defines or overrides
  a staleness bound, and that `data.fetchedAt` is never an input to the classifier.
- Query parse/serialize round trips are idempotent and stable; duplicate, unknown, empty, and
  malformed values cannot reach application state. Stage and attention-group values cannot coexist
  after serialization; `view=factory` survives round trips without activating board filters.
  Default serialization is the clean `/kanban` URL.
- Flag tests prove only the exact string `1` enables `PUBLIC_ATTENTION_QUEUE_V2`; unset, empty,
  `0`, `true`, and malformed values remain off, and `.env.example` documents rollback.
- Existing repository-selection behavior (`src/lib/state/filter.svelte.ts`), refreshed-at behavior,
  and loader result shape remain green with the flag off; `src/lib/board/sort.test.ts` stays green.
- `bun test src/lib/board`, `bun test src/lib/server`, and `bun run check` exit 0 with no warnings.

### Slice 2 — attention queue and bounded-action WorkItemCard (6–8 h)

**User-visible outcome:** a phone opens to a grouped, countable queue whose cards explain state,
risk, and available proof before offering at most one currently resolvable route to detail.

**Exact files to touch:**

- `src/lib/components/board/AttentionSummary.svelte` (new)
- `src/lib/components/board/AttentionGroup.svelte` (new)
- `src/lib/components/board/WorkItemCard.svelte` (new)
- `src/lib/components/board/WorkItemList.svelte` (new)
- `src/lib/components/board/attention-queue.test.ts` (new)
- `src/lib/components/index.ts` (export the new components alongside the shipped barrel entries)
- `src/routes/kanban/+page.svelte`
- `tests/e2e/kanban-responsive.spec.ts` (new)

**Machine-checkable definition of done:**

- Fixture counts, including `open` and `unclassified`, equal rendered group/card counts; selecting
  a count filter changes the list and canonical URL without reclassifying an item.
- Each card's DOM order matches TO-BE 6; it renders `WorkItemSurface`/`WorkItemMarks` rather than
  private markup; missing action/evidence renders as unavailable rather than invented text or `0`;
  a detail-scope predicate renders its named not-evaluated note; and every rendered contextual
  action resolves to an internal `/kanban/...` detail URL. A kind without an internal detail route
  renders a truthful unavailable-detail state and no contextual link. No transition request is
  possible from the card DOM.
- Every empty condition renders an explanation and a focusable recovery control. Sticky group
  headers retain label/count during measured scrolling.
- With `PUBLIC_ATTENTION_QUEUE_V2=1`, Playwright at 320/390/430px proves no page overflow, no
  clipped text, 44px coarse-pointer controls, keyboard operation, and group ordering. With the flag
  off, the existing board behavior and `tests/e2e/board-ordering.spec.ts` remain unchanged.

### Slice 3 — focused stages, filter sheet, and desktop lane polish (6–8 h)

**User-visible outcome:** every lifecycle stage is directly reachable on a phone without sideways
scrolling, filters are shareable/recoverable, and desktop lanes remain efficient.

**Exact files to touch:**

- `src/lib/components/board/StageSelector.svelte` (new)
- `src/lib/components/board/FilterSheet.svelte` (new — composes the shipped `Popover`)
- `src/lib/components/board/DesktopLane.svelte` (new)
- `src/lib/components/board/stage-filter.test.ts` (new)
- `src/lib/components/index.ts`
- `src/routes/kanban/+page.svelte`
- `tests/e2e/kanban-responsive.spec.ts`
- `DESIGN.md`

**Machine-checkable definition of done:**

- At 320/390/430px the clean URL shows the attention summary with no stage region. Selecting any
  stage shows exactly one stage region; direct, previous, and next controls reach all five stages,
  announce both stage name and correct "N of 5," and clearing stage returns to attention mode.
- Apply/cancel/reset semantics, active count, reload, copied URL, and browser back/forward are all
  asserted. A filtered-empty stage provides both reset and stage-selection recovery. The sheet
  reuses `Popover`'s focus trap, Escape/outside dismissal, and return-focus rather than forking
  them; `tests/e2e/interaction-primitives.spec.ts` remains green.
- At 768/1280/1920px all five lanes remain, empty lanes alone can collapse, controls expose
  `aria-expanded`, and sticky headings are verified by rectangle position during scroll. Existing
  `KebabMenu`, `StagePicker`, card-detail links, `RepoChips` filters, and auto-refresh tests remain
  green. A mobile-selected stage survives a desktop resize without hiding lanes and is restored on
  return to mobile.
- No root `overflow-x: hidden` or `clip` is introduced. `bun run check` and `bun run lint:design`
  exit 0.

### Slice 4 — responsive run cards and authenticated lazy logs (6–8 h)

**User-visible outcome:** phone users can scan a run's state/stage/time in the existing Factory
view and selectively inspect its logs without downloading every run's history.

**Exact files to touch:**

- `src/lib/runs/presentation.ts` (new — owns the exhaustive Factory→`StatusValue` map of TO-BE 9)
- `src/lib/runs/presentation.test.ts` (new — the mapping matrix, one row per Factory status)
- `src/lib/board/sort.ts` (export the existing `FACTORY_STATUS_ORDER` constant; no other change,
  `sort.test.ts` stays green)
- `src/lib/components/semantic-marks.ts` (additive only: the new `'error'` `StatusValue` member)
- `src/lib/components/Status.test.ts` (shipped — its literal `statusFixtures` table gains exactly
  the one `error` row; every other row stays byte-identical)
- `src/lib/components/runs/RunCard.svelte` (new)
- `src/lib/components/runs/RunLogDisclosure.svelte` (new — composes the shipped `Disclosure`)
- `src/lib/components/runs/run-card.test.ts` (new)
- `src/lib/components/FactoryRuns.svelte` (confirmed shipped path; it owns the Factory-view fetch,
  so the flag boundary and card/table switch live here — the kanban loader is not involved)
- `src/lib/board/feature-flag.ts` and `.env.example` (add `PUBLIC_RESPONSIVE_RUNS_V2`)
- `src/lib/server/factory.ts` (add `factoryFetchBounded` + `LOG_MAX_BYTES`; `factoryFetch` keeps
  its current behavior and callers)
- `src/lib/server/factory-bounded.test.ts` (new — the byte-ceiling matrix)
- `src/routes/api/runs/[id]/logs/+server.ts` (new; authenticated same-origin endpoint that calls
  `factoryFetchBounded('runs/<id>/log', { maxBytes: LOG_MAX_BYTES, … })` with server-fixed bounds —
  deliberately distinct from the generic `/api/factory/[...path]` proxy, which forwards a
  client-chosen `n` and buffers the whole body)
- `src/routes/api/runs/[id]/logs/logs.test.ts` (new)
- `tests/e2e/runs-responsive.spec.ts` (new)

**Machine-checkable definition of done:**

- A table-driven test maps every member of `FACTORY_STATUS_ORDER` plus `pending` to its
  `StatusValue` and asserts the rendered label and tone match TO-BE 9 — in particular that
  `passed`, `failed`, `error`, and `canceled` never render “Unknown status”. An unrecognized status
  renders the `unknown` mark **and** the raw value. Removing a row from the map, or adding a
  Factory state without one, fails `bun run check` (the map is typed `Record<FactoryRunStatus,
  StatusValue>`). `src/lib/components/Status.test.ts` proves the `error` member is purely additive:
  every pre-existing status fixture is unchanged and `statusValues` grows by exactly one.
- `factoryFetchBounded` never holds more than `LOG_MAX_BYTES` plus one chunk: a synthetic
  `ReadableStream` of several MiB — and a variant that is one newline-free line — is bounded, the
  reader is canceled, `truncated` is true, and total bytes pulled are asserted. A UTF-8 sequence
  split across the ceiling decodes without `U+FFFD`. A body-less synthesized 503/502 is reported as
  a transport error, not an empty log. A body under the ceiling is returned whole with
  `truncated: false`. `factoryFetch`'s own tests and callers are unaffected.
- At 320/390/430px on `/kanban?view=factory` the seven-column table is absent and each fixture card
  exposes state, stage, elapsed value, resolvable internal work-item links, and a labeled log
  disclosure without page overflow. Desktop retains an efficient table or enhanced wide layout with
  the same data and `sortFactoryRuns` ordering.
- The log endpoint rejects unauthenticated requests, ids outside `^[\w.-]{1,150}$`, ids absent from
  the authenticated run listing, arbitrary upstream targets, and any client-supplied line/byte
  bound. It enforces the 200-line/128-KiB ceiling server-side — the byte half through
  `factoryFetchBounded`, asserted by a test that the endpoint never calls `factoryFetch` for log
  reads — states truncation to the user, and maps timeout, not-found, and upstream failure —
  including the 503 `unconfigured` and 502 `unreachable` synthesized responses — to non-secret
  error responses. Membership is checked against `loadActiveRunListing`; an unavailable listing
  answers with an explicit “cannot verify this run right now” error rather than serving or denying
  on a guess.
- Browser request counts prove no log request before expansion, one request on first expansion,
  no duplicate while pending, successful cache reuse, and one new request after explicit retry
  from failure. `<script>` and ANSI/control-character fixtures render as inert bounded text.
- `PUBLIC_RESPONSIVE_RUNS_V2` is exact opt-in; flag-off route tests remain unchanged. Targeted unit,
  endpoint, and browser tests prove only `1` enables it and that unset/empty/`0`/`true`/malformed
  values remain off; `.env.example` documents rollback. Those tests plus `bun run check` and
  `bun run lint:design` exit 0.

## 4. Cross-repo impact assessment

Per the root `AGENTS.md` Cross-Project Impact Zones, this work changes no gateway protocol,
channel extension, database schema, agent-definition format, shared auth, workshop/pixel-office,
or Paperclip adapter. `repos: [minion-base]` is intentionally narrow.

- **Minion Factory read surface — resolved:** the authenticated, run-scoped log capability is
  confirmed in use today (`FactoryRuns.showLog` → `/api/factory/runs/<id>/log?n=80` →
  `factoryFetch` → upstream `runs/:id/log`, admitted by the `runs(\/|$)` allowlist entry). Base
  adds only a narrower same-origin endpoint that fixes the bounds server-side, reads the body through
  a byte-bounded reader, and checks listing membership; it changes no factory endpoint, requests no
  new factory capability, and exposes no factory credential. The byte ceiling is enforced entirely
  inside Base, so it needs nothing from the runner. Nothing about this
  slice requires a factory change, so the pass-3 stop-for-revision guard is discharged rather than
  carried forward.
- **WorkDetail destination — resolved:** all six board card kinds have internal detail routes
  (`all-kinds-work-detail.test.ts`, `issue-route.test.ts`). The truthful unavailable-detail state
  remains as a guard for kinds added later, not as an expected state today.
- **UI primitives/shell dependency — resolved:** the exports this spec imports are present on
  `main`. This spec owns only the responsive sheet presentation; no local interaction fork.
- **Existing board correctness:** repo filters, current lifecycle derivation, G0 possibly-shipped
  warnings, deploy-branch CI semantics, auto-refresh, and detail routing are adjacent shipped
  behavior. Mitigation: project existing loader records without changing their source semantics,
  read `spec-warning.ts` predicates rather than re-deriving them, and retain flag-off regression
  tests.
- **Deployment/CI alert:** Base's GitHub workflows are `factory-notify.yml` and `labeler.yml` —
  there is no CI job that runs the gates. The PR must attach full local gate and browser
  transcripts; this spec does not broaden into CI infrastructure. Vercel rejects deploys whose
  committer email is not associated with a GitHub user, so the implementer must commit with an
  associated identity or the merge will deploy nothing.

Memory shaping these decisions:

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records the ★★★ mobile HITL constraints
  (Decision→Risk→Proof→Detail→History, no board-level one-click approval, truthful evidence,
  `Availability<T>` — the UI never invents missing data, revision-safe semantics), the shipped UI
  fold that makes `/kanban?view=factory` the canonical Runs surface, the live
  `FACTORY_DISPOSAL=1` disposal controls, the flag activation of `PUBLIC_WORK_DETAIL_V2` and
  `PUBLIC_MOBILE_SHELL_V2`, and the Vercel committer-email deploy block.
- `/memory/MINION/minion-base-lifecycle-dashboard.md` anchors the board routes, repo filter,
  auto-refresh, Base-specific design governance, Svelte 5 rules, fail-closed authentication, and
  the rule that a new route needs `svelte-kit sync`.
- `/memory/MINION/minion-factory-agent-pipeline.md` anchors the runner's bearer-secret boundary,
  the weekly Saturday 21:00 promotion train behind `ATTENTION_STALE_AFTER_MS`, and the
  slice-scoped-run rule that keeps each slice implementable in one dev run.
- `/memory/MINION/overflow-hidden-kills-sticky.md` requires intrinsic-width fixes instead of root
  clipping and requires sticky behavior to be measured while scrolling.
- `/memory/MINION/piping-gates-masks-exit-code.md` requires unpiped gate transcripts; a `check |
  tail` returns tail's exit code.

## 5. Explicit out of scope

- Any approve, reject, lifecycle retry/requeue, promote, confirm-shipped, or other consequential
  action on a board/run card. Retrying the read-only bounded log request after an explicit failure
  remains in scope.
- Adding per-item GitHub fetches to the board loader to resolve detail-scope predicates. The board
  stays a single fan-out; detail-scope cells render their named not-evaluated note instead.
- UI-008 guarded decision workflows, UI-009 evidence manifest/artifacts, or UI-010 durable event
  timeline. UI-005/006/007 detail work is shipped and is not re-opened here.
- New factory log storage, a new factory public API, runner/factory authentication changes, live
  log streaming, websockets, or unbounded log downloads.
- Changes to lifecycle derivation, `spec-warning.ts` predicates, proposal/spec indexes, GitHub
  write APIs, database/schema, gateway protocol, auth policy, repo registry, deploy pipeline, or
  Base CI.
- A mobile drag-and-drop kanban, horizontal swipe as the only stage control, cross-device saved
  preferences beyond URL state, or server-side user preference storage.
- Redesigning the detail page, adding a second card action, inventing evidence/risk/action copy,
  or treating an unknown state as completed/safe.
- **Known residual, deliberately not fixed here:** `src/routes/kanban/[kind]/[...ref]/+page.server.ts`
  offers its recovery `start dev run` gate on the same "approved with no `ActiveRun` match"
  condition and keeps the fail-soft `loadActiveRuns` wrapper, so it inherits the identical
  false-positive during a Factory outage. This spec fixes the board classifier only; the detail
  gate is a one-call migration to `loadActiveRunListing` and must be filed as its own proposal
  (`proposals/`) rather than folded into these slices, per the open-items ledger rule in the root
  `AGENTS.md`. Nothing in this spec makes that residual worse — the wrapper it depends on is
  unchanged.
- Replacing desktop lanes with the mobile queue, removing existing stage menus, or altering route
  URLs. No gradients, glass, decorative status color, raw colors outside `tokens.css`, or hub/site
  token imports.

## 6. End-to-end verification

From a clean Minion Base worktree based on `main`, with all four slices present:

```bash
bun install
bunx svelte-kit sync
bun test src/lib/board
bun test src/lib/server
bun test src/lib/components/board src/lib/components/runs
bun test src/lib/components/Status.test.ts
bun test src/lib/runs
bun test 'src/routes/api/runs'
bun run check
bun run lint:design
bun run test:e2e -- tests/e2e/kanban-responsive.spec.ts tests/e2e/runs-responsive.spec.ts
```

Run each gate unpiped and capture its own exit code; a piped command reports the pipe's status, not
the gate's. Run the browser suite twice: first with both flags absent, proving the current
board/runs experience and the shipped `tests/e2e/` specs are unchanged; then with
`PUBLIC_ATTENTION_QUEUE_V2=1` and `PUBLIC_RESPONSIVE_RUNS_V2=1`.

The flagged E2E scenario must begin at a copied `/kanban` URL at 320px, verify that attention mode
is the default, verify every group's summary count — including `open`, the explained-empty
`completed`, and `unclassified` — and exclusive assignment, filter to an empty result and recover,
enter focused-stage mode, visit all five stages through visible controls, confirm "N of 5," return
to attention mode, apply/cancel/reset filters, reload, and use back/forward. It must open a
resolvable card's internal detail route, verify that a detail-scope predicate renders its named
not-evaluated note rather than a false negative, and prove no mutation request originated on the
board. Repeat layout checks at 390 and 430px; at each width assert
`document.documentElement.scrollWidth <= document.documentElement.clientWidth` and measure sticky
heading rectangles before and after scroll.

At 768, 1280, and 1920px, verify all desktop lanes, sticky headings, accessible empty-lane
collapse, stage menus, repo filtering, links, and refresh behavior. Then open
`/kanban?view=factory` at 320px, verify state/stage/elapsed/work-item links, assert zero log
requests, expand one run, assert exactly one bounded request and escaped text, close/reopen without
another request, and exercise a failed request followed by explicit retry. Confirm another run
remains independent. Recheck `/kanban?view=factory` at 390, 430, 768, 1280, and 1920px with no
clipped or page-overflowing content.

Attach viewport screenshots, axe results with no serious or critical violations, request-count
evidence, sticky-position measurements, and the unpiped command transcripts to the PR. Any missing
log authorization, dependency mismatch, invented evidence, card mutation, inaccessible stage, or
horizontal overflow is a release blocker. So is any of the three round-1 regressions: a
`decision_required` classification produced while the active-run listing is unavailable, a log read
that reaches `factoryFetch` instead of the byte-bounded reader, and a Factory run state rendering
as “Unknown status”. Include a fault-injected pass with `FACTORY_URL` unset, proving the board
still renders, the outage notice is visible, and no approved item is presented as needing a
decision.
