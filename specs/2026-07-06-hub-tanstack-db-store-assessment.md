# Hub — TanStack DB + Store fit assessment: WAIT / SKIP

**Date:** 2026-07-06
**Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**Libraries:** TanStack DB — https://tanstack.com/db/latest · TanStack Store — https://tanstack.com/store/latest
**Verdicts:** Store = **SKIP** (permanent, for app code). DB = **WAIT** (good library, no measured problem here; triggers below).
**Bundled fixes:** two real rollback bugs found during recon are covered by the Query spec T3 (`specs/2026-07-06-hub-tanstack-query.md`) — nothing else in this assessment produces work.

---

## TanStack Store — SKIP for app code (confirmed from both sides)

- `@tanstack/svelte-store` v0.12 is genuinely runes-native (real `$state`/`$effect` in `useSelector.svelte.ts` — not a shim). The library isn't the problem.
- In a Svelte 5 runes app, `$state`/`$derived` beat it on every axis for code we own: no subscribe boilerplate, compiler-level granularity, zero added bundle. The hub's 13.5k lines of state code use zero `@tanstack/store` directly — it exists only as a transitive dep of `@tanstack/svelte-hotkeys` (bun.lock) and, once the Pacer spec lands, as the internal store our pacer wrapper subscribes to.
- Its only legitimate role here is exactly that: reading OUT of other TanStack libs' internal stores. That's consumption we already do inline; no adoption decision exists.
- Correction for future readers: the old `Store`/`Derived`/`Effect` triad in stale docs is gone — v0.11 exports `Store`, `createAtom`/`createAsyncAtom`, `batch`; `Derived`/`Effect` are no longer public API.

## TanStack DB — WAIT (library is real; the problem it solves isn't present)

**What it is:** client-side reactive collections + differential-dataflow live queries (`@tanstack/db-ivm`), optimistic transactions, sync adapters (query/electric/powersync/rxdb/trailbase + `localOnly`/`localStorage` built in). `@tanstack/svelte-db` 0.1.x is runes-native (`SvelteMap`, `$derived.by` — real implementation, not a shim). Core is pre-1.0: 123 releases in 14 months, no 1.0 milestone, **SSR explicitly unimplemented** ("routes using TanStack DB must disable SSR"; SvelteKit SSR issue #1196 open).

**Why WAIT, from the codebase evidence (this is the deciding half):**

- **No scale target.** Differential dataflow pays off at 10k–100k+ row live views. Hub maxima: agents = tens, sessions capped at 1,000 (LRU-evicted), reliability events paged at 2,000, registry catalog ~1,350 (IndexedDB-cached). Every derived view recomputes in microseconds; nothing is flagged or measured slow.
- **The state layer is already well-shaped.** The WS→state pipeline mixes full-array replacement (rosters — nothing incremental to save) with three small, correct hand-rolled incremental spots: the O(1) `sessionIndex` Map (`gateway-data.svelte.ts:8-10,82-95`), the presence de-thrash patch (`gateway.svelte.ts:882-911`), and the 15-line reliability summary fold (`reliability.svelte.ts:254-287`). No cross-module entity duplication, no `$effect` sync chains, no "keep in sync" pain comments beyond the one deliberate index note.
- **Joins barely exist.** The heaviest "live query" candidates are one keyed Map merge (`sessions/+page.svelte:41-46`, ≤1,000 rows) and a Fuse.js filter over ≤2,000 events (`ActivityLogTable.svelte:151-173`). Rewriting ~1,000+ lines of working, tested, domain-shaped modules to gain O(δ) updates on inputs this small is a rewrite for parity.
- **Persistence is covered.** `localStorageCollectionOptions` would replace the workshop per-slice autosave and the registry IndexedDB SWR cache — both already correct, debounced, versioned (~250 lines combined). Swap-for-swap, no new capability.

**What IS worth keeping from this recon (record, then close):**

- The custom sync-adapter interface is a genuinely good design and maps ~1:1 onto the gateway protocol if we ever need it: `sync({ begin, write, commit, markReady, metadata }) => cleanup`, with **buffer-events-before-initial-snapshot-then-replay** and `markReady()` (live queries hang without it), plus cursor persistence in `metadata` for reconnect resume. The buffer-before-ready pattern is a race our hand-rolled modules don't explicitly defend against today — if a WS-event-vs-initial-fetch race ever surfaces as a real bug, steal the pattern (30 lines), not the library.
- Query-language constraints for whoever integrates later: joins are equality-only (`JoinConditionMustBeEqualityError`), `limit/offset` require `orderBy`, updates are Immer-style drafts (`draft.x = y`, never reassign draft), Svelte binding needs getter-fn dep arrays and forbids destructuring `useLiveQuery` results.

**Re-adoption triggers** (any one → re-run this assessment):
1. An entity domain grows past ~10k client-side rows with live cross-collection joins (e.g., multi-gateway fleet view, full reliability event history client-side).
2. `@tanstack/db` hits 1.0 AND SvelteKit SSR support ships (#1196 closed).
3. We adopt ElectricSQL/PowerSync-style Postgres sync for any module (the collection adapters then come for free).
4. A third+ hand-rolled incremental-aggregate-maintenance site appears (today: 1 — the reliability fold; at 3+, the uniform mutation/sync lifecycle starts paying).

---

## Series status (rounds 1–3 complete)

| Library | Verdict | Spec |
|---|---|---|
| Virtual | ADOPT (core + runes wrapper) | `specs/2026-07-05-hub-tanstack-virtual.md` |
| Pacer | ADOPT-NARROW | `specs/2026-07-06-hub-tanstack-pacer.md` |
| AI | SKIP (+W1–W3 cleanup) | `specs/2026-07-06-hub-tanstack-ai-assessment.md` |
| Query | ADOPT-NARROW | `specs/2026-07-06-hub-tanstack-query.md` |
| DB | WAIT | this doc |
| Store | SKIP | this doc |

Cross-spec collisions to sequence: Virtual T2/T4 ↔ AI W1 (SessionViewer), Virtual T4 ↔ Pacer T3.4 (AgentRegistry), Pacer T2.2 ↔ Query T2.3 (marketplace search). Land one spec at a time; rebase the later ones.
