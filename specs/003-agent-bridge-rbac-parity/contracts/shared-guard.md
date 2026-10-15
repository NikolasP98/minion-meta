# Contract — the shared bridge guard

What every `/api/gateway/**` handler may rely on after this feature, stated as behaviour rather than
as a signature so the implementation can pick the smallest shape that satisfies it.

## Inputs

`locals`, `url`, the endpoint's `module`, the endpoint's `action`.

## Guarantees

1. **Principal.** The caller is resolved to `{principalId, orgId}` by `resolveAssistantPrincipal`,
   unchanged: the org is never taken from the request as authority, a requested org may only narrow
   or be rejected, and a browser caller is self-or-admin only.
2. **Capability.** `capabilities.can(module, action)` holds, or the request has already been refused
   with 403 and a message the agent can relay verbatim to the user.
3. **Module state.** `module` is enabled for `orgId`, or the request has already been refused with
   404 `module_disabled` — the human API's outcome. An absent toggle row counts as enabled; a
   *failure to read* the state refuses.
4. **Owner scope, handed over.** The result carries the owner id the handler must filter by, or
   `undefined` when the person's roles grant un-restricted view. The handler does not call
   `ownerScoped` itself and does not decide whether the module is owner-scopable.
5. **Field level, handed over.** The result carries whether sensitive fields must be masked for this
   person on this module (`fieldLevel(module) < SENSITIVE_FIELD_LEVEL`).
6. **Context.** The result carries the org-scoped `CoreCtx` (`{db, tenantId, profileId}`) it already
   returns today, so no handler re-derives an org.
7. **Observability.** Every refusal the guard makes emits one structured record
   `{endpoint, module, action, reason}` with no withheld data in it.

## Obligations on the handler

- A handler that receives an owner id **must** apply it: filter reads, and pre-check the target
  record on a write and refuse (404) if it is not visible — the human path's behaviour
  (`api/crm/contacts/[id]/+server.ts:56-60`).
- A handler that receives "mask" **must** mask before responding. Masking in a client or in the
  agent runtime does not satisfy it: the gateway, the model and any channel transcript are outside
  the trust boundary (FR-029).
- A handler that spans two modules calls the guard for each; the stricter answer wins.
- A handler that legitimately needs no module or no capability (the capability read itself, personal
  notes, platform admin endpoints) states that in a code comment naming why. Silence is not an
  exemption.

## Non-guarantees (stated so nobody assumes them)

- **Freshness.** The server-token resolution is memoised 60 s (`resolve-identity.ts:78`) and the
  module-state map is cached 5 m with 1 m stale-while-revalidate (`modules.service.ts:13-24`), so a
  revoked role or a freshly disabled module can be honoured late on the agent path. This feature does
  not change that.
- **The gateway's tool filter is not this guard.** `permissionAllowed()` in the gateway decides which
  tools the model is *offered*; it is prompt economy. This guard is the only boundary, because
  server-token requests bypass the hub's central gate chain entirely
  (`resolve-identity.ts:296-307`).
- **Cross-org credential endpoints are out of scope.** `google-adc`, `google-identities` and
  `channel-identities` are hub PR #541's; this guard must not be read as covering them.
- **No sandbox.** Nothing here constrains what a custom-tool script does once it runs.
