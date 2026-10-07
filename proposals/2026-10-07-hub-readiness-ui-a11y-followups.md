---
id: 2026-10-07-hub-readiness-ui-a11y-followups
title: Open-items ledger for the readiness UI/a11y batch (HC-043, HC-028, UI-002, HC-029, HC-027, GW-027)
status: draft
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub, minion]
tags: [todo, handoff-sweep, ui, security, test]
value: 6
effort: M
source: readiness-ui-a11y-batch-2026-10-07
---

# Readiness UI/a11y batch — open-items ledger

## Problem

The 2026-10-07 readiness batch (hub draft PR
[#437](https://github.com/NikolasP98/minion_hub/pull/437) on `fix/readiness-hub-ui-a11y`;
gateway PR [#296](https://github.com/NikolasP98/minion-ai/pull/296) on `fix/readiness-gateway`)
closed five findings from `2026-10-02-hub-gateway-production-readiness-recon` and left 13
`TODO(handoff)` markers plus four unmarked open ends behind. Per AGENTS.md's open-items ledger
rule every one of them must be written down here or it never gets fixed. This proposal is that
ledger; it authorizes no change by itself.

Specs this ledger closes the loop for:

| Spec | Finding | Commit | PR |
|---|---|---|---|
| `2026-10-07-readiness-mention-contrast-spec` | HC-043 | hub `1f1def7a` | #437 |
| `2026-10-07-readiness-overlay-dialog-contract-spec` | HC-028 | hub `4fa49266` | #437 |
| `2026-10-07-readiness-calendar-toolbar-coarse-pointer-spec` | UI-002 | hub `0823c93c` | #437 |
| `2026-10-07-readiness-date-range-menu-keyboard-spec` | HC-029 | hub `821801d5` | #437 |
| `2026-10-07-readiness-tenant-event-audience-completion-spec` | GW-027 | gateway `44d2d0d45` | #296 (hold: GW-024) |

## AS-IS

Collected mechanically on 2026-10-07 from the two implementation checkouts:

```
git -C ~/.cache/claude-tmp/hub-ui-wt grep -n "TODO(handoff)" -- src tests scripts \
  | grep -E "HC-028|HC-043|UI-002|HC-029|HC-027"      # + scripts/qa/hc043/resolve.ts (HC-043 dir)
git -C ~/.cache/claude-tmp/gw023-wt grep -n "TODO(handoff): GW-005"
```

Counts: HC-028 = 8, HC-043 = 2, UI-002 = 2, HC-029 = 0, HC-027 = 0 (lane still in progress,
uncommitted, no marker yet), GW-005 = 1. Total 13. Line numbers are as of hub `821801d5` and
gateway `44d2d0d45`.

### HC-043 — mention contrast (2)

| # | Site | TODO text (verbatim) | Needs | Priority |
|---|---|---|---|---|
| 1 | `src/app.css:155` | `TODO(handoff): shares HC-043's structural defect — the runtime accent as link text measures 3.3–4.0:1 on every dark preset (scripts/qa/hc043/report.ts with fg=--color-accent); link foreground needs its own semantic contract.` | A `--color-link` (or link-on-surface) semantic token in `packages/design-tokens/contract.json` tuned per preset for ≥ 4.5:1 on canvas/surface-1/2/3, `a { color: var(--color-link) }` in `app.css`, and the `hc043` matrix extended with a `link` surface. Token-contract change ⇒ ui-design-governance skill + `lint:tokens`. | P2 — every dark preset fails AA on body links today |
| 2 | `scripts/qa/hc043/resolve.ts:77` | `TODO(handoff): solarized-light --color-text-primary #586e75 on --color-surface-3 #eee8d5 = 4.39:1 (meta packages/design-tokens/contract.json only gates text against canvas); gruvbox-light text-destructive on bg-destructive/15 over surface-3 = 3.86:1 (ChatMessage error bubble). Remove an entry once its surface clears 4.5:1.` | Retune `solarized-light` `--color-text-primary`/`--color-surface-3` and `gruvbox-light` `--color-danger-fg` in the token contract; extend the contract gate to check text against surface-1/2/3, not only canvas; then delete the two `KNOWN_SURFACE_TEXT_GAPS` entries so the test fails if they regress. | P3 — not chat hosts; two presets |

### HC-028 — overlay dialog contract (8)

| # | Site | TODO text (verbatim) | Needs | Priority |
|---|---|---|---|---|
| 3 | `src/lib/components/agents/SectionProseEditor.svelte:269` | `TODO(handoff): HC-028 hand-rolled modal; migrate to the shared Dialog (size="xl"). Not mechanical: the header carries the scope toggle + variant tabs, and outside-click dismissal must be gated on unsaved slot.dirty edits (today a stray click discards them). See spec-hc028-overlay-dialog-contract.md DELTA 2.` | Migrate to `Dialog size="xl"` with a custom header snippet; `dismissible={!hasDirty}` where `hasDirty = slots.some(s => s.dirty !== null)`; add a case to `overlay-dialog-contract.mounted.test.ts`. | P2 — data loss: a stray click discards unsaved edits today |
| 4 | `src/lib/components/agents/AgentSettingsPanel.svelte:239` | `TODO(handoff): HC-028 hand-rolled drawer; migrate to the shared Sheet. Not mechanical: 680px two-column layout vs the Sheet's fixed 28rem width, and the window-level Escape listener closes it even when a nested Zag menu owns the key. See spec-hc028-overlay-dialog-contract.md DELTA 2.` | Either a `Sheet` `width` prop (one-line primitive change) or `Dialog` with a side-anchored variant; drop the window-level Escape listener so the UA `cancel` path runs (nested Zag menus then own Escape first). | P2 — Escape steals from nested menus |
| 5 | `src/lib/components/builder/AgentCreateWizard.svelte:236` | `TODO(handoff): HC-028 hand-rolled wizard modal; migrate to the shared Dialog. Not mechanical: multi-step chrome, Mod+Enter hotkey and step-scoped outside-click policy. See spec-hc028-overlay-dialog-contract.md DELTA 2.` | Wrap in `Dialog`; keep step chrome as content; `dismissible = !inFlight`; Mod+Enter stays a content-level handler. Share the approach with #6. | P3 |
| 6 | `src/lib/components/marketplace/AgentCreatorWizard.svelte:147` | `TODO(handoff): HC-028 hand-rolled wizard modal; migrate to the shared Dialog. Not mechanical: multi-step wizard with its own step chrome and no Escape path at all. See spec-hc028-overlay-dialog-contract.md DELTA 2.` | Same as #5; today there is **no Escape path at all**, so the mechanical `Dialog` wrap already fixes the worst of it. | P2 — keyboard users cannot leave it |
| 7 | `src/lib/components/workshop/RelationshipPrompt.svelte:44` | `TODO(handoff): HC-028 hand-rolled modal anchored at canvas (x,y); the shared Dialog centres itself (auto margins) and has no anchor API. Needs a positioned-dialog decision (Popover vs Dialog with an anchor). See spec-hc028-overlay-dialog-contract.md DELTA 2.` | Decision: a Zag `Popover` anchored to a virtual element at (x,y) (non-modal, matches "transient canvas prompt"), or a `Dialog` `anchor` prop. Prefer Popover — no primitive change. | P3 |
| 8 | `src/lib/components/my-agent/EaselBoard.svelte:323` | `TODO(handoff): HC-028 claims aria-modal="true" without a native modal (no inert background, no Tab trap, no focus return). Full-screen mode, not a dialog: either open through the shared Dialog or drop the modal claim. See spec-hc028-overlay-dialog-contract.md DELTA 3.` | Drop `aria-modal="true"` (full-screen mode is a view, not a dialog) — one attribute; or `Dialog size="full"`. | P3 — mis-claim misleads AT only |
| 9 | `src/lib/components/my-agent/ZenMode.svelte:103` | `TODO(handoff): HC-028 claims aria-modal="true" without a native modal (no inert background, no Tab trap, no focus return). Full-screen mode, not a dialog: either open through the shared Dialog or drop the modal claim. See spec-hc028-overlay-dialog-contract.md DELTA 3.` | Same as #8. | P3 |
| 10 | `src/lib/components/layout/BugReporter.svelte:97` | `TODO(handoff): HC-028 floating panel claims aria-modal="true" but is non-blocking by design (the page stays usable while it is open): drop the modal claim (aria-modal="false" like DraggableWindow) rather than trapping focus. See spec-hc028-overlay-dialog-contract.md DELTA 3.` | `aria-modal="false"` — one attribute. | P3 |

### UI-002 — calendar toolbar coarse pointer (2)

| # | Site | TODO text (verbatim) | Needs | Priority |
|---|---|---|---|---|
| 11 | `src/lib/components/scheduling/CalendarWindowIssues.svelte:39` | `TODO(handoff): UI-002 — on a coarse pointer this Retry is the sm 28px control (measured 56×28 at 390×844 in evidence-ui002); the toolbar's 44px floor does not reach it. Governance asks shared error/retry controls for the same touch-height check as toolbars.` | A by-role 44 px floor under `(max-width: 767.98px), (pointer: coarse)` on the issues banner's `button` (same rule shape as the toolbar's), plus a Retry-size assertion in `calendar-mobile.spec.ts`'s error-state pass. | P3 |
| 12 | `tests/e2e/ui-audit/calendar-mobile.spec.ts:138` | `TODO(handoff): UI-002 — this test and "Staff and event-type filters narrow the grid" still expect the aggregate "All" lane beside a single staff column; #434 (day view drops the aggregate column beside a single staff column) made a one-staff day view ONE lane, so both were already red before the UI-002 toolbar fix (evidence-ui002/logs/playwright-foreign-failures-also-red-PRE-FIX.log). Re-baseline DAY_LANES expectations for the single-staff case.` | Change `expect(m.lanes).toHaveLength(2)` → `1` in both tests (the #434 behaviour is intended). Two red assertions in a committed e2e spec since hub #434 — this is the "two assertions already red" open end from the task brief. | P2 — a red e2e file masks new regressions |

### HC-029 — date-range menu keyboard (0 markers)

No `TODO(handoff)` was left; the unmarked open ends are in the next section.

### HC-027 — `role="button"` keyboard contract (0 markers, lane in progress)

At collection time the HC-027 lane was uncommitted in `hub-ui-wt` (`src/lib/a11y/button-keys.ts`,
`src/lib/a11y/role-button-keys.mounted.test.ts`, 19 modified components; a pointer-only drag
handle note in `AgentSettingsPanel.svelte`). No marker exists yet. When that lane commits, append
its markers here (same `git grep` as above) before #437 leaves draft.

### GW-005 — orchestration progress audience (1)

| # | Site | TODO text (verbatim) | Needs | Priority |
|---|---|---|---|---|
| 13 | gateway `src/gateway/server.impl.ts:751` | `TODO(handoff): GW-005 — pi-agent.orchestration-progress is admin-guarded in EVENT_SCOPE_GUARDS (server-broadcast.ts) because no emitter is wired yet and the bus carries no session key. Before any emitter is wired it must resolve audience: resolveSessionAudience(sessionKey) here and move to AUDIENCE_REQUIRED_EVENTS, like heartbeat / cron.` | The orchestration event bus gains a `sessionKey` on every event; the bridge passes `audience: resolveSessionAudience(sessionKey)`; move the event from `EVENT_SCOPE_GUARDS` to `AUDIENCE_REQUIRED_EVENTS`; `tenant-events.test.ts` case 9 flips from "admin-only" to "session audience, withheld when unresolved". Must land in the same PR as the first emitter. | P1 — security: wiring an emitter first reintroduces the GW-023 class of leak |

### Unmarked open ends (no in-code `TODO(handoff)`)

| # | Finding | Open end | Needs | Priority |
|---|---|---|---|---|
| U1 | HC-029 | `@minion-stack/ui` `Button shape="icon"` renders 30×24 on desktop, not square: `px-2` from the size recipe beats `shape="icon"`'s `px-0` in Tailwind source order (the ⋯ trigger in `DateRangeControls`). | Fix in the shared package (`packages/ui` Button recipe: emit the icon shape's padding after the size padding, or use `!px-0`), publish, bump hub. Same class of bug as the earlier "Button base beats caller" / `role` clobber. | P3 — desktop recipe is governance-compliant; cosmetic |
| U2 | HC-028 | `builder/SkillCreateWizard.svelte` stays `dismissible` while `creating`: Escape or a backdrop click dismisses a pending POST. The mechanical migration kept the pre-existing behaviour. | `dismissible={!creating}` on its `<Dialog>` + a mounted case asserting Escape is ignored while `creating`. One-line fix. | P2 — a dismissed in-flight create can double-submit on retry |
| U3 | HC-043 | `a { color: var(--color-accent) }` body links share the mention defect (3.3–4.0:1 on dark presets). | Same work item as #1 above — listed here because the task brief names it separately. | P2 |
| U4 | UI-002 | The two `calendar-mobile.spec.ts` assertions red since hub #434. | Same work item as #12 above. | P2 |
| U5 | UI-002 | `/pos/appointments` shares `BookingCalendar` and inherits the fix but was not separately measured (no switch; same switcher/tabs/nav/tools). | One 390×844 coarse measurement pass with the existing `evidence-ui002/logs/measure.js` against the POS route fixture. | P3 |
| U6 | GW-027 | Job-level `cron` events (`added`/`updated`/`removed`) carry no session key and are now withheld from tenants (admin only). Whether any tenant hub surface listened to them was not verified by the documentation lane. | `grep -rn "'cron'" minion_hub/src` for tenant-role subscribers; if one exists, give job events an org audience instead. | P3 |
| U7 | GW-027 | Gateway PR #296 is on hold for GW-024 (legacy credential bypass); the hub consumer (#436) is already live, so hub tolerates both gateway states. | Land GW-024, then merge #296. Tracked in the readiness program, repeated here for completeness. | P0 (GW-024 itself) |

## TO-BE

Every row above is either closed by a commit that removes its marker (and this ledger row is
struck through with the commit sha) or explicitly rejected with a reason. The HC-027 section is
filled before hub #437 leaves draft. `git grep "TODO(handoff)" | grep -E "HC-028|HC-043|UI-002|GW-005"`
on hub `master` / gateway `DEV` returns only rows still open here.

## DELTA

Suggested grouping into slices (each a junior-dev half day):

1. **Security first:** #13 (GW-005) travels with the first orchestration emitter — never separately.
2. **Data-loss/keyboard P2s:** #3, #4, #6, U2 — four overlay follow-ups, one hub PR, re-using
   `overlay-dialog-contract.mounted.test.ts`.
3. **Test hygiene:** #12/U4 — one-line re-baseline, immediately.
4. **Token contract:** #1/U3 + #2 — one design-tokens PR (meta `packages/design-tokens`) + hub
   adoption; needs the ui-design-governance skill.
5. **Cosmetic P3s:** #5, #7, #8, #9, #10, #11, U1, U5, U6 — batch when touching the files.

## Out of scope

Re-doing any of the five closed findings; the HC-027 lane itself (its own spec follows when it
commits); GW-024 (owned by the readiness program).

## Definition of done

- Every numbered row has a closing commit sha or a rejection reason.
- The two `git grep` commands in AS-IS return no rows that are absent from this file.
- `proposals/index.json` regenerated (`node scripts/proposal-index.mjs`) on every edit.

## Reconciliation merge — 2026-10-07

The factory handoff-ledger sweep independently filed one `handoff-minion-hub-*`
marker per file for the same 2026-10-07 batch; each is a mechanical, file-scoped
duplicate of a row already tabulated above (same repo/path/line ± post-collection
drift/no new content beyond a GitHub permalink). Tombstoned as merged, no unique
content:

- handoff-minion-hub-3801495216 (`src/app.css` → row #1)
- handoff-minion-hub-750555389 (`scripts/qa/hc043/resolve.ts` → row #2)
- handoff-minion-hub-2055892347 (`src/lib/components/agents/SectionProseEditor.svelte` → row #3)
- handoff-minion-hub-2569479786 (`src/lib/components/agents/AgentSettingsPanel.svelte` → row #4)
- handoff-minion-hub-1135390610 (`src/lib/components/builder/AgentCreateWizard.svelte` → row #5)
- handoff-minion-hub-1063105272 (`src/lib/components/marketplace/AgentCreatorWizard.svelte` → row #6)
- handoff-minion-hub-1848377581 (`src/lib/components/workshop/RelationshipPrompt.svelte` → row #7)
- handoff-minion-hub-1393930408 (`src/lib/components/my-agent/EaselBoard.svelte` → row #8)
- handoff-minion-hub-1528821121 (`src/lib/components/my-agent/ZenMode.svelte` → row #9)
- handoff-minion-hub-4235974689 (`src/lib/components/layout/BugReporter.svelte` → row #10)
- handoff-minion-hub-2471413522 (`src/lib/components/scheduling/CalendarWindowIssues.svelte` → row #11)
- handoff-minion-hub-3787739678 (`tests/e2e/ui-audit/calendar-mobile.spec.ts` → row #12)
