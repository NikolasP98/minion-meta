---
id: 2026-08-03-crm-relationship-graph-v2-port-spec
title: CRM Relationship Graph v2 — Port to `master` (branch slice 4/5)
stage: spec
status: shipped
pass: 1
created: 2026-08-03
updated: 2026-08-13
repos: [minion_hub]
---

# CRM Relationship Graph v2 — Port to `master` (branch slice 4/5)

**Date:** 2026-08-03
**Status:** Proposed (ready for execution)
**Owner surface:** `minion_hub` — `/crm`, `/crm/graph`, `crm-relationship*.service.ts`, `/api/crm/**`
**Design authority:** [`specs/2026-07-23-crm-relationship-graph-v2-spec.md`](2026-07-23-crm-relationship-graph-v2-spec.md) — **unchanged by this document.** This spec covers *porting mechanics only*.
**Prereq reading:** memory `feat-level-branch-disposition`, `crm-relationship-graph-v2-2026-07-23`, `hub-deploy-workflow`

---

## 1. Context

`feat/level-2026-07-30` is a live integration branch that cannot be rebased onto `master`
(a rebase resurrects `socials/ad-performance/+page.server.ts`, which PR #88 deleted). Its
work is being landed as scoped PRs branched off `origin/master`:

| Slice | Work | Status |
|---|---|---|
| 1 | `messages_realtime_broadcast` | ✅ PR #89 `b0713ded` — prod-verified |
| 2 | `bank statement imports` | ✅ PR #90 `71f0ab78` |
| 3 | `module-availability refactor` | ✅ PR #91 `d4424d24` — re-derived |
| **4** | **CRM relationship graph v2** | **this spec** |
| 5 | brains/SUSII diagnostic scripts | pending |

Source commit: **`203375e4`** — 39 files, **+3,759 / −146**.

**Verified against `origin/master` on 2026-08-03 — master has NONE of this work:**
`_relationship` occurrences = 0, `crm-relationship*` files = 0, `/crm/graph` route = 0.
There is no partial-landing to reconcile.

**Verified NOT a dependency:** `brain-hybrid-retrieval.service.ts` already exposes
`vector?: boolean` on master (line 68). The `vector:false` retriever option the design
spec calls for **already exists** — do not re-add it.

---

## 2. Four porting hazards (each has bitten a previous slice)

### H1 — `crm-insights.service.ts` is BINARY to git 🚨

The file contains a **NUL byte** (10,882 bytes; 10,881 after stripping `\0`) on *master
as well as the branch*. `git diff`/`git show` therefore emit `Binary files … differ`
instead of a hunk, and **a text patch silently omits the file's 2.5 KB of changes** —
no error, no conflict, just missing code.

**Required handling** — do NOT rely on `git show 203375e4 | git apply`:

```bash
# Option A (preferred): binary-aware patch
git show --binary 203375e4 -- src/server/services/crm-insights.service.ts | git apply --3way -

# Option B: take the file wholesale, then re-verify it contains ONLY 203375e4's delta
git checkout 203375e4 -- src/server/services/crm-insights.service.ts
git diff --stat HEAD -- src/server/services/crm-insights.service.ts   # must be non-empty
```

Option B is only safe because **no other branch commit touches this file** (verified).
**Acceptance:** after applying, `git diff --stat HEAD` must list
`crm-insights.service.ts`. If it does not appear, the port is incomplete — this is the
exact failure mode that makes the hazard dangerous.

*(Related known-issue: a NUL byte also makes `grep` treat the file as binary and skip
it silently — see memory `codebase-leveled-2026-07-30`. Use `grep -a` when searching it.)*

### H2 — Three files carry unrelated in-flight perf work

These files are touched by `203375e4` **and** by newer branch commits that are **not**
on master and are **not** part of this slice:

| File | Other commit | What that commit is |
|---|---|---|
| `src/server/services/crm-contacts.service.ts` | `831da4b0` | perf: cut WAN round-trips, cache hot reads |
| `src/routes/(app)/crm/customers/+page.svelte` | `1e1804c1` | perf: stream the customers roster |
| `src/routes/(app)/crm/customers/+page.server.ts` | `1e1804c1` | perf: stream the customers roster |

**Do not** `git checkout 203375e4 -- <file>` for these — that drags in nothing from the
perf commits (they are later) but *does* discard any master-side evolution. Apply the
**commit-scoped delta** instead, which is what `git show 203375e4 -- <file>` produces:

```bash
git show 203375e4 -- <file> | git apply --3way -
```

The perf work is a separate future slice; a co-agent is actively iterating on it
(see `specs/2026-08-03-crm-customers-server-pagination-spec.md`). **Landing any of it
here would conflict with that spec's server-pagination rewrite.**

### H3 — `/crm/graph` route contract (deliberately deferred by PR #91)

PR #91 **dropped** the `/crm/graph` manifest + access-registry entries because the route
did not exist yet on master. This slice adds the route, so those entries must come back
*here*, together with the counter bump:

1. `src/lib/routes/route-design-manifest.ts` — re-add
   `screen('/crm/graph', 'CRM relationship graph', 'business-operations', 'canvas-kanban')`
   and bump the section comment `CRM, finance, sales, support and work (15)` → `(16)`.
2. `src/lib/routes/route-access-registry.ts` — re-add
   `{ key: 'crm.graph', label: 'Graph', route: '/crm/graph' }`.
3. `src/lib/routes/route-design-validation.ts` — `endpoints: 149 → 150`, `screens: 139 → 140`.
4. `src/lib/routes/route-design-contracts.test.ts` — bucket `B: 67 → 68`, and update the
   comment to say `/crm/graph` added one back.

**Do not copy the branch's numbers (151/141, B:69)** — those also counted the
`ad-performance` route master deleted. The correct post-merge values are **150 / 140 /
B:68**, i.e. master's current counts **+1** for this one new screen.

### H4 — The new tick endpoint needs THREE registrations or it silently never runs

`src/routes/api/crm/relationship/tick/+server.ts` is new. Per
`src/lib/automations/system-automations.ts`, a tick without all three is dead code — the
file's own header cites `/api/crm/dni-validation/tick` as a built-and-allowlisted tick
that was **never scheduled and silently never ran**:

1. the route (in this commit);
2. an entry in the **`hooks.server.ts` unauthenticated-API allowlist**;
3. a **crontab line on netcup** — outside this repo.

Because (3) cannot be done in a PR, add the manifest entry with **`wiring: 'unscheduled'`**
and a `messages/*.json` key pair (`automation_crm_relationship_{title,desc}`). Claiming
`netcup` for an unscheduled tick is explicitly worse than omitting it.

⚠️ Also note memory `hub-netcup-cron-ticks`: the netcup crontab was **pruned** to a
production-recovery lane (`meta` + `jobs` only). Several manifest entries claiming
`netcup` are currently stale. Do not "fix" them in this PR; scheduling is a follow-up
decision for the user.

---

## 3. Work plan

### WP1 — Branch + apply (mechanical)

```bash
cd minion_hub
git fetch origin
git worktree add .worktrees/crm-relationship-graph -b feat/crm-relationship-graph-v2 origin/master
cd .worktrees/crm-relationship-graph
bun install && bunx svelte-kit sync && bun run i18n:compile && cp ../../.env .env
```

Apply in this order, checking each step:

1. `git show 203375e4 | git apply --3way -` — expect the binary file to be skipped (H1).
2. Apply `crm-insights.service.ts` per **H1**. Verify it appears in `git diff --stat`.
3. Resolve any conflicts in the three H2 files, keeping **only** `203375e4`'s hunks.
4. Apply the **H3** route-contract edits by hand.
5. Add the **H4** manifest entry + i18n keys.

### WP2 — Reconcile against master's newer code

`203375e4` predates PRs #88–#91. Re-check these seams before trusting a clean apply:

- **`crm/+page.server.ts`** — PR #87 replaced its hand-rolled `T23:59:59` range parse
  with the shared `toTimestamps()` adapter. The branch version predates that. **Keep
  master's `toTimestamps()` call**; layer the relationship changes on top. Range filters
  are inclusive at both endpoints (`ui-design-governance` rule).
- **Module gating** — PR #91 centralised route guards. The new `/crm/graph` route
  inherits `crm` gating from the `/crm` prefix in `MODULE_MANIFEST`; it must **not**
  hand-roll an `isModuleEnabled` 404. Confirm `resolveModuleForPath('/crm/graph')`
  resolves to `crm`, and extend `src/lib/modules/deguarded-routes.test.ts` with that pair.
- **`crm-insights.service.ts`** — `/crm/insights` gained sentiment/wins/lead-origin work
  on the branch; only the parts inside `203375e4` belong here.

### WP3 — Security + correctness review (do NOT skip)

Confirmed requirements from the design spec, each needing an assertion in tests:

| Requirement | Where |
|---|---|
| `shouldMaskSensitive` principals receive **no relationship data at all** — the roster is cached and serialised to the browser, and `pii.ts` masking is shallow | `crm-contacts.service.ts` sanitiser |
| `_relationshipClaim` (the inference lease) is **internal-only** and always stripped | same sanitiser |
| `_relationship` writes use an **atomic `jsonb_set` JSON-path setter** — `_funnel`'s read-modify-write is not concurrency-safe | relationship service |
| `label:null` + `source:'user'` means the user **cleared** it; AI must not refill | inference service |
| Personal-org restriction enforced in **tick SQL** (`organizations.kind='personal'`) **and** re-checked in-service — not via `locals.orgKind` (cron has no user locals), not via `effectiveModuleEnabled` (crm is available to both kinds) | tick + service |
| Inference cron principal is `searchableModules:['crm'], fieldLevels:{crm:1}` — **never** owner/admin (that path falls back to a legacy vector search that throws when embeddings are disabled) | tick |
| Dirty gate is `inputSig` (aggregate `crm_conversation_index.content_sig`); rerun only on missing / sig-change / version-change / cooldown / explicit refresh — **never age-based** | inference service |
| Advisory xact lock ends **before** LLM calls, so exclusivity comes from an **atomic expiring claim**; caps per-org 5, global 25/tick, concurrency 2 | tick |

RBAC needs no new wiring: `['/api/crm', 'crm']` is already in `API_WRITE_PREFIXES`, so
all new `/api/crm/**` mutations are centrally write-gated. Verify, don't assume.

### WP4 — Gates

```bash
bun run check                                   # must be 0 errors / 0 warnings
bun run vitest run src/lib/components/crm/ src/server/services/crm-*.test.ts \
                   src/routes/api/crm/ src/lib/modules/ src/lib/routes/
bun run lint:tokens
DESIGN_LINT_BASE_REF=origin/master bun run lint:design   # ⚠️ see below
```

🚨 **`lint:design` silently exits 0 in a master-based worktree.** It defaults its base to
`origin/dev`, which no longer exists, prints `per-file debt skipped`, and returns 0 —
indistinguishable from a pass. This slice adds `CrmGraph.svelte` (460 lines) plus edits
to 6 more `.svelte` files, so the ratchet genuinely matters here. **Always pass
`DESIGN_LINT_BASE_REF=origin/master`.**

`CrmGraph.svelte` is a **canvas/data-viz surface** — expect `raw-icon-size` /
categorical-colour findings. Chart colours must be resolved through
`cssVar()`/`chartColors()`; a raw `'var(--token)'` string renders gray on canvas and a
sankey gradient throws. Any genuine exception goes in
`scripts/design-lint-exceptions.json` with a **numeric cap** + category + reason.

### WP5 — Ship

PR → `master`, squash-merge with `--admin` (the Vercel required check never resolves).
No migration runs: `_relationship` lives in `custom_fields`, so **zero DDL**.
Post-deploy: confirm Production `● Ready`, then `/en/crm/graph` returns 302 (auth), not
404 (guard mis-mapping) or 500.

---

## 4. Acceptance criteria

1. `git diff --stat HEAD` lists **all 39 files**, `crm-insights.service.ts` included.
2. None of `831da4b0` / `1e1804c1` perf work is present.
3. Route contract = **150 endpoints / 140 screens / B:68**; contract test green.
4. `resolveModuleForPath('/crm/graph') → crm`, pinned in `deguarded-routes.test.ts`.
5. `check` 0/0; full CRM + modules + routes test selection green.
6. `DESIGN_LINT_BASE_REF=origin/master bun run lint:design` reports **no changed file
   increased governed debt** (and prints a real base line, not `skipped`).
7. A masked principal receives **no** `_relationship` and **no** `_relationshipClaim` —
   asserted by test, not by inspection.
8. Prod `/en/crm/graph` → 302, and the graph renders for an authenticated personal org.

## 5. Out of scope

Deferred by the design spec and **not** to be added here: generic edge-label layer,
ring-by-category layout, business-org relationship inference (client/supplier/staff),
raw-evidence quote UI. Also out of scope: scheduling the tick on netcup, and the
`lint:design` base-ref fallback fix (its own small PR).
