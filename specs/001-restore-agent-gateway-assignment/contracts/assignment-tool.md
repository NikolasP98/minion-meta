# Contract — the owner-run assignment tool

The only new interface this feature exposes. Everything else is internal service code behind existing call sites, so no other contract is defined (per the plan skill's "skip if purely internal").

**Path**: `minion_hub/scripts/backfill-personal-agent-gateway.ts`
**Runner**: `bun scripts/backfill-personal-agent-gateway.ts [--apply]`, from the hub checkout, by the **owner** (the classifier blocks an agent from running production writes; this is run through the owner's shell).

## Arguments

| Argument | Effect |
|---|---|
| *(none)* | Dry run. Reads only. Prints the plan, the counts, and the exact command to apply. Exit 0. |
| `--apply` | Performs the plan inside one transaction, then asserts INV-1 and INV-2 and prints the before/after counts and the undo statement. Exit 0 on success, non-zero with the data unchanged on any failure. |
| anything else | Exit non-zero with usage. Unknown flags are never ignored. |

## Environment

Reads the same core database connection the hub server uses. **Before any read it prints which database host it is about to touch**, so a run against the wrong target is visible in the first line of output rather than in the consequences (FR-007).

## Output contract (dry run)

```
database: <host>/<db>        ← printed first, always

plan (10 to assign, 1 to skip):
  personal-<id>  owner <email>  org <org-id> (<org name>)  →  gateway <gateway-id> <name> [prd]
  … one line per agent …

skip:
  personal-<id>  owner <email>  reason: owner has no organization membership
  … one line per skipped agent, each with a reason …

active agents with no assignment: 11            ← the standing instrument (FR-013a)

DRY RUN — nothing written. Re-run with --apply to execute.
```

Rules:
- Exactly one line per affected agent, and the per-agent line names the gateway it would be assigned to. No summary-only mode.
- Every skipped agent gets a reason. "Skipped" with no reason is a defect.
- The plan is computed with the **same** gateway pick the provisioner uses (research R1/R2). A tool with its own rule is how the two drift apart.

## Output contract (`--apply`)

```
database: <host>/<db>
before: assigned 0 / unassigned 11 (active: 10)
applying 10 …
after:  assigned 10 / unassigned 1 (active: 10)

invariant INV-1 (every assignable active agent is assigned to a gateway of its own org): PASS
invariant INV-2 (no profile, agent id, status or org changed; only gateway_id NULL→value): PASS

undo:  update personal_agents set gateway_id = null, updated_at = now()
       where id in ('<id1>', …, '<id10>');
```

Rules:
- Both invariants are asserted as **conditions re-read from the database after the write**, and a failure aborts non-zero. A count of affected rows is explicitly **not** accepted as proof (FR-011).
- The undo statement lists the ids actually written, so it cannot clear a row this run did not touch.
- A second `--apply` run prints `nothing to do` and writes nothing (FR-010).
- On any failure the transaction rolls back and the output says so; no partial assignment survives (FR-009).

## Guarantees it must hold

| # | Guarantee |
|---|---|
| G1 | No write without `--apply`. |
| G2 | Only `gateway_id` (NULL → value) and `updated_at` are ever written, on `personal_agents` only. |
| G3 | A row that already has an assignment is never touched, including by a repeat run. |
| G4 | An agent is only ever assigned a gateway belonging to an organization its owner is currently a member of. |
| G5 | All-or-nothing; a failure leaves the data exactly as it was. |
| G6 | Idempotent: run it as many times as you like. |
| G7 | It never changes the resolver's behavior, and there is no flag that makes it do so. |

## Non-goals

- It does not reassign, revoke, or move an assignment. That lifecycle is the open item (spec Q7).
- It does not run automatically, on deploy, on login, or from any code path. The 2026-09-09 containment contract forbids automatic backfill of missing assignments, in those words.
- It is not a general gateway administration tool and takes no target ids, no `--org`, no `--force`.
