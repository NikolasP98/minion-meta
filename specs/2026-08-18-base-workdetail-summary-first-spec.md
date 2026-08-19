---
id: 2026-08-18-base-workdetail-summary-first-spec
title: Base UI-005/006/007 — issue route, WorkDetail adapter, summary-first detail
stage: deploy
status: flag-ready
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-18-base-workdetail-summary-first
verdict: approved
repos: [minion-base]
relationship: depends-on
related: [2026-08-18-minion-base-mobile-hitl-ux-plan, 2026-08-18-base-ui-primitives-and-shell]
merge_sha: 805886e0052710b5ced07d63185b97836bae3d5c
merged_pr: https://github.com/NikolasP98/minion-base/pull/28
merged_at: 2026-08-18T16:58:03-05:00
release_flag: PUBLIC_WORK_DETAIL_V2
release_state: off
evidence: https://github.com/NikolasP98/minion-base/commit/805886e0052710b5ced07d63185b97836bae3d5c
---

# Base UI-005/006/007 — issue route, WorkDetail adapter, summary-first detail

## 0. Product

Quoted from the approved proposal:

> **AS-IS:** issue cards deep-link straight to GitHub (no internal route);
> the generic Detail type renders full markdown body BEFORE the review verdict;
> no readiness/blockers/revision model. **TO-BE:** /kanban/issue/:owner/:repo/
> :number internal detail (triage state, lineage, View source ↗ separate);
> WorkDetail discriminated model with Availability<T> per field (missing/
> unsupported explicit — the UI never invents evidence; legacy items show an
> EVIDENCE INCOMPLETE banner); summary-first layout: IdentityStrip (sticky) →
> DecisionBrief (objective, requested decision with consequence language,
> revision identity) → ReadinessBand (vetoes above scores) → blockers →
> disclosures (full doc/history/lineage collapsed; failed review auto-expanded);
> deep-link anchors.

The product outcome is a mobile detail page whose first viewport identifies the exact work
revision when supplied (or explicitly says it is unavailable), the decision being requested, its
consequence, readiness, and blockers. Raw source and history remain available, but never displace
the decision summary.

## 1. Relationship recommendation

Classification: **depends-on**.

- `2026-08-18-minion-base-mobile-hitl-ux-plan` — the approved plan of record defines UI-005,
  UI-006, UI-007 and the Decision → Risk → Proof → Detail → History hierarchy implemented here.
- `2026-08-18-base-ui-primitives-and-shell` is currently an approved proposal, not a spec in this
  checkout. This package consumes its proposed `Status`, `RiskMark`, `IntegrityMark`,
  `CopyableHash`, and `Disclosure` primitives plus sticky/safe-area shell tokens; implementation
  must wait until those exports and contracts exist and Slice 0 confirms their actual names.

No other located artifact owns the same combination of internal issue routing,
Availability-typed work normalization, and summary-first work detail. The adjacent
`2026-08-18-base-attention-queue-responsive-runs` proposal changes list/runs surfaces and routes
cards into detail, but does not own the detail contract or layout.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified behavior and constraints

The `minion-base` checkout is not present in this meta-repo workspace, so implementation-time
recon must verify line-level anchors before editing. The following anchors are supported by the
approved/shipped artifacts and operator memory:

- `src/routes/kanban/+page.server.ts` derives board data from GitHub and committed meta indexes;
  issue items therefore already have GitHub identity/source data, but the approved proposal
  confirms their cards link directly to GitHub rather than an internal issue route.
- `src/routes/kanban/[kind]/[...ref]/+page.server.ts` and `+page.svelte` are the shipped generic
  card-detail route (`/kanban/[kind]/[...ref]`). The current generic `Detail` shape places the full
  markdown body before the review verdict and has no typed readiness, blocker, or revision fields.
- `src/lib/server/meta.ts` (or its recon-confirmed successor) loads full proposal/spec markdown;
  `metaFileFull` retains the GitHub blob SHA. That SHA is the revision identity already bound to
  consequential gates and must not be replaced by a mutable branch name.
- UI-001 removed gates from board cards and made detail actions revision-bound. `applyTransition`
  rejects stale revisions with 409, separates `approved_and_queued` from persistent
  `approved_queue_pending`, and exposes `indexSynced`; this spec must preserve that behavior.
- The app is SvelteKit 2/Svelte 5 with Bun, has no database, and uses its own `DESIGN.md`,
  `src/lib/design/tokens.css`, and `bun run lint:design` governance. It does not use Hub design
  tokens.

These decisions are shaped by `/memory/MINION/minion-base-lifecycle-dashboard.md`: the card-detail
route and lineage shipped on 2026-08-13; new routes require `bunx svelte-kit sync`; GitHub-contents
markdown must be decoded as UTF-8 bytes, never bare `atob()`. The ★★★ mobile constraints and
UI-001 gate contract come from
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` (2026-08-18 MOBILE HITL UX PROGRAM).

Before Slice 1, run and attach the output of:

```bash
rg -n "href=.*github|html_url|issue" src/routes/kanban src/lib
rg -n "type Detail|interface Detail|metaFileFull|review|body|markdown" src/routes/kanban src/lib
rg -n "applyTransition|approved_queue_pending|revision_conflict|indexSynced" src
rg -n "type .*Kind|kind:|'proposal'|'spec'|'run'|'ci'|'issue'|href=" src/routes/kanban src/lib
test ! -f AGENTS.md || sed -n '1,240p' AGENTS.md
test ! -f CLAUDE.md || sed -n '1,240p' CLAUDE.md
```

If the generic route, data loader, or revision contract differs behaviorally from these anchors,
stop and revise this spec. Pure file renames may be recorded in the PR with the replacement path.
The recon record must enumerate the finite set of board-card kinds that are intended to open a
work-detail page and identify any external-only artifact links; that recorded set is the source of
truth for the all-kinds adapter and route tests below.

### TO-BE — target behavior and invariants

1. Every board-card kind identified by Slice 0 as a work-detail kind opens an internal
   `/kanban/...` detail page; intentionally external-only artifact links are recorded and are not
   silently reclassified. Issues use the canonical, segment-encoded route
   `/kanban/issue/:owner/:repo/:number`; “View source ↗” is a distinct external link.
   Unknown/malformed issue refs return 404, not a partly populated page.
2. Server loaders normalize source-specific records into a discriminated `WorkDetail` union.
   Optional evidence-bearing fields use `Availability<T>` with explicit `available`, `missing`,
   or `unsupported` states; `undefined`, empty strings, or fabricated defaults never masquerade
   as evidence.
3. Legacy/incomplete records remain renderable and show `EVIDENCE INCOMPLETE`. Absence is named
   per field; unavailable readiness cannot render as a zero score, “green,” or “ready.”
4. All kinds render in this DOM order: sticky `IdentityStrip`; `DecisionBrief`; `ReadinessBand`
   with explicit vetoes before source-supplied scores; blockers; proof/detail/history disclosures;
   and the safe-area-aware `DecisionDock`. The failed-review evidence disclosure is expanded by
   default; otherwise raw body, history, and lineage start collapsed. If review evidence and the
   raw document share one disclosure in the existing renderer, that combined disclosure is the
   one expanded for a failed review.
5. For the bounded mobile fixture defined in the test matrix, the first 390×844 viewport
   communicates identity, requested decision, consequence, revision or explicit revision
   unavailability, readiness/unknown state, and blocker presence without horizontal page
   scrolling. State is label + shape + color, never color alone; interactive targets are at least
   44×44 on coarse pointers. Full blocker text remains above disclosures but need not fit in the
   first viewport.
6. Deep links `#decision`, `#readiness`, `#blockers`, `#document`, `#history`, and `#lineage` land
   on stable section IDs with sticky-header scroll offset and keyboard focusable headings.
7. Existing gate semantics, auth, existing-source fetch behavior, cache policy, UTF-8 decoding,
   lineage, and GitHub blob-SHA revision binding remain unchanged; the only additive fetch is the
   single-issue read in Slice 1. A source that has no immutable revision token renders revision as
   unavailable rather than substituting an issue number, branch, timestamp, or other mutable
   label. This package adds no mutation endpoint.
8. The implementation sits behind `PUBLIC_WORK_DETAIL_V2`, parsed centrally as enabled only when
   its exact string value is `1`; unset, empty, `0`, and every other value are off. Off means
   current detail behavior and URLs remain functional. The internal issue URL may ship while the
   flagged layout is off, but must render a complete current-style detail rather than redirect
   externally.

### DELTA — transitions, slices, and proof

1. External-only issue navigation → canonical internal issue detail and separate source link.
   **Slice 1.** Proved by route-loader unit tests and Playwright card-to-detail/source-link tests.
2. Source-specific/generic optional fields → exhaustive `WorkDetail` + `Availability<T>` adapters.
   **Slice 2.** Proved by the fixed 20-case adapter matrix covering every recon-enumerated kind
   and every availability state across the suite.
3. Body-first generic rendering → reusable summary-first shell, `DecisionDock`, and stable anchors.
   **Slice 3.** Proved by component tests, axe, mobile Playwright assertions, and snapshots.
4. Kind-specific detail drift → every recon-enumerated work-detail kind rendered through the
   adapter/shell, with failed-review and legacy fallbacks. **Slice 4.** Proved by the 20-case
   fixture matrix and an all-kinds route test.
5. Individually passing pieces → production-equivalent end-to-end decision journey with the flag
   both on and off. **Slice 5.** Proved by the end-to-end verification in §8.

## 3. Approach: vertical slices

Each slice is one junior-developer-sized 4–8 focused-hour unit. Slice 0 recon above is a required
precondition, not an implementation slice.

### Slice 1 — internal issue detail from card to source (4–6 h)

Implement an issue page using the existing generic detail route rather than a parallel page
family. Parse exactly three decoded path segments after `issue`, validate the original `number`
segment against `^[1-9][0-9]*$` before numeric conversion, and segment-encode owner/repo when
constructing links. Reject an extra, empty, or malformed segment rather than truncating it. Then
load the issue through the existing authenticated GitHub server client, and retain repository,
triage state, lineage, and canonical GitHub URL. Change issue-card primary navigation to the
internal URL and add a separately named external source link on detail.

Files to touch:

- `src/routes/kanban/[kind]/[...ref]/+page.server.ts`
- `src/routes/kanban/[kind]/[...ref]/+page.svelte`
- `src/routes/kanban/+page.svelte` (or the recon-confirmed card component)
- `src/lib/server/github.ts` (only if no existing single-issue loader can be reused)
- route/loader tests colocated under `src/routes/kanban/` and the existing Playwright spec for
  kanban details

Machine-checkable DoD:

- A fixture issue card points to `/kanban/issue/acme/widget/42`, navigation returns 200 and shows
  `acme/widget#42`; the source link has the fixture GitHub URL and external-link accessible name.
- Zero, negative, non-decimal, missing, extra-segment, and nonexistent issue refs return 404.
- Every recon-enumerated pre-existing work-detail card kind remains internal and passes its
  existing tests.
- `bunx svelte-kit sync && bun run check` exits 0.

### Slice 2 — typed WorkDetail normalization (5–8 h)

Add a UI-facing domain contract independent of GitHub/meta/factory response shapes. Define
`Availability<T>` as an exhaustive discriminated union and `WorkDetail` as a union discriminated
by every work-detail kind enumerated in Slice 0. Centralize adapters; do not spread fallback
inference through Svelte components. Preserve the raw source URL and immutable revision identity
when supplied. Where a source contract cannot supply a field, return `unsupported` with a stable
reason code; where the contract can supply it but the record does not, return `missing` with a
stable reason code. Record the closed reason-code sets and source-to-field mapping in the adapter
test table. Transport readiness scores only when the source explicitly supplies them; a
deterministic mapping of an explicit failed-review or blocker state to a veto is allowed only when
the adapter retains the source field/provenance. Never synthesize a numeric readiness score.

Files to touch:

- `src/lib/work-detail/types.ts` (new)
- `src/lib/work-detail/adapters.ts` (new)
- `src/lib/work-detail/adapters.test.ts` (new)
- `src/lib/work-detail/fixtures.ts` (new; 20 cases across kinds, missing data, failed review,
  stale revision, blockers, and complete evidence)
- `src/routes/kanban/[kind]/[...ref]/+page.server.ts`

Machine-checkable DoD:

- Type checking enforces exhaustive handling of all `WorkDetail['kind']` and
  `Availability['state']` members; no `any`, `@ts-ignore`, or cast-to-invent-data is introduced.
- The committed 20-case fixture table names the kind, source fields, expected availability states,
  and coverage purpose of each case; tests cover every recon-enumerated kind, all three
  availability states across the suite, explicit blocker-veto precedence, failed-review
  detection, issue lineage, exact preservation of supplied blob SHA/source URL, and an issue with
  unavailable revision.
- A grep assertion finds no presentation-layer fallback such as `readiness || 0` or a default
  “ready” label for unavailable evidence.
- `bun test src/lib/work-detail/adapters.test.ts && bun run check` exits 0.

### Slice 3 — summary-first shell (6–8 h)

Build small components over `WorkDetail` and the UI-002 primitives. DOM order is the hierarchy,
not CSS reordering. `ReadinessBand` lists vetoes first and never converts unavailable scores to
zero. Blockers remain visible above disclosures. Use semantic headings/regions, anchor IDs, and
`scroll-margin` tokens. Failed review alone opens its evidence disclosure initially. Add a
`DecisionDock` that reuses the existing revision-bound gate UI for actionable kinds and otherwise
shows no invented action; its sticky positioning must consume the dependency's safe-area token
and must not obscure anchored content.

Files to touch:

- `src/lib/components/work-detail/IdentityStrip.svelte` (new)
- `src/lib/components/work-detail/DecisionBrief.svelte` (new)
- `src/lib/components/work-detail/ReadinessBand.svelte` (new)
- `src/lib/components/work-detail/DecisionDock.svelte` (new)
- `src/lib/components/work-detail/WorkDetailShell.svelte` (new)
- `src/lib/components/work-detail/WorkDetailShell.test.ts` (new)
- `src/lib/design/tokens.css`
- `src/routes/kanban/[kind]/[...ref]/+page.svelte`

Machine-checkable DoD:

- Component tests assert DOM order, all six IDs, veto-before-score ordering, incomplete banner,
  and failed-review disclosure state.
- At 390×844 the fixture's identity, decision, consequence, revision, readiness state, and blocker
  indicator are present in the initial viewport; revision may be an explicit unavailable state.
  `document.documentElement.scrollWidth` is no greater than `clientWidth` at 320, 390, and 430 px,
  and the dock does not cover the focused anchor or final disclosure content.
- axe reports no serious/critical violations; keyboard deep links focus the target heading; no
  consequence text is available only through a tooltip.
- `bun run lint:design && bun run check` exits 0.

### Slice 4 — all kinds, legacy evidence, and gate preservation (5–8 h)

Route every recon-enumerated work-detail card kind through its adapter and the shared shell. Place
the existing revision-bound gate UI in `DecisionDock` without changing its state machine or endpoint.
Render existing lineage/history/raw markdown through disclosures. With
`PUBLIC_WORK_DETAIL_V2` off under the exact parser in invariant 8, retain current rendering; with
the exact value `1`, use the new shell. Do not duplicate gate logic into work-detail components.

Files to touch:

- `src/routes/kanban/[kind]/[...ref]/+page.server.ts`
- `src/routes/kanban/[kind]/[...ref]/+page.svelte`
- `src/lib/work-detail/adapters.ts`
- `src/lib/work-detail/fixtures.ts`
- the recon-confirmed existing gate/outcome component test (edit only; do not fork it)
- the existing kanban detail Playwright spec

Machine-checkable DoD:

- A parameterized test opens one fixture for every recon-enumerated work-detail card kind and
  finds an identity strip, decision brief, readiness/unknown state, source link or explicit source
  unavailability, and revision identity or explicit revision unavailability.
- All legacy fixtures render `EVIDENCE INCOMPLETE` with explicit missing/unsupported fields and no
  invented score.
- Existing tests for 409 conflict, 202 `approved_queue_pending`, durable result receipt,
  `indexSynced`, and stale-action freezing pass unchanged or with selector-only updates.
- Flag-off route screenshots/semantic assertions match the current behavior baseline for unset,
  `0`, and a non-`1` value; the exact value `1` selects the new shell.

### Slice 5 — integrated verification and flag-ready release (4–6 h)

Exercise the real server loaders against deterministic mocked GitHub/meta/factory responses,
complete the responsive/accessibility matrix, and document flag enable/rollback. This slice fixes
only integration defects within Slices 1–4; newly discovered scope is a new proposal.

Files to touch:

- existing Playwright configuration and kanban detail spec
- `README.md` or the existing environment/feature-flag reference (one recon-confirmed file)
- no production component unless an integration failure proves it necessary

Machine-checkable DoD:

- The §8 command sequence passes from a clean install with the flag off and on.
- Visual fixtures at 320, 390, 768, 1280, and 1920 px are reviewed; no page-level horizontal
  overflow, clipped decision copy, or hidden blocker exists.
- Flag rollback requires setting `PUBLIC_WORK_DETAIL_V2=0` or unsetting it and restarting or
  redeploying the application as required by the recon-confirmed SvelteKit env import; no code
  rollback, data migration, or cleanup is required.

## 4. Cross-repo impact assessment

Target repo: `minion-base` only.

- **minion-meta:** read-only consumer impact. Proposal/spec/index shapes are adapted at the
  boundary; this spec does not change frontmatter or `specs/index.json`. If a desired field is not
  projected, render it `missing` rather than modifying meta in this package.
- **minion-factory:** read-only consumer impact. Existing lifecycle endpoints and typed gate
  outcomes remain unchanged. No mutation, queue, receipt, or transition contract change is
  permitted here.
- **GitHub:** existing authenticated read client only. Issue source is fetched server-side; tokens
  never enter page data. UTF-8 contents decoding remains byte-safe per operator memory.
- **minion-base deployment/config:** document `PUBLIC_WORK_DETAIL_V2`'s exact `1` opt-in and the
  restart/redeploy needed by the selected SvelteKit env import; no secret or external contract is
  added.
- **Hub/site/gateway/paperclip/pixel-agents:** no gateway protocol, shared package, database,
  authentication, or agent-format change; no impact expected under AGENTS.md's Cross-Project
  Impact Zones.

Unavoidable alert: adding an internal issue fetch can increase GitHub calls. Reuse the existing
server client/cache headers and single-item endpoint; do not broaden board fan-out. Rate-limit or
permission failures must render an explicit unavailable state or existing error boundary, never
stale evidence presented as current.

## 5. Out of scope

- UI-004 attention queue, stage selector, filters, card redesign, and UI-011 responsive runs.
- UI-008 guarded decision workflows or any new decision/mutation endpoint.
- UI-009 evidence manifest/artifact system, integrity verification, or provenance production.
- UI-010 durable/live event timeline.
- Factory/meta schema, index projection, reconciler, lifecycle, or queue changes.
- Database/storage additions, card drag-and-drop, desktop navigation redesign, or public auth.
- Automatic approval/merge, heuristic or probabilistic readiness/blocker inference, or evidence
  synthesis. Lossless deterministic normalization of an explicit source state is permitted by §3.
- Editing the related plan/proposals/specs or resolving their lifecycle relationship.

## 6. Risks and mitigations

- **Unverified checkout paths:** Slice 0 verifies anchors and stops on behavioral contradiction;
  path-only drift is recorded without expanding scope.
- **Adapter becomes a second domain authority:** `WorkDetail` is presentation normalization only;
  source status, revision, and evidence values remain authoritative and losslessly traceable.
- **Unknown rendered as safe:** union exhaustiveness and fixtures forbid boolean/default coercion;
  vetoes and unavailable fields have independent representations, and issues without a source
  revision render revision unavailable.
- **Gate regression during layout move:** gate code is reused, its revision SHA is preserved, and
  UI-001 outcome tests are mandatory Slice 4 gates.
- **Sticky content obscures anchors/mobile content:** safe-area/sticky tokens from the dependency
  are reused, with scroll-offset and 320–430 px overflow tests.
- **GitHub rate/permission failures:** reuse existing server cache/auth and expose unavailability;
  do not retry client-side or leak credentials.

## 7. Acceptance matrix

| Case | Expected observable result | Proof |
|---|---|---|
| Complete spec/proposal | Summary precedes raw body; exact blob SHA shown | Adapter + component test |
| Legacy item | `EVIDENCE INCOMPLETE`; named gaps; no zero/green fallback | Fixture test |
| Failed review | Veto before score; review/document disclosure expanded | Component + Playwright |
| Blocked item | Blocker indicator is in the first viewport; full blocker is above disclosures | Mobile Playwright |
| Issue card | Internal route opens; separate source link opens GitHub | Route + Playwright |
| Invalid issue ref | 404 without partial evidence | Loader test |
| Stale action | Existing frozen 409 conflict/reload experience | Gate regression test |
| Approved but queue pending | Existing persistent 202 partial outcome | Gate regression test |
| Flag off/unset/invalid | Existing detail remains usable; issue route does not external-redirect | Playwright |
| Deep link | Target heading visible/focused below sticky strip | Accessibility test |

## 8. End-to-end verification

From the `minion-base` repository after Slice 0 confirms script names:

```bash
bun install --frozen-lockfile
bunx svelte-kit sync
bun test
bun run check
bun run lint:design
bun run build
env -u PUBLIC_WORK_DETAIL_V2 bun run test:e2e --grep "work detail"
PUBLIC_WORK_DETAIL_V2=0 bun run test:e2e --grep "work detail"
PUBLIC_WORK_DETAIL_V2=invalid bun run test:e2e --grep "work detail"
PUBLIC_WORK_DETAIL_V2=1 bun run test:e2e --grep "work detail"
```

Each flag-mode invocation must start an independent test server (and rebuild first if Slice 0
finds the selected SvelteKit public-env import is build-time) so a previous process or build cannot
make the flag matrix pass accidentally.

The E2E suite must start at `/kanban`, open an issue card internally, verify the separate source
link, then open complete, legacy, failed-review, blocked, and stale-revision fixtures. At 390×844
it asserts the first-viewport contract, follows every stable anchor, confirms disclosure defaults,
and exercises the existing arm→confirm gate through success, queue-pending, and revision-conflict
responses. Repeat the overflow assertion at 320/430 px and the semantic hierarchy check at
768/1280/1920 px. Finally, run a production-preview smoke test behind auth: anonymous access
remains fail-closed, an authenticated issue/detail load returns 200, no server credential appears
in HTML/page data, and setting the flag off restores the prior renderer without a deploy-time data
operation.
