# Feature Specification: Restore Agent Gateway Assignment

**Feature Branch**: `001-restore-agent-gateway-assignment` *(spec directory name; no branch created — this run produces documents only)*

**Created**: 2026-10-15

**Status**: Draft — awaiting owner approval (security + data tagged, Constitution Principle V)

**Input**: User description: "Restore the hub assistant's gateway→hub tool bridge, which has returned 403 for every call since the 2026-09-09 security containment. The resolver (`minion_hub/src/server/auth/assistant-principal.ts` resolveGatewayPrincipal) requires `personal_agents.gateway_id` to equal the gateway behind the calling server token, but all 11 production rows have NULL because the provisioner (`personal-agent-provisioner.ts:114` → `personal-agent.service.ts createPersonalAgent`) passes `serverId: ''`. Make provisioning persist a real gateway assignment for new personal agents, provide an owner-run, dry-run-by-default, reversible, twice-runnable backfill for the existing rows that asserts an invariant, and keep the resolver fail-closed exactly as written."

---

## AS-IS (measured 2026-10-15)

Required by Constitution Principle II. Every claim below carries its anchor; nothing here is inferred.

| # | Observable behavior today | Evidence |
|---|---|---|
| A1 | Every gateway-originated assistant tool call into the hub is refused with `403 ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`. | `audits/2026-10-15-agent-harness/00-synthesis.md` §0 L1 |
| A2 | The refusal is correct given the data: `resolveGatewayPrincipal` joins `personal_agents` to `gateway` on `personal_agents.gateway_id` and requires `row.gatewayId === assignedGateway.gatewayId` **and** `provisioningStatus === 'active'`. A NULL `gateway_id` drops the row from the inner join, so `rows.length !== 1` and the request is rejected. | hub `src/server/auth/assistant-principal.ts:89-186` (read at `7d917ed0`) |
| A3 | **11 of 11** production `personal_agents` rows have `gateway_id NULL` — 10 `active`, 1 `pending`. | Supabase query 2026-10-15, recorded in synthesis §0 L1 |
| A4 | The only non-test caller of provisioning is the `(app)` layout, fire-and-forget: `ensureActivePersonalAgent(coreCtx, { userId, email }).catch(…)`. It passes `serverId: ''` into `provisionPersonalAgent`. | hub `src/routes/(app)/+layout.server.ts:203`; `src/server/services/personal-agent-provisioner.ts:111-114` |
| A5 | `provisionPersonalAgent` turns that empty string into a NULL column: `const gatewayId = params.serverId ? await resolveGatewayId(params.serverId) : null;` — and inserts it. The empty string is accepted silently. | hub `src/server/services/personal-agent.service.ts:99-127` (the function the input calls `createPersonalAgent`; its real name is `provisionPersonalAgent`) |
| A6 | `ensurePersonalAgentOnLogin` has the same `serverId: string` parameter and the same behavior, and has **no non-test callers** today. | hub `src/server/services/personal-agent.service.ts:210-219`; grep over `src/` |
| A7 | The owner's own agent hit A1 on 2026-10-13 16:17Z: `crm_insight` → `{"error":"insight fetch failed: 403"}`; the model then searched for other tools and gave up. | FACES gateway transcript `personal-nk7u…/sessions/d6e8cbf6….jsonl` (synthesis §0 L2) |
| A8 | Nobody noticed for five weeks because usage is near zero: 5 routed turns / 30 days / 1 org; 18 tool calls, 4 of them bridge failures. | PostHog `assistant_route`; gateway transcript scan (synthesis §0 L5) |
| A9 | The fail-closed resolver was deliberate. The 2026-09-09 containment states: "Do not backfill or relax missing assignments automatically to restore old permissive behavior." Its restoration half (a provisioner that persists the assignment, plus a lifecycle for it) was never built. | `proposals/2026-09-09-assistant-query-delegation-restoration.md` §"Required restoration work" item 4 |
| A10 | `gateway.channel` is read as a raw JSON expression (`coalesce(to_jsonb(gateway) ->> 'channel', 'prd')`), not as a drizzle column, and the house pick order for any multi-row gateway choice is `channelFirst('prd'), createdAt, id` — a deliberately **total** order (a `created_at`-only tiebreak once sent a production RPC to a dev gateway). `ensureDefaultGatewayForUser` already performs exactly the "this org's prd gateway" pick. | hub `src/server/services/gateway.pg.service.ts:53-98, 572-615` |
| A11 | `personal_agents.gateway_id` is a single nullable uuid with `ON DELETE SET NULL`. One row = one gateway; there is no per-(user, org) assignment table. | `packages/db/src/pg/schema/personal-agents.ts:20` |
| A12 | 3 of the 11 users are members of several orgs with different `prd` gateways (the owner: 4 orgs, 3 gateways). All 10 active agents are members of org `21e0601b…` whose `prd` gateway is `netcup-faces-prd` `a64274a8…`; 2 are also in `c9e8dc46…` (`prd` gateway `870bd8f1…`); the owner is additionally in `3e721e98…` (`prd` `db408ec9…`) and `8c07721e…` (no `prd` gateway). The 1 pending agent (`bri…`) has no org membership. | Dry-run assignment table measured 2026-10-15; proposal §"S0 design constraint" |
| A13 | The repository already has the production-data-script convention this feature needs: `--apply` flag, dry-run default, one transaction, "a second run is a no-op rather than a double-apply". | hub `scripts/faces-catalog-cleanup.ts:6,19,25,263` |
| A14 | Every personal agent in fact runs on the FACES gateway container today, regardless of how many orgs its owner belongs to. | proposal §"S0 design constraint" |
| A15 | **Provisioning creates the gateway agent on the *system* gateway, not the org's.** `ensureActivePersonalAgent` calls `gatewayCall('agents.create', …)`, and `gatewayCall` → `resolveCredentials()` → `resolveCredentialsForUser(undefined)` — no profile, no org — so steps 0 (org/channel lease) and 1 (per-user) are skipped and it lands on step 2, the platform-wide system gateway. The resolver, by contrast, compares the assignment to the gateway that *calls* — i.e. the one the agent actually runs on. So "the org's prd gateway" and "the gateway the agent runs on" are two different values whenever they differ, and only the second one restores service. They coincide for org `21e0601b…` (all 10 active rows), which is why the measured dry-run table is still correct. | hub `src/server/services/personal-agent-provisioner.ts:127`; `src/lib/server/gateway-rpc.ts:76-123` |
| A16 | The two existing org-gateway picks disagree on their tiebreak: `ensureDefaultGatewayForUser` orders `channelFirst('prd'), createdAt ASC, id`; `getUserGatewayCredentials` orders `channelFirst(channel), createdAt DESC, id`. Both are total; they can select different rows for an org with two same-channel gateways. | hub `src/server/services/gateway.pg.service.ts:592, 476` |

## TO-BE (desired observable behavior + invariants)

- A personal agent provisioned from now on carries the gateway assignment its provisioning organization resolves to, so its first tool call succeeds without any manual step.
- The 10 existing active rows carry that same assignment after one owner-run backfill, so the assistant's hub tools answer with data again.
- The resolver's text does not change. A row that cannot be assigned stays unassigned and keeps being refused.

Invariants (each must hold after every run of either path):

- **INV-1** Every `active` personal agent whose owner is a member of an organization that has a `prd` gateway has a non-NULL `gateway_id` pointing at a gateway of that organization.
- **INV-2** No personal agent's `profile_id`, `agent_id`, `provisioning_status` or owning organization is changed by this feature. The only column written is `gateway_id` (plus `updated_at`), and only from NULL to a value.
- **INV-3** A personal agent whose owner has no organization membership, or whose organization has no `prd` gateway, has `gateway_id` NULL and is refused by the resolver.
- **INV-4** No agent is ever reachable from a gateway belonging to an organization its owner is not a member of.
- **INV-5** An agent's stored assignment is the gateway it was created on. If the two can differ, the feature has not been delivered (A15).

## DELTA (exact transitions + the test that proves each)

| # | From (AS-IS) | To (TO-BE) | Test that proves it |
|---|---|---|---|
| D1 | A5: empty `serverId` silently becomes NULL | provisioning resolves the organization's gateway and writes it | provisioner unit test: a new row for an org with a `prd` gateway carries that `gateway_id` |
| D2 | A4: caller passes `serverId: ''` | caller passes the provisioning organization; the empty-string input is rejected rather than coerced | unit test: the empty/missing-organization input is refused with a named error, no row written with NULL where an assignment was resolvable |
| D2a | A15: creation target and assignment are computed by two different rules (and today one of them is not computed at all) | one resolution, used for both | test: for an org whose production gateway is **not** the system gateway, the created agent's assignment equals the gateway the creation call was made through (INV-5) |
| D3 | A3: 11 NULL rows | 10 assigned, 1 (no membership) still NULL | backfill dry-run report equals the measured table in A12; apply run then re-run is a no-op; INV-1/INV-2 asserted |
| D4 | A2 resolver refuses every agent | resolver accepts a provisioned agent and still refuses an unassigned one | resolver test pair (positive for an assigned row, negative for a NULL row) added to the existing 22 pinned tests |
| D5 | A1/A7: `crm_insight` → 403 | the same call returns data for the owner's agent on the FACES gateway | owner-run post-merge verification on production, recorded in the PR body |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Existing agents regain their hub tools (Priority: P1)

The owner asks their assistant something that needs hub data ("how did sales go this week?"). Today the assistant tries a hub tool, gets refused, hunts for another tool and gives up. After this story, the assistant answers from real hub data.

This is delivered by a one-off, owner-run assignment of the existing rows. It is P1 because it is the only part that changes what any user experiences this week: all 11 affected agents already exist, and nothing else in the agent harness programme matters while every hub tool call is refused (synthesis §6).

**Why this priority**: Restores a capability that has been dead in production for five weeks, for every existing user, with no code path change to the authorization logic.

**Independent Test**: Run the assignment tool in dry-run against production, confirm its report matches the measured table (A12), apply it, then ask the assistant a question that needs hub data and see data instead of a refusal. Delivers the whole user-visible value on its own, even if User Story 2 never ships.

**Acceptance Scenarios**:

1. **Given** the 10 active agents all have no gateway assignment and all belong to an organization whose production gateway is the FACES container, **When** the owner runs the assignment tool with no arguments, **Then** it writes nothing, lists exactly which 10 rows would be assigned to which gateway and which 1 would be skipped and why, and says how to apply.
2. **Given** that dry-run report, **When** the owner applies it, **Then** the 10 rows carry the assignment, the pending agent with no organization membership is left unassigned, and the run reports the before/after counts.
3. **Given** the assignment has been applied, **When** the owner runs the tool again, **Then** it reports nothing to do and writes nothing (INV-2 holds across both runs).
4. **Given** the assignment has been applied, **When** the assistant on the FACES gateway calls a hub tool for one of those agents, **Then** it receives data rather than a permission refusal.
5. **Given** the assignment has been applied, **When** the assistant calls a hub tool for the pending agent that has no organization membership, **Then** it is still refused (INV-3), with the unchanged refusal code.
6. **Given** an apply run fails partway, **When** it exits, **Then** no partial assignment is left behind and the recorded prior values are restorable (the run is reversible, undo in the failure path).

---

### User Story 2 - New agents are born assigned (Priority: P2)

A new member signs in for the first time. Their personal agent is created in the background. Today it is created without a gateway assignment, so their assistant's hub tools are refused from the first turn and stay refused forever. After this story, their assistant works on their first turn.

**Why this priority**: P2 because it affects only users created after it ships (A3 shows every existing row is already broken, and User Story 1 covers those). It is what stops the defect recurring — without it, the backfill of User Story 1 is a decaying patch.

**Independent Test**: Provision an agent for a test user in an organization that has a production gateway and assert the stored row carries that gateway; assert the resolver then accepts a call for it. No production data involved.

**Acceptance Scenarios**:

1. **Given** a user whose organization has a production gateway, **When** their personal agent is provisioned, **Then** the stored agent carries that organization's production gateway assignment.
2. **Given** a user whose organization has both a development and a production gateway, **When** their personal agent is provisioned, **Then** the production one is chosen, and the choice is reproducible across runs on identical data (A10's total order).
3. **Given** a user whose organization has no gateway of its own, **When** their personal agent is provisioned, **Then** the agent is created on the platform default gateway and assigned to **that** gateway — because that is where it runs (FR-002b, INV-5).
4. **Given** a user whose organization's production gateway is **not** the platform default, **When** their personal agent is provisioned, **Then** the agent is created through that organization's gateway and assigned to the same one, and its first hub tool call succeeds (this is the case A15 says would silently stay refused under the obvious implementation).
5. **Given** no gateway can be resolved at all, **When** provisioning runs, **Then** the agent record exists but is not marked ready, the reason is recorded, the page still loads, and the next page load retries (FR-005, FR-005a).
6. **Given** provisioning is called without a resolvable organization, **When** it runs, **Then** it refuses with a named error rather than silently storing an unassigned agent.
7. **Given** an agent already has an assignment, **When** provisioning runs again (it is called on every page load while the agent is not ready), **Then** the existing assignment is not overwritten or duplicated.

---

### Edge Cases

- **Owner has no organization membership** (the pending `bri…` agent, A12): stays unassigned and refused. INV-3.
- **Owner's organization has a development gateway only**: no production gateway exists, so no assignment is made (a development gateway must never become the production binding — A10's channel clause exists for exactly this).
- **The organization's production gateway is not the gateway the agent is created on** (A15): the stored assignment must follow the creation target, not an independently computed "organization's production gateway", or the agent is assigned to a gateway that never calls and the refusal persists invisibly. This is the single most likely way to ship this feature and still have it not work.
- **Two gateway picks disagree on the tiebreak**: the two existing organization-gateway picks order by oldest-first and newest-first respectively (A16). Whichever one this feature uses, it must be the same one the agent is created through, or a two-gateway organization can be assigned one gateway and created on the other.
- **Owner belongs to several organizations with different production gateways** (3 of 11 users, A12): the subject of Q1 below. Until that is resolved, the assignment is the gateway the agent was provisioned on, which for every current row is the FACES container (A14).
- **Organization's gateway row is deleted after assignment**: the column is `ON DELETE SET NULL` (A11), so the agent silently reverts to refused. The assignment tool must be safe to re-run to repair this, and that is the lifecycle the 2026-09-09 contract asked for (A9).
- **Two gateway rows share a `created_at` to the microsecond** (this really happened — A10): the pick must stay total, so the same input always yields the same gateway.
- **An agent's owner loses membership of the assigned gateway's organization**: the resolver already re-reads membership on every request and refuses; no change, and the stale assignment is a reporting item, not an escalation.
- **The tool is run against a non-production database**: it must say which database it is about to touch before it writes anything.
- **Concurrent provisioning** (the `(app)` layout calls it on every load while the agent is non-active, A4): the write must be idempotent, as the existing insert already is.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Provisioning a personal agent MUST resolve a gateway from the provisioning organization and store it on the agent, rather than storing an unassigned agent.
- **FR-002**: The gateway chosen MUST be one belonging to that organization and MUST prefer the production channel; a development gateway MUST NOT be chosen when a production one exists, and MUST NOT be chosen as a substitute when none exists.
- **FR-002a**: The gateway stored on the agent MUST be **the same gateway the agent was actually created on**. The assignment and the creation target MUST be resolved once, together — not computed independently by two rules that can disagree. (See Q6; this is the difference between a restored bridge and a second silent 403.)
- **FR-002b**: When the organization has no gateway of its own and the agent is therefore created on the platform-wide default gateway, the assignment MUST be that default gateway, because that is where the agent lives. It MUST NOT be left unassigned in that case, and MUST NOT be set to a gateway the agent does not run on.
- **FR-003**: The choice MUST be deterministic: the same organization with the same gateways always yields the same gateway (no reliance on storage order), and MUST use one single ordering rule shared with the existing gateway picks rather than a new one.
- **FR-004**: Provisioning MUST reject an empty or missing organization input with a named error instead of coercing it into an unassigned agent.
- **FR-005**: When no gateway at all can be resolved (not even the platform default), provisioning MUST still create the agent record, leave it unassigned, record the reason, and MUST NOT block the user's sign-in or page load.
- **FR-005a**: An agent MUST NOT be marked ready while its assignment is missing. It stays in the not-yet-ready state so the existing retry path reattempts on the next page load, and the user sees the existing "no personal agent provisioned" state rather than a silently broken assistant. (See Q8.)
- **FR-005b**: Once the existing retry budget is exhausted, the agent stays not-ready and its recorded reason names the missing assignment. Repair is then the owner-run tool of FR-007, not an automatic path. (See Q7.)
- **FR-006**: Re-running provisioning for an agent that already has an assignment MUST NOT change or duplicate it.
- **FR-006a**: Any other code path that creates a personal agent MUST obtain its assignment the same way, or MUST be removed. A second provisioning entry point that can still store an unassigned agent reintroduces this defect. (See Q10.)
- **FR-007**: The system MUST provide an assignment tool for existing agents that performs no writes unless explicitly told to apply, and that names the database it is targeting before any write.
- **FR-008**: The tool's dry run MUST list, per affected agent, the gateway it would be assigned to, and per skipped agent, the reason it is skipped.
- **FR-009**: Applying MUST be all-or-nothing, and on failure MUST leave the data as it was, restoring the recorded prior values in the failure path.
- **FR-010**: Running the tool a second time after a successful apply MUST be a no-op that writes nothing.
- **FR-011**: The tool MUST verify INV-1 and INV-2 as stated conditions over the data after applying, and MUST NOT accept a count of affected rows as proof.
- **FR-012**: The tool MUST only ever change an agent's gateway from unassigned to assigned. It MUST NOT reassign an already-assigned agent, and MUST NOT write any other field (beyond the modification timestamp).
- **FR-013**: The tool MUST leave unassigned every agent whose owner has no organization membership, and every agent whose organization has no eligible gateway.
- **FR-013a**: The dry-run report MUST state how many active agents are unassigned. That count is the standing instrument for this defect class; no new dashboard, alert or health page is added. (See Q9.)
- **FR-014**: The refusal logic MUST remain exactly as written: an unassigned, non-active, or cross-organization agent is still refused, with the same refusal code. No flag, environment variable or parameter may relax it.
- **FR-015**: Both paths MUST be covered by a test pair — one proving an assigned agent is accepted, one proving an unassigned agent is still refused.
- **FR-016**: For a user who is a member of several organizations with different production gateways, the binding rule MUST be [NEEDS CLARIFICATION: Q1 below — single gateway per user, per-(user, organization) assignments, or a resolver that accepts any production gateway of a member organization. Owner decision; each option has a different trust boundary].
- **FR-017**: The owner MUST approve this specification before any code is written and MUST perform the merge (Constitution Principle V — this is tagged security and data).
- **FR-018**: After applying, the owner MUST record the before/after counts and one real end-to-end assistant turn as the proof, in the pull request body.

### Key Entities *(include if feature involves data)*

- **Personal agent**: the per-user assistant identity. Carries its owner, its identifier, its provisioning state, and **at most one gateway assignment**. One per user (A11). The assignment is the authorization fact this whole feature is about.
- **Gateway**: a registered Minion gateway server. Belongs to one organization, serves one channel (development or production), and holds the shared credential the gateway presents to the hub.
- **Organization membership**: which organizations a user belongs to. Re-read on every request by the refusal logic; the reason an assignment alone is not authority.
- **Assignment report**: the dry-run output — per agent, the gateway that would be assigned or the reason for skipping. It is the artifact the owner approves before applying, and the before/after record afterwards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the owner applies the assignment, 10 of the 11 existing personal agents are assigned and 1 (the one with no organization membership) is not — matching the dry-run report exactly, row for row.
- **SC-002**: An assistant turn that needs hub data returns hub data. Measured as: of the hub tool calls made by the owner's agent in the first week after applying, zero are refused for a missing assignment, against 4 of 4 bridge failures in the 30 days before (A8).
- **SC-003**: A brand-new user's first assistant turn can use hub tools, with no manual assignment step by anyone.
- **SC-004**: Running the assignment tool twice in a row produces no change on the second run — verified by comparing the data before and after that second run.
- **SC-005**: An agent that is not assigned, not active, or whose owner is not a member of the calling gateway's organization is still refused, demonstrated by a test for each of the three cases.
- **SC-006**: A later regression that reintroduces unassigned provisioning fails the test suite rather than reaching production — the condition that was missing for five weeks (A8).
- **SC-007**: For an organization whose production gateway is not the platform default, a newly provisioned agent's first assistant turn can still use hub tools — i.e. the assignment matches where the agent actually runs (INV-5), not just where its organization nominally points.
- **SC-008**: The number of ready agents without an assignment is reportable on demand in one command, and is 1 (the membership-less one) after applying.

## Assumptions

- (ASSUMPTION — owner to confirm) The gateway an agent binds to is **the gateway it was created on, resolved from the organization it was provisioned in, production channel preferred** — which for all 10 active rows is the FACES container `a64274a8…` of org `21e0601b…` (A12, A14, and Q6 for why "created on" rather than "the organization's" is the load-bearing half). This is the narrowest rule that restores service without widening trust, and it is what Q1 asks the owner to ratify or replace.
- (ASSUMPTION — owner to confirm) The 1 pending agent with no organization membership stays unassigned. It is not treated as a failure of the backfill.
- The production channel is the default when a gateway row predates the channel column (A10's `coalesce(…, 'prd')`), so a legacy gateway row is treated as production. This matches every other gateway pick in the hub.
- The backfill is **owner-run**, not automatic — the 2026-09-09 contract forbids automatic backfill of missing assignments (A9). An automated or deploy-time backfill would violate that contract even if its logic were identical.
- Provisioning already knows the organization it is running in (the layout builds an organization-scoped context before calling it, A4), so no new organization-selection concept is introduced by this feature.
- No user-facing string, route, page, navigation entry or API endpoint is added, so the Paraglide, route-contract and design-token build steps of Constitution Principle IV do not apply. The RBAC requirement of Principle IV is satisfied by leaving the existing refusal logic untouched (FR-014) rather than by adding a gate.
- This feature does not make the agent able to do more than it could in August: it restores the authorization data the existing checks expect. Widening the agent's surface is separate work.

## Out of Scope

Named explicitly because the audit this comes from covers much more, and because the proposal's own slice table invites confusion:

- Retiring or re-pointing the permanently failing general data tool (`crm_query`), and adding the two implemented-but-uninstantiated CRM tools to the gateway's tool order — proposal slices S0c/S0d; S0c already shipped as gateway #329.
- The turn-router fixes (S1, shipped as hub #540), the security hardening of the bridge (S2a/S2), the generic action dispatcher (S3), typed dataset reads (S4), MCP export (S5), and tool-selection ranking (S6).
- A per-(user, organization) assignment table, or any resolver change — unless Q1 is answered in a way that requires one, in which case this specification must be revised and re-approved before code.
- A lifecycle for assignments beyond "re-running the tool repairs an assignment that was cleared" — revocation, rotation and reassignment flows remain the open item the 2026-09-09 contract left (A9).
- Forwarding a per-user credential on the gateway bridge. The gateway's shared token remains an organization-wide impersonation credential; this feature does not change that, and must not be read as having addressed it.

## Clarifications

### Session 2026-10-15

This session had no live owner. Each answer below was derived from the evidence cited and is tagged where it is an assumption the owner must confirm.

- **Q: What exactly is the gateway a newly provisioned agent should bind to?** → A: The production-channel gateway of the organization the agent is being provisioned in, picked with the house total order (production channel first, then oldest, then identifier). This reuses `ensureDefaultGatewayForUser`'s existing pick rather than inventing a second rule (A10). *(ASSUMPTION — owner to confirm: that provisioning-organization, not some explicitly chosen organization, is the right source.)*
- **Q: Should the backfill run automatically on deploy or in the provisioning path?** → A: No. The 2026-09-09 containment contract says "Do not backfill or relax missing assignments automatically" (A9). It is an owner-run tool, dry-run by default. Not an assumption — this is quoted contract.
- **Q: What happens to the pending agent with no organization membership?** → A: It stays unassigned and keeps being refused (INV-3). A backfill that "succeeded" by assigning it to some gateway of an organization its owner does not belong to would violate INV-4, which is the exact trust widening the containment was built to prevent. *(ASSUMPTION — owner to confirm: that leaving one agent broken is acceptable rather than a blocker.)*
- **Q: Should the resolver be relaxed so a NULL assignment falls back to organization membership?** → A: No. FR-014. The audit is explicit that the resolver is correct and the provisioner is the defect (synthesis §0, "Why L1 exists"). Not an assumption.
- **Q: For a user in several organizations with different production gateways, which one wins?** → A: **Unresolved — kept as Q1 below.** The measured data makes this unavoidable rather than hypothetical (A12), the column physically holds one value (A11), and the three available answers have genuinely different trust boundaries. Answering it from the evidence would be guessing on a security boundary, which Principle V does not allow.

### Session 2026-10-15 — `/speckit-clarify` pass

Five questions from the ambiguity scan. Again no live owner: each answer is derived from the evidence named and tagged where it is an assumption.

- **Q6: Must the gateway stored on a new agent be the gateway that agent was actually created on, or is it enough that it is the agent's organization's production gateway?** → A: **It must be the gateway the agent was created on.** Not an assumption — it follows from A15 and A2. Provisioning creates the agent through the *system* gateway today (no organization threaded into the credential resolution), while the resolver compares the assignment to the gateway that *calls*. Assigning an independently computed "organization's production gateway" would leave a new user in any organization whose gateway is not the platform default with an agent that is assigned, looks provisioned, and is still refused — the same five-week-invisible failure in a new disguise. The two values must come from one resolution. They happen to coincide for the one organization that holds all 10 active rows, which is why the backfill table in A12 is still correct. → FR-002a, FR-002b, FR-003, INV-5, D2a, SC-007, 2 edge cases.
- **Q7: When an assignment is cleared later — the organization's gateway row is deleted, and the column is `ON DELETE SET NULL` — what restores it?** → A: The owner re-runs the assignment tool. Nothing automatic. *(ASSUMPTION — owner to confirm.)* Reasoning: an automatic re-assignment of a cleared assignment is indistinguishable from the automatic backfill the 2026-09-09 contract forbids (A9), and the existing retry path cannot help because it does not run for an agent that is already marked ready (`shouldRetryAgent` returns false for `active`). A full revocation/reassignment lifecycle stays the open item that contract left. → FR-005b, edge case.
- **Q8: If no assignment can be resolved while provisioning, should the agent still be marked ready?** → A: No — it stays not-ready, so the existing retry-on-next-page-load path reattempts, and the user sees the existing "no personal agent provisioned" state. *(ASSUMPTION — owner to confirm: this is a deliberate behavior change — today such a user gets a ready-looking agent whose hub tools silently fail forever, which is precisely A3.)* Reasoning: this reuses machinery that already exists (status, retry count, backoff, max retries, and a designed empty state) and makes the failure self-healing and visible instead of permanent and silent. It costs no new concept. → FR-005a.
- **Q9: Does an unassigned ready agent need to be surfaced somewhere, given this went unnoticed for five weeks?** → A: No new surface. The assignment tool's dry run reports the count, and that is the instrument. *(ASSUMPTION — owner to confirm.)* Reasoning: A8 shows the real cause of the five weeks was near-zero usage plus no instrument, and Q8's answer removes the silent-failure mode for every future agent. A dashboard, alert or health page for a condition that should now be unreachable is work nobody asked for; the one-command count is the lazy equivalent and is honest about being pull, not push. → FR-013a, SC-008.
- **Q10: There is a second provisioning entry point with the same defect and no callers — fix it or delete it?** → A: It must either resolve its assignment the same way or be removed; it may not keep the ability to store an unassigned agent. *(ASSUMPTION — owner to confirm which of the two.)* Reasoning: `ensurePersonalAgentOnLogin` takes the same `serverId: string` and has the same coercion (A6), and has no non-test callers. Leaving a dormant second path that reproduces the exact defect is how this comes back; deleting dead code is the cheaper of the two options and is the recommendation. → FR-006a.

**Deferred (quota reached, flagged per the skill's rules)**: Q1 below remains unresolved and is the one high-impact item left. Terminology (`serverId` / `gatewayId` / organization-vs-tenant naming across these modules) is Partial but immaterial to behavior; data volume and performance are Clear (11 rows; one extra lookup on a path that already opens a websocket).

### Q1 — multi-organization binding (owner decision, blocks implementation)

**Context**: FR-016. `personal_agents.gateway_id` is one nullable column (A11); the refusal logic requires the row's gateway to equal the calling gateway (A2); 3 of 11 users are members of several organizations with different production gateways, the owner of 4 organizations across 3 gateways (A12).

**What we need to know**: when a user belongs to several organizations with different production gateways, which gateway may their agent act from — and therefore which organization's data can that agent reach?

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **One gateway per user** — the gateway the agent was created on (for every current row: the FACES container; see Q6). | Narrowest. Restores service today with no schema or resolver change, and INV-4 holds trivially. A multi-organization user's assistant can only ever see one organization's data; from their other organizations the assistant stays silently refused, and the only way to change it is to re-provision. Matches A14 (that is where every agent actually runs). |
| B | **One assignment per (user, organization)** — a new assignment row per organization the user belongs to. | Correct model; the agent follows the user across organizations. Costs a schema change, a migration, a lifecycle (what happens on membership loss), and a resolver that selects the row by calling gateway. Still fail-closed, still one gateway per request, so no trust is widened — but it is a larger change than a restoration, and it arrives after the 403s would have been fixed by A. |
| C | **Resolver accepts any production gateway of an organization the user is a member of.** | Smallest code change, **largest trust change**: it turns a leaked gateway token for organization X into reach over every organization each of X's agent owners belongs to. Today a leaked token is already organization-wide impersonation at the highest member's level (report E, trust model); this would make it cross-organization. It also deletes the equality check that the 2026-09-09 containment was specifically built around (A9). Recommend against. |

**Recommendation**: A now, B as follow-up work with its own specification if a multi-organization user actually needs their assistant in a second organization. C should be refused in writing so it does not come back as a convenience fix.

**Your choice**: _awaiting owner_
