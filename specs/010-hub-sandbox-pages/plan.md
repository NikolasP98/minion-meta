# Implementation Plan: Sandbox pages

**Feature Dir**: `specs/010-hub-sandbox-pages` | **Spec**: `spec.md` | **Date**: 2026-10-15

## Summary
An admin-only `/sandbox` page where the floating assistant builds HTML/CSS/JS elements that run
in sandboxed iframes and read org data through one declarative, RBAC-aware query endpoint over a
server-owned dataset registry. Context engineering: tools are page-scoped (schemas exist only on
the page), the data catalog and samples are pulled JIT by tool calls, and a JEV `sandbox`
manifest injects the authoring protocol only on building turns.

## Technical Context
- **Repo / PR base**: `NikolasP98/minion_hub` → `master`. Package manager bun. Gates: prettier
  (svelte plugin), `svelte-check` (NODE_OPTIONS 6 GB), `bun run lint:design && bun run lint:tokens`,
  route-contract tests (`src/lib/routes/*.test.ts` + the two outside), targeted `bun run vitest run`.
  Never the full `bun run test`.
- **Local run**: `bun run dev:local` (containerized seeded Supabase + host Vite; personas in
  `.env.qa.local`; use the `tenancy.user.owner` persona — the first `qa-login` persona has an
  empty org).
- **Stack**: SvelteKit 2 / Svelte 5 runes, Postgres via `withOrgCore` + parameterized `sql`,
  Paraglide i18n, design-token contract, ECharts 6.1.

## Constitution Check
| Principle | Status | Note |
|---|---|---|
| I Spec before code | PASS | this spec; POC follows it |
| II AS-IS/TO-BE/DELTA with evidence | PASS | file:line anchors + information_schema columns |
| III Slice-scoped delivery | PASS | S1–S4 below; one hub PR for the POC (draft until owner approves), later slices separate |
| IV Required build steps | PASS | nav `requires`, registry `role:admin`, manifest screen, i18n keys, tokens, write-API gate (`requireAdmin` on element writes; `/api/sandbox` added to `API_WRITE_PREFIXES` as module `settings`… see decision D6), route-contract counts |
| V Security/data gates | **APPLIES** | user-authored JS executes in the browser; new generic read endpoint. Owner approves this spec before the POC merges; owner merges. The POC runs locally meanwhile. |
| Open-items ledger | the `sandbox` RBAC module (vs role:admin), write tools, sharing → `TODO(handoff)` + proposal entry | |
| Artifact layout | board stub pending feature 008 | |

## Design decisions
- **D1 Execution model = sandboxed iframe + srcdoc + postMessage bridge.** `sandbox="allow-scripts"` without `allow-same-origin` gives the element a null origin: no hub DOM, no cookies, and cross-origin fetches to the hub fail (no credentials). A CSP `<meta>` inside the srcdoc (`default-src 'none'; script-src 'unsafe-inline' {origin}; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'`) closes outbound network entirely. All data enters via `postMessage` from the host, which calls the API with the user's session, so RBAC is the user's. This is the Artifact/"generative UI" state of the art; nothing user-authored is ever bundled or evaluated in the hub's origin.
- **D2 No framework inside elements.** Vanilla HTML/CSS/JS + a ~2 KB bridge (`minion.query`, `minion.ready`, `minion.theme`, `minion.echarts`, `minion.size`). "Hot-load" = replace `srcdoc`; instant, no compiler. Svelte-in-iframe would need the compiler at runtime for no gain.
- **D3 Vendor assets, not bundle sharing (the tree-shaking answer).** Element code cannot reach the app bundle, and the app bundle must not grow for ad-hoc needs. Allowlisted libraries are served whole via Vite asset URLs: `import echartsUrl from 'echarts/dist/echarts.min.js?url'` emits a hashed, cached file. No subtree is exempted from tree-shaking; the allowlist (`src/lib/sandbox/vendor.ts`) is the single place to add a library (dayjs next). The srcdoc CSP allows scripts only from the hub origin.
- **D4 One declarative query endpoint over a registry, compiled to parameterized SQL.** Registry entries (`src/server/sandbox/datasets.ts`) declare base SQL, allowed columns with types/PII/meaning, RBAC module, owner column. The compiler (`query-compiler.ts`) is pure (spec → `{sql, params}`) and unit-tested; the route wraps it in `withOrgCore` + capability + owner scope + masking + statement timeout. Default limit 100, max 1000 — the owner's "100 customers, but filterable". This is spec 002's typed-dataset layer built for the browser first; the gateway can reuse it.
- **D5 Context engineering.** (a) Page-scoped tools via `registerTools(…, {signal})` on `/sandbox` mount — their schemas enter the envelope automatically through `uiToolsBriefing(getTools())`; leaving the page removes them. (b) Catalog and samples are tool results, not envelope prose (progressive disclosure; a sample of 20 rows beats a schema dump). (c) JEV: manifest `sandbox` carries the authoring protocol (~1.2 KB) gated by noul + `record_action`; classifier state gains `page:`; one 1-line core hint on the page so the model knows to call `sandbox.datasets`. (d) Follow-up loop: the existing silent follow-up (`dispatch.ts`, chain ≤3) returns tool results, so "preview → build" fits in one user turn.
- **D6 Authorization in the POC.** Page: registry `'role:admin'`. Element writes: `requireAdmin`. Query reads: dataset module `view` + owner scope + masking (so the same endpoint is safe for members later). `/api/sandbox` is added to `API_WRITE_PREFIXES` under `settings` so the central write guard still fires if `requireAdmin` is ever removed. Later slice: a `sandbox` module.
- **D7 Storage.** `sandbox_elements` table; `page` text column (`default`) so multiple pages come free; `position` int; `w,h` grid units. Migration + seed matrix row (`sandbox` under domain `tenancy`).

## Project Structure (minion_hub)
```
src/server/sandbox/datasets.ts            # registry
src/server/sandbox/query-compiler.ts      # pure compiler + tests
src/server/sandbox/sandbox.service.ts     # run query (RLS/RBAC), element CRUD
src/routes/api/sandbox/{query,datasets,elements,elements/[id]}/+server.ts
src/routes/(app)/sandbox/+page.server.ts  # requireAdmin, load elements
src/routes/(app)/sandbox/+page.svelte     # grid + ElementFrame + chat hint
src/lib/sandbox/{vendor.ts,bridge.ts,srcdoc.ts,host.svelte.ts,tools.ts}
src/lib/assistant/turn-router.ts          # + manifest 'sandbox'
src/server/services/assistant-router.service.ts  # state page:
src/lib/state/features/assistant-context.ts      # sandbox section + core hint
src/lib/nav/{modules,routes}.ts · src/lib/routes/{route-access-registry,route-design-manifest}.ts · messages/{en,es}.json
supabase/migrations/2026101600_sandbox_elements.sql · scripts/qa/seed/{matrix,tenancy}.ts
```

## Complexity Tracking
Added: one registry + compiler (replaces N bespoke endpoints), one iframe host, one bridge. No new dependency.
