# Feature Specification: `dev:local` gateway mode

**Feature Branch**: `docs/spec-011-dev-local-gateway`

**Created**: 2026-10-16

**Status**: Draft

**Input**: Owner decision (verbatim): "I should be able to interact with the agent from a dev server. At least there should be a mode where a local server can ship with it enabled." → "yep, do 2" = a mode in which a local dev server also starts a Minion gateway, provisions the QA personas' personal agents on it, and wires it into the dev environment so the floating assistant is online locally, with no production contact.

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

### AS-IS — current observable behavior

Running `bun run dev:local` in `minion_hub` gives a working dashboard on a containerized, seeded Supabase backend, but **the floating assistant is permanently offline and no agent can be talked to**. Four independent mechanisms produce that outcome:

| # | Observable | Evidence |
|---|---|---|
| A1 | `dev:local` deletes every inherited gateway variable from its own process before any step runs, so nothing downstream can see a gateway. | `minion_hub/scripts/qa/dev.ts:116` calls `ignoreInheritedBackendEnv(TAG)`; that function deletes each name in `BACKEND_ENV_KEYS ∪ OUTBOUND_SERVICE_ENV_KEYS` (`scripts/qa/backend.ts:114-123`), and `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_URL`, `MINION_GATEWAY_BROADCAST_URL`, `MINION_GATEWAY_PRIMARY_URL`, `MINION_GATEWAY_URL` are members (`scripts/qa/backend.ts:97-101`). |
| A2 | `.env.qa` then writes those same five names back as **empty**, deliberately, so a developer's `.env.local` can never refill them. | `scripts/qa/env.ts:107` (`...OUTBOUND_SERVICE_ENV_KEYS.map((key) => \`${key}=\`)`) with the rationale in the comment at `scripts/qa/env.ts:94-106`. Confirmed in the on-disk artifact: `minion_hub/.env.qa` contains `OPENCLAW_GATEWAY_TOKEN=`, `OPENCLAW_GATEWAY_URL=`, `MINION_GATEWAY_BROADCAST_URL=`, `MINION_GATEWAY_PRIMARY_URL=`, `MINION_GATEWAY_URL=`. |
| A3 | The browser does not read gateway credentials from env at all — it reads a **host list loaded from the Postgres `gateway` table** — and that table is empty on the QA stack, so there is no host to connect to. | `src/routes/(app)/+layout.server.ts:138` → `loadHostsForUser` → `listGatewayHostsForUser` (`src/server/services/gateway.pg.service.ts:270`, fail-closed `if (!orgId) return []`, otherwise `gateway ⋈ user_gateway`). The client takes the list from `page.data` (`src/lib/state/features/hosts.svelte.ts:251`) and fetches the token out-of-band from `POST /api/servers/[id]/token` (`hosts.svelte.ts:84-108`) immediately before `wsConnect()` (`src/lib/services/gateway.svelte.ts:562`, host read at `:583`). Measured on the running QA stack 2026-10-16: `select count(*) from gateway` = **0 rows**. |
| A4 | The only gateway fixture the QA seed writes is a **legacy Turso-mirror `servers` row in libsql**, with `auth_mode 'none'`, no token, and a URL on the bridge port — not a row in the Postgres `gateway` table the hub actually reads. | `scripts/qa/seed/gateway-libsql.ts:28-41` inserts `servers(id, tenant_id, name, url='http://127.0.0.1:18790', auth_mode='none', …)`. The file's own header notes `personal_agents` is not there — it lives in Postgres. |

Two further AS-IS facts constrain the design:

- `personal_agents.gateway_id` **exists** (uuid, nullable — verified against the running QA Postgres) but is never written: the QA seed helper `ensureSeededPersonalAgent` (`scripts/qa/seed/tenancy.ts:26-99`) inserts only `(id, profile_id, agent_id, display_name, provisioning_status)`, and the runtime provisioner passes `serverId: ''` (`src/server/services/personal-agent-provisioner.ts:112`). So every QA persona has a personal-agent row with a NULL gateway.
- The hub's own inbound bridge for calls made *by* a gateway requires a real gateway row: `resolveGatewayPrincipal` (`src/server/auth/assistant-principal.ts:89-134`) rejects with 403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` unless `locals.serverId` resolves to **exactly one** `gateway` row whose `org_id` equals the token's org.
- `docker-compose.qa.yml` declares one service (`hub`) and no gateway (`minion_hub/docker-compose.qa.yml:16-44`).

Net AS-IS: a developer can exercise every hub screen locally except the one that needs an agent. To talk to an assistant they must point the dev server at a real gateway — i.e. at production — which the QA pipeline exists to prevent.

### TO-BE — desired observable behavior and invariants

`bun run dev:local --gateway` brings up everything `dev:local` brings up today **plus** a Minion gateway running locally in the QA compose project, and the dashboard's floating assistant is online against it.

Invariants that must hold:

- **I1 — opt-in.** Without `--gateway`, behavior is byte-for-byte unchanged: the five gateway names are still dropped and still written empty, and no gateway container is started.
- **I2 — no production contact.** Every URL the stack resolves stays loopback. The existing loopback assertion (`assertResolvedLoopback`, `scripts/qa/dev.ts:91`) is extended to the gateway URL rather than bypassed. No request leaves the machine except the container image pull and the model-provider API calls the agent itself makes.
- **I3 — one declared secret boundary.** Model-provider keys are the only developer secrets that enter the stack, they enter only under `--gateway`, they are copied only into the gateway container's environment, and that is stated in the documentation. Everything else in `OUTBOUND_SERVICE_ENV_KEYS` stays blanked.
- **I4 — the gateway token is generated, not borrowed.** The shared secret is minted per stack, persisted mode 600 outside git, and sealed with the QA `ENCRYPTION_KEY` in the `gateway` row exactly as a production row is.
- **I5 — idempotent.** Re-running the command re-uses the existing token, container and rows; it does not accumulate gateways, agents or personas.
- **I6 — non-destructive to a co-tenant.** The command adds a service to the existing QA compose project; it never resets or tears down the shared Supabase containers.

### DELTA — exact transitions and the test that proves each

| ID | Transition | Proof |
|----|-----------|-------|
| D1 | `--gateway` flag parsed by `dev:local` (and `qa:up`) and threaded to the env writer and the seed. | Unit test on the pure flag/arg parser. |
| D2 | A per-stack gateway token is minted once and reloaded on re-runs. | Unit test: two calls to the loader return the same value; file mode is 600. |
| D3 | `.env.qa` keeps the five gateway names blank by default, and under `--gateway` resolves them to the local gateway's loopback URL + the minted token. | Unit test on the pure `.env.qa` builder: default output contains `MINION_GATEWAY_URL=`; gateway-mode output contains the loopback URL and the token. |
| D4 | A `minion-gateway` service exists in the QA compose project with the published image, the minted token, the host-reachable hub callback URL, and the provider keys. | Compose config is parsed and asserted (`docker compose config`) in the contract test; `qa:status` reports the container's health. |
| D5 | The seed writes one token-bearing `gateway` row (channel `dev`, `org_id` = QA business org, sealed token) plus `user_gateway` links for the QA personas. | Seed matrix row + `seed.contract.test.ts` assertion; `listGatewayHostsForUser` returns it for the admin persona. |
| D6 | QA personas' `personal_agents.gateway_id` points at that row with `provisioning_status = 'active'`. | Seed matrix row + contract assertion that `gateway_id is not null`. |
| D7 | The agents exist on the gateway itself, so a chat request resolves to a real agent. | The bootstrap step reports created/already-present agent ids; browser proof below. |
| D8 | The floating assistant is online and answers. | Browser proof: log in as the QA admin persona, open the assistant, observe a connected (not "offline") composer, send a message, capture the reply. |
| D9 | Documentation states the mode, its one secret boundary, and its limits. | `minion_hub/docs/qa-stack.md` section. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Talk to an agent on a local dev server (Priority: P1)

As the product owner working on assistant behavior, I start the local dev server in gateway mode and hold a conversation with my own assistant in the dashboard, without any of it touching production.

**Why this priority**: This is the whole of the owner's request. Nothing else in this feature has value without it.

**Independent Test**: Start the dev server with the flag, log in as a seeded persona, open the floating assistant, send a message, receive a reply.

**Acceptance Scenarios**:

1. **Given** the local stack started in gateway mode, **When** I open the dashboard and reveal the floating assistant, **Then** it presents itself as connected rather than offline.
2. **Given** the assistant is connected, **When** I send it a message, **Then** a reply from my own assistant appears in the conversation.
3. **Given** I stop and restart the stack in gateway mode, **When** I open the assistant again, **Then** it is connected again without my re-entering any credential.

### User Story 2 - Default mode stays sealed (Priority: P1)

As any developer or agent on this repository, I keep the existing guarantee that a plain local dev server cannot reach any external service, including a gateway.

**Why this priority**: The QA stack's reason to exist is that it cannot touch production. A mode that weakens that by default would be a regression with security consequences, so it ships in the same breath as the feature.

**Independent Test**: Start the local stack without the flag and confirm no gateway is present and no gateway credential is resolvable.

**Acceptance Scenarios**:

1. **Given** no flag, **When** the stack starts, **Then** no gateway process is running in the stack and the dashboard's assistant is offline as before.
2. **Given** no flag and a developer's own environment file containing real production gateway values, **When** the stack starts, **Then** those values are not visible to the dev server.
3. **Given** the flag, **When** the stack starts, **Then** every address the stack resolves is a loopback address, and the start is refused outright if one is not.

### User Story 3 - A second developer or agent is not disrupted (Priority: P2)

As a second agent already running a local dev server against the same shared QA backend, I am not torn down by someone else enabling gateway mode.

**Why this priority**: Concurrent agents on this machine share one QA backend; a mode that resets it would cost another session its work. Lower than P1 because it is a constraint on the delivery rather than the owner's goal.

**Independent Test**: With a dev server already running against the QA backend, start gateway mode and confirm the first one keeps serving.

**Acceptance Scenarios**:

1. **Given** a dev server already running against the shared backend, **When** gateway mode is started, **Then** the shared backend containers are not recreated or reset.
2. **Given** gateway mode has been started once, **When** it is started again, **Then** no duplicate gateway, agent or persona appears.

### Edge Cases

- **No model-provider key available.** The stack must still start and the assistant must still connect; only the reply fails, and the failure must be legible rather than silent.
- **The published gateway image cannot be fetched** (offline, or no registry credentials). The command must fail with a message naming the image, not hang.
- **The chosen gateway port is already taken** by another gateway on the machine. The command must say which port and stop, not bind silently to something else.
- **A stale gateway row already exists** for the QA org from an earlier run with a different token. The seed must update it in place rather than add a second row, because the host picker tolerates only one match for a given identifier.
- **The container cannot reach the host dev server** for its hub callbacks. This is reported at bootstrap time, not discovered later as a confusing tool failure.
- **The developer stops the dev server with Ctrl-C.** As today, that stops only the dev server; the shared backend and the gateway keep running until their lifetime expires.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The local dev server command MUST accept an opt-in flag that additionally starts a Minion gateway as part of the local stack.
- **FR-002**: Without that flag, the command's behavior MUST be unchanged, including continuing to blank every outbound-service credential.
- **FR-003**: The stack MUST mint its own gateway shared secret on first use, persist it outside version control with owner-only permissions, and reuse it on subsequent runs.
- **FR-004**: In gateway mode the dev server MUST resolve the gateway's address and secret from the local stack, and MUST refuse to start if the resolved address is not a loopback address.
- **FR-005**: The stack MUST record the local gateway in the dashboard's own registry of gateways, scoped to the seeded local organization, with its secret stored the same way a production entry's is, and MUST link the seeded personas to it so the dashboard offers it as their host.
- **FR-006**: Each seeded persona's personal assistant MUST be associated with the local gateway and marked ready, and MUST exist on the gateway itself so a conversation resolves to a real assistant.
- **FR-007**: Model-provider credentials MUST be passed from the developer's own environment into the gateway only under the opt-in flag, and this MUST be the only place a developer-held secret enters the local stack.
- **FR-008**: The gateway MUST be reachable from the dashboard and MUST be able to reach the dashboard back for the tools that call into it.
- **FR-009**: Re-running the command MUST be idempotent in container, secret, registry entry, persona links and assistants.
- **FR-010**: Starting gateway mode MUST NOT reset, recreate or tear down the shared local backend, so a concurrently running dev server is unaffected.
- **FR-011**: The stack's status command MUST report whether the local gateway is up and healthy.
- **FR-012**: The documentation for the local stack MUST describe the mode, the single secret boundary it opens, and its known limits.

### Key Entities

- **Local gateway instance** — the gateway process in the local stack; identified by its loopback address and its per-stack shared secret.
- **Gateway registry entry** — the dashboard's record of a gateway: name, address, sealed secret, owning organization, and the build channel it serves (here: the development channel).
- **Persona-to-gateway link** — the association that makes a gateway appear as a host for a seeded persona.
- **Personal assistant** — a persona's own assistant: a record on the dashboard side pointing at a gateway, and a matching assistant on the gateway side.
- **Per-stack gateway secret** — the generated shared secret, held once outside version control and sealed into the registry entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a cold start, one command brings up a local stack in which a developer can send a message to their assistant and receive a reply, with no manual credential entry beyond a model-provider key already in their own environment.
- **SC-002**: In the default mode, zero gateway credentials are resolvable by the dev server, and this is checked automatically rather than by inspection.
- **SC-003**: Running the command twice leaves exactly one local gateway, one registry entry per organization, and one assistant per persona.
- **SC-004**: Enabling the mode while another dev server is running against the shared backend leaves that dev server serving.
- **SC-005**: Every address the stack resolves in either mode is a loopback address, enforced by a refusal to start otherwise.

## Assumptions

- **A-01**: A published gateway container image is reachable from the developer's workstation. *(Verified 2026-10-16: both the development and production tags of `ghcr.io/nikolasp98/minion-ai` resolve from this machine with the credentials already in the local container-registry configuration.)*
- **A-02**: The developer already holds a model-provider key in their own environment file. *(ASSUMPTION — owner to confirm)* If absent, the stack still starts and the assistant still connects; only its replies fail.
- **A-03**: The mode targets Linux hosts only, matching the existing local stack, which already documents itself as Linux-only because of its host-networking choice (`minion_hub/docker-compose.qa.yml:1-14`).
- **A-04**: One gateway per stack, serving the seeded local organization, is enough. Multi-organization or multi-channel local gateways are not in scope. *(ASSUMPTION — owner to confirm)*
- **A-05**: The seeded personas' assistants are created with the stack's default assistant configuration; per-persona personality tuning is out of scope. *(ASSUMPTION — owner to confirm)*
- **A-06**: The gateway's own persistent state (its configuration and workspace) may live in a stack-local directory outside version control and may be discarded; no requirement exists to preserve a local gateway's state across a stack reset. *(ASSUMPTION — owner to confirm)*

## Out of scope

- Any change to production gateway deployment, the swarm stack, or the netcup host.
- Any change to how the hosted dashboard resolves gateways for real organizations.
- Running more than one local gateway, or local gateways for more than the seeded organization.
- Channel extensions (Telegram, WhatsApp, and the rest): the local gateway serves the dashboard's assistant only.
- Voice, telephony and browser-automation capabilities of the gateway.
- Making the fully containerized local stack mode (as opposed to the host dev server) gateway-capable, beyond the flag being accepted if that is a one-line change.
- Fixing the pre-existing runtime provisioner defect that writes an empty gateway identifier (`src/server/services/personal-agent-provisioner.ts:112`) for hosted gateways; this feature writes the correct value on the seed path only and records the runtime defect in the open-items ledger.
