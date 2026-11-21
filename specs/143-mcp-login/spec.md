# Feature Specification: Log in to the hub's MCP endpoint — tools run as you, with your role

**Feature Directory**: `specs/143-mcp-login`
**Created**: 2026-11-21
**Status**: Draft — security tagged (Constitution V)
**Tags**: security, auth, permissions
**Repos & PR base**: `minion_hub` → `master`; `minion-meta` → `dev`
**Proposal**: `proposals/2026-11-20-hub-org-pages-on-the-fly.md` (slice S6)
**Input**: Owner, 2026-11-20: "create authentication for the MCP instead of a key. Like other tools (cloudflare, posthog, etc) need authentication for harnesses to use it. Look into this option (set up mcp connection, auth and through auth, confirm the user's role)". Then: "Begin planning and implementation via speckit + egm. Lmk when its live and working. Set it up here for testing as well."

## AS-IS (read 2026-11-20/21, hub `origin/master` `379b0739`, production read-only)

| # | Observed | Evidence |
|---|---|---|
| A1 | `POST /api/mcp` serves ten sandbox tools. The only credential is an org API key with the `sandbox` scope. | `src/routes/api/mcp/+server.ts`; hub #692 |
| A2 | A key is an org, not a person: no role is checked, every scoped key can do the same things, and nothing a key writes names a human. | `sandbox-tools.ts` builds `CoreCtx { tenantId: key.orgId }` with no profile |
| A3 | No tool returns data rows, because a key has no role to scope them by. | spec 136 FR-008 |
| A4 | A harness must be given the key by hand in a header; there is no "log in" step. | `claude mcp add … --header` |
| A5 | The hub signs people in with Supabase Auth. Tokens are ES256 and can be verified without a network call. | `supabase-bridge.runtime.ts` `getClaims`; project JWKS lists one ES256 key |
| A6 | `resolveSupabaseUser(event, client, accessToken)` already turns an explicit access token into the hub user with its role; `resolveSupabaseTenant(userId, orgId)` confirms membership of one org. | `supabase-bridge.runtime.ts:37,108` |
| A7 | Role checks and the sandbox query already work per user: `hasOrgCapability(locals, module, action)`, `runQuery(locals, spec)`. The Sandbox page itself requires `settings:manage`. | `rbac.service.ts:835`; `sandbox.service.ts`; `(app)/sandbox/+page.server.ts` |
| A8 | Supabase Auth has an OAuth 2.1 server (beta) with authorize and token endpoints, discovery, optional dynamic client registration and refresh rotation; the app supplies a consent page. It is **disabled** on the hub's project. | Supabase docs `guides/auth/oauth-server`; `GET …/.well-known/oauth-authorization-server/auth/v1` → `feature_disabled` |
| A9 | The installed client library exposes the consent calls (`auth.oauth.getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`). | `@supabase/auth-js` 2.110.1 `GoTrueClient.d.ts:23` |
| A10 | A token from that server is an ordinary user token: it also works against the project's data API. 220 of 247 public tables grant SELECT to `authenticated`; `crm_contact_stats` has row security off. A browser session already holds an equivalent token. | production catalog query, 2026-11-20 |
| A11 | Claude Code accepts a pre-registered client (`claude mcp add --client-id … --callback-port …`) and also registers itself where a server allows it. | `claude mcp add --help` |
| A12 | The current MCP authorization spec prefers Client ID Metadata Documents and deprecates dynamic client registration; Supabase documents dynamic registration and pre-registered clients only. | modelcontextprotocol.io authorization spec 2025-11-25 and draft |

## TO-BE

A person adds the hub to a harness with only its address. The harness opens the hub in a browser; the person signs in as usual, sees who is asking and for what, picks the organization, and approves. From then on every tool call runs as that person in that organization, with that person's role, and the person can end the connection from the hub.

Invariants:

- **INV-1** A call is served only for a verified token of a known person who is still a member of the organization the connection was approved for.
- **INV-2** A tool does nothing that the same person could not do in the hub with the same role. Sandbox tools require the same permission as the Sandbox page.
- **INV-3** A connection is approved for exactly one organization and can never act in another.
- **INV-4** Ending a connection in the hub stops its next call, even if the token itself has not expired.
- **INV-5** A browser session token is not a connection: without an approved connection for that client, the endpoint refuses.
- **INV-6** API keys keep working exactly as before.
- **INV-7** Only clients the owner registered can ask for a connection (no open registration in this slice).

## DELTA

| From | To | Proof |
|---|---|---|
| Key in a header | Browser sign-in started by the harness (A4 → TO-BE) | Discovery documents served; unauthenticated call answers 401 with the pointer; live connection from Claude Code |
| Org identity (A2) | Person + role + one org | Tests: member with the permission passes; member without it is refused per tool; non-member refused |
| No rows (A3) | A role-checked `sandbox_query` tool for signed-in callers only | Tests: caller without `view` on the dataset's module is refused; key callers do not see the tool |
| No way to see or end connections | "Connected apps" list with revoke | Test: revoked connection refused on next call |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a harness by signing in (Priority: P1)

**Independent Test**: With the OAuth server enabled and one registered client, `claude mcp add` with only the address and client id ends, after a browser approval, with the hub's tools listed.

**Acceptance Scenarios**:

1. **Given** no credential, **When** a harness calls the endpoint, **Then** it is refused with a pointer to where sign-in is described, and that description names the hub's sign-in service.
2. **Given** a signed-in person on the consent screen, **When** they belong to several organizations, **Then** they must pick one before approving; with one organization it is preselected.
3. **Given** approval, **When** the harness calls `tools/list`, **Then** it receives the tools that person's role allows in that organization.
4. **Given** a person who is not signed in, **When** they reach the consent screen, **Then** they are sent to sign in and return to the same request.
5. **Given** the person denies, **Then** the harness is told access was denied and no connection is recorded.

### User Story 2 - Tools obey the person's role (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a member whose role can manage the Sandbox, **When** they write a block, **Then** it is stored with them as the author.
2. **Given** a member whose role cannot manage the Sandbox, **When** they call a write tool, **Then** it is refused with "your role does not permit…" and nothing is written.
3. **Given** a member with `view` on sales but not on finance, **When** they query a sales dataset, **Then** rows come back; **When** they query a finance dataset, **Then** it is refused.
4. **Given** a person removed from the organization after connecting, **When** the harness calls again, **Then** it is refused.
5. **Given** a `whoami` call, **Then** the reply states the person, the organization, the role, and which tool groups are permitted.

### User Story 3 - See and end connections (Priority: P2)

**Acceptance Scenarios**:

1. **Given** Settings → Developers, **Then** the person sees their own connected apps for the current organization with the app name and when it was approved and last used.
2. **Given** they end one, **When** that harness calls again, **Then** it is refused and must be approved again.

### Edge Cases

- A token whose connection was approved for another organization is refused; there is no way to pass an organization in a call.
- An expired or malformed token is refused as unauthenticated (so the harness refreshes or signs in again).
- A token without a client id (an ordinary browser session) is refused (INV-5).
- A platform admin still needs an approved connection; the org on it is the one they picked.
- The same person may connect two harnesses; each is its own connection.
- Key and token in the same request: the key path is taken only for `mk_` values; anything else is treated as a token.

## Requirements *(mandatory)*

- **FR-001**: The endpoint MUST accept a Supabase-issued access token as `Authorization: Bearer` in addition to org API keys.
- **FR-002**: The hub MUST publish protected-resource metadata for the endpoint naming the sign-in service, and MUST answer unauthenticated calls with 401 and a `WWW-Authenticate` pointer to it.
- **FR-003**: The hub MUST provide the consent screen: requesting app, requested access, organization picker limited to the person's memberships, approve and deny.
- **FR-004**: Approval MUST record a connection (person, app, organization). The endpoint MUST refuse a token with no live connection for its person and app.
- **FR-005**: Every call MUST re-check membership of the connection's organization and resolve the person's current role.
- **FR-006**: Sandbox tools MUST require the same permission as the Sandbox page for a signed-in caller; refusals MUST say the role does not permit the action.
- **FR-007**: Elements written by a signed-in caller MUST record that person as author.
- **FR-008**: Signed-in callers MUST get `whoami` and `sandbox_query` (rows, through the existing role-checked query). Key callers MUST NOT see `sandbox_query`.
- **FR-009**: A person MUST be able to list and end their own connections; an org admin MUST be able to list and end all connections of the organization.
- **FR-010**: Calls MUST be rate limited per connection.
- **FR-011**: Client registration MUST be closed: only clients registered by the owner can start sign-in. Opening registration is a later, separate decision that depends on tightening data-API grants (A10).
- **FR-012**: Key-authenticated behaviour (spec 136) MUST be unchanged.

### Key Entities

- **Connection**: person, app (client id and name), organization, approved at, last used at, ended at.
- **App**: an OAuth client registered with the sign-in service; identified by client id.

## Success Criteria *(mandatory)*

- **SC-001**: From `claude mcp add` to a working tool list takes one browser approval and under a minute.
- **SC-002**: A member without the Sandbox permission cannot change anything through the endpoint; a non-member gets nothing.
- **SC-003**: Ending a connection takes effect on the next call.
- **SC-004**: Every element written through a signed-in connection names its author.
- **SC-005**: All spec-136 key tests pass unchanged.

## Assumptions

- The owner enables the OAuth server on the Supabase project and registers the Claude Code client; these are dashboard actions outside the repository.
- A harness that cannot be given a client id cannot connect until registration is opened (FR-011).
- The token is an ordinary user token (A10); this slice does not change what such a token can reach outside the hub.
