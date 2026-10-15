# Implementation Plan: Hub business tools over MCP, under the caller's own RBAC

**Feature directory**: `specs/005-mcp-hub-tools-per-user-identity` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-mcp-hub-tools-per-user-identity/spec.md`

**Repos touched**: `minion` (gateway) and `minion_hub` (hub) — two independent git repositories with
different package managers and different PR bases. There is no single branch for this feature.

## Summary

Give an external MCP client a named, per-user, organization-scoped credential, then export the hub's
business tools over the gateway's existing `/mcp` origin filtered by that user's own capabilities, so
that every call runs through the agent→hub bridge that already enforces RBAC, organization scoping
and audit attribution. The hard invariant is that a caller authenticated with a shared credential
never reaches a write.

Approach, from `research.md`: reuse the hub's existing gateway-JWT issuance behind a new cookie-free
exchange (R1), populate its agent claim from the table the authorizer actually reads (R2 — it is
empty today), add identity filtering keyed on the tool metas' declared permission with
"no permission = denied" (R4), discriminate shared-credential callers by the absence of a user and
organization rather than by auth method (R5), check the revocation store that `/mcp` currently skips
(R6), map 27 tool names onto one invoke method with pinned parameters merged over caller arguments
(R7), and meter calls per credential (R8). No new authorization, scoping, masking or audit code.

## Technical Context

**Language/Version**: TypeScript, strict, on Node 22+ (gateway) and Bun with SvelteKit 2 / Svelte 5 (hub).

**Primary Dependencies**: gateway — its own hand-rolled MCP implementation (`src/gateway/mcp/**`),
TypeBox schemas on the agent tools, the generated tool registry, `jose`-validated JWTs; hub —
`jose`, Drizzle over the Postgres core store, Paraglide for strings. **No new dependency is
required**; in particular not `@modelcontextprotocol/sdk`, because the gateway's own transport is
being reused (audit D "Smallest design").

**Storage**: hub Postgres core store for the credential (same store as `personal_agents`, `gateway`
and the canonical memberships the checks depend on); gateway process memory for the call budget; a
durable gateway store for the embedded-OAuth state (store choice deliberately not prescribed — see
`research.md` R9).

**Testing**: gateway `vitest` (targeted paths only — the full suite crashes the box; the CI gate is
`pnpm vitest run test/ci/`); hub `vitest` targeted plus `svelte-check` (never the full
`bun run test` with a `.env` present).

**Target Platform**: self-hosted long-lived gateway process (Docker/Swarm on the Netcup VPS) and the
hub on Vercel. The long-lived process is why the MCP server stays in the gateway.

**Project Type**: two web services plus one UI surface, in two repositories.

**Performance Goals**: no added latency to in-app assistant turns (this feature must not change that
path at all); `tools/list` filtering served from the existing 60 s capability cache rather than a
per-request hub round trip.

**Constraints**: INV-1 to INV-6 in the spec. No second MCP server. No new authorization decision
point. Credential expiry 1 h for the token, with the exchange secret as the long-lived artifact.

**Scale/Scope**: 11 personal agents and ~10 active users today, 27 exported tools, 3 role personas in
the acceptance matrix. Usage is near zero (5 routed assistant turns in 30 days), so nothing here is
load-driven — the rate limit is a blast-radius control, not a capacity measure.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — result at the end of this section.*

Checked against `.specify/memory/constitution.md` v1.0.0.

| Principle | Verdict | Evidence / what satisfies it |
|---|---|---|
| **I. Spec before code (NON-NEGOTIABLE)** | **PASS** | This artifact set is the spec-first cycle. No code exists for this feature. |
| **II. AS-IS → TO-BE → DELTA, with evidence** | **PASS** | The spec carries a dedicated AS-IS/TO-BE/DELTA section with 19 anchored observations, 6 invariants and 11 delta rows each naming its proof. Three audit counts were re-measured and corrected (31 not 32 flagged tools; 17 not 12 writes; 27 of 30 declare a permission), and two findings are new and anchored (empty agent claim; `/mcp` skips revocation). *Caveat recorded honestly: nothing was exercised against a running instance — every anchor is a code reading, as in audits D and E.* |
| **III. Slice-scoped delivery** | **PASS with a named risk** | Five slices below, each one PR against its repository's registered PR base, from an isolated worktree, with that repository's own gates in the foreground. The risk: slices S5-1/S5-2 (hub) and S5-3/S5-4 (gateway) are cross-repository and must land in that order, because a gateway that filters on a claim the hub does not yet mint denies everything. The order is stated per slice. Branch roles are not restated here — read them with `node scripts/repo-policy.mjs show hub` / `show minion`. |
| **IV. Required build steps are spec requirements** | **PASS** | The feature adds hub routes (credential create/list/revoke/exchange) ⇒ route-contract manifest plus its six counts, and RBAC wiring; it adds a hub UI surface (token page, corrected MCP panel) ⇒ design-token contract, `lint:design && lint:tokens`, and Paraglide `m.*()` + `i18n:compile` for every string. FR-029 and contract C5 carry these. Two of the six route-contract counts live outside `src/lib/routes/`, so a green targeted vitest is not proof. |
| **V. Security and data work keeps human gates** | **PASS — gates asserted, not yet obtained** | The feature is tagged security and data (a new authentication path, credentials, tenant scoping). Therefore: **owner approval of this spec is required before any code, and owner merge is required for every slice.** No production data script is part of this feature; the one it depends on (the personal-agent backfill, HD1) belongs to slice S0 and carries its own dry-run/run-twice/invariant rules. |
| **Open-items ledger** | **PASS by construction** | FR-030 requires the three permissionless tools withheld from export to be recorded in `proposals/` with a `TODO(handoff)` at each meta. The five owner-gated items (OG1–OG5) and the three hard dependencies (HD1–HD3) are listed in `research.md` and must be appended to `proposals/2026-10-15-agent-harness-restoration.md`, which is this feature's matching open proposal. |
| **Artifact layout and registration** | **PARTIAL — action required** | The Spec Kit directory is correct (`specs/005-.../spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `checklists/`). But the meta-repo board reads only top-level `specs/*.md` through `scripts/spec-index.mjs`, so the constitution requires a top-level stub `specs/<date>-<slug>-spec.md` with `TEMPLATE.md` frontmatter pointing here. **That stub does not exist** — this run produced documents only and created no board entry. Recorded as the one unmet constitution item. |

**Gate result: PASS.** No principle blocks the plan. One governance item (the board stub under
"Artifact layout and registration") is unmet and is listed in Complexity Tracking with its reason.

**Post-Phase-1 re-check**: unchanged. The Phase 1 design added no new dependency, no new
authorization decision point, no new data store, and no new surface beyond what Principle IV already
covers. The `data-model.md` entity list is 3 new records (credential, resolved identity, call budget)
plus 3 extensions of existing structures, which is the minimum the requirements imply; nothing in it
exists "for later".

## Project Structure

### Documentation (this feature)

```text
specs/005-mcp-hub-tools-per-user-identity/
├── spec.md              # Feature specification (+ AS-IS/TO-BE/DELTA, Clarifications)
├── plan.md              # This file
├── research.md          # Phase 0 — 10 decisions, 5 owner-gated items, 3 hard dependencies
├── data-model.md        # Phase 1 — 7 entities
├── quickstart.md        # Phase 1 — validation order and gates
├── contracts/
│   ├── mcp-surface.md       # What an external MCP client sees; the negative contract
│   └── hub-credential-api.md # Credential create/list/revoke/exchange; the capability view
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── analysis.md          # /speckit-analyze report
├── tasks.md             # /speckit-tasks output
└── sdd-notes.md         # Friction log for the SDD audit (not a Spec Kit artifact)
```

### Source code (two repositories, not one tree)

```text
minion/  (gateway — pnpm, PR base per repo-policy)
└── src/
    ├── gateway/
    │   ├── mcp/
    │   │   ├── registry.ts          # McpToolEntry gains pinnedParams + permission + access; listMcpTools takes identity
    │   │   ├── protocol.ts          # tools/list filtered; tools/call applies the same test and merges pinned params over args
    │   │   ├── agent-tools-seed.ts  # NEW — seeds the 27 permission-declaring mcpExport tools from the generated registry
    │   │   └── oauth/store.ts       # durable backing; refresh-token expiry + revocation
    │   ├── server.impl.ts           # identity resolver: revocation check, agent id, named-user classification; seed call
    │   └── server-methods/tools.ts  # NEW invoke method {toolId, args}
    └── agents/
        ├── tools/_gen/_registry.generated.ts  # read-only input (generated); its 3 permissionless metas get TODO(handoff)
        └── tool-search/hub-capabilities.ts    # reused as the capability source (HD2 must land first)

minion_hub/  (hub — bun, PR base per repo-policy)
└── src/
    ├── routes/api/
    │   ├── mcp-credentials/         # NEW — create, list, revoke (cookie session)
    │   └── gateway/jwt/             # unchanged; the headless exchange is a separate path
    ├── routes/(app)/settings/       # NEW — the token page where a user mints and revokes
    ├── server/services/
    │   ├── gateway-jwt.service.ts   # agent claim sourced from personal_agents, not user_agents
    │   └── mcp-credential.service.ts # NEW — create/verify/revoke, membership + agent preconditions
    └── lib/components/builder/McpPanel.svelte  # sources the real /mcp list; corrects its copy
```

**Structure decision**: the gateway owns the MCP surface and the tool export; the hub owns the
credential and the user-facing pages. This is the audit's explicit conclusion and the reason no hub
MCP route appears above: the hub is a serverless deployment with no long-lived process for SSE, and a
second server would mean a new SDK dependency, a new auth path and a duplicate tool table.

## Slices (delivery order is load-bearing)

| # | Repo | Slice | Covers | Gate |
|---|---|---|---|---|
| S5-1 | hub | Agent claim correctness: source the gateway JWT's agent claim from `personal_agents`; test that a provisioned personal agent appears in the claim | D1 (part), D2 | Owner merge (security). Ships first because every later slice depends on a non-empty claim |
| S5-2 | hub | Credential: table, service, create/list/revoke routes, headless exchange, token page, security events, route-contract manifest, i18n | D1, FR-001…009, C1–C4 | Owner approval of the design + owner merge (new authentication path) |
| S5-3 | gateway | Identity hardening: revocation check on every `/mcp` request; named-user classification; agent id from identity only | D3, D6 (part), INV-1/INV-5 | Owner merge (security). Independent of S5-4 and worth shipping alone |
| S5-4 | gateway | Export + filter + invoke: seed the 27 tools, pinned params, one invoke method, identity-filtered list, INV-1 at list and call, withhold list | D4, D5, D6, D7, D11 | Owner approval + owner merge. **Must not land before S5-1 and S5-3** |
| S5-5 | gateway + hub | Metering and durability: per-credential call budget, cross-org refusal alerting, OAuth persistence and refresh expiry, `/capabilities` panel truth | D8, D9, D10 | Owner merge |

A slice is one PR against its repository's registered PR base, from an isolated worktree, with that
repository's gates run in the foreground before the PR opens.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Constitution "Artifact layout and registration": no top-level `specs/<date>-<slug>-spec.md` board stub was created | This run was instructed to produce documents only, inside a throwaway worktree; creating a board entry would register a feature nobody has approved | None — this is a genuine unmet item, not a justified exception. Creating the stub is the first action if this spec is adopted |
| Two repositories, four PRs, one ordered dependency chain between them | The MCP transport lives in the gateway and the credential lives in the hub; neither can move | A single PR is impossible (separate repos, separate package managers, separate deploys). Collapsing the gateway slices into one would make a security-only fix (S5-3) wait for the export |
| A new authentication path (C3) rather than extending the existing cookie route | A headless client has no cookie; this is the blocking gap the feature exists to close | Extending `/api/gateway/jwt` with a second mode was rejected so that a cookie bug cannot become a headless bypass — two credentials sharing one handler is how that class of bug happens |
| A new field pinned onto the MCP tool entry (`pinnedParams`) | 27 tool names must reach one invoke method, and the mapping has to live somewhere | 27 gateway methods, or parsing the tool id out of the tool name. Both are more code for the same behavior |
