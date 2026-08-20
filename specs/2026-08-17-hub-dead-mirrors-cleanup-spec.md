---
id: 2026-08-17-hub-dead-mirrors-cleanup-spec
title: "Delete two satisfied-TODO dead mirrors in hub — prove equivalence before deleting, not after"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-20
proposal: 2026-08-17-hub-dead-mirrors-cleanup
verdict: approved
repos: [minion_hub]
tags: [logic, data, test]
type: fix
approved_reason: "G2 verdict approved in sidecar; data tag keeps merge human-gated."
---

# Delete two satisfied-TODO dead mirrors in hub

**Owner surface:** `minion_hub` — `src/lib/types/secrets.ts` (delete), its importers (retarget to
`@minion-stack/shared`), `src/server/db/schema/workspace-membership.ts` (delete), the hub schema
barrel `src/server/db/schema/index.ts`, the hub `drizzle.config.ts`, and one new guard test.
**Canonical replacements (already shipped, verified in this repo):**
[`packages/shared/src/gateway/secrets.ts`](../packages/shared/src/gateway/secrets.ts) — exported from
`@minion-stack/shared` v**0.9.0** via `src/gateway/index.ts:9` → `src/index.ts:1`, so reachable from both
the root specifier and the `./gateway` subpath;
[`packages/db/src/schema/workspace-membership.ts`](../packages/db/src/schema/workspace-membership.ts) —
exported from `@minion-stack/db` v**0.9.4** via `src/schema/index.ts:36-37` (root and `./schema`
subpaths), with a Postgres twin at `packages/db/src/pg/schema/workspace-membership.ts`.
**Design ancestors:**
[`2026-05-20-centralized-secrets-vault`](2026-05-20-centralized-secrets-vault.md) (the origin of the
`secrets.*` RPC surface these types describe — `secrets.list/set/clear/probe` + scoped variants, and the
hub Security tab that consumes them),
[`2026-06-14-workforce-org-company-bridge-design`](2026-06-14-workforce-org-company-bridge-design.md)
(retires `workspace_membership` as the active-org carrier and states the disposition this spec must
honour verbatim: *"Leave the table/endpoint in place for now (**no destructive drop**), but stop
depending on the cookie"*),
[`2026-06-30-turso-telemetry-audit`](2026-06-30-turso-telemetry-audit.md) (counts `workspace_membership`
at **3 live rows** in production Turso — the reason Slice 2 is a `data`-tagged slice and not a file
deletion).
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
per-slice tags below are the routing unit. Slice 1 is `logic`/`test` (red-state TDD, **no**
UI-governance checks — no `.svelte` file is edited anywhere in this spec). Slice 2 is `data`, which
per §4b pulls the **schema-drift check** and a **reversibility note** — both are written into its DoD.

---

## 0. Product

From the approved proposal `2026-08-17-hub-dead-mirrors-cleanup`, verbatim:

> ## Problem
>
> src/lib/types/secrets.ts TODO says remove once shared >0.5.0 ships gateway/secrets — hub is on ^0.9.0
> and the shared file exists; 4 importers still use the stale mirror.
> src/server/db/schema/workspace-membership.ts marks itself TEMPORARY, superseded by @minion-stack/db,
> zero real callers.
>
> ## Definition of done
>
> Both files deleted; importers retargeted to @minion-stack/shared / @minion-stack/db; svelte-check
> green; grep returns no references.
>
> ## Out of scope
>
> Any behavior change.

**Why this is worth a spec and not a `rm` plus a find-and-replace.** Both files are *mirrors*, and a
mirror that has sat next to its canonical source for months is only dead if it never drifted. The
proposal's own framing is the trap: the TODO says "remove once shared ships it", shared has shipped it,
therefore delete. But the TODO was written before the divergence had a chance to happen. Two concrete
ways a naive delete goes wrong here:

1. **Type drift is silent in one direction only.** If the local `secrets.ts` grew a field or a symbol
   the shared package never got, retargeting the importers turns that into a compile error — loud, fine.
   But if the local mirror is *narrower* or *looser* than canonical (an optional field the canonical
   makes required, a `string` where canonical has a union), the swap compiles and changes what the hub
   accepts at a boundary it does not control. The proposal's out-of-scope line is "any behavior change",
   so the equivalence has to be **demonstrated**, not assumed. That demonstration is most of Slice 1.
2. **A schema file is not just a type.** `src/server/db/schema/workspace-membership.ts` is a Drizzle
   table declaration, and Drizzle's migration generator diffs *the declared schema* against *the
   migration journal*. Removing a declaration is exactly how you get a `DROP TABLE` in the next
   generated migration — against a table that `2026-06-30-turso-telemetry-audit` counts at 3 live
   production rows and that `2026-06-14-workforce-org-company-bridge-design` explicitly ruled
   "no destructive drop". "Zero real callers" is true and still insufficient: the risk lives in the
   toolchain, not in the call graph.

So the shape of this spec is: **prove the mirror is redundant, then delete it, then make the class of
regression un-reintroducible by a grep-level guard.** Each slice ends with a machine check that a
reviewer can run without reading the diff.

---

## 1. Discovery contract (run first, applies to both slices)

`minion_hub` is a separate git repo and may not be present in every meta-repo checkout (`.gitignore`
excludes every subproject), so the implementer must re-derive the paths and the proposal's "4
importers" count. Every command runs from the `minion_hub/` root on branch `dev`.

```bash
# 0.1 — the two mirrors exist where the proposal says
ls -l src/lib/types/secrets.ts src/server/db/schema/workspace-membership.ts

# 0.2 — the canonical packages are actually installed at the versions this spec assumes
node -p "require('./package.json').dependencies['@minion-stack/shared']"   # expect ^0.9.0 or newer
node -p "require('./package.json').dependencies['@minion-stack/db']"       # expect ^0.9.x or newer
ls node_modules/@minion-stack/shared/dist/gateway/secrets.d.ts
ls node_modules/@minion-stack/db/dist/schema/workspace-membership.d.ts

# 0.3 — the real importer set (the proposal says 4; treat that as a hypothesis)
rg -n --no-heading "types/secrets|from ['\"]\\\$lib/types/secrets" src/
rg -n --no-heading "db/schema/workspace-membership|workspaceMembership|workspace_membership" src/ drizzle* supabase/ 2>/dev/null

# 0.4 — establish a green baseline before touching anything
bun run check
bun run test
```

**If 0.2 fails** (either package resolves below the version that contains the canonical file), stop:
this spec's premise is void and the correct move is a dependency bump proposal, not a deletion.
**If 0.3 returns a materially different importer set** than the proposal's 4 (say 9, or 0), record the
real list in the PR body and proceed — the count is not load-bearing, but an unexplained mismatch means
the sweep that produced the proposal was reading a different tree.

---

## 2. Slice 1 — retire `src/lib/types/secrets.ts` behind a proven-equivalent import

**Tags:** `logic`, `test` · **Size:** ~5–7 focused hours (the audit is the bulk; the edit is minutes)

### 2.1 The equivalence audit (do this before editing a single importer)

Produce a symbol-by-symbol table comparing the local mirror against
`node_modules/@minion-stack/shared/dist/gateway/secrets.d.ts`. The canonical side, read from
`packages/shared/src/gateway/secrets.ts` in this repo, exports exactly:

| Symbol | Kind | Notes from the canonical source |
|---|---|---|
| `SECRETS_METHODS` | **const value** (`as const`) | 7 keys: `list`, `set`, `clear`, `probe`, `setScoped`, `clearScoped`, `probeScoped` — note `setScoped` maps to the wire string `"secrets.set_scoped"`, i.e. camelCase key ≠ wire name |
| `SecretsProbeStatus` | type union | `"ok" \| "invalid" \| "unknown" \| "missing"` |
| `SecretsKind` | type union | `"static" \| "dynamic"` |
| `SecretsSummary` | interface | 13 fields; `description` is the **only** optional one; `instanceId`, `probeMessage`, `lastProbeAt` are nullable-not-optional |
| `SecretsListParams` / `SecretsListResult` | interfaces | params is empty |
| `SecretsSetParams` / `SecretsSetResult` | interfaces | |
| `SecretsClearParams` / `SecretsClearResult` | interfaces | |
| `SecretsProbeParams` / `SecretsProbeResult` | interfaces | |
| `SecretsSetScopedParams` / `SecretsSetScopedResult` | interfaces | |
| `SecretsClearScopedParams` / `SecretsClearScopedResult` | interfaces | |
| `SecretsProbeScopedParams` / `SecretsProbeScopedResult` | interfaces | |

Classify every local symbol into one of four buckets and act accordingly:

| Bucket | Action |
|---|---|
| **Identical** (same name, same shape) | Nothing — the import swap covers it |
| **Canonical-only** (exists in shared, absent locally) | Nothing — strictly additive |
| **Local narrower/looser** (same name, different optionality, nullability, or member set) | This is a **behaviour-relevant** difference. Fix the *call sites* to satisfy the canonical shape, and note each one in the PR body. If satisfying canonical requires changing what the hub sends or renders, **stop** — that is the proposal's out-of-scope line, and it needs its own proposal |
| **Local-only** (exists nowhere in shared) | Decide by nature: a **hub view-model** type (UI row state, form state, sort keys) moves into the file that uses it or a hub-owned `src/lib/types/secrets-view.ts` — it was never protocol and never belonged in a mirror. A genuine **protocol** type means the shared package is the one that is incomplete: **stop, file a proposal to promote it to `packages/shared`**, and leave this slice blocked. Do **not** hand-add protocol types to `packages/shared` under this spec — that is a publish + version-bump loop across two repos and it is not what was approved |

The audit table itself is a deliverable: paste it into the PR body. A reviewer must be able to see that
"deleted a file" was actually "checked all 18 canonical exports and every local export".

### 2.2 The import swap, and the one runtime trap

`SECRETS_METHODS` is a **runtime value**, not a type. `@minion-stack/shared`'s `./gateway` barrel also
re-exports `client.js` and `connection.js`, and the package declares an optional `ws` peer dependency
(`packages/shared/package.json` `peerDependencies` / `peerDependenciesMeta`). A *value* import from the
barrel in a module that reaches the browser bundle can therefore drag WS-client code — and a Node-only
dependency — into the hub's client chunk. There is no `./gateway/secrets` subpath in the package's
exports map, so a deep import is not available as an escape hatch.

Rules for the swap:

- Type-only importers use `import type { … } from '@minion-stack/shared'` (or `'…/gateway'`) — erased at
  compile time, zero runtime consequence.
- A `SECRETS_METHODS` **value** importer stays server-side (`src/routes/**/+page.server.ts`,
  `src/server/**`) if it already is. If a value importer lives in client-reachable code, verify the
  production build stays clean (2.4) — and if it does not, keep the *value* local as a hub-side constant
  and import only the types. Losing the shared constant for one call site is a far smaller cost than
  shipping `ws` to a browser.
- Match the specifier style the hub already uses for `@minion-stack/shared` elsewhere (`rg -n
  "@minion-stack/shared" src/ | head -20`) rather than introducing a second convention.

### 2.3 Files to touch

- **Delete:** `src/lib/types/secrets.ts`
- **Modify:** every file returned by discovery 0.3's first command (proposal says 4; the real list
  governs) — import specifier only, no logic edits
- **Create (optional, only if the audit's "local-only view-model" bucket is non-empty):**
  `src/lib/types/secrets-view.ts` holding those hub-owned types, with a one-line comment saying why they
  are hub-owned and not protocol
- **Create:** `src/lib/no-dead-mirrors.test.ts` — the guard (see 2.5)

### 2.4 Definition of done (machine-checkable)

```bash
test ! -f src/lib/types/secrets.ts                                        # file gone
rg -c "lib/types/secrets" src/ ; test $? -eq 1                            # rg exit 1 == zero matches
bun run check                                                             # exits 0 (svelte-check)
bun run build                                                             # exits 0
bun run test                                                              # exits 0, includes the new guard
```

Plus one non-grep check that closes the bundle trap: after `bun run build`, confirm
`rg -l "(from|require\()['\"](ws|node:)" .svelte-kit/output/client/ 2>/dev/null` returns nothing. If
the adapter uses a different client-output directory, locate it from the build output and run the same
scan there; absence of a known path is not a passing result.

### 2.5 The guard (red-state first, per §4b `logic` routing)

`src/lib/no-dead-mirrors.test.ts` — a vitest test that reads the source tree from disk and asserts:

1. `src/lib/types/secrets.ts` does not exist;
2. no file under `src/` contains the string `lib/types/secrets`.

Write it **before** the deletion so it fails red on the current tree (that is the §4b red-state
requirement, and here it is genuinely cheap to satisfy), then make it green by deleting. Slice 2 extends
this same file rather than adding a second one.

---

## 3. Slice 2 — retire `src/server/db/schema/workspace-membership.ts` without touching the table

**Tags:** `data`, `test` · **Size:** ~5–8 focused hours (the migration-safety proof is the work)

### 3.1 Prove schema equivalence and preserve migration ownership

`@minion-stack/db` already declares this table (`packages/db/src/schema/workspace-membership.ts`:
composite PK `(user_id, paperclip_company_id)`, `role` defaulting to `'admin'`, `created_at`, plus
`idx_workspace_membership_user`, with FK `user_id → user.id ON DELETE CASCADE`). The hub's local copy is
intended to be a duplicate declaration of the **same physical table** in the **same shared database**.
Before editing it, compare the local and package declarations field by field: table name, column names
and modes, nullability, defaults, primary key, index, and foreign-key target and delete action. Record
the comparison in the PR body. Any mismatch is a hard stop because replacing the declaration could
create migration churn or a type-level behavior change.

Then establish how the hub loads its schema:

```bash
cat drizzle.config.ts                              # what does `schema:` point at? local dir, package, or both?
rg -n "workspace" src/server/db/schema/index.ts    # is the local file re-exported from the barrel?
ls drizzle/ migrations/ 2>/dev/null                # is there a local migration journal at all?
rg -rn "workspace_membership" drizzle/ migrations/ supabase/ 2>/dev/null
```

The required end state is that the hub barrel re-exports the canonical declaration:
`export { workspaceMembership } from '@minion-stack/db/schema'`. This preserves the table in the hub's
schema graph while removing the local mirror, and satisfies the proposal's requirement to retarget to
`@minion-stack/db`. The package declaration references its own canonical `user` table, so §3.2 must
also prove that the re-export does not introduce duplicate-table or unrelated auth-schema churn. If the
hub's Drizzle configuration does not discover the package re-export, or generation produces any diff,
stop: silently removing the table from the hub's migration graph is not an allowed fallback and needs a
separate human decision about migration ownership.

### 3.2 The migration-safety proof (the §4b schema-drift check, non-negotiable)

```bash
git status --porcelain drizzle/ migrations/          # clean before
bunx drizzle-kit generate                            # or the hub's own script: `bun run db:generate`
git status --porcelain drizzle/ migrations/          # MUST still be clean — no new migration file
```

If a migration file *is* produced, open it. Any occurrence of `DROP TABLE`, `drop table`, or
`workspace_membership` is a **hard stop**: revert the slice and report the blocker. The table holds 3
live production rows per `2026-06-30-turso-telemetry-audit` and is explicitly under a "no destructive
drop" ruling from `2026-06-14-workforce-org-company-bridge-design`.

Never run `bun run db:push` in this slice. `db:push` applies a diff directly to the connected database
with no migration file to review — it is precisely the mechanism that would turn this cleanup into data
loss. If the hub's `check`/`test` scripts invoke `db:push` transitively, note it and run the underlying
steps individually.

**Reversibility note (required for `data` slices):** this slice is fully reversible by `git revert` —
it changes zero SQL and zero rows. That is the *point*: if the diff contains any `.sql` file, the slice
has failed its own definition, not merely gained scope.

### 3.3 Prove "zero real callers" the boring way

The proposal asserts zero callers. Confirm across all three spellings, because Drizzle code, raw SQL, and
the barrel each use a different one:

```bash
rg -n "workspaceMembership"   src/            # Drizzle identifier
rg -n "workspace_membership"  src/            # raw SQL / sql`` templates / string queries
rg -n "workspace-membership"  src/            # module specifier
```

Every hit must resolve to one of: the file being deleted, the barrel line being re-pointed, or an import
of `@minion-stack/db` (which is the desired end state and stays). A hit anywhere else — a service, a route,
a `+page.server.ts` — means the premise "zero real callers" is wrong; retarget that caller to
`@minion-stack/db` (root or `./schema` specifier) rather than deleting out from under it, and say so in
the PR body.

### 3.4 Files to touch

- **Delete:** `src/server/db/schema/workspace-membership.ts`
- **Modify:** `src/server/db/schema/index.ts` — re-point the export at `@minion-stack/db/schema`
- **Modify:** `src/lib/no-dead-mirrors.test.ts` — extend the guard with the second file
- **Must NOT appear in the diff:** anything under `drizzle/`, `migrations/`, `supabase/`, or any `.sql`
  file. This is itself a reviewable check: `git diff --name-only main... | rg "\.sql$|^(drizzle|migrations|supabase)/"` returns nothing.

### 3.5 Definition of done (machine-checkable)

```bash
test ! -f src/server/db/schema/workspace-membership.ts
rg -c "db/schema/workspace-membership" src/ ; test $? -eq 1
bunx drizzle-kit generate && git status --porcelain drizzle/ migrations/   # empty output
git diff --name-only | rg "\.sql$|^(drizzle|migrations|supabase)/" ; test $? -eq 1
bun run check   # exits 0
bun run build   # exits 0
bun run test    # exits 0, guard covers both files
```

---

## 4. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion_hub` | The only repo with code changes | Source ownership changes only; DoD forbids `.sql`, migration drift, and check failures |
| `packages/shared` (minion-meta) | **None if the audit comes back clean.** If §2.1 finds a genuine local-only *protocol* type, shared is incomplete | **Alert, do not absorb.** Promoting a type to `@minion-stack/shared` means a changeset → "Version Packages" PR → npm publish → hub dep bump. That is a multi-repo release loop and is **out of scope**: stop the slice, file a proposal, leave `src/lib/types/secrets.ts` in place until it lands. Partial deletion is worse than no deletion |
| `packages/db` (minion-meta) | None. The canonical declaration already exists and is already exported; this spec only stops the hub from duplicating it | — |
| `minion_site` | Shares the database with the hub (AGENTS.md → *DB schema change* impact zone). **No schema change occurs**, so no impact — but this is exactly why §3.2's empty-diff proof is mandatory: a stray generated migration would hit site's data too | Empty-diff proof; `db:push` prohibited |
| `paperclip-minion` | `workspace_membership.paperclip_company_id` is the hub↔Paperclip tenancy bridge (`2026-06-14-workforce-org-company-bridge-design`), and the package docstring names the JWT `companyId` claim as a consumer. The **table and its data are untouched**, so the bridge is unaffected | No action. Flagged so a reviewer seeing "paperclip" in the deleted file does not assume the bridge moved |
| Gateway protocol (`minion/`) | None. The `secrets.*` RPC method names and payload shapes are unchanged — the hub stops reading them from a stale copy and starts reading them from the published one | The wire-format equivalence is what §2.1's audit certifies; if the audit finds a mismatch, that mismatch was **already** a live hub/gateway disagreement, and is a finding worth its own proposal |
| `minion-meta` (this repo) | None. The canonical package sources are verification inputs only | — |

---

## 5. Out of scope

- **Any behaviour change** (the proposal's own line). No new fields, no renamed methods, no altered
  optionality reaching a call site's runtime output.
- **Dropping the `workspace_membership` table or deleting its 3 rows.** Explicitly forbidden by
  `2026-06-14-workforce-org-company-bridge-design` ("no destructive drop") and by §3.2.
- **Promoting any type into `packages/shared`**, publishing `@minion-stack/*`, or bumping hub's
  dependency ranges. If the audit demands it, the slice blocks and a proposal is filed.
- **Retiring the `/api/workspaces/select` endpoint or the `pc_company_id` cookie.** Same design ancestor
  lists them as follow-up work; they are not mirrors and are not in this proposal.
- **A general "dead mirror" detector** (a lint rule that finds every local file duplicating a
  `@minion-stack/*` export). Tempting, and probably correct as a future proposal; this spec ships a
  two-path guard test, not a framework.
- **Other satisfied TODOs** found by the same `debt-sweep-2026-08-17` source. One proposal, two files.
- **UI work of any kind.** No `.svelte` file is edited, so no `lint:design` / `lint:tokens` run is
  required (§4b: `logic` and `data` slices skip UI governance).

---

## 6. End-to-end verification

Run from `minion_hub/` on the feature branch, after both slices:

```bash
# 1. Both mirrors are gone and nothing references them
test ! -f src/lib/types/secrets.ts && test ! -f src/server/db/schema/workspace-membership.ts
rg "lib/types/secrets|db/schema/workspace-membership" src/ ; test $? -eq 1

# 2. Types still resolve — from the published packages now
bun run check            # exits 0
bun run build            # exits 0
bun run test             # exits 0; no-dead-mirrors.test.ts green

# 3. The database was not touched
bunx drizzle-kit generate && git status --porcelain drizzle/ migrations/    # empty
git diff --name-only main... | rg "\.sql$|^(drizzle|migrations|supabase)/" ; test $? -eq 1
```

**4. The behavioural check the greps cannot make.** Start the hub against a database that has
`workspace_membership` rows (`bun run dev`), sign in, and confirm two surfaces still work:
(a) the Security → secrets page lists secrets with their probe status pills and a probe action still
round-trips — this exercises the retargeted `secrets.*` types against the real gateway, which is the only
proof that the swapped types match the wire and not just each other;
(b) query the same non-production database before and after the change and confirm the
`workspace_membership` row count and a representative row are unchanged. The cited workforce design
explicitly says the active-org flow no longer depends on this table, so navigation through that flow
would not verify preservation of the table or its rows.

If (a) or (b) regresses, the cleanup was not equivalence-preserving and the correct response is to revert,
not to patch forward — every change in this spec is designed to be `git revert`-safe precisely so that
option stays open.
