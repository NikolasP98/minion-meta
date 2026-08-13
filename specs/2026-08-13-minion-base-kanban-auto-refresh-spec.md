---
id: 2026-08-13-minion-base-kanban-auto-refresh-spec
title: "minion-base /kanban — visible-tab auto-refresh + live refreshed-ago label"
stage: spec
status: draft
pass: 1
created: 2026-08-13
updated: 2026-08-13
proposal: 2026-08-13-minion-base-kanban-auto-refresh
verdict: pending
repos: [minion-base]
type: feature
---

# minion-base /kanban — visible-tab auto-refresh + live refreshed-ago label

**Owner surface:** `minion-base` (`NikolasP98/minion-base`, private, `main` → Vercel → base.minion-ai.org) —
the `/kanban` route only
**Design ancestor:** [`specs/2026-08-12-minion-base-v2-sdlc-kanban-spec.md`](2026-08-12-minion-base-v2-sdlc-kanban-spec.md)
(§1 Architecture, §2 Design governance, §4 Gates — the board this spec makes live)
**Context:** [`specs/2026-08-12-minion-base-lifecycle-dashboard.md`](2026-08-12-minion-base-lifecycle-dashboard.md)
(v1 — the GitHub fan-out and the basic-auth gate this inherits)

---

## 0. Product

From the approved proposal `2026-08-13-minion-base-kanban-auto-refresh`, verbatim:

> ## Problem
>
> In the user's words:
>
> > "the kanban board only refreshes on page load. I want it to auto-refresh its data every
> > 5 minutes while the tab is visible (pause when hidden), and show the refreshed-ago time
> > updating live."
>
> The /kanban board derives entirely from live GitHub state (open issues, PRs, workflow runs
> — see `specs/2026-08-12-minion-base-v2-sdlc-kanban-spec.md` §1 "Kanban derivation"), but
> that fan-out only happens in the server `load` on navigation. A board left open on a second
> monitor silently goes stale, and there is no indication of *how* stale it is.
>
> ## Definition of done
>
> - Board data re-fetches on a 5-minute interval **only** while the document is visible;
>   hiding the tab stops the interval, and returning to it resumes refreshing.
> - The board header shows a live relative refreshed time that updates on screen without a
>   refetch (it visibly ages while you watch).
> - Timers are cleared on component destroy — no leaks, no fetches after leaving the board.
> - `bun run lint:design` passes with design debt unchanged (0).
> - `bunx svelte-check` passes clean.

The proposal is small and its requirements are unambiguous. What it defers to this stage is
one real design question, which §2 settles:

> the kanban server `load` sets `s-maxage=300`, so a 5-minute client interval sitting on a
> 5-minute CDN cache can land on a cached response and appear to refresh without new data.
> The spec should decide how to handle this — cache-bust the refetch, shorten `s-maxage`, or
> accept it — and the "last refreshed" timestamp should reflect when the data was actually
> produced, not just when the request returned.

## 1. Assumptions and what must be verified first

**This spec was written from the meta-repo, where `minion-base` is not checked out.** The
meta-repo `.gitignore` excludes every subproject, and `minion-base` is not even in AGENTS.md's
Project Map (see §5, note N1). Every file path and header value below is carried over from
`2026-08-12-minion-base-v2-sdlc-kanban-spec.md` and
`2026-08-12-minion-base-lifecycle-dashboard.md`, and was true when those were written.
**Treat them as strong leads, not verified fact.**

Slice 0 (§3, ≤ 30 min, not counted as a slice) turns them into fact. If a path moved, fix it
in this spec's §4 table in the same commit — do not silently implement against a different file.

Three carried-over claims are load-bearing:

1. The kanban server `load` is a `+page.server.ts` that calls `setHeaders({ 'cache-control':
   … 's-maxage=300' … })`. **If the fan-out has since moved to a universal `+page.ts` or an
   API route, S1's header edit moves with it and S2's invalidation target changes** (see A2).
2. The board header (repo filter chips) is a component the label can be added to without
   touching column rendering.
3. minion-base has **no test runner configured** (the v2 spec's gates are `lint:design` →
   `svelte-check` → `build`). This spec therefore uses **`bun test`** — Bun's built-in runner,
   zero new dependencies — for pure-function DoDs, and a browser probe for wiring. If a
   runner is already configured, use it instead and note the substitution in the PR.

## 2. Design decisions this spec settles

### D1 — Freshness is server-stamped, not request-stamped

The server `load` returns `fetchedAt: number` (epoch ms), stamped **after** the GitHub fan-out
resolves, alongside the existing board payload. The header label renders the age of
`data.fetchedAt` — never the time the client's request returned.

This is what makes the cache question non-load-bearing for *honesty*: if a refetch lands on a
cached response, `fetchedAt` does not advance and the label keeps aging. The board can be
stale, but it can never *claim* to be fresh. That is the property the proposal asked for.

### D2 — Shorten `s-maxage` to 60; do **not** cache-bust per client

Of the three options the proposal lists, shorten wins:

- **Cache-bust the refetch** — rejected. SvelteKit's `invalidate`/`invalidateAll` cannot add a
  query param to the `__data.json` request; forcing one means `goto('?_r=…')`, which puts junk
  in the URL (the v2 spec deliberately keeps the board URL-state-free) and, worse, defeats the
  shared cache that coalesces concurrent viewers — the one thing protecting the GitHub rate
  limit when two boards are open (see A1).
- **Accept it** — rejected. A 5-minute client interval on a 5-minute shared cache means
  effective staleness of up to ~10 minutes with a phase offset nobody can see. D1 makes that
  honest, but it does not make it work.
- **Shorten `s-maxage`** — taken. Target header on the kanban load:

  ```
  cache-control: max-age=0, s-maxage=60
  ```

  `max-age=0` is explicit because a response carrying only `s-maxage` gives the *browser* no
  freshness directive and invites heuristic caching of `__data.json`. Drop
  `stale-while-revalidate` on this route, or cap it at 60 — SWR lets the CDN serve a stale
  body and revalidate behind it, and with a 5-minute client interval the "next request that
  gets the fresh copy" is 5 minutes away, which reintroduces exactly the problem being fixed.

  60 s still absorbs rapid navigation and still coalesces concurrent viewers within the same
  minute. A 300 s client interval against a 60 s shared cache means a refetch can return data
  at most ~60 s older than origin-fresh.

**This contradicts `2026-08-12-minion-base-v2-sdlc-kanban-spec` §1**, which states the fan-out
"stays in server `load` with `s-maxage=300`". That line needs a one-line correction once this
spec is approved. It is a human call and deliberately not made here — this spec touches no
other spec file.

### D3 — Returning to a hidden tab refreshes immediately if the data is already due

The proposal's state diagram says Hidden → Visible "resumes refreshing" without saying whether
a board that went stale while hidden refetches on return. **Settled: on becoming visible, if
`now - fetchedAt >= intervalMs`, refetch immediately; otherwise schedule the remainder of the
interval.** A board you just looked back at should not sit visibly 9 minutes stale waiting out
a timer. This is an interpretation of the proposal, flagged here so review can overrule it.

### D4 — Clock skew is clamped, not corrected

`fetchedAt` is a server clock reading rendered against a client clock. Skew can make the age
negative. **Clamp to `>= 0`**; never render a negative or future age. No skew correction — this
is a single-user private dashboard, and correction would require trusting a `Date` response
header that the CDN also rewrites. Stated so it is a known limitation, not a surprise.

### D5 — The label must be hydration-stable

Computing a relative string during SSR and again on first client render produces a mismatch
warning. **The label's clock is a `$state` value initialised to `data.fetchedAt`**, so SSR and
first client paint both render the zero-age string; the display tick moves it from there. No
`browser` guard around the markup, no `{#if mounted}` flicker.

## 3. Approach

Three vertical slices, each ~4–8 focused hours, each landing independently green and leaving
`/kanban` fully working at every commit boundary. Strictly sequential — S2 needs S1's
`fetchedAt` to decide when a refresh is due, S3 needs it to render.

```
S0 (recon, ≤30 min) ─▶ S1 ─▶ S2 ─▶ S3
```

### Slice 0 — recon (≤ 30 min, prepend to S1)

Confirm §4's paths and record actuals. Machine-checkable:

```bash
cd minion_base   # or wherever NikolasP98/minion-base is checked out
git rev-parse --abbrev-ref HEAD                      # expect main
test -f src/routes/kanban/+page.server.ts            # A2: if absent, find the load and update §4
test -f src/routes/kanban/+page.svelte
test -f src/lib/design/tokens.css
test -f DESIGN.md
test -f scripts/lint-design.mjs
rg -n 's-maxage|setHeaders|cache-control' src/routes/kanban/          # records the CURRENT header
rg -n 'fetchedAt|Date.now\(\)' src/routes/kanban/                     # is a stamp already returned?
rg -ln 'chip|filter' src/lib/components/ src/routes/kanban/           # locates the board header component
rg -n '"scripts"' -A 20 package.json                                  # confirms lint:design; is there a test runner?
bun --version
```

Paste the recorded current `cache-control` value into the PR — S1's DoD diffs against it.

---

### S1 — Server-stamped `fetchedAt` + the 60 s cache window

**Goal:** the board payload carries an honest production timestamp, and the shared cache stops
being able to swallow a 5-minute refresh. **No visible UI change, no timers.** This slice is
shippable and useful on its own: it is the correctness half of the feature.

**Do:**
- In the kanban server `load`, stamp `const fetchedAt = Date.now()` **after** the GitHub
  fan-out settles (after the `Promise.allSettled`/`await` that produces the columns — not at
  the top of the function, or a slow fan-out reports itself as instant), and return it in the
  load payload.
- Change the route's `cache-control` to `max-age=0, s-maxage=60` per D2. Do not touch caching
  on any other route.
- Add `src/lib/refresh/relative-time.ts` exporting a pure
  `formatAge(ageMs: number): string` with a closed, testable domain:

  | Input | Output |
  |---|---|
  | `ageMs < 0` | same as `0` (D4 clamp) |
  | `0 ≤ ageMs < 5_000` | `just now` |
  | `5_000 ≤ ageMs < 60_000` | `${floor(ageMs/1000)}s ago` |
  | `60_000 ≤ ageMs < 3_600_000` | `${floor(ageMs/60000)}m ago` |
  | `ageMs ≥ 3_600_000` | `${floor(ageMs/3600000)}h ago` |

  Pure and dependency-free — no `Date.now()` inside it, no `Intl.RelativeTimeFormat` (its
  output is locale-dependent and untestable against a fixed string).

**Files:** `src/routes/kanban/+page.server.ts`, `src/lib/refresh/relative-time.ts` (new),
`src/lib/refresh/relative-time.test.ts` (new).

**Definition of done (machine-checkable):**
```bash
bun test src/lib/refresh/relative-time.test.ts
#   every boundary in the table above, both sides: -1, 0, 4999, 5000, 59_999, 60_000,
#   3_599_999, 3_600_000 — exact string equality, no snapshots
rg -n 'max-age=0, s-maxage=60' src/routes/kanban/+page.server.ts   # 1 match
rg -n 's-maxage=300|stale-while-revalidate' src/routes/kanban/     # 0 matches
rg -n 'fetchedAt' src/routes/kanban/+page.server.ts                # returned from load
bunx svelte-check                                                  # 0 errors / 0 warnings
bun run lint:design                                                # debt still 0
bun run build

# header actually served (dev server, basic-auth creds from DASH_PASSWORD):
curl -sI -u "minion:$DASH_PASSWORD" http://localhost:5173/kanban | rg -i 'cache-control'
```

**Estimate:** 4–5 h (most of it is the boundary table and confirming the stamp lands after the
fan-out, not before).

---

### S2 — Visibility-gated 5-minute refresh controller

**Goal:** the proposal's headline. The board refetches every 5 minutes while visible, never
while hidden, and never after you leave the route.

**Do:**
- Add `src/lib/refresh/controller.ts` — a **pure, fully injected** controller. Every ambient
  dependency is a parameter, which is what makes the whole behaviour unit-testable with no DOM
  and no 5-minute waits:

  ```ts
  export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  export interface RefreshDeps {
    intervalMs: number;
    now: () => number;
    isVisible: () => boolean;
    schedule: (fn: () => void, ms: number) => number;   // setTimeout
    cancel: (id: number) => void;                        // clearTimeout
    refresh: () => Promise<void>;                        // invalidateAll
    lastFetchedAt: () => number;                         // reads data.fetchedAt (S1)
  }

  export interface RefreshController {
    start(): void;
    onVisibilityChange(): void;
    stop(): void;
  }

  export function createRefreshController(deps: RefreshDeps): RefreshController;
  ```

  Required behaviour:
  - Schedules with `setTimeout`, not `setInterval`: the next fire is
    `max(0, intervalMs - (now() - lastFetchedAt()))`, re-derived after every refresh. A fixed
    `setInterval` drifts past a slow fan-out and cannot express D3.
  - `onVisibilityChange()` → hidden: `cancel` the pending timer and hold no timer at all.
    Visible: re-derive from `lastFetchedAt()` and either fire immediately (D3, when already
    due) or schedule the remainder.
  - **In-flight guard:** never call `refresh()` while a previous `refresh()` is unsettled;
    the next timer is scheduled from the settle, not from the call.
  - **Failure is non-fatal:** a rejected `refresh()` is caught, does not advance anything, and
    schedules the next attempt normally. The board stays up with an ageing label — which is the
    correct signal — rather than freezing the timer.
  - `stop()` cancels the pending timer and makes every subsequent callback a no-op, including
    one already queued from an in-flight refresh.

- Wire it in `src/routes/kanban/+page.svelte` inside a single `$effect` that returns its
  teardown. The `$effect` supplies the real deps: `Date.now`, `() => document.visibilityState
  === 'visible'`, `setTimeout`/`clearTimeout`, `() => invalidateAll()`, `() => data.fetchedAt`.
  It adds the `visibilitychange` listener and its cleanup **removes the listener and calls
  `stop()`**. `$effect` does not run during SSR, so no `browser` guard is needed.

**Files:** `src/lib/refresh/controller.ts` (new), `src/lib/refresh/controller.test.ts` (new),
`src/routes/kanban/+page.svelte`.

**Definition of done (machine-checkable):**
```bash
bun test src/lib/refresh/controller.test.ts
#   driven by a fake clock + fake scheduler (no real time passes; whole file runs in ms):
#   - visible, no activity for intervalMs      → exactly 1 refresh(), not 2
#   - hidden before the deadline               → 0 refresh(); cancel() called; no timer held
#   - hidden for 3× intervalMs                 → still 0 refresh()
#   - hidden → visible with age >= intervalMs  → refresh() fires immediately (D3)
#   - hidden → visible with age <  intervalMs  → no immediate refresh; fires at the remainder
#   - refresh() unsettled when the next deadline passes → no second concurrent call
#   - refresh() rejects                        → no throw escapes; next attempt still scheduled
#   - stop() then advance 10× intervalMs       → 0 further refresh(); 0 pending timers
#   - stop() while a refresh() is in flight; then resolve it → no timer scheduled after stop
rg -n '\$effect' src/routes/kanban/+page.svelte                 # the wiring effect exists
rg -n 'removeEventListener|controller.stop\(\)' src/routes/kanban/+page.svelte  # teardown present
rg -n 'setInterval' src/lib/refresh/ src/routes/kanban/         # 0 matches (setTimeout only)
bunx svelte-check && bun run lint:design && bun run build
```

Plus one browser probe (browser-harness skill, headless Chromium at `BU_CDP_URL`; the board is
behind basic auth — supply `minion:$DASH_PASSWORD`), pasted into the PR:

```
- open /kanban, record requests to **/kanban/__data.json
- CDP Emulation.setPageVisibilityOverride hidden → wait past one interval → request count unchanged
- override visible → a __data.json request fires (D3) and fetchedAt in the payload advances
- navigate away from /kanban → wait past one interval → request count unchanged
```

**Estimate:** 6–8 h. The controller is small; the fake-clock test matrix is the slice.

---

### S3 — Live "refreshed N ago" in the board header

**Goal:** the age is on screen and visibly moves without a refetch.

**Do:**
- Add a display tick in the same `+page.svelte`: `let nowMs = $state(data.fetchedAt)` (D5 —
  SSR and first client paint both render the zero-age string), a `setInterval` at **1000 ms**
  that sets `nowMs = Date.now()`, and teardown in the same `$effect` cleanup as S2's controller.
  1 s is chosen because the `s`-granularity band in S1's table is visible for the first minute
  — a coarser tick makes the label look frozen exactly when the user is watching it.
- Render `refreshed {formatAge(nowMs - data.fetchedAt)}` in the existing board header, beside
  the repo filter chips, as a low-emphasis element. Add `title` / `aria-label` carrying the
  absolute local time of `data.fetchedAt` so the exact value is recoverable on hover.
- Mark it `aria-live="off"` (or leave it out of the live region): a per-second ticking string
  in a live region floods screen readers.
- **Styling: semantic tokens only.** Use the existing `--text-dim`, the existing spacing and
  type scale from `src/lib/design/tokens.css`. No raw hex, no raw px. Adding a token is a
  DESIGN.md-governed decision — if you think you need one, you probably need an existing one.

⚠️ **Do not invoke the `ui-design-governance` skill for this work.** That skill governs
`minion_hub`/`minion_site` against `packages/design-tokens/contract.json`. minion-base has its
own, separate governance — `DESIGN.md` + `src/lib/design/tokens.css` + `scripts/lint-design.mjs`
(v2 spec §2). Running hub's rules here is a category error.

**Files:** `src/routes/kanban/+page.svelte`, the board header component located in Slice 0,
`DESIGN.md` (only if a new idiom genuinely needs documenting).

**Definition of done (machine-checkable):**
```bash
bun run lint:design       # debt EXACTLY 0 — the proposal's DoD; a raw value here fails the slice
bunx svelte-check         # 0 errors / 0 warnings
bun run build
git diff --stat -- src/lib/design/tokens.css     # expect empty; a token add needs PR justification
rg -n '#[0-9a-fA-F]{3,8}|[0-9]+px' src/routes/kanban/+page.svelte   # 0 matches
rg -n 'aria-live="polite"|aria-live="assertive"' src/routes/kanban/ # 0 matches on the age label
```

Plus one browser probe, pasted into the PR:

```
- open /kanban, screenshot the header → label reads "refreshed just now"
- wait 20 s with no navigation and no network activity → label reads "refreshed 20s ago"
  (± 1 s) and the __data.json request count is unchanged  ← the "ages without a refetch" DoD
- hover the label → title shows the absolute local time
- both themes if minion-base has a light/dark pair → contrast holds at --text-dim
```

**Estimate:** 5–6 h.

---

## 4. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/routes/kanban/+page.server.ts` | S1 | stamp `fetchedAt` after fan-out; `max-age=0, s-maxage=60` |
| `src/lib/refresh/relative-time.ts` | S1 | new — pure `formatAge` |
| `src/lib/refresh/relative-time.test.ts` | S1 | new |
| `src/lib/refresh/controller.ts` | S2 | new — injected visibility-gated scheduler |
| `src/lib/refresh/controller.test.ts` | S2 | new |
| `src/routes/kanban/+page.svelte` | S2, S3 | wiring `$effect`, display tick, label |
| board header component (located in Slice 0) | S3 | the label's placement |
| `DESIGN.md` | S3 | only if a new idiom needs documenting |

All paths relative to the `minion-base` checkout. **Nothing outside `minion-base` is edited** —
see §5.

## 5. Cross-repo impact

Checked against AGENTS.md → "Cross-Project Impact Zones". **No zone applies.** minion-base has
no DB, no gateway WS protocol surface, no `@minion-stack/*` dependency, no agent-definition
format, no shared auth — it is a standalone read-only SvelteKit app over the GitHub REST API.

| Surface | Impact | Mitigation |
|---|---|---|
| `minion/` gateway, `@minion-stack/shared`, WS frame types | **None** — no protocol surface | — |
| `@minion-stack/db` / `minion_hub` ↔ `minion_site` shared DB | **None** — minion-base has no DB | — |
| `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** — no shared package, no shared deploy | CI guard below |
| `minion-meta` (this repo) | **Read-only, unchanged** — the board reads `specs/index.json` via the contents API; nothing here changes what it reads or its shape | — |
| minion-base's other routes (`/`, `/practices`, `/research`) | **None** — S1's header edit is scoped to the kanban route | S1 DoD greps the kanban dir only |
| Shared GitHub PAT rate limit | **Real, quantified** — alert A1 | A1 |
| `2026-08-12-minion-base-v2-sdlc-kanban-spec` §1 | **Documentation drift** — D2 contradicts its `s-maxage=300` claim | note N2 |

Scope guard for the PR:

```bash
git diff --name-only origin/main...HEAD | rg -v '^(src/|DESIGN\.md$)' && \
  echo "FAIL: change escaped the minion-base app surface" && exit 1
```

### 🚨 A1 — the refresh spends a shared GitHub rate limit

The kanban load fans out across every tracked repo. v1 measured ~22 calls
(`2026-08-12-minion-base-lifecycle-dashboard`); v2's kanban adds workflow-run and
minion-meta-contents calls, so **the true count is higher and unmeasured** — Slice 0 should
record it from a single cold load. Today that cost is paid once per navigation. After this
spec it is paid up to once per 5 minutes per open board, i.e. **~264+ calls/hour per tab**.

The PAT is the shared `GITHUB_TOKEN` from Infisical `minion-core` (AGENTS.md, env hierarchy
layer 2) — the same identity the factory pipeline uses. Authenticated REST is 5,000 req/hr, so
one open board is ~5% of the budget; three boards plus CI is not.

Mitigations, all already in the design — do not weaken them:
1. **Visibility gating** (S2) is the primary control and is not optional polish.
2. **The 60 s shared cache** (D2) coalesces concurrent viewers. This is the decisive argument
   against per-client cache-busting: with cache-busting, N open boards cost N× the rate limit;
   with a shared cache they cost ~1×.
3. If Slice 0's measured call count is materially above ~22, say so in the PR and re-check the
   5-minute interval against the budget **before** S2 merges. The interval is a product
   requirement, not a free variable — raising it needs the user, not the implementer.

### 🚨 A2 — the load may not be where this spec thinks it is

Assumption 1 of §1. If the fan-out has moved to a universal `+page.ts` or an API route since
2026-08-12, then: the `setHeaders` edit moves with it; `invalidateAll()` may need to become a
targeted `invalidate('<url-or-key>')`; and if the data is fetched client-side rather than in a
load, S2's `refresh` dep becomes that fetch instead. **Resolve in Slice 0 and correct §4 in the
same commit.** Do not implement against a guessed file.

### ⚠️ N1 — minion-base is missing from AGENTS.md's Project Map

The orchestrator hub's Project Map lists 8 directories; `minion_base/` is not among them,
despite being a live production surface with two specs. That is a real docs gap and the reason
this spec had to reconstruct paths from prose. **Not fixed here** — this spec touches no file
outside its own and the proposal's frontmatter. Worth a one-line follow-up.

### ⚠️ N2 — v2 spec §1 needs a one-line correction after approval

`2026-08-12-minion-base-v2-sdlc-kanban-spec` (status `implementing`) asserts `s-maxage=300`.
D2 changes it to 60. Reconciling that line is a human call, deliberately not made here.

## 6. Out of scope (explicit)

Carried from the proposal, unchanged:

- **Any repo other than `minion-base`; any route other than `/kanban`.** The v1 lifecycle
  dashboard, `/practices` and `/research` do not get a refresh timer in this spec.
- **Configurable or user-settable interval, and a manual refresh button.** 5 minutes is a
  constant (`REFRESH_INTERVAL_MS`), exported for tests, not for a settings UI.
- **Websockets, SSE, GitHub webhooks, or any push-based liveness.**
- **Persisting refresh state across navigations or reloads.** Leaving and returning to
  `/kanban` starts a fresh load and a fresh timer, by design.
- **Diffing or animating what changed between refreshes; toasts; notifications.**
- **Changing what the board derives or how columns are computed.** The v2 derivation table is
  untouched; this spec only changes *when* the same load runs.

Added by this spec:

- **A test framework adoption.** `bun test` on two pure modules is the whole testing footprint.
  No vitest, no @testing-library, no Playwright suite — the DOM assertions are one-off browser
  probes pasted into the PR.
- **Refactoring the GitHub fan-out** (concurrency, per-call caching, conditional requests /
  ETags). A1 quantifies the cost; if it needs reducing, that is its own proposal.
- **Loading/skeleton states or a spinner during the background refetch.** SvelteKit swaps the
  data when it lands; a board that flashes every 5 minutes is worse than one that doesn't.
- **Error UI for a failed refresh.** Per-fetch failures already degrade to "unreachable"
  badges (v1 §Architecture); S2 only guarantees a failed refresh doesn't kill the timer.
- **Touching the basic-auth gate, `hooks.server.ts`, or the Vercel/DNS config.**
- **Design-token additions.** S3's DoD expects `tokens.css` unchanged.

## 7. End-to-end verification

Run with all three slices merged, against the real `minion-base` checkout on `main`.

```bash
cd minion_base

# 1. Gates (the v2 spec §4 chain, in order)
bun test                                      # both pure suites green
bun run lint:design                           # debt EXACTLY 0 — proposal DoD
bunx svelte-check                             # 0 errors / 0 warnings — proposal DoD
bun run build

# 2. Server contract (S1 / D1 / D2)
curl -sI -u "minion:$DASH_PASSWORD" "$BASE/kanban" | rg -i 'cache-control'
#   → max-age=0, s-maxage=60   (no s-maxage=300, no stale-while-revalidate)
curl -s -u "minion:$DASH_PASSWORD" "$BASE/kanban/__data.json" | rg -o 'fetchedAt[^,]*'
#   → present, and within a few seconds of `date +%s000` on a cold hit

# 3. The cache no longer swallows a refresh (D2, the proposal's flagged risk)
#    Two loads ~90 s apart must report different production times:
A=$(curl -s -u … "$BASE/kanban/__data.json" | jq '.. | .fetchedAt? // empty' | head -1)
sleep 90
B=$(curl -s -u … "$BASE/kanban/__data.json" | jq '.. | .fetchedAt? // empty' | head -1)
[ "$B" -gt "$A" ] || { echo "FAIL: cached response served past the 60s window"; exit 1; }

# 4. No leaks
rg -n 'setInterval|setTimeout' src/routes/kanban/ src/lib/refresh/ \
  | rg -v '\.test\.ts'        # every hit must be inside the S2 controller or the S3 tick,
                              # and every one must have a visible teardown path
```

**Browser probe** (browser-harness skill, headless Chromium; basic-auth credentials required).
This is the acceptance run — paste the transcript into the PR:

| # | Step | Expected |
|---|---|---|
| 1 | Open `/kanban`, start a network log filtered to `__data.json` | board renders; label reads `refreshed just now` |
| 2 | Idle 20 s, no interaction | label reads `refreshed 20s ago` (±1 s); **request count unchanged** — the label ages without a refetch (proposal DoD 2) |
| 3 | Idle past 5 min | exactly **one** `__data.json` request; `fetchedAt` advanced; label resets to `just now` (proposal DoD 1) |
| 4 | `Emulation.setPageVisibilityOverride` → hidden; idle past 5 min | **zero** requests (proposal DoD 1, pause-when-hidden) |
| 5 | Override → visible | one request fires immediately (D3); label resets |
| 6 | Navigate to another route; idle past 5 min | **zero** further `__data.json` requests (proposal DoD 3, teardown) |
| 7 | Return to `/kanban`, then throttle the network to offline and idle past 5 min | board stays rendered; no unhandled rejection in the console; label keeps ageing; a further interval after restoring the network produces a successful refresh |

**Ship gate:** §7 blocks 1–4 green, all seven probe rows recorded, A1's measured fan-out call
count stated in the PR, and Slice 0's recorded pre-change `cache-control` value diffed against
the post-change one.
