---
id: 2026-08-31-handoff-minion-hub-722867358-spec
title: Resolve the minion_hub updateServer tenant-scope handoff
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
proposal: handoff-minion-hub-722867358
verdict: pending
repos: [minion_hub]
relationship: depends-on
related: [2026-08-18-hub-updateserver-tenant-scope-spec, 2026-08-17-hub-updateserver-tenant-scope]
tags: [security, data, logic, test, handoff-sweep]
---

# Resolve the `minion_hub` `updateServer` tenant-scope handoff

## 0. Product

From the approved proposal, verbatim:

> **Definition of done:** the marker's open end is resolved and the
> `TODO(handoff):` comment removed; the sweep closes this proposal
> automatically once the file carries no more markers.
>
> `NikolasP98/minion_hub@master src/server/services/server.service.ts:43` — add eq(servers.tenantId, ctx.tenantId) to the WHERE below

The product outcome is defense in depth at the persistence boundary: a server update must require
the requested server id and the active tenant id in one atomic SQL predicate. Resolving the marker
must not bypass the existing data-compatibility gate or weaken the route-level ownership check.

### Relationship recommendation

- `2026-08-18-hub-updateserver-tenant-scope-spec` — **depends-on**: it owns the same mutation,
  records Slice 1 as only partly complete, and provides the executable `bun run rekey:readiness`
  prerequisite that must pass before this handoff can be resolved.
- `2026-08-17-hub-updateserver-tenant-scope` — **depends-on**: it is the original approved debt
  proposal and makes completion conditional on the Turso re-key rather than authorizing an early
  predicate change.

Searches of `specs/index.json` and `proposals/index.json` also found
`handoff-minion-hub-1637616237`, but that proposal concerns running and hardening the readiness
audit script rather than the `server.service.ts` mutation. The resolver should coordinate this spec
with the two related ids above and avoid executing duplicate implementation slices; this
recommendation does not merge, retire, supersede, or edit any related artifact.

## 1. Problem

The current handoff marker says the `updateServer` mutation still selects its target using only the
server id. That leaves tenant isolation at the route/caller boundary instead of also enforcing it in
the database mutation. A future or internal caller that reaches the service without the route guard
could therefore mutate a row belonging to another tenant.

The fix is data-sensitive. Existing planning evidence says legacy Turso `servers.tenant_id` values
may not match the canonical Supabase organization ids supplied through `TenantContext.tenantId`.
Adding the predicate before compatibility is proved could turn legitimate same-tenant updates into
not-found results. The prior spec therefore installed an executable readiness gate and deliberately
made an early predicate change fail tests.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — current verified behavior and constraints

- The approved handoff anchors the open end at
  `minion_hub/src/server/services/server.service.ts:43`: the `updateServer` `WHERE` clause needs
  `eq(servers.tenantId, ctx.tenantId)`. The source checkout is not mounted in this meta-repo, so the
  implementation agent must re-read `minion_hub/CLAUDE.md` and verify the current symbol, imports,
  line, callers, and return contract in its isolated `minion_hub` worktree before editing.
- `2026-08-18-hub-updateserver-tenant-scope-spec` records, from `minion_hub` `master` on
  2026-08-29, that `updateServer` still uses `eq(servers.id, id)` alone and carries the handoff
  marker. It also records that the normal `PUT` route calls `assertOwnsOrAdmin()` first and denies a
  mismatched owner with 404; the open issue is therefore service-level defense in depth and data
  hygiene, not a demonstrated open route exploit.
- The predecessor's Slice 1 shipped service baselines and the read-only two-source audit in PR #130,
  but its canonical `tests/rekey-readiness/evidence.json`, independent non-production audit,
  concrete re-key apply record, and rollback/recovery note remained outstanding. Its
  `bun run rekey:readiness` command consequently exited 1 as of 2026-08-29.
- The public service seam is `updateServer(ctx, id, data)`, where the trusted tenant identity is
  `ctx.tenantId`, the target identity is `id`, and `data` is the existing typed patch. The persistence
  seam is the Drizzle update of the installed `servers` schema. Neither shape is changed by this
  work.
- The hub and site share database/auth surfaces, but this task changes neither schema nor auth. The
  root Cross-Project Impact Zones therefore do not require a `minion_site` edit; a migration or auth
  change would be scope expansion and must stop implementation.
- Operator memory warns that hub data is split across Turso and Supabase and that the databases
  cannot be treated as one joinable store; compatibility evidence must read each source separately
  and compare exact ids in application memory. Source: `/memory/MINION/MEMORY.md`, DB/schema entry
  linking the two-database split and org-scoping/RLS records. The topic files referenced there were
  not present in this checkout, so the prior spec's anchored summary is the available detailed
  evidence. No relevant past-session observation was returned by the read-only FTS query.

### TO-BE — target behavior and invariants

1. `updateServer(ctx, id, data)` updates a row only when `servers.id = id` and
   `servers.tenantId = ctx.tenantId` are both true in the same database statement.
2. A cross-tenant id has the same service result/error contract as an unknown id, writes nothing,
   and reveals no tenant or owner metadata.
3. A same-tenant update retains the existing patch, timestamp, return-value, and route response
   behavior. The route-level `assertOwnsOrAdmin()` check remains an independent layer.
4. The predicate may land only after `bun run rekey:readiness` exits 0 with canonical evidence that
   all current Turso server tenant ids are non-null and match canonical Supabase organization ids.
5. The `TODO(handoff)` marker is removed only in the same change that lands the tested predicate;
   removing the marker alone is not completion.
6. No schema, migration, re-key operation, auth policy, API/wire shape, gateway protocol, UI,
   shared-package, deployment, or cross-repo production-code change occurs.

### DELTA — numbered transitions, slices, and proof

1. **Convert the data prerequisite into a green, reviewable preflight** → Slice 1 →
   `bun run rekey:readiness` exits 0 and its checked evidence reports zero null and unmatched tenant
   ids; the focused readiness tests pass and human reviewers verify the non-production/production
   audit and re-key/recovery records.
2. **Make the update predicate atomically tenant-scoped and close the ledger marker** → Slice 2 →
   the focused service test proves same-tenant success, cross-tenant no-write plus unknown-id parity,
   and the source assertion proves the predicate contains both id and tenant id while the marker is
   absent.
3. **Preserve the caller contract and repository health** → Slice 2 → the existing route test,
   when one owns this behavior, plus `bun run check`, the focused test, `bun run test`, and
   `bun run build` all exit 0 with no migration/schema diff.

## 3. Approach — vertical slices

### Slice 1 — complete and prove tenant-key readiness

**Topics:** `security`, `data`, `test`

**Size:** ~4–6 focused hours for a credential-holding implementer/reviewer.

#### Exact files to touch

- `tests/rekey-readiness/evidence.json`
- Existing readiness files only if current focused tests expose a defect in evidence validation:
  `scripts/audit-server-tenant-scope.ts`, `scripts/audit-server-tenant-scope.lib.ts`,
  `scripts/audit-server-tenant-scope.test.ts`, `scripts/rekey-readiness-gate.test.ts`, and
  `docs/runbooks/server-tenant-scope-rekey-readiness.md`

No production service, schema, migration, route, or UI file may change in this slice. If the
canonical paths differ on current `master`, stop and revise this spec rather than inventing a second
evidence format.

#### Work

1. Run the existing audit read-only against an independent non-production Turso/Supabase pair and
   production. It must fetch the Turso server ids/tenant ids and Supabase organization ids separately
   and compare exact strings in application memory.
2. Complete the existing canonical evidence file with the command, environment labels, timestamps,
   counts, concrete re-key apply/deployment identifier, and rollback/recovery record required by the
   shipped readiness validator. Do not put credentials, tokens, or raw tenant data in the file.
3. Run the focused readiness tests and `bun run rekey:readiness`. If either audit reports a null or
   unmatched tenant id, stop; data repair or re-key execution is outside this spec.
4. Obtain human security/data review. The evidence gate is not satisfied by a planning artifact's
   lifecycle status or by production-only results.

#### Machine-checkable definition of done

```bash
bun run test -- scripts/audit-server-tenant-scope.test.ts scripts/rekey-readiness-gate.test.ts
bun run rekey:readiness
test -f tests/rekey-readiness/evidence.json
rg -n 'null_tenant_ids[^0-9]*0|unmatched_tenant_ids[^0-9]*0' tests/rekey-readiness/evidence.json
```

All commands exit 0, the validator proves both environments and change/recovery records are present,
and review confirms the artifact contains no secrets or raw tenant identifiers. Any unmet condition
blocks Slice 2.

### Slice 2 — tenant-scope the mutation, test denial parity, and remove the marker

**Topics:** `security`, `logic`, `test`

**Size:** ~4–6 focused hours.

#### Exact files to touch

- `src/server/services/server.service.ts`
- `src/server/services/server.service.test.ts`
- Only if an existing test already owns the public route contract: its current test beneath
  `src/routes/api/servers/[id]/`; no route production file is expected to change

#### Work

1. Before any edit, run `bun run rekey:readiness`. A non-zero exit is a hard stop: make no service
   change and report the missing evidence emitted by the command.
2. Import/use Drizzle `and` and change only the existing `updateServer` predicate to combine
   `eq(servers.id, id)` with `eq(servers.tenantId, ctx.tenantId)`. Preserve the typed patch,
   timestamps, returning clause, and not-found behavior.
3. In the two-tenant service fixture, prove tenant A can update server A; tenant A cannot update
   server B; server B's full persisted row is unchanged; and the cross-tenant outcome equals the
   current unknown-id outcome. If the harness mocks Drizzle, assert the generated/query predicate
   includes both columns rather than merely asserting that `and()` was called.
4. Keep the route ownership check unchanged. Run its existing contract test if present.
5. Remove the exact `TODO(handoff)` marker only after the predicate and regression assertions are in
   place. Confirm that no marker remains in the target file.

#### Machine-checkable definition of done

```bash
bun run rekey:readiness
bun run test -- src/server/services/server.service.test.ts
rg -n 'and\(|servers\.tenantId|servers\.id' src/server/services/server.service.ts
! rg -n 'TODO\(handoff\)' src/server/services/server.service.ts
bun run check
bun run test
bun run build
test -z "$(git diff --name-only -- ':(glob)**/*.sql' ':(glob)**/migrations/**' ':(glob)**/drizzle/**' ':(glob)**/supabase/**')"
```

All commands exit 0. The focused output must name green same-tenant, cross-tenant no-write, and
unknown-id parity cases. Because this is security/data work, human approval and merge remain
mandatory.

## 4. Cross-repo impact assessment

| Surface | Assessment | Mitigation or alert |
|---|---|---|
| `minion_hub` service and tests | Direct target; mutation selection becomes tenant-scoped | Preserve the route guard and public result contract; run focused and full hub gates |
| Hub Turso data + Supabase organizations | Read-only prerequisite evidence spans two stores | Compare separately fetched exact ids in application memory; never mutate production under this spec |
| `@minion-stack/db` / meta packages | Installed schema is consumed but not changed | Any schema/package need blocks the slice and requires separate cross-project planning |
| `minion_site` shared DB/auth surface | No schema or auth contract change is intended | Require zero migration/schema diff; otherwise alert and stop because the DB/auth impact zone expands |
| `minion` gateway and Paperclip adapter | No token, protocol, row-shape, or adapter change | Existing valid same-tenant server updates must remain green; no files to touch |
| Deployment | Normal hub branch-triggered deployment only after merge | No direct deploy or data repair; attach readiness and test evidence to the human-gated PR |

Unavoidable behavioral impact: a direct service caller that previously attempted to update a server
outside `ctx.tenantId` will now receive the service's unknown-id outcome and perform zero writes.
That is the intended authorization boundary, and the regression test proves it without disclosing
which tenant owns the id.

## 5. Out of scope

- Performing, repairing, or rolling back the Turso re-key or changing tenant ids.
- Adding or altering schema, migrations, foreign keys, gateway tokens, or shared packages.
- Removing or changing `assertOwnsOrAdmin()` or any route production behavior.
- Changing server create, delete, list, assignment, token, or gateway-routing behavior.
- Migrating the service between Turso and Supabase/Postgres.
- UI/design-token work, gateway protocol work, `minion_site`, `minion`, or Paperclip code changes.
- Production writes during verification or committing secrets/raw tenant identifiers as evidence.
- Resolving the separate handoff marker in `scripts/audit-server-tenant-scope.ts` unless the existing
  validator is demonstrably broken and the resolver separately admits that proposal.

## 6. End-to-end verification

In an isolated non-production environment containing tenant A/server A and tenant B/server B:

1. Run `bun run rekey:readiness`; stop unless it exits 0.
2. Through the normal authenticated update route, update server A as tenant A and assert the existing
   success status/body and persisted patch.
3. Attempt server B through the same route as tenant A and assert the characterized ownership denial,
   no tenant metadata disclosure, and an unchanged server B row.
4. Exercise `updateServer` directly with tenant A's context and server B's id, then an unknown id;
   assert identical service outcomes and zero mutation. This direct call proves the database-service
   boundary rather than only the route guard.
5. Re-read both rows and prove only server A changed. Inspect the source/query assertion to prove the
   mutation requires both `servers.id` and `servers.tenantId` atomically.
6. Run the complete Slice 2 definition-of-done command block. Attach outputs, sanitized readiness
   evidence, and human security/data review to the PR.

After the normal branch-triggered deployment, repeat only the non-mutating health/route checks and
confirm the deployed revision. Do not run production cross-tenant writes. The handoff is complete
only when the predicate is deployed, regression evidence is green, and
`src/server/services/server.service.ts` contains no `TODO(handoff)` marker.
