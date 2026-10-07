---
id: 2026-10-07-readiness-workshop-workspace-lifecycle-spec
title: One owned Workshop workspace lifecycle — loads and writes cannot erase state (HC-037)
stage: dev
status: implementing
pass: 2
verdict: pending
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub]
tags: [ui, data, logic, test]
type: fix
proposal: 2026-10-07-hub-readiness-state-integrity-followups
findings: [HC-037]
pr: pending
---

# Workshop workspace lifecycle (HC-037)

## 0. Product

A workspace the user has open is never erased by a request that failed, never replaced by a
request that lost a race or belongs to a previous actor/org, and the save indicator never says
"Saved" for a write the server did not acknowledge. HC-037
(`2026-10-02-hub-gateway-production-readiness-recon`, approved proposal
`2026-10-03-readiness-workshop-owned-persistence`).

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc037-workshop-workspace-lifecycle.md`).

## 1. AS-IS (hub `master` `802a62d0`, `src/lib/state/workshop/workshop.svelte.ts`)

| Defect | Mechanism | Red proof |
|---|---|---|
| Create erases the live workspace before the server answers | `createBlankSave` (L459–474) calls `resetWorkshop()` first, then POSTs; a rejected POST throws with the blank state already published and `saveSync.activeSaveId` still pointing at the loaded workspace. The pending 300 ms autosave then writes the blank slices under the host key and the 2 s debounce PUTs the blank snapshot to the *previous* save id. The list route (`routes/(app)/agents/workshop/+page.svelte` L44–61) has no catch — unhandled rejection, nothing shown. | `workshop-lifecycle.svelte.test.ts` (1): `expected [] to deeply equal ['a1', …]` |
| Open has no owner | `openSave` (L438–457) publishes whatever response arrives and sets `activeSaveId` unconditionally. Open A then B with A late → A overwrites B's state and identity; the list route's `handleOpen` persists and navigates for A as well. Actor/org rotation between dispatch and completion is never checked; the debounced PUT (L403–427) sends under whoever is signed in now. | (2): `expected 'A' to be 'B'`; mounted: `gotos` contains both `/agents/workshop/B` and `/A`; `expected ['PUT /api/workshop/saves/A'] to deeply equal []` |
| Failed persistence looks saved | `saveSync.lastSavedAt` is set by the localStorage debouncer (L116–131) before the DB PUT starts; the PUT callback never reads `res.ok` and swallows network errors. `WorkshopToolbar.svelte` (L124–140) shows "Saved hh:mm" after a 500 or a dropped connection. | (3): `saveSync.status` is `undefined` |
| Host switch persists blank data | `gateway.svelte.ts` L866–869: `autoSave(host); resetWorkshop()` schedules an autosave and blanks the state 0 ms later, so the trailing debounce persists the *blank* snapshot — same class as create. | covered by the `resetWorkshop` flush case |

Four `TODO(handoff): HC-037` markers sat at the sites (`workshop.svelte.ts:410,439,460`,
`+page.svelte:45`). Red run: `evidence-hc037/vitest-red-prefix.log` — **2 files, 11 failed /
1 passed (12)**.

## 2. TO-BE

One owned lifecycle in the state module, mirroring `services/gateway/session-owner.svelte.ts`
(handle captured at dispatch, checked before every publication):

```
WorkspaceOwner = { saveId, actorId, orgId, generation, current(): boolean }
```

| # | Invariant |
|---|---|
| 1 | `actorId`/`orgId` come from `userState` at dispatch; `generation` is a monotonic counter bumped by every open/create dispatch and by `resetWorkshop()`. Two slots: `intent` (latest load dispatched) and `active` (workspace on screen). A load completion publishes only while it is still the `intent` with matching actor/org; a save publishes status only while its owner is still `active` with matching identity, and is not sent at all when the identity rotated. |
| 2 | `openSave(id): Promise<boolean>` — `true` published (state, `activeSaveId`, persisted active-save key), `false` superseded/stale, throws on a real failure. Callers persist and navigate only on `true`. |
| 3 | `createBlankSave(name): Promise<string \| null>` — POSTs a blank snapshot built from `blankWorkshopState()` **without touching live state**; on acknowledgement publishes the blank workspace under the new id; on rejection throws with everything intact; `null` when superseded. |
| 4 | `saveSync.status: 'idle' \| 'unsaved' \| 'saving' \| 'saved' \| 'failed' \| 'unknown'` — `unsaved` = local mutation not acknowledged; `saving` = PUT in flight; `saved` = acknowledged and no mutation since; `failed` = non-2xx; `unknown` = response lost (the write may or may not have landed). `lastSavedAt` moves only on acknowledgement (DB) or, with no active save, on the local write. |
| 5 | Recovery is explicit and bounded: `retryDbSave()` sends the *current* snapshot once under the current owner; no automatic replay of a failed PUT. |
| 6 | `resetWorkshop()` flushes the pending local autosave (real data) and the pending DB save (snapshot captured synchronously, before the state is cleared), then retires both owner slots and blanks the state — a host switch never persists blank data. Route teardown flushes instead of cancelling. |
| 7 | Visible status (toolbar): Saving… / Unsaved changes / Not saved + Retry / Save status unknown + Retry / Saved hh:mm. List route: pending admission (`loading`/`disabled` while a create/open/delete is in flight), failures via `toastError`. |
| 8 | **HC-026 preserved:** card markup untouched — open stays the native `type="button"` Button with the open → persist → goto ordering (now gated on `true`), Delete stays a named sibling Button, every route/transport path keeps `recordPathSegment(id)` encoding. `card-actions.mounted.test.ts` keeps guarding it; its fixture `openSave` now returns `true` so the qualified ordering is reproduced, not weakened. |

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `workshop.svelte.ts`: owner slots + `dispatchIntent`/`identityMatches`; `openSave`/`createBlankSave` fenced and non-destructive; `blankWorkshopState` extracted from `resetWorkshop`; `saveSync.status` + `retryDbSave` + `flushDbSave`; DB PUT checks `res.ok` and distinguishes thrown from rejected; `autoSave` bumps a mutation sequence so a mid-flight mutation keeps `unsaved`; `resetWorkshop` flush-then-retire; the three in-module `TODO(handoff): HC-037` removed | state tests (1)–(3) |
| 2 | `WorkshopToolbar.svelte`: status machine with semantic status tokens; Retry = ghost Button → `retryDbSave` | mounted + Chromium `30`–`33` |
| 3 | List route `+page.svelte`: try/catch + `toastError` on create/open/delete, one `busy` admission state, navigate only on `true`/id; its `TODO(handoff): HC-037` removed. `[id]/+page.svelte`: `flushDbSave` on destroy; stale `false` is a no-op, real failure toasts and returns to list | `workshop-lifecycle.mounted.test.ts` |
| 4 | `messages/{en,es}.json`: six appended keys `workshop_unsavedChanges`, `workshop_saveFailed`, `workshop_saveUnknown`, `workshop_createFailed`, `workshop_openFailed`, `workshop_deleteFailed` (carried in the staged HC-040 change on the same branch) | toasts asserted |
| 5 | Tests `workshop-lifecycle.svelte.test.ts` (state), `workshop-lifecycle.mounted.test.ts` (route); `tests/fixtures/card-actions/state.svelte.ts` `openSave` → `true`; native fixture `tests/fixtures/workshop-lifecycle/` (`Fixture.svelte`, `build.mjs`, `main.js`, `stubs/*`, `verify.mjs`) | red 11/12 → green 38/38 |

`gateway.svelte.ts` is untouched: its `autoSave(host); resetWorkshop()` sequence is fixed by
`resetWorkshop`'s flush-then-retire (DELTA 1). Unstaged diff: 17 files, +1041 / −101.

## 4. Verification

- State + route + sibling lanes: red **2 files, 11 failed / 1 passed (12)** on `802a62d0`
  (`evidence-hc037/vitest-red-prefix.log`); green **5 files, 38 passed (38)**
  (`vitest-green-postfix.log`) — the lifecycle state and mounted tests alongside the undo,
  banter and HC-026 card-action lanes. Mounted route test proves toast + no navigation on a
  rejected create, B-only navigation/identity on the A/B race, and a visible delete failure.
- Chromium (headless, scripted fetch transport, no login, no production data;
  `evidence-hc037/hc037-native-proof.json`): **24/24 checks** — create pending and rejected
  with toast and state preserved, A/B race with late A dropped, identity rotation dropped,
  unsaved / not-saved + Retry / retry acknowledged → saved / lost response → unknown, delete
  rejected. Screenshots `00`–`40` in the same directory.
- `lint:design` / `lint:tokens` debt not increased (`lint-*-{before,after}.log`);
  `svelte-check --threshold error` reports no new errors in touched files (`svelte-check.log`).

## 5. Implementation record

- Hub branch `fix/readiness-hub-state-integrity` (base `master` `802a62d0`), worktree
  `~/.cache/claude-tmp/hub-ui2-wt`. Change **unstaged, commit pending signing** (to be committed
  after the staged HC-040 change); message prepared at `~/.cache/claude-tmp/hc037-msg.txt`
  (`fix(workshop): own the workspace lifecycle so loads and writes cannot erase state`). No PR
  yet (`pr: pending`); it will share a PR with HC-040.
- Tests: red 11/12 → green 38/38; native 24/24.
- Markers: the four pre-existing `TODO(handoff): HC-037` are removed by this change; none is
  left behind.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-hc037/`.

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-state-integrity-followups.md`.
None carries an in-code `TODO(handoff)` — these are stated scope boundaries, not unwired code.

- Server-side conflict detection / versioned PUTs: a last-writer-wins workspace stays
  last-writer-wins; two tabs or two users on one save still overwrite each other silently.
- Canvas consumers' handling of a mid-frame workspace swap (PixiJS/Rapier sprites bound to the
  previous state while `openSave` publishes a new one).
- The legacy single-key autosave migration (localStorage key shape predating per-host slices).
- An optimistic delete on the `agents/workshop` list: delete stays pessimistic (the row is
  removed only after the DELETE is acknowledged; a rejection toasts and leaves the row) — the
  optimistic-with-rollback variant is not built here.
