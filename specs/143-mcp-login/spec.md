# Feature Specification: Log in to the hub's MCP endpoint — tools run as you, with your role

**Feature Directory**: `specs/143-mcp-login`
**Created**: 2026-11-21 · **Revised**: 2026-11-21 (pass 2, after EGM round 1: hub-issued tokens)
**Status**: Draft — security tagged (Constitution V)
**Tags**: security, auth, permissions
**Repos & PR base**: `minion_hub` → `master`; `minion-meta` → `dev` (this spec only)
**Proposal**: `proposals/2026-11-20-hub-org-pages-on-the-fly.md` (slice S6)
**Input**: Owner, 2026-11-20: "create authentication for the MCP instead of a key. Like other tools (cloudflare, posthog, etc) need authentication for harnesses to use it. Look into this option (set up mcp connection, auth and through auth, confirm the user's role)". Then: "Begin planning and implementation via speckit + egm. Lmk when its live and working. Set it up here for testing as well."

## AS-IS (read 2026-11-20/21, hub `origin/master` `379b0739`, production read-only)

| # | Observed | Evidence |
|---|---|---|
| A1 | `POST /api/mcp` serves ten sandbox tools. The only credential is an org API key with the `sandbox` scope. | `src/routes/api/mcp/+server.ts`; hub #692 |
| A2 | A key is an org, not a person: the route builds `CoreCtx { db, tenantId: key.orgId }` with no profile, no role is checked, and nothing a key writes names a human. | `routes/api/mcp/+server.ts:35` |
| A3 | No tool returns data rows, because a key has no role to scope them by. | spec 136 FR-008 |
| A4 | A harness must be given the key by hand in a header; there is no "log in" step. | `claude mcp add … --header` |
| A5 | People sign in to the hub with Supabase Auth; the app gate sends an unauthenticated page request to `/login?redirectTo=<path+query>`. Password and QA sign-in honour `redirectTo`; Google sign-in goes to `/auth/callback` without it. | `hooks.server.ts:566-577`; `login/+page.svelte:146,159-163,186` |
| A6 | A person's platform role (`user`/`admin`) comes from `profiles.role`; the role **in an organization** and its permissions come from `resolveCapabilities(orgId, profileId)` (cached 2 min + 30 s stale). | `supabase-bridge.ts:39-40`; `rbac.service.ts:320-333` |
| A7 | Permission checks and the sandbox query read only `locals.user.{role,supabaseId}` and `locals.tenantCtx`: `hasOrgCapability`, `resolveOwnerScope`, `requireCoreCtx`, `runQuery(locals, spec)`, `listDatasets(locals)`. Platform admins pass every capability check before any org check. The Sandbox page requires `settings:manage`. | `rbac.service.ts:436-476,835-846`; `sandbox.service.ts:39-47`; `(app)/sandbox/+page.server.ts:6` |
| A8 | Supabase Auth offers an OAuth 2.1 server (beta, disabled on this project). A token it issues is an ordinary user session token: the hub's cookie path accepts any verified token without looking at who it was issued to, and the same token works on the data API, storage and realtime. | Supabase docs; `resolve-identity.ts:225-258`; production probe `feature_disabled` |
| A9 | 220 of 247 public tables grant SELECT to `authenticated`; `crm_contact_stats` has row security off. | production catalog query, 2026-11-20 |
| A10 | The hub already hand-serves `/.well-known/*` documents before the app gate, and `/api/mcp` is already exempt from session auth. | `hooks.server.ts:166-206,230,516-518` |
| A11 | Claude Code connects to an MCP server that advertises OAuth: it discovers the metadata, registers itself where allowed, opens a browser and listens on a loopback address for the result. | `claude mcp add --help` (`--client-id`, `--callback-port`); MCP authorization spec |

## TO-BE

A person adds the hub to a harness with only its address. The harness opens the hub in a browser; the person signs in as usual, sees which app is asking, picks the organization, and approves. From then on every tool call runs as that person in that organization with their role there. The person can see and end their connections in the hub.

The hub issues the credential itself. It is valid only on the MCP endpoint.

Invariants:

- **INV-1** A call is served only for a live connection whose person still exists and is still a member of the connection's organization.
- **INV-2** A tool does nothing the same person could not do in the hub with the same role in that organization.
- **INV-3** A connection belongs to exactly one organization, fixed at approval, and never changes.
- **INV-4** Ending a connection stops its very next call and its ability to renew.
- **INV-5** A connection credential is useless anywhere but the MCP endpoint, and a browser session is useless on the MCP endpoint.
- **INV-6** API keys keep working: every existing key assertion still holds.
- **INV-7** An app can only receive a credential at an address on the person's own machine, and only after that person approved it by name on the hub.
- **INV-8** Credentials are stored only as hashes; a database read does not yield a usable credential.

## DELTA

| From | To | Proof |
|---|---|---|
| Key in a header (A4) | Browser sign-in started by the harness | Metadata served; unauthenticated call answers 401 with the pointer; live connection from Claude Code with only the address |
| Org identity (A2) | Person + org role + one org | Tests per tool: permitted member passes, member without permission refused, non-member refused |
| No rows (A3) | `sandbox_query` for signed-in callers only | Tests: no `view` on the dataset's module → refused; key callers do not see the tool |
| No connection management | "Connected apps" with end | Test: ended connection → 401 on the next call and on renewal |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a harness by signing in (Priority: P1)

**Independent Test**: `claude mcp add --transport http minion-hub <hub>/api/mcp`, then one browser approval, ends with the hub's tools listed.

1. **Given** no credential, **When** a harness calls the endpoint, **Then** it gets 401 with a pointer to the sign-in description, which names the hub itself as the place to sign in.
2. **Given** an app that registers itself with a return address on the person's own machine, **Then** it is accepted; **Given** any other return address, **Then** registration is refused.
3. **Given** a signed-in person on the approval screen, **Then** they see the app's name and return address, and must pick one of their organizations (preselected when there is only one).
4. **Given** a person who is not signed in, **When** they reach the approval screen, **Then** they are sent to sign in and come back to the same request (password sign-in; Google sign-in must return there too).
5. **Given** approval, **Then** the harness receives a credential and `tools/list` shows the tools that person's role allows.
6. **Given** denial, **Then** the harness is told access was denied and no connection exists.
7. **Given** a person with no organization, **Then** the approval screen says so and offers no approval.

### User Story 2 - Tools obey the person's role (Priority: P1)

1. **Given** a member whose role can manage the Sandbox, **When** they write a block, **Then** it is stored with them as its author.
2. **Given** a member whose role cannot manage the Sandbox, **When** they call a sandbox write or read tool, **Then** the reply says their role does not permit it and nothing changes.
3. **Given** a member who can manage the Sandbox and has `view` on sales but not finance, **When** they query a sales dataset, **Then** rows come back; a finance dataset is refused.
4. **Given** a person removed from the organization, **When** the harness calls again, **Then** it is refused and the connection is ended.
5. **Given** `whoami`, **Then** the reply names the person, the organization, their role(s) there, whether they may manage the Sandbox, and which datasets they may query.

### User Story 3 - See and end connections (Priority: P2)

1. **Given** Settings → Developers, **Then** a person sees their own connections in the current organization: app name, approved on, last used.
2. **Given** a member with `settings:manage`, **Then** they see every connection of the organization, with the person.
3. **Given** a connection is ended (by its person or by such an admin), **When** that harness calls or renews, **Then** it gets 401 and must be approved again.

### Edge Cases

- Unknown, malformed, expired or ended credential → 401 with the sign-in pointer (the harness renews or signs in again).
- Renewing with a renewal credential that was already used → the whole connection is ended (theft signal).
- An approval code used twice, used after 60 seconds, or with the wrong proof → refused; nothing is issued.
- Two harnesses on one account → two connections; approving again never changes an existing one.
- A platform admin who is not a member of an organization cannot connect to it.
- A request carrying both a hub cookie and a connection credential is treated by the credential alone.
- `mk_` values take the key path; `mcp_` values take the connection path; anything else is 401.

## Requirements *(mandatory)*

- **FR-001**: The endpoint MUST accept a hub-issued connection credential as `Authorization: Bearer`, in addition to org API keys.
- **FR-002**: The hub MUST publish protected-resource metadata and authorization-server metadata, and MUST answer unauthenticated or invalid-credential calls with 401 and a `WWW-Authenticate` pointer.
- **FR-003**: The hub MUST accept self-registration of public apps whose every return address is a loopback address (`http://localhost`, `http://127.0.0.1`, `http://[::1]`, any port), and refuse all others. Registration MUST be rate limited.
- **FR-004**: The approval screen MUST require a signed-in person, show the app name and return address, list only that person's organizations, and offer approve and deny. It MUST NOT be embeddable in another site.
- **FR-005**: Approval MUST use the authorization-code flow with PKCE (S256 only): a single-use code valid 60 seconds, bound to the app, the return address, the person, the organization and the proof.
- **FR-006**: Exchanging a code MUST create one connection and issue an access credential (1 hour) and a renewal credential (30 days, replaced on every use). Reuse of a replaced renewal credential MUST end the connection.
- **FR-007**: Every call MUST load the connection, confirm the person exists and is a member of its organization (ending the connection if not), and resolve their role there from the hub's permission service.
- **FR-008**: For a signed-in caller every sandbox tool MUST require `settings:manage` (the Sandbox page's permission); `sandbox_query` MUST additionally pass the existing per-dataset `view` and record-scope checks. Refusals MUST read "Your role does not permit …".
- **FR-009**: Signed-in callers MUST get `whoami` and `sandbox_query`; `sandbox_datasets` MUST list only datasets they may view. Key callers MUST NOT see `whoami` or `sandbox_query`.
- **FR-010**: Elements created by a signed-in caller MUST record that person as author; elements they change MUST clear any recorded key.
- **FR-011**: A person MUST be able to list and end their own connections; a member with `settings:manage` MUST be able to list and end all connections of the organization.
- **FR-012**: Calls MUST be rate limited per connection, and credential checks per address before any lookup.
- **FR-013**: Credentials and codes MUST be stored only as hashes (INV-8).
- **FR-014**: Key-authenticated behaviour MUST keep every existing assertion (INV-6).

### Key Entities

- **App**: a registered client: id, name, return addresses.
- **Connection**: person, app, organization, approved at, last used at, ended at, ended by.
- **Credential**: hash, connection, kind (code, access, renewal), expires at, used at; a code also carries the return address, the proof challenge, the person and the organization until it becomes a connection.

## Success Criteria *(mandatory)*

- **SC-001**: From `claude mcp add` with only the address to a working tool list takes one browser approval and under a minute.
- **SC-002**: A member without the Sandbox permission cannot read or change anything through the endpoint; a non-member gets nothing.
- **SC-003**: Ending a connection takes effect on the next call.
- **SC-004**: A connection credential presented as a hub browser session, or to the database's API, is rejected.
- **SC-005**: Every existing key test assertion holds (mocks may be extended).

## Assumptions

- The approval screen relies on the hub's existing sign-in; this slice fixes the Google return path only if it is broken for this URL (A5).
- Role changes can take up to the permission cache's lifetime (A6) to show in tool calls; membership removal and ended connections are immediate.
- Harnesses that need a non-loopback return address (hosted assistants) are out of scope.
