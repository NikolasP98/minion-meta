# Phase 0 — Research: Agent bridge RBAC parity

Every question below was resolved by reading the two repositories in this session, not by looking anything up externally. Anchors are hub `origin/master` `7d917ed0` and gateway `origin/DEV` `f2de5e00534`.

## R1 — One guard that returns decisions, vs. one guard per concern

**Decision**: extend the single existing guard. `requireAssistantCapability(locals, url, module, action)` keeps its signature and gains (a) an `isModuleEnabled(ctx, module)` check and (b) two extra fields on its return value: the owner id to filter by (or `undefined`) and whether sensitive fields must be masked.

**Rationale**: all 48 endpoints already call it or `resolveAssistantPrincipal` directly, and it already builds the `CoreCtx` that `isModuleEnabled` needs — so the module check costs one line and reaches every endpoint at once (E-rbac-parity's own "suggested order of work" item 4). Returning the owner/mask decisions rather than a second helper is what stops the failure mode the audit actually found: four endpoints computed these by hand and 44 forgot. A handler that destructures the result sees the fields; a handler that ignores them is visible in review as an endpoint that took a decision and dropped it.

**Alternatives rejected**:
- A separate `requireAssistantOwnerScope()` / `requireAssistantMask()` pair — same omission failure mode, three call sites per endpoint instead of one.
- Making `ownerFilter(locals, module)` / `shouldMaskSensitive(locals, module)` work for gateway callers — they key off `App.Locals.user`, which a gateway caller does not have (the reason is written at `query/tickets/+server.ts:29`); faking a `locals.user` for the bridge would put a synthetic session into the human code path, which is strictly worse than reading the same decision off `Capabilities`.
- A SvelteKit `handle` hook for the bridge — server-token requests deliberately bypass the gate chain (`resolve-identity.ts:296-307`, `bypassGate: true`), so a hook would have to undo that bypass for all of `/api/gateway`, a much larger behavioural change than this feature needs.

## R2 — Refusal status for a disabled module: 404

**Decision**: 404, matching the human API's `module_disabled`.

**Rationale**: `custom-properties-access.ts:53` throws `error(404, 'module_disabled')`, and the human module gates E-rbac-parity §S6 lists (`api/sales/orders/+server.ts:12`, `api/support/issues/+server.ts:14`, `api/stock/bins/+server.ts:13`, `api/projects/+server.ts:29`, `api/pos/sellables/+server.ts:34`, `$server/auth/scheduling-read.ts:11`) all 404. Parity means the same status, not merely the same denial: a 403 would make the agent tell the user "your role does not permit this", which is false — their role is fine and the module is off.

**Alternatives rejected**: 403 with a distinct message (loses parity, misinforms the user); 503 (implies transient).

**Open consequence**: `isModuleEnabled` reads through `cached()`, so it can throw where the capability check would not. FR-027 resolves that as "refuse", which is both fail-closed and what the human path does when the same read fails.

## R3 — Owner scope on writes: pre-check, not filtered write

**Decision**: read the record with the owner filter first and refuse (404) if it is not visible, then write.

**Rationale**: it is literally what the human handler does — `api/crm/contacts/[id]/+server.ts:56-60` runs `if (ownerId && !(await getContact(ctx, id, ownerId, true))) throw error(404)`. A filtered `UPDATE … WHERE owner_id = $me` would silently succeed with zero rows affected, which the agent would report to the user as done.

**Alternatives rejected**: owner predicate on the update (silent no-op); doing nothing for writes and only filtering reads (leaves A5's edit-any-contact gap open).

## R4 — The custom-tool credential: gateway-mediated, not a new token

**Decision**: stop putting `MINION_HUB_TOKEN` in the script environment. A script that needs hub data gets a run-scoped endpoint on the gateway, which forwards through the authenticated client it already owns (`hub-common.ts:44-84`); the script holds a per-run handle, not a credential.

**Rationale**: the smallest of the two directions in `C-tool-feeding.md` §S2. It adds no token lifecycle (no issuance, expiry, rotation or revocation surface), reuses `hubGet`/`hubPost` unchanged, and keeps the hub's view of the caller exactly as it is today — so no hub change and no RBAC change are needed for this slice. The alternative, minting a short-lived principal-scoped token per run, means a new hub endpoint, a new secret with its own expiry, and a second credential shape on the bridge — more code to secure the thing we are securing.

**Alternatives rejected**: minted per-run token (above); leaving the token in place and documenting publish as an admin-trust boundary (the loader runs published tools for *any* hub-linked personal agent, so the editor's admin gate does not bound who can run them — `server-methods/tools.ts:338` vs. the loader at `custom-tools.ts:204-248`); sandboxing first (`run-script.ts` is explicit that there is no container sandbox — a real gap, but removing the credential does not wait on it).

**Known limit**: an unsandboxed script can still read everything else in its environment and reach the network. `shortcut: the credential is removed, the sandbox is not; upgrade when run-script.ts gains a container.`

## R5 — The 404 "legacy hub" escape: delete, with an explicit flag if the fleet needs one

**Decision**: a 404 from `query/tool-permissions` produces a `null` snapshot like every other failure, so `permissionAllowed()` denies permission-carrying tools. Legacy tolerance, if anyone still needs it, becomes an operator config flag or a positive `{supported:false}` answer from the hub.

**Rationale**: `hubGet` synthesizes `request failed: 404` whenever a 404 body is not JSON — which is what SvelteKit returns for a missing **or misrouted** route. On 2026-10-11 every hub route 404'd for ~11 h; in that window every permission-gated tool would have been offered to every role with nothing but an in-memory `legacyHub` flag to show it. Everything else in the file is already fail-closed (`hub-capabilities.ts:78-100`), so this is one branch removed and the file becomes consistent with its own header comment.

**Alternatives rejected**: keeping the inference and adding a route-health probe (two mechanisms to get one answer); treating 404 as fail-closed only when a flag says the hub is modern (a flag that must be set to be *safe* is the wrong default).

**Residual uncertainty**: whether any fleet hub genuinely predates the endpoint — one of the spec's two `[NEEDS CLARIFICATION]` items. If one does, FR-017's flag is required; if none does, the branch is deleted outright.

## R6 — `module_action`: document, do not invent a permission

**Decision**: leave `module_action` without a permission meta; add a test asserting every endpoint on its 17-entry allowlist enforces a hub capability, and correct the tool-scaling spec's "L1 is a security boundary" wording.

**Rationale**: the hub handler is the only guard a bridge request passes (`resolve-identity.ts:296-307`), so the gateway's L1 filter is prompt economy. Giving `module_action` a coarse permission (say `overview.view`) would look like a control while changing nothing about what the endpoint accepts — and would newly hide the tool from roles that can legitimately use the endpoints behind it. The honest fix is the invariant: no endpoint is reachable through that tool without a hub-side gate.

**Alternatives rejected**: a coarse permission (security theatre, plus a new denial path); removing the tool (it is the only reach for `pos-sale`, `booking-complete` and the two stock-issue endpoints, which have no dedicated tool at all).

## R7 — Which direction the create/edit skews resolve

**Decision**: the agent adopts the human path's capability — `edit` for `booking-create`, `stock-entry-create`, `stock-issue-from-invoice`, `task-create`, `ticket-create`; `create` for `pos-sale`. `tool-save` additionally requires what the human needs (`create`/`edit` **and** `manage`).

**Rationale**: `apiWriteCapability` is the human contract and already carries explicit, commented exceptions where the team decided a POST is `create` work (`/api/pos/plans`, `/api/pos/tickets`, `/api/pos/appointments` — `rbac.service.ts:1179-1197`). Moving the *human* path instead would loosen the human path for every caller, which is a product decision well outside a parity fix. Four agent flows become stricter; that is named in FR-025/SC-010 and in the release note.

**Alternatives rejected**: adding the four paths to `CREATE_COLLECTION_ENDPOINTS` (loosens the human API); per-endpoint judgement calls (exactly the drift the parity test exists to stop).

**Owner decision required** (Constitution V): this is the one answer in the feature that reduces what an agent can do today.

## R8 — How the parity test knows the human path

**Decision**: a committed table in `contracts/actions-human-path-map.md`, mirrored as a typed constant beside the test; each `actions/*` endpoint maps to one human pathname and method. The test asserts the endpoint's required capability equals `apiWriteCapability(pathname, method)` and **fails on an endpoint that is not in the map**.

**Rationale**: the capability a handler requires is an argument to a function call, so the test needs either source parsing or a declared map. A map that must be updated for a new endpoint is the cheaper half of the pair and makes the omission loud (the same mechanism as the repo's existing frozen export inventories, e.g. `pos-service-boundaries.test.ts`). Three endpoints have no human counterpart at all (`stock-issue-from-service`, `notify-user`, `note-create`) and are declared as such in the map with the reason, so "no counterpart" is a recorded decision instead of a silent gap.

**Alternatives rejected**: deriving the capability by parsing `+server.ts` (brittle); asserting only the six known skews (would not catch the seventh).
