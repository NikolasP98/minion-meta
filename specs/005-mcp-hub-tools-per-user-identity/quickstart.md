# Quickstart: validating hub tools over MCP under the caller's own RBAC

How to prove the feature works, in the order that fails fastest. Read `plan.md` for scope and
`contracts/` for the surfaces. Nothing here is implementation code.

## Prerequisites

| # | Prerequisite | Why | How to confirm |
|---|---|---|---|
| P1 | Hard dependency HD1 is done: the personal-agent↔gateway assignment is restored | Every hub tool call is a 403 until then (`audits/2026-10-15-agent-harness/00-synthesis.md` L1) | A gateway→hub read tool returns data rather than `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` |
| P2 | HD2: the capability source fails closed on a 404 | A fail-open capability source makes the whole filter decorative (`audits/.../C-tool-feeding.md` C-S1) | Point the capability fetch at a 404 and confirm tools are denied, not allowed |
| P3 | HD3: module-enabled is checked on the bridge | FR-016 depends on it (`audits/.../E-rbac-parity.md` E-S6) | A disabled module's tool is refused |
| P4 | The gateway is configured to trust the hub as a JWT issuer | It is the only RBAC-carrying auth path (`gw src/gateway/server.impl.ts:1694-1710`) | A hub-minted token authenticates a WebSocket connect today |
| P5 | At least 3 test personas in one organization: full capability, view-only, single-module | Story 2 and SC-003 are table tests over personas | Each can sign in to the hub and sees the modules you expect |

P1–P3 are other slices' work. Starting this feature's acceptance without them produces green unit
tests and a broken product — the exact failure mode the audit found live.

## Order of validation

### Step 1 — identity before anything else

1. As a persona, create a credential for their organization in the hub. Confirm the secret is shown
   once and the listing shows org, created and expires.
2. Exchange it for a gateway token with no browser cookie. Confirm the token's claims name that user,
   that organization, and **a non-empty personal agent** — this last is the thing that is empty today
   (`research.md` R2) and the single most likely silent failure.
3. Present the token to `POST /mcp` `initialize`. Confirm success.
4. Ask the session who it is. Confirm it reports the user, not an administrator.
5. Revoke the credential in the hub. Confirm the **next** `/mcp` request is 401 (not the one after a
   restart, and not after an hour).
6. Remove the persona's membership of the organization. Confirm an unexpired credential stops working.

**Stop here if step 2 or step 5 fails.** Steps 2 and 5 are the two invariants that make the rest safe.

### Step 2 — the list, per persona

For each of the 3 personas, list tools and compare against that persona's capabilities:

- full capability → all 27 permission-declaring hub tools present;
- view-only → every write tool absent;
- single-module → only that module's tools present;
- for every persona → `module_action`, `notes_create`, `notes_query` absent (they declare no
  permission, spec Clarifications Q3);
- for every persona → the ~19 infrastructure tools still present.

Then the symmetry check (INV-2): for each persona, call one tool that *is* listed and one that is
*not*. The listed one must not fail for permission reasons; the unlisted one must.

### Step 3 — the hard invariant, exhaustively

Connect with the **shared gateway token**. Then, separately, with an **embedded-OAuth token** if
OAuth is enabled.

- `tools/list` must contain zero hub business tools.
- Call each of the 16 exported write tools by name. Every one must be refused.

This is SC-004 and it is deliberately exhaustive rather than sampled: a filter that forgets one write
tool is the whole exposure.

### Step 4 — real work, and attribution

1. As a persona with read capability, call a read tool. Confirm only their organization's data comes
   back.
2. As a persona with write capability, call a write tool. Confirm the hub records the change and that
   the audit trail names the human followed by the via-agent marker
   (`hub src/routes/api/gateway/_shared/action-auth.ts:40-50`).
3. Pass a different organization id in the tool arguments. Confirm refusal (INV-4).
4. Call a tool whose business precondition fails (for example a till operation with no open shift).
   Confirm the message is distinguishable from a permission refusal.

### Step 5 — limits and durability

1. Exceed the call budget on one credential. Confirm a retryable refusal naming when to retry, and
   that a second credential is unaffected.
2. Restart the gateway. Confirm an MCP client reconnects and re-lists without the user re-minting,
   and that embedded-OAuth client registrations survive.
3. Confirm a refresh token past its expiry is refused.

### Step 6 — reporting and the kill switch

1. Open `/capabilities` as the owner and confirm the MCP list equals what a client receives.
2. Withhold one tool from MCP. Confirm external clients no longer list or call it, while the in-app
   assistant still uses it.

## Automated gates to run before any PR

Per-repository, from the subproject directory or through the meta CLI, in the foreground:

| Repo | Gates |
|---|---|
| gateway (`minion/`) | `pnpm tsgo`, `pnpm check`, and the targeted vitest paths for the MCP and agent-tool areas — **never** the full `pnpm test` suite (it crashes the box; the gate is `pnpm vitest run test/ci/`) |
| hub (`minion_hub/`) | `bun run check`, `bun run lint:design && bun run lint:tokens` if any UI changed, `bun run i18n:compile` for new strings, the route-contract manifest test for new routes, and targeted vitest — **never** the full `bun run test` with a `.env` present (it has hit production through `*.sql.integration` tests) |

## What this quickstart cannot prove

- Whether `/mcp` is publicly reachable (OG2). That is a reverse-proxy fact an operator confirms.
- Whether the 403 refusals a hostile client generates are actually visible to an operator (FR-024)
  without someone looking at the alerting.
- Behavior under a real external client's quirks: tool-name length limits, schema strictness, and
  `list_changed` handling differ between Claude Code, Codex and Cursor, and only connecting all three
  shows it.
