# EGM reviews of pass 2 (2026-11-15) and what pass 3 did with them

Two reviewers read pass 2 against gateway `gw-119` and hub `hub-116-base` (static). Production facts were then read by the spec author.

## Design critique: verdict not-ready

| # | Finding | Disposition in pass 3 |
|---|---|---|
| B1 | Browsers can hold the shared gateway token and connect as admin; "has a user id and is not admin" misclassifies shared-token sockets. | Confirmed in production: both gateways run `auth.mode: token` with no `multiTenant.oidcIssuers`. Spec states the spec 045 precondition at the top. Person = token role `user` or `org_admin`. |
| M1 | `agent` frames can lack a session key and carry text. | Events are allowed for persons only with an owned key or on a reviewed no-content list. |
| M2 | `heartbeat` carries a message preview and no key. | Not on the no-content list. |
| M3 | Two ownership rows with no precedence. | Second row (`user:<id>` shape) dropped. |
| M4 | `agent` by `sessionId` has no hook for a check. | A person must send an owned `sessionKey` on `agent`. |
| M5 | "New chat" needs `sessions.patch`, which needs the agent in the token list. | The token list now contains the assistant (slice 1). |
| M6 | Hub key call-site list incomplete (about 20 sites). | Hub key helper dropped with the second row. |
| M7 | Shared agents share memory; `tools.sessions.visibility` can reopen history. | Shared-agent chats dropped; both named out of scope and in the ledger. |
| minor | Impersonation keeps the admin role; `session.scope: global`; `pi-agent.subagents.list`; non-string keys. | Edge cases and FR-004 updated. |
| deletable | Remembered-key rule, `agent.wait` check, `exec.approval.request`, the FR-002 method list, row 2 and the hub key slice. | All deleted. |

## Codebase check

| # | Finding | Disposition |
|---|---|---|
| a1 | An existing personal-assistant row keeps a legacy id (`personal-agent.service.ts:134`). | Production: 2 of 14 differ. Ownership uses the id in the token list, which the hub fills from the stored row. |
| a3 | `agent.wait` has no run-to-session registry in the handler. | Check dropped; it returns status only. |
| a6 | `exec.approval.request` is refused earlier for lack of scope. | Removed from the gate. |
| a8 | The run-key fallback can emit a key without its `agent:<id>:` prefix. | Fails closed for persons; `chat.send` runs register the canonical key; SC-003 checks the real flow. |
| a9 | `mesh.run` nests session keys; `pi-agent.thinking.*`, `pi-agent.spawn`, `pi-agent.orchestrate`, `pi-agent.subagents.list`. | FR-003 and FR-004. |
| c4 | Four hub routes return stored chat rows to any organisation member. | New slice 2. |
| c5–c8 | Gate position, handler anchors, broadcaster structure, test helpers, no pinned files. | Carried into plan.md. |
