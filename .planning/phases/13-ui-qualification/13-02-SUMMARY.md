---
phase: 13-ui-qualification
plan: "02"
subsystem: ui
tags: [svelte, mobile, calendar, playwright, composition]
requires: ["13-01"]
provides: [mobile-composition-fixture, home-mobile-spec, calendar-mobile-spec]
affects: [13-ui-qualification]
tech-stack:
  added: []
  patterns: [isolated-route-fixture, minimum-lane-width-scroll-region]
key-files:
  created:
    - minion_hub/tests/e2e/ui-audit/home-mobile.spec.ts
    - minion_hub/tests/e2e/ui-audit/calendar-mobile.spec.ts
    - minion_hub/tests/e2e/ui-audit/mobile-fixture.ts
    - minion_hub/tests/fixtures/mobile-composition/
    - proposals/2026-09-10-hub-calendar-utc-offset-dropped.md
  modified:
    - minion_hub/src/routes/(app)/home/+page.svelte
    - minion_hub/src/routes/(app)/scheduling/calendar/+page.svelte
    - minion_hub/src/lib/routes/wave-d-composition.test.ts
requirements-completed: []
requirements-source-verified: [UI-04, UI-03]
status: partial
---

# Phase 13 plan 02 — mobile Home and Calendar composition repaired and qualified

Both QC-2026-09-08 mobile defects were reproduced first, repaired with token-conformant CSS in the two owned
route files, and pinned by two new Playwright specs that are red on `origin/master` source and green after.
UI-04 is **not** closed: the repair is source-and-fixture evidence on one browser, and a separate correctness
defect found during the work means "appointments keep correct time" cannot be asserted true today.

## Candidate identity

| Item | Value |
|---|---|
| Base | `minion_hub` `origin/master` `1df0a9216ad3f7f85d989eb59cfccb779d9f7285` (contains #244 and #245) |
| Snapshot | private detached worktree `~/.cache/claude-tmp/hub-13-02`, branch `feat/ui-mobile-home-calendar` |
| Live checkout | `minion_hub/` on `feat/level-2026-07-30` — read only, never written |

| File | SHA-256 |
|---|---|
| `src/routes/(app)/home/+page.svelte` | `19e303a93c2a3b93752ae291025a1fcfb4717783a0f0a52f8713b937850012e5` |
| `src/routes/(app)/scheduling/calendar/+page.svelte` | `9c50bc04b5f34e2a90443fcd921ca518ba79478fb9495366da35c82039ae3909` |
| `src/lib/routes/wave-d-composition.test.ts` | `99433b007467920475712b7021ce35f6042b223d424f838e4eaf2349b61be192` |
| `tests/e2e/ui-audit/home-mobile.spec.ts` | `c9a80685faaf5070d09d73238238a3283270654fb2ea46062548a4fc0337e929` |
| `tests/e2e/ui-audit/calendar-mobile.spec.ts` | `9245a7c1157c1ef1d7f3cf5597e20dcdab8798a6891e26ca289c126be0828a8f` |
| `tests/e2e/ui-audit/mobile-fixture.ts` | `6353903620252e340d99bbf42cc3c5e8ef886c03f5ec5df0ce3ba5bf03c70650` |
| `tests/fixtures/mobile-composition/build.mjs` | `b84cdfd7248155486d7b3dbb01f724752d7c4705d5a5aea087d55010bbaa0e9c` |
| `tests/fixtures/mobile-composition/seed.ts` | `f083f1b43bff6093556bab06f1f52860465f179b6d4406488211a5a12802f874` |
| `tests/fixtures/mobile-composition/Shell.svelte` | `dc273930729cfbe4cb56cdc03aa4cd61e13e906424b2acc58f8a87c02cf374e8` |
| `tests/fixtures/mobile-composition/CalendarFixture.svelte` | `4195ada0d5e8bbea1d679059e4e1e3713962aa5ae670d2ce2de931f80628981f` |
| `tests/fixtures/mobile-composition/HomeFixture.svelte` | `f541c06c09bce4c475bf6e4a2146fa8583e8fd43baca75f3e815628f8499b24f` |

## Where the PLAN's file list no longer matches the tree

The plan was written before hub PR #244 landed.

| PLAN entry | Current reality |
|---|---|
| `tests/e2e/ui-audit/fixtures.ts`, `personas.ts` — "this plan owns fixture creation" | Both already exist on `origin/master` with the seeded `route-audit` harness (`scripts/ui-audit-seed.ts`, `bun run audit:ui:seed`, `tests/e2e/ui-audit/README.md`). **Not modified.** They need a disposable local Supabase stack, which could not be provisioned here (see Deviations). |
| `scheduling/calendar/+page.svelte` as the place holding the multi-staff grid | Now an 82-line shell over `CalendarToolbar` + `SchedulingCalendar` (`@event-calendar/core`, PR #244). The composition floor was added at the route; the library view component was **not** touched. |
| read-first `MemberCalendarStrip.svelte` | Still exists but is no longer on the calendar page's path; the day view's staff lanes are `@event-calendar/core` resource columns. Read for context only. |
| `my-agent/NotesPanel.svelte` | **Not modified** — the Home clipping root cause was the dock's positioning in `home/+page.svelte`, not the panel. |
| not in the plan | `src/lib/routes/wave-d-composition.test.ts` had to change: it pinned the old `@media (max-width: 768px) … .notes-dock { position: absolute; }` shape that the repair replaces. |
| not in the plan | `tests/e2e/ui-audit/mobile-fixture.ts` and `tests/fixtures/mobile-composition/` are new (see Deviations). |

## What was wrong, and what changed

### Home (`src/routes/(app)/home/+page.svelte`)

Before, at 390x844: `.column` spanned `0..390` while the permanently visible collapsed notes rail sat at
`344..390`, so `.composer-call` ended at `x=366` — 22px under the rail (matches
`.lavish/minion-qc-2026-09-08/hub-home-mobile.png`). `New chat` rendered `18x28` with its icon hidden,
because `@container agentcol (max-width: 460px) { :global(.new-chat span) { display: none } }` also matched
`Button`'s single wrapper span — a present, focusable, invisible control. The chat-history trigger was
`32x32`.

Changes: the compact drawer rule now applies to `.notes-dock:not(.collapsed)` only, so the collapsed rail is
a real flex item again; the label rule targets `:global(.new-chat > span > span)`; a
`@media (max-width: 768px), (pointer: coarse)` block gives `.chat-header-actions` buttons a
`var(--control-height-touch, 44px)` floor; `.inner` uses `--space-4` gutters on compact.

After: `.column` `0..344`, composer `24..320`, every header/composer control ≥ 40px and clear of the rail at
360/390/768. Desktop 1440 unchanged — dock `position: static`, `column.right === dock.left`.

### Calendar (`src/routes/(app)/scheduling/calendar/+page.svelte`)

Before, at 390x844: six resource columns at `47px` with wrapped staff names and `41px` chips (matches
`hub-calendar-mobile.png`), and `PageBody scroll="none"` clipped a `1454px` day grid inside a `663px`
region — the schedule had **no** scroll in either axis, so nothing past ~11:45 was reachable.

Changes: `PageBody` is `scroll="region"`, and the calendar is wrapped in `.cal-lanes` carrying
`--cal-lanes: {laneCount}` (selected staff in `day`, 7 in `week`, 0 in `month`/`agenda`) with
`min-width: calc(var(--cal-time-gutter) + var(--cal-lanes) * var(--cal-lane-min))`, `--cal-lane-min: 7.5rem`.

After (measured): 360/390/768 → 6 lanes at `120px`, chips `114px`, region `scrollWidth 832` vs
`clientWidth 360/390/768`, document `scrollWidth === clientWidth`; vertical scroll restored
(`scrollHeight 1454 > clientHeight`). `?staff=r1` → 1 lane, no sideways scroll. `month`/`agenda` → container
width kept. 1440 → lanes `222px`, floor inert, no overflow.

## Commands and results (exit codes captured directly, never through a pipe)

| Command | Result |
|---|---|
| `bunx svelte-kit sync` | exit 0 (required before the fixture build) |
| `node tests/fixtures/mobile-composition/build.mjs` | exit 0 |
| `E2E_MOBILE_FIXTURE_URL=… E2E_BASE_URL=… bunx playwright test tests/e2e/ui-audit/{home,calendar}-mobile.spec.ts` | **13 passed**, exit 0 |
| same specs against reverted (`origin/master`) source | **12 failed / 1 passed**, exit 1 — red evidence |
| `bun run check` | 10784 files, **0 errors, 0 warnings**, exit 0 |
| `DESIGN_LINT_BASE_REF=origin/master bun run lint:design` | exit 0 — "no changed file increased governed debt" |
| `bun run lint:tokens` | **0 violations**, exit 0 |
| `bunx vitest run src/lib/routes/ src/server/ui-audit/` | 14 files, **120 passed**, exit 0 |
| `bunx prettier --plugin=prettier-plugin-svelte --check <changed files>` | clean, exit 0 |

Playwright browsers were already installed (`~/.cache/ms-playwright/chromium-1234`); `bunx playwright install`
was **not** needed or run. No route file was added or removed, so `tests/ui-audit/current-baseline.json` is
unchanged and was not re-pinned. `bun run test` was never run (it reaches the production DB with `.env`
present).

### Red detail

The red run reverted only the two route files, rebuilt the same fixture, and reran. Home failed all three
compact widths plus the keyboard case; the desktop-control test passed in both states, as designed. Calendar
failed at 360/390/768 on `expect(bodyScrollWidth).toBeGreaterThan(bodyClientWidth)` — the lanes were being
compressed instead of held. The calendar's four control cases (`month`, `agenda`, single-staff, desktop)
passed in both states and are controls, not defect proof.

## Evidence artifacts

Local and ephemeral, under `~/.cache/claude-tmp/13-02-evidence/`:

| File | Shows |
|---|---|
| `home-390-before.png` | call control cut by the rail; header actions invisible |
| `home-390-after.png` | composer row inside the column; two 44px header controls |
| `home-1440-after.png` | desktop composition unchanged |
| `calendar-390-before.png` | six 47px columns, wrapped names, clipped grid |
| `calendar-390-after.png` | 120px lanes with a horizontal scrollbar |
| `calendar-390-after-staff-filtered.png` | one lane, no sideways scroll |
| `calendar-1440-after.png` | desktop unchanged |

Raw gate logs: `~/.cache/claude-tmp/13-02-{green,red,red2,check,design,tokens,routes}.log`.

## Deviations from the PLAN

1. **New fixture instead of the seeded harness.** The plan's Task 1 asks this plan to create/qualify
   `fixtures.ts`/`personas.ts` mounting actual routes with synthetic authenticated users. Those files already
   exist and belong to the seeded `route-audit` harness, which requires a **disposable local Supabase stack
   with every hub migration applied**. That stack could not be provisioned: `docker` is present but the
   socket is root-owned (`permission denied on /var/run/docker.sock`), the `supabase` CLI is not installed,
   and nothing is listening on 54321/54322. Pointing anything at the production project was refused outright.
   Instead, following the 13-01 precedent (`tests/fixtures/overlay-native/`), a new isolated fixture
   production-bundles the **actual** Home and Calendar route components with the (app) shell's height/scroll
   chain, synthetic data and `$app/*`/`$env/*` stubs. `fixtures.ts` and `personas.ts` are untouched, so 13-03
   inherits them exactly as shipped.
2. **`wave-d-composition.test.ts` edited** (outside the plan's `files_modified`): it asserted the exact CSS
   shape this repair replaces. The assertion now pins the corrected contract.
3. **`NotesPanel.svelte` untouched** — the defect was not there.
4. `conn.connected` is set synthetically in the Home fixture so the call/history controls render enabled and
   can be tab-reached. No socket is opened.

## Evidence limits

- The fixture omits the authenticated app shell (sidebar, topbar, module nav) and real tenant data; it
  qualifies these two page compositions, not whole-app mobile compatibility.
- Chromium only, one host, one theme (`data-theme="dark"`). WebKit/Firefox, coarse-pointer emulation across
  engines, real devices and assistive technology remain 13-03/13-04 scope.
- No authenticated route was loaded; no production data was read or written; no dev server ran against the
  production database.
- The Home feed/chat render their offline states, so feed cards and chat turns are not part of the measured
  composition.

## Open items

1. **Blocking for UI-04's "appointments keep correct time".** Bookings are drawn at their UTC wall-clock:
   `load-calendar-events.ts` emits `toISOString()` ("…Z") and `@event-calendar/core`'s `parseOffset` only
   accepts a trailing `±HH:MM`, so an 08:00 Lima booking lands on the 13:00 row while its chip label still
   reads 08:00. Measured: `inset-block-start: 576px` of a 1344px 07:00–21:00 grid.
   `TODO(handoff)` at `src/routes/(app)/scheduling/calendar/+page.svelte`; proposal
   `proposals/2026-09-10-hub-calendar-utc-offset-dropped.md`. Both candidate fix sites are outside this
   plan's ownership.
2. The composer's language toggle (`CallControls.svelte`) has no accessible name — `aria-label` is null,
   `title` empty, text "A". Not an owned file; belongs with 13-04's accessibility scope.
3. The day grid's time gutter scrolls away horizontally with the lanes. Each chip carries its own `hh:mm`, so
   time is never lost, but a sticky gutter would be better; it needs a library-level hook
   (`calendar/ec-skin.css`, shared with `TimeOffCalendar`), which is not owned here.
4. The seeded `route-audit` harness still has no runnable disposable backend on this host, so UI-05 and the
   authenticated release matrix stay entirely with 13-03.

## Next gated plan

13-03 (`UI-05`, `UI-01`, `UI-03`) — seeded cross-browser journey release gates. It should expand the shipped
`fixtures.ts`/`personas.ts` on a disposable Supabase stack and may reuse `tests/fixtures/mobile-composition`
for composition regressions that do not need auth.
