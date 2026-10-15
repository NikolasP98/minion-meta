---

description: "Task list for feature implementation"
---

# Tasks: Hub assistant JEV turn router — follow-up defects

**Input**: Design documents from `specs/007-jev-router-followups/` (spec.md, plan.md,
research.md, data-model.md, contracts/assistant-route.md, quickstart.md)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md —
all present (see Phase 0/1 outputs).

**Tests**: Included — the feature's own FR-008/FR-009 and most Success Criteria (SC-001–SC-007)
are test assertions, so tests are not optional here, they are most of the deliverable.

**Organization**: Tasks are grouped by user story (US1–US5, spec.md). All file paths are
relative to the `minion_hub` repository root (a sibling repo to this meta-repo — see plan.md
"Project Structure"), checked out fresh at `origin/master` (post hub #540) in its own isolated
worktree per Constitution Principle III.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Setup/Foundational/Polish tasks carry no story label

---

## Phase 1: Setup

- [ ] T001 Check out a fresh `minion_hub` worktree at `origin/master` (post hub #540,
      `7d917ed06`) per `AGENTS.md`'s Project Map (`pnpm`→ no, `bun install` for this repo); do
      not reuse another agent's worktree (Constitution III).
- [ ] T002 [P] Run `bunx svelte-kit sync && bun run i18n:compile` in the worktree — prerequisite
      the audit names for the envelope-size test suites (`assistant-context.test.ts`) to resolve
      `$lib/paraglide/runtime` in a fresh checkout.

---

## Phase 2: Foundational

None required as a blocking phase — the five remaining defects (D3, D5, D7, D8, D9, D10) touch
mostly independent files/sections and are each sized as their own PR (US1–US5). The one real
cross-story dependency is US1's live-verification task on US3's probe harness; it is called out
in **Dependencies & Execution Order** below rather than forced into a blocking phase, since US1
can still be *implemented* (the question reworded, unit-guarded) before US3 exists — only its
final live-measured verification step waits.

**Checkpoint**: No foundational blocker — user story work can begin immediately.

---

## Phase 3: User Story 1 - brain question rewording (Priority: P1) 🎯 MVP

**Goal**: The `brain` noul question names the mechanism it tests (semantic search over past
chat/documents) instead of a wording true of almost any business question.

**Independent Test**: Reword the question, run the committed probe set (US3), confirm the
true/false score ranges for `brain` now show improved separation over the audit's 0.57–0.92 /
0.08–0.85 baseline (spec.md SC-001).

- [ ] T003 [US1] Reword the `brain` entry's `question` field in `CONTEXT_MANIFESTS`
      (`src/lib/assistant/turn-router.ts`, ~lines 106-115) to: "Does this request require
      semantic search over past chat messages and documents, as opposed to a direct database
      lookup?" (research.md D3). Update the adjacent threshold comment to note the old
      measured baseline (0.57–0.92 true / 0.08–0.85 false, no separating threshold) and that
      it is pending re-probe.
- [ ] T004 [P] [US1] Add a regression-guard case to `src/lib/assistant/turn-router.test.ts`
      asserting `MANIFEST_QUESTIONS.brain` equals the new wording verbatim, so a future edit
      to this string is a visible, reviewed diff rather than a silent revert.
- [ ] T005 [US1] (depends on T015/T016, Phase 5 — US3's probe harness) Run
      `LIVE_LLM=1 bun run vitest run src/lib/assistant/jev-probe-set.live.test.ts`; record the
      measured true/false score ranges for `brain` in the threshold comment from T003. Adjust
      the `0.5` threshold only if the probe data supports a specific different number
      (FR-002) — do not move it speculatively.

**Checkpoint**: US1's code change (T003, T004) is complete and independently reviewable without
T005; T005 is the measured proof and can land in the same PR once US3 exists, or as a fast
follow once it does.

---

## Phase 4: User Story 2 - follow-up turns carry prior mode (Priority: P2)

**Goal**: A short follow-up ("sí", "viernes 3pm", "12") is classified with the prior turn's
mode in the classifier's `state`, not in isolation.

**Independent Test**: Call `buildState(text, locale, priorMode)` directly and confirm the
rendered string carries the `prior_mode` line; confirm the no-`priorMode` call renders
identically to today (spec.md SC-002, FR-004).

- [ ] T006 [P] [US2] Add an optional `priorMode?: RouteMode` third parameter to `buildState()`
      in `src/server/services/assistant-router.service.ts` (~lines 45-47); when present, insert
      one additional line `prior_mode: ${priorMode}` into the returned `state` string, between
      `ui_locale` and the blank line before `REQUEST:` (data-model.md). When absent, output is
      byte-identical to today.
- [ ] T007 [US2] Thread `priorMode` into `classifyAssistantTurn`'s `input` parameter type and
      its call to `buildState(...)` in the same file (depends on T006).
- [ ] T008 [P] [US2] Add an optional third parameter `priorMode?: RouteMode` to
      `requestRouteDecision(text, locale, priorMode?)` in `src/lib/assistant/turn-router.ts`
      (~lines 189-208); include it in the POST body as `{text, locale, priorMode}` only when
      defined (contracts/assistant-route.md).
- [ ] T009 [US2] Update `POST /api/assistant/route` (`src/routes/api/assistant/route/+server.ts`)
      to read an optional `priorMode` field from the request body (same validation style as the
      existing `text`/`locale` fields) and pass it through to `classifyAssistantTurn` (depends
      on T007, T008).
- [ ] T010 [P] [US2] In `src/lib/components/layout/FloatingAssistant.svelte`, pass the
      component's existing `lastMode` state (already tracked at line 217, never sent) as the
      third argument to `requestRouteDecision` at its call site (~line 236) (depends on T008).
- [ ] T011 [P] [US2] In `src/routes/(app)/home/+page.svelte`, add a `lastMode =
      $state<RouteMode | null>(null)` variable (mirroring `FloatingAssistant.svelte`), set it
      after each classification the way `FloatingAssistant.svelte` does at line 237, and pass
      it as the third argument to `requestRouteDecision` at its call site (~line 667) (depends
      on T008).
- [ ] T012 [US2] Add two cases to
      `src/server/services/assistant-router.service.test.ts`: (a) `buildState(text, locale,
      'record_action')` contains a `prior_mode: record_action` line; (b) `buildState(text,
      locale)` (no third argument) renders identically to the pre-existing expected output
      (FR-004 — no-history path unchanged) (depends on T006).
- [ ] T013 [US2] (depends on T006–T011 and Phase 5's probe harness) Optional live check: run
      `LIVE_LLM=1 bun run vitest run src/lib/assistant/jev-probe-set.live.test.ts` and confirm
      the probe rows `fu-yes`, `fu-value`, `fu-qty` (run with their preceding turn's mode
      supplied) no longer report core-only (spec.md SC-002).

**Checkpoint**: User Stories 1 AND 2 both work independently of each other; US2's live check
(T013) shares US3's harness the same way US1's T005 does.

---

## Phase 5: User Story 3 - committed probe-set test (Priority: P3)

**Goal**: The audit's 46-turn live probe set exists in the repository as an opt-in test,
runnable on demand, reporting per-manifest threshold separation.

**Independent Test**: Run the test on demand; it reports pass/fail per manifest with measured
score ranges, readable without opening the audit markdown (spec.md SC-006).

- [ ] T014 [US3] Create `src/lib/assistant/jev-probe-fixtures.ts` exporting `PROBE_CASES:
      readonly ProbeCase[]` (data-model.md shape: `{id, locale, request, needed}`) — the 46 rows
      transcribed verbatim from `audits/2026-10-15-agent-harness/B-jev-router.md`'s probe table
      (`id`, `loc`, `request`, `needed` columns; `mode`/`loaded`/`verdict` columns are the
      audit's own measurement, not part of the fixture).
- [ ] T015 [US3] Create `src/lib/assistant/jev-probe-set.live.test.ts` following
      `prompt-contract.live.test.ts`'s exact gating shape: `const LIVE = process.env.LIVE_LLM
      === '1'` and `describe.skipIf(!LIVE)(...)` (matched by vitest's default glob, runtime-
      skipped otherwise — research.md D10). For each `PROBE_CASES` row: call
      `classifyAssistantTurn` live, then `gateManifests`, collect the five manifest
      probabilities, and bucket them by whether that manifest is in `needed`. After all cases
      run, report per-manifest min/max score for the needed-bucket and the not-needed-bucket
      and whether `MANIFEST_THRESHOLDS[id]` currently falls strictly between them (depends on
      T014).
- [ ] T016 [P] [US3] Add a header comment to `jev-probe-set.live.test.ts` with the exact
      on-demand command (`LIVE_LLM=1 bun run vitest run
      src/lib/assistant/jev-probe-set.live.test.ts`), mirroring `quickstart.md`, so a future
      reader does not need this spec to run it (depends on T015).

**Checkpoint**: All of US1–US3 independently functional; US1's T005 and US2's T013 can now run
against this harness.

---

## Phase 6: User Story 4 - `hub.pages` flags weak-only matches (Priority: P4)

**Goal**: The `hub.pages` recovery tool marks a weak/keyword-only ("module does not exist")
match distinctly from a genuine strong match.

**Independent Test**: Call `hub.pages` with "planilla de sueldos" and confirm the `/team` hit
carries `moduleMissing: true`; call it with a strong-matching query and confirm `moduleMissing:
false` (spec.md SC-003).

- [ ] T017 [US4] In `src/lib/assistant/site-map.ts`, expose the per-page weak/strong distinction
      `rankPages()` already computes internally (the `weak` local at ~lines 160-168) on its
      return value — e.g. add a `weak: boolean` field to `rankPages`'s result objects — without
      changing `searchPages()`'s existing return shape (`SitePage[]`) for its other callers.
- [ ] T018 [US4] In `src/lib/assistant/global-tools.ts`, update the `hub.pages` tool's
      `execute()` (~lines 70-94) to call the updated `rankPages()` (T017) instead of
      `searchPages()`, and add `moduleMissing: boolean` to each returned hit: `true` when that
      page's matched tokens were *only* weak hits (data-model.md — mirrors the condition
      `describePages()` already uses at `site-map.ts:220-226`).
- [ ] T019 [P] [US4] Add two cases near the existing `global-tools` tests (or a new
      `src/lib/assistant/global-tools.test.ts` if none exists yet): `hub.pages({query:
      "planilla de sueldos"})` returns a `/team` hit with `moduleMissing: true`; `hub.pages({
      query: "inventario"})` returns a hit with `moduleMissing: false` (depends on T017, T018).

**Checkpoint**: US1–US4 independently functional.

---

## Phase 7: User Story 5 - rate limit + un-nested timeout (Priority: P5)

**Goal**: `/api/assistant/route` throttles per authenticated user and fails open; the server's
own classifier timeout is strictly smaller than the client's round-trip timeout.

**Independent Test**: Exceed the limit from one user and confirm later calls return
`{decision: null}` at HTTP 200 without invoking the classifier; diff the two `TIMEOUT_MS`
constants and confirm `1200 < 1500` (spec.md SC-004, SC-005).

- [ ] T020 [US5] In `src/routes/api/assistant/route/+server.ts`'s `POST` handler, call
      `checkRateLimit(`assistant-route:${locals.user.id}`, 20, 60_000)` (reusing
      `src/server/auth/rate-limit.ts` unchanged) before the `classifyAssistantTurn` call; on
      `false`, skip the classifier call and return `json({decision: null})`, keeping the
      existing `captureServerEvent` call with its current `decision?.mode ?? 'unavailable'` /
      `?? 0` fallbacks unchanged (contracts/assistant-route.md).
- [ ] T021 [P] [US5] In `src/server/services/assistant-router.service.ts`, change the
      `TIMEOUT_MS` constant from `1500` to `1200` (line ~28) and correct the adjacent comment
      ("Matches the client's AbortSignal budget") to state the new, intentionally smaller
      relationship.
- [ ] T022 [US5] Add two cases to the route's server test (e.g.
      `src/routes/api/assistant/route/server.test.ts`): 21 calls within the window for the same
      user id — the 21st returns `{decision: null}` and the classifier mock is NOT invoked for
      it; a separate case confirms 20 calls in the window all proceed normally (no
      false-positive throttling at the boundary) (depends on T020).
- [ ] T023 [P] [US5] Add a small assertion (in `turn-router.test.ts` or
      `assistant-router.service.test.ts`) that imports both `TIMEOUT_MS` constants (or re-reads
      them via an exported getter if not already exported) and asserts the server's value is
      strictly less than the client's — a diffable regression guard for SC-005 (depends on
      T021).

**Checkpoint**: All five remaining defects (US1–US5) independently functional and tested.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T024 Run the full regression from `quickstart.md`'s "Full regression" section: `bun run
      vitest run src/lib/assistant src/lib/state/features
      src/server/services/assistant-router.service.test.ts src/routes/api/assistant`; `bunx
      prettier --plugin=prettier-plugin-svelte --check <changed files>`; `NODE_OPTIONS=
      --max-old-space-size=6144 bunx svelte-check --threshold error --output machine | grep
      ERROR | cut -d'"' -f2 | sort -u`; `DESIGN_LINT_BASE_REF=origin/master node
      scripts/design-lint.mjs`. Confirm no new errors beyond hub #540's known 7 pre-existing
      ones (none in files this feature touches).
- [ ] T025 [P] Update `proposals/2026-10-12-hub-assistant-jev-context-router.md` (in this
      meta-repo, not `minion_hub`) — mark open ends 1 (partially, re: `brain`), 4 (context),
      7, 8 with their resolved/updated status per `AGENTS.md`'s open-items ledger requirement,
      naming which of T003–T023 closed each one.
- [ ] T026 [P] Add a one-line status update to
      `audits/2026-10-15-agent-harness/B-jev-router.md`'s "Known open ends" table (or a sidecar
      note) pointing at this feature's spec, so a future reader lands on the resolution instead
      of the open question — does not re-run the audit's probes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: None — see note above.
- **User Stories (Phase 3–7)**: Each can start immediately after Setup. Priority order is
  P1→P5, but only one real cross-story dependency exists (below) — the rest are independent.
- **Polish (Phase 8)**: Depends on all five user stories being complete.

### The one real cross-story dependency

- **US1's T005** and **US2's T013** (both live-verification steps) depend on **US3's T015/T016**
  (the probe harness) existing. If executing strictly in priority order (P1 before P3), T003/
  T004 (US1's code change) and T006–T012 (US2's code change) can still land first — only the
  live-measured verification steps wait. If a single PR per story is required before the next
  starts, implement US3 before closing out US1/US2's PRs, or land US1/US2's code+unit-test
  portions first and their live-verification as a fast-follow once US3 merges.

### Within Each User Story

- US1: T003 → T004 (parallel-safe once T003 lands) → T005 (external dependency on US3).
- US2: T006 → T007 (same file); T008 independent of T006/T007 (different file) but T009 needs
  both T007 and T008; T010/T011 need T008; T012 needs T006; T013 needs T006–T011 and US3.
- US3: T014 → T015 → T016.
- US4: T017 → T018 → T019.
- US5: T020 and T021 are independent (different files); T022 needs T020; T023 needs T021.

### Parallel Opportunities

- T001/T002 (Setup) are sequential-safe but T002 can start as soon as T001's checkout exists.
- Across stories: US1 (T003-T004), US4 (T017-T018), and US5's T021 touch files no other story
  touches concurrently — these three stories' non-test tasks can be worked in parallel by
  different people/agents. US2 and US3 share no files with each other either.
- Within US2: T006, T008 in parallel (different files); T010, T011 in parallel (different
  files, both depend on T008).
- Within US5: T020, T021 in parallel (different files).

---

## Parallel Example: User Story 2

```bash
# T006 and T008 touch different files — parallel-safe:
Task: "Add priorMode param to buildState() in src/server/services/assistant-router.service.ts"
Task: "Add priorMode param to requestRouteDecision() in src/lib/assistant/turn-router.ts"

# Once T008 lands, T010 and T011 touch different Svelte files — parallel-safe:
Task: "Send lastMode as priorMode in FloatingAssistant.svelte"
Task: "Add lastMode state + send as priorMode in (app)/home/+page.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1's code change (T003, T004) — ship as its own PR; T005 (live
   verification) can follow once US3 exists, or be bundled if US3 is done first.
3. **STOP and VALIDATE**: confirm T004's regression guard passes and the question text matches
   research.md D3 exactly.

### Incremental Delivery (recommended order, given the one real dependency)

1. Setup.
2. US3 (Phase 5) — ships the probe harness first, since US1 and US2 both want it for their own
   verification step; this reorders *execution* without reordering *priority* (US1 is still the
   MVP by importance, US3 merely unblocks proving it).
3. US1 (Phase 3) — code change + T005 verification against the now-existing harness.
4. US2 (Phase 4) — code change + T013 verification.
5. US4 (Phase 6), US5 (Phase 7) — fully independent, any order, any time after Setup.
6. Polish (Phase 8).

### Independent/parallel-team strategy

With multiple agents: US1, US3, US4, and US5's non-test tasks can start in parallel immediately
after Setup (no shared files). US2 can also start in parallel but its live-verification task
(T013) and US1's (T005) both wait on US3's T015/T016 landing first.
