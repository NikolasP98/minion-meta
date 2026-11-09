# Quickstart — validating Restore Agent Gateway Assignment

In order. Steps 1–3 are an implementer's; steps 4–6 are **the owner's only** (production data, Constitution Principle V).

## Prerequisites

- hub checkout at the slice branch, `bun install` done.
- For steps 1–3: nothing else. No database, no gateway, no network — the unit harness mocks the database (`personal-agent.service.test.ts` pattern) and the gateway call.
- For steps 4–6: the owner's shell with the production core-database credentials, and the owner's own hub session for the end-to-end turn.

## 1 — The provisioning change (slice S0a)

```bash
bun run vitest run src/server/services/personal-agent.service.test.ts \
                   src/server/services/personal-agent-provisioner.ensure.test.ts \
                   src/server/auth
```

Expect: all pass, including the new cases —

- a new agent for an organization with a production gateway carries that gateway's id;
- **a new agent for an organization whose production gateway is not the platform default carries that organization's gateway, and it is the gateway the creation call was made through** (INV-5 — the case that distinguishes a working fix from one that still 403s invisibly);
- an organization with a development gateway only yields no assignment;
- an organization with no gateway of its own yields the platform default and is assigned to it;
- no resolvable gateway at all ⇒ the agent exists, is **not** marked ready, records a reason, and does not throw;
- an empty/missing organization input is refused with a named error;
- re-provisioning an already-assigned agent changes nothing;
- the resolver accepts an assigned active agent on the calling gateway, and still refuses an unassigned one, a non-active one, and one whose owner is not a member.

```bash
bun run check
```

Expect: clean. No `lint:design` / `lint:tokens` run — there is no UI in this feature (plan, Principle IV).

## 2 — The tool's logic, offline (slice S0b)

```bash
bun run vitest run scripts/backfill-personal-agent-gateway.test.ts
```

Expect: the planner, given a fixture of agents/organizations/gateways, produces the assign-and-skip plan the contract describes; the invariant assertions fail loudly on a doctored fixture (an agent assigned to a gateway of an organization its owner is not in ⇒ INV-1 FAIL, non-zero). The test must not open a database connection.

## 3 — The tool, against a local or scratch database

```bash
bun scripts/backfill-personal-agent-gateway.ts
```

Expect: the first line names the database. Then a plan, a skip list with reasons, the unassigned-active count, and the "re-run with --apply" line. **Nothing written** — confirm by re-running and seeing an identical plan.

## 4 — Dry run against production *(owner)*

```bash
bun scripts/backfill-personal-agent-gateway.ts
```

Expect, matching the measured table in spec A12 **row for row**:

- 10 agents to assign, all to gateway `a64274a8…` (`netcup-faces-prd`) of org `21e0601b…`;
- 1 agent skipped (`bri…`) with reason "owner has no organization membership";
- `active agents with no assignment: 11`.

**If the plan does not match, stop.** A different plan means the pick rule or the data changed since 2026-10-15, and the spec's AS-IS is stale.

## 5 — Apply *(owner)*

```bash
bun scripts/backfill-personal-agent-gateway.ts --apply
bun scripts/backfill-personal-agent-gateway.ts --apply    # run it twice, as the constitution requires
```

Expect: first run reports `before: assigned 0 / unassigned 11` → `after: assigned 10 / unassigned 1`, both invariants PASS, and prints the undo statement. Second run reports `nothing to do` and writes nothing.

Paste both outputs into the PR body (spec FR-018). If anything fails, the transaction has rolled back; the undo statement from a successful run is the way back out afterwards.

## 6 — The real proof *(owner)*

In the hub, ask the assistant something that needs hub data — the same shape of request that failed on 2026-10-13 (`crm_insight`, spec A7). Expect data, not `insight fetch failed: 403`.

Then confirm the negative still holds: a tool call for the still-unassigned pending agent is refused, with the unchanged refusal code.

**This step is the acceptance of the feature.** Steps 1–5 can all pass while the bridge is still dead if the assignment does not match where the agent actually runs (A15), so no green test suite substitutes for one real turn.

## What is deliberately not validated here

- Any other agent-harness finding. `crm_query` is still a permanent 503 and the agent still reaches ~5% of the write surface; those are the sibling slices named in the spec's Out of Scope. A working bridge will make them *visible*, not fixed.
- Multi-organization behavior. Until Q1 is answered, a multi-organization user's assistant is reachable from exactly one gateway, and testing the others would be testing an undecided rule.
