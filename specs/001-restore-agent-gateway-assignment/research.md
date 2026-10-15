# Phase 0 — Research: Restore Agent Gateway Assignment

Every question here was answered by reading this codebase, not by looking for a pattern outside it. Anchors are hub `origin/master` `7d917ed0` unless stated.

## R1 — Where does the "which gateway does this organization use" rule already live?

**Decision**: reuse `gateway.pg.service.ts`'s existing channel-aware pick. Expose it once as a row-returning helper (id + url + token) and have both the provisioner and the assignment tool call that. Do not write a third pick.

**Rationale**: two picks already exist and both encode the same hard-won ordering lesson — `channelFirst('prd')` first, then a tiebreak, then `id`, because `created_at` alone is not a total order and a non-total order once sent a production RPC to a dev gateway (`gateway.pg.service.ts:82-98`). `ensureDefaultGatewayForUser` (`:589-593`) is literally "pick this organization's production gateway". A third implementation would be a third place to get the channel clause wrong.

**Alternatives considered**: (a) a new `resolveOrgPrdGateway()` in a new module — rejected, it would duplicate the ordering comment and drift; (b) inlining the query in the provisioner — rejected, the assignment tool needs the identical rule and divergence between them is exactly the failure in R2.

**Caveat found**: the two existing picks disagree on their tiebreak — `ensureDefaultGatewayForUser` uses `createdAt` ascending, `getUserGatewayCredentials` uses `desc(createdAt)` (`:476` vs `:592`). For an organization with two same-channel gateways they select different rows. Whichever the feature adopts must be the one the creation call goes through (see R2). Recorded as AS-IS A16 and an edge case; unifying them is **not** in scope and would touch unrelated callers.

## R2 — How are "the gateway the agent is created on" and "the gateway stored on the agent" made to be the same value?

**Decision**: resolve the gateway row **once**, before the creation call, and use it for both: open the websocket to that row's url with that row's token, then store that row's id. Thread the organization through so the resolution is organization-aware.

**Rationale**: this is the finding that changes the shape of the fix. `ensureActivePersonalAgent` creates the gateway-side agent with `gatewayCall('agents.create', …)` (`personal-agent-provisioner.ts:127`), and `gatewayCall` calls `resolveCredentials()` → `resolveCredentialsForUser(undefined)` (`gateway-rpc.ts:123`). With no profile and no organization, steps 0 (the organization/channel lease) and 1 (per-user) are skipped and it lands on step 2, the **platform-wide system gateway**. The resolver, meanwhile, compares the stored assignment to the gateway that *calls* the hub — i.e. the one the agent actually runs on (`assistant-principal.ts:157-175`). So "the organization's production gateway" and "where the agent lives" are two different values, and only the second one makes a tool call succeed. They coincide today for org `21e0601b…`, which holds all 10 active rows, which is why nobody noticed and why the measured backfill table is still right.

`resolveCredentialsForUser(profileId, orgId, channel)` already exists and already has the correct priority chain (organization/channel lease → per-user → system → env bootstrap), with a comment explaining that a channel-blind pick caused "the all-day intermittency". The work is to thread the organization in and to return *which row* was used, not to design a resolution.

**Alternatives considered**: (a) compute the assignment independently from the organization and leave `gatewayCall` as is — rejected: it ships a feature that still 403s for any organization whose gateway is not the default, in a way that looks exactly like success; (b) read back the gateway the agent appeared on by querying the gateway after creation — rejected: an extra round trip to learn something the caller already decided.

## R3 — What shape should the owner-run assignment tool take?

**Decision**: a single `scripts/backfill-personal-agent-gateway.ts`, dry-run by default, `--apply` to write, one transaction, re-run is a no-op. Copy the shape of `scripts/faces-catalog-cleanup.ts`.

**Rationale**: the convention exists and the owner already knows it: `--apply` (`:25`), "executes inside ONE transaction" (`:6`), "a second run is a no-op rather than a double-apply" (`:19`), `DRY RUN — nothing written. Re-run with --apply to execute.` (`:263`). The repo also contains a counter-example to avoid: `scripts/backfill-personal-agent-displaynames.ts` writes immediately with no dry run and no transaction. Matching the newer convention costs nothing and means the owner needs no new instructions.

**Alternatives considered**: (a) a hub admin UI action — rejected: one-off, owner-only, 11 rows, and a new surface would drag in RBAC wiring, nav visibility and the route-contract manifest for something used once; (b) a SQL migration — rejected outright: it would be an automatic backfill on deploy, which the 2026-09-09 containment contract forbids in as many words, and it would make the owner gate unreachable.

## R4 — How is reversibility achieved without building anything?

**Decision**: the affected rows' prior values are, by construction, all NULL (FR-012 forbids touching an already-assigned row). So the undo is a single statement over the ids the run printed, and the forward run is wrapped so a failure rolls back rather than leaving a partial write. The run prints the undo statement with its own id list.

**Rationale**: "reversible" normally implies a snapshot. Here the pre-state is a constant, so a snapshot table, a backup file or an audit row would all be ceremony for information already known. One transaction covers the mid-run failure case (FR-009); the printed undo covers "the owner changed their mind afterwards". Both are the smallest honest answer.

**Alternatives considered**: (a) a CSV snapshot before applying — rejected, it would contain only ids and NULLs; (b) an audit table — rejected, nothing reads it.

**Invariant assertion (FR-011)**: after applying, re-query and assert the *condition* — every active agent whose owner is a member of an organization with an eligible gateway has a non-NULL `gateway_id` pointing at a gateway of that organization (INV-1), and no row's profile, agent id, status or organization changed (INV-2). Not "10 rows updated". A statement count is satisfied by 10 wrong writes.

## R5 — Does the resolver need anything at all?

**Decision**: no production code change in `assistant-principal.ts`. Add one **positive** test case (an assigned, active agent on the calling gateway resolves to its owner's principal); the negative cases are already pinned among the existing 22.

**Rationale**: the audit's own conclusion is "the resolver is correct; the provisioner is the defect" (synthesis §0). The resolver's checks are the containment contract. The missing test is the positive direction — it cannot ever have passed in production, because no row has ever carried an assignment.

## Unresolved

**Q1 — the multi-organization binding rule.** Deliberately not resolved here. It is a trust-boundary decision with three answers (one gateway per user / per-(user, organization) rows / a resolver that accepts any member organization's production gateway) whose consequences differ in kind, not degree — the third converts a leaked gateway token from organization-wide impersonation into cross-organization impersonation. Constitution Principle V puts that with the owner. Research can state the options and recommend; it cannot decide. spec.md §Q1 holds the table and the recommendation (option A now, B as separate specified work, C refused in writing).

Implementation is not blocked: option A is what the code in R2 does naturally, and the two slices are correct under A. Option B would require this spec to be revised and re-approved before code.
