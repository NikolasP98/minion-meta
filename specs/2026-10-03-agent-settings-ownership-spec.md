---
id: 2026-10-03-agent-settings-ownership-spec
title: Bind agent capabilities and settings to their authenticated gateway owner
stage: spec
status: approved
pass: 2
verdict: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion, minion-meta]
findings: [HC-036]
tags: [security, data, logic, ui, test]
type: fix
---

# Agent settings ownership

## 0. Product

Changing the selected agent, organization or gateway must immediately stop showing the previous
selection's capabilities. A late read, failed write or reconnect cannot change the new selection.
Disabling the final skill leaves no skills enabled. A saved setting is never submitted again merely
because its refresh failed.

The Gateway remains responsible for authorization. This contract preserves method names,
permissions and skill inheritance semantics, and requires the narrow transport/error and atomic
configuration prerequisites below before its mutation paths can be accepted.

## Out of scope

Gateway authorization, agent execution and marketplace installation remain in their own reviewed
slices. Channel consumers include shared config reads/writes, plugin linking and the QR operation
that changes credentials/configuration before database creation. Their durable server/Gateway
implementation belongs to D's required child contract. This work does not redesign the agent
workspace or change channel-specific business rules.

## 1. AS-IS

Source inspected in the readiness Hub checkout based on `ea15c6732e1e6775e53841d151e68038caec7766`:

| Surface | Observable defect |
| --- | --- |
| `src/lib/state/agents/agent-tools.svelte.ts:12` | `tools.status` publishes into a module singleton after an ambient transport wait. An older load can clear a newer load's pending state. |
| Same module, `toggleTool` | Optimistic updates and unconditional rollback have no write ordering or owner check. |
| `src/lib/state/agents/agent-skills.svelte.ts:11` | Status and settings completion update one shared selection with no authenticated session or agent epoch. |
| `AgentSkillsPanel.svelte:51` | The final disabled skill sends `null`, which means inherit all, instead of `[]`. The next filter also excludes globally disabled skills and can accidentally erase unrelated explicit selections. |
| `AgentDashboard.svelte:28` | File-count success and failure publish after an agent switch; the effect watches `connected` rather than the exact authenticated session. |
| `AgentCapabilitiesPanel`, `AgentSettingsPanel`, `ChatInput` | Counts and suggestions read the same ambient skills/tools singleton even when their agent differs. |
| `src/lib/state/agents/tool-catalog.svelte.ts:22` | A purported session cache never checks a session token; an old request can prime the new gateway's permission badges. `BuilderHub` also writes directly into this cache. |
| `src/lib/state/config/config.svelte.ts:182,275` | The optional `current` callback defaults to true. Save acknowledges one gateway and then reloads through ambient transport, allowing the new gateway to receive or display old draft state. `loadConfig` swallows reload errors, so the caller's success toast is not proof of a successful refresh. |

These are source-confirmed failure paths. No cross-tenant write or production exploit was attempted.
The existing authenticated `GatewaySessionOwner` already exposes an opaque token, actor/org/host
identity, `current()` and an exact-client `request()` function. Reliability uses it with canonical
PageData; this work must reuse that authority source.

### Required shared and Gateway prerequisites

The installed Hub shared artifact currently turns server errors into plain `Error` values. Source
that defines `GatewayError` is not evidence that the installed artifact preserves it. Publish a new
reviewed local shared artifact and pin/lock it in every consuming checkout used for qualification;
test the actual installed module. Preserve finite client `source/code` distinctions for known-unsent
not-connected/send failure and dispatched timeout/disconnect, plus server error codes. A send error
is known-unsent only when transport semantics prove no dispatch; otherwise classify it unknown.

Gateway unknown-method dispatch must expose an unambiguous method-unsupported code, and an actual
base-hash mismatch must expose `CONFLICT`; missing or unavailable hash remains a distinct validation
failure. Additive codes preserve old clients' generic error handling. Historical `INVALID_REQUEST`
is treated as a generic known server rejection, never parsed by English message into conflict or
unsupported. Legacy reads may display a generic unavailable state when no stable subtype exists.
Shared/Gateway error schema, real dispatcher, base-hash handler, Hub, Site and Paperclip adapter
compatibility are part of this prerequisite's review.

GW-022A (`2026-10-03-gw022a-linux-filesystem-atomicity.md`, canonical configuration transaction) is
the required server configuration-writer/CAS dependency. GW-024 is the separate browser credential,
JWT and broker prerequisite for authorized invocation; it does not define configuration CAS.
The real `tools.update`,
`skills.update`, `agents.skills.set`, `config.patch` and all other configuration writers must serialize
the authoritative read/validate/write operation and recheck a caller's base hash under that same
authority. Temporary-file rename alone does not prevent lost updates. This spec does not invent a
second writer mechanism; implement and qualify the reviewed GW-022A authority protocol. The native
filesystem authority work has its own GW-022 prerequisites and must remain honestly pending until
wired. Client read ownership can be implemented first; mutation correctness cannot be closed while
these required dependencies remain unqualified.

## 2. TO-BE

### A. Agent resources and capability writes

Create a small resource/controller module under `src/lib/state/agents/`, separate from component
markup and transport. A controller receives a live identity getter and the exact authenticated
owner. Identity includes canonical PageData actor/organization, selected host id/URL and agent id.
It validates identity again immediately before dispatch and publication, including before the next
Svelte effect. Do not infer identity from `connected`, timestamps, display names or mutable globals.

Admission requires nonempty canonical `PageData.user.supabaseId`, organization ID, selected host ID
and URL, with exact equality to the authenticated owner's actor/org/host tuple. There is no legacy
`user.id` fallback. A missing or mismatched value synchronously clears visible data, disables writes
and sends zero RPC. The opaque session token remains part of identity even when all visible IDs
match. If an advertised methods array explicitly omits the needed method, that operation is
`unsupported`, not empty or failed. `methods=null` is the legacy compatibility case: one deduplicated
read probe is allowed; a method-not-found response becomes unsupported. A write additionally needs a
valid current read and the existing UI permission gate; an absent advertised write method disables
it. Legacy probing never bypasses server authorization or retries a mutation.

Use an owner token plus a monotonic view generation so A→B→A rejects the first A's continuations.
Views obtain their own controller or an explicitly bounded, reference-counted resource for the
same owner and agent; different agent views never share a mutable selected-agent singleton. No
unbounded process-lifetime agent map. Retired resources clear visible data, dispose listeners and
retain only the promises still needed to observe underlying completion.

Reads deduplicate an identical pending request. Explicit refresh keeps the same owner's admitted
data visibly stale while loading; a failed read has a retry affordance and cannot become an empty
success. Validate the complete report shape before publication. Loading, error and finalizers use
the same exact generation as data. A reconnect with the same actor/org/host creates a new epoch.

Writes have explicit pending state and an admission guard. One shared per-owner configuration gate
covers tools, global skills, agent skill allowlists and every config patch, including different agents
and different tool IDs. Per-control pending keys are UI detail, not separate mutation authority.
Derive a toggle's next allowlist from
the latest admitted filter when the write is admitted, preserving explicit globally disabled
entries. There is at most one admitted write for a conflicting key; a second action is known-unsent
and does not build an unbounded queue. UI controls reflect this pending state.

Use the existing action outcome contract: explicit server rejection is failed/conflict, lost
acknowledgement is unknown, and an acknowledged write with failed refresh is committed-refreshing.
Do not replay unknown or acknowledged writes. An old owner's completion cannot show a toast,
clear a new draft, navigate, focus, update counts, or roll back new-owner data. Read reconciliation
is allowed; a new mutation requires current authority and an explicit user action after an
authoritative read resolves ambiguous local state. There are no automatic mutation retries.

`[]` means explicitly no skills. `null` is reserved for an explicit inherit/default action. Removing
one skill preserves all other explicit entries, including globally disabled skills. Deduplicate ids
without changing server inheritance semantics. A malformed status report never enables a write.

Migrate every production consumer; search is the authority for the final inventory:

- `AgentDashboard`: owned tools/skills and file counts.
- `AgentToolsPanel`: owned read, refresh and write; keyboard-operable enable/disable action alongside drag.
- `AgentSkillsPanel`: owned read/filter/write and correct empty/inherit behavior.
- `AgentFiles`: owned root/directory/file reads and create/save mutations, including selection epochs.
- `AgentCapabilitiesPanel` and `AgentSettingsPanel`: counts from the explicit selected agent.
- `ChatInput`: suggestions and selected-skill lookup from its own conversation agent.
- `McpPanel`, `skill-editor.core.svelte.ts` (including the flow-editor skill page), and
  `routes/(app)/tools/[id]/+page.svelte`: remove their direct `tools.status` casts and use the
  captured-owner catalog. The tool page's `tools.update` uses the same per-owner configuration
  write gate as the agent panels; capture its selected tool and editor revision.
- Remove the unused exported `toggleGlobalSkill` entry point after checking imports and barrels;
  any discovered live consumer must instead use the same owned write boundary.
- Any barrel re-export or additional caller found during implementation: migrate or remove unused API.

File counts use the same generation discipline but a separate read resource, so a failed directory
read does not discard valid tools or skills. No server method or file-list semantics change.

`AgentFiles` has a directory-resource generation and a selected-file/editor revision under the same
agent/session owner. A late directory result cannot attach nodes to a replacement tree. A late file
read cannot replace another selection or an edited buffer. Capture path and content at save admission;
acknowledgement cannot clear later edits. Create/save use the shared action outcomes and same-path
write guard, including unknown acknowledgement and committed-refreshing without replay. Errors are
visible rather than swallowed. Owner retirement clears file content and drafts; changing a file
within the same owner must use the existing explicit edit/cancel controls and never silently save.

### B. Gateway tool catalog

The catalog is owner-scoped, separate from per-agent enabled state. `BuilderHub` may prime it only
through a validating API taking the captured authenticated owner; direct mutable publication is
removed. `ChatBlocks` reads only the current owner's catalog. Session retirement synchronously
makes old badges unavailable, including when the next catalog request fails. Deduplicate one read
per owner, validate reports, and never let the old request's finalizer clear the replacement request.

The tool-detail surface has additional operations beyond catalog read and enable/disable. Their
explicit dispositions are part of this slice's client ownership work:

| Tool-detail operation | Required disposition |
| --- | --- |
| `GatewayToolView` / `tools.inspect` | Capture the selected tool and authenticated owner, reload on either changing, and fence source/loading/error publication. Strictly decode the exact inspection envelope and nested metadata below. IDs must match the requested tool; source is null or at most 2 MiB UTF-8 and sourceLang is exactly `javascript`. Whole response max 3 MiB. No source execution. Only structural unsupported-method evidence may show an explicitly labelled unavailable-source compatibility stub; timeout, malformed reply, denied or failed module load shows its own Retry/error state. Null source means source unavailable, not proof of an old Gateway. |
| Builder tool HTTP read, save/autosave and publish continuations in `tools/[id]` | Capture canonical actor/org, selected tool, exact draft revision and the Gateway owner needed for a later nudge. Cancel queued unsent autosaves on retirement; fence each actual read and effect continuation. Capture immutable save payload and never clear newer edits. Preserve a real DB commit separately from Gateway refresh. Owner retirement prevents late status/error/console/navigation/focus publication, but cannot claim an already dispatched write was cancelled. |
| `tools.reload` after a committed builder publish | Capture the exact Gateway request capability before HTTP publish, revalidate it immediately before reload, await and classify the nudge separately. A changed owner skips the unsent nudge; never reload the replacement Gateway. An acknowledged DB publish remains committed when nudge is unsupported/failed/unknown. Report pending Gateway refresh; do not repeat the DB publish or automatically retry a dispatched nudge. Strict response is `{reloaded:true,profile:string}` with profile max 256 UTF-8 bytes; malformed acknowledgement is unknown. |
| `tools.custom.run` | Keep existing admin authorization and capture owner, tool, immutable script/language/environment and one in-flight execution token. A replacement view cannot inherit output or have its running flag/focus cleared by an old execution. Timeout/disconnect after dispatch is unknown; no automatic retry or claim of process cancellation. Output admission is max 2 MiB whole JSON, 500 rows, 4,096 UTF-8 bytes per line, exact `stdout\|stderr` stream, integer exitCode and nonnegative finite durationMs; malformed/oversized output shows unavailable result without replaying execution. Render escaped text. Gateway execution lifecycle/physical resource containment is separately required backend work; this client change cannot claim it. |

`tools.custom.run`, `channels.plugins.list`, `channels.telegram.validateToken` and
`channels.discord.validateToken` currently exist as handlers but are missing from the explicit
advertised method list. The shared/Gateway prerequisite adds these exact methods to the canonical
advertisement only where their real handlers are installed. Preserve each handler's existing
server authorization, including the admin gate on script execution and the channel credential
operations; advertisement never grants authorization. Exercise the actual hello method list and
authorized/unauthorized dispatcher for all four methods. A deliberately omitted capability must
leave its corresponding client operation unavailable with zero dispatch. Existing plugin catalog
and Telegram/Discord setup must remain available on an authorized current Gateway after this
prerequisite lands; do not disable working flows merely because the old registry omitted them. Do not
weaken client capability admission by probing an unadvertised mutation. A legacy-null methods
array requires an explicit current admin action for this execution; it never permits a read probe
to execute a script. The current handler has only language/nonempty-script checks, silently filters
environment values and passes a loosely checked numeric timeout; those are not bounded admission.
The prerequisite adds the same strict client and Gateway request contract: exact keys `lang`,
`script`, optional `env` and optional `timeoutMs`; language exactly `javascript|python|bash`;
nonempty script at most 128 KiB UTF-8; entire params at most 256 KiB UTF-8 JSON; env a plain record
of at most 64 distinct keys matching `[A-Za-z_][A-Za-z0-9_]*`, keys at most 128 bytes, string values
at most 4 KiB each and 64 KiB aggregate encoded env JSON; no NUL in script or environment values;
timeout a finite integer `1..30000`, absent means 30000. Reject unknown keys, unsafe prototype keys,
arrays or non-string environment entries instead of silently dropping them. Validate before cloning,
injection, spawning or admitting execution. Server-owned credential injection follows validation and
cannot be overridden by caller input. Direct RPC tests cover exact/cap-plus-one/multibyte and invalid
timeout/type cases with zero execution on rejection. No unbounded output may be copied to the console.
Redact secrets from monitoring; physical process containment remains its separate backend dependency.

### C. Shared configuration draft and save

Configuration is gateway-wide, so its draft is owned by actor/org/host/session and its base hash,
not merely an agent selection. All `loadBaseHash`, `loadConfig`, `save`, reset and reconnect callers
must be inventoried. Owner change clears the visible old draft and authority; it must not apply a
patch from the old gateway to the new one. Preserve current same-gateway restart recovery only
when the authenticated actor/org/host match and the new base snapshot is reconciled explicitly.

Capture the exact gateway request function and base hash at save admission. Admit one save at a
time. Acknowledgement updates only its captured draft revision; edits made during a save are not
silently cleared. Refresh returns a typed success/failure outcome, rather than swallowing an error
and producing a success toast. A confirmed patch followed by disconnect is committed-refreshing;
an unacknowledged disconnect is unknown. Neither grants mutation replay. Conflict preserves the
draft and requires current-base reconciliation. `setField` and discard act only on the live draft.

Split draft ownership, read coordination and mutation outcome handling into focused modules if
the current config module would otherwise become a larger hotspot. Preserve schema inference,
admin gating, patch format, baseHash conflict checks and existing restart UI semantics.

The concrete caller inventory below is required. An implementation search must verify that no new
direct consumer appeared; every additional consumer gets an explicit disposition before sign-off.

| Caller | Required disposition |
| --- | --- |
| `routes/(app)/config/+page.svelte`, `ConfigSaveBar`, `ConfigField`, `ConfigJsonEditor`, `ConfigSidebar`, `ConfigSection` | Read/edit/discard/save only the current owned draft, including retry handlers and JSON edits. |
| `AgentSettingsPanel`, `AgentSidebar`, `routes/(app)/home/settings/+page.svelte` | Capture agent/view plus config owner; stale base loads, saves, dirty counts and completion UI cannot publish. |
| `routes/(app)/settings/+page.svelte` | Same owned draft/edit/save rules as the config page. Remove its ambient `configState.loading = false` mutation on disconnect; only the matching read owner may settle loading. |
| `routes/(app)/users/+page.svelte`, `BindingsTab` | Load and render only admitted current-owner bindings. Unavailable is distinct from an empty binding list. Binding edits and saves share the gateway mutation gate and capture the draft revision. |
| `routes/(app)/agents/autonomous/+page.svelte` | Derive only from the current admitted agent config. A new owner's unavailable config must not render the old owner's autonomous-agent list or a successful empty result. |
| `GatewayUpdateCard` | Capture config/session owner for config-derived update preferences and every asynchronous update/restart publication. An unavailable read disables dependent actions; an old update completion cannot start the new gateway's restart UI. Preserve the separate update RPC's existing authorization. |
| `utils/agent-display.ts` and all `agentArchetype`/`agentAvatarUrl` callers | Config-derived archetypes must use a current owned read. A neutral avatar fallback is display-only and cannot assert an agent's operational role; never reuse an old owner's archetype. Verify representative mounted sidebar/dashboard consumers and the shared helper's full import inventory. |
| `workshop/gateway-bridge.ts` owner notification | Bind the completed conversation, participant identity and config bindings to one authenticated owner. Unknown/stale bindings cannot authorize a notification prompt. Revalidate before every participant dispatch; retire the loop on owner change and never replay a dispatched prompt. Test that switching owner between participants dispatches no further prompts. |
| `ChannelsTab`, `state/channels/channels.svelte.ts` | Own list/status reads, singleton publication, create/update/delete/assignment continuations and derived counts by captured actor/org/host/view/input revision. Retired reads and mutations cannot publish rows, errors, pending flags or toasts into a new owner. Preserve committed mutations and never replay unknown outcomes. |
| `state/features/channel-sources.svelte.ts`; `NodeConfigPanel`, `TriggerNodeConfig`, `DestinationListField`, `my-agent/ChatInput` | Replace session-global `pluginsLoaded/statusLoaded/identitiesLoaded` caches with the canonical owner/session resources and bounded decoders below. All four consumers read only current-owner plugin/account/default/identity data and expose failed/unavailable separately from an empty list. Built-in presentation labels cannot imply an installed or available channel. Preserve stored flow configuration without silently selecting a fallback from old or unavailable accounts. |
| `ChannelLinking` | Own `plugins.list`, descriptor decoding, credential-form state and dynamic `submitMethod` calls. Strictly admit method/descriptors against current advertised capabilities and the selected plugin's reviewed contract before dispatch; never treat arbitrary plugin metadata as unrestricted RPC authority. Capture owner/plugin/input revision, freeze admitted input, clear secrets and old descriptors on retirement, and fence every continuation. Unknown dispatched credential operations are not retried automatically. |
| `ChannelSetupWizard.verifyTelegram/verifyDiscord` | Both credential-bearing validateToken calls capture authenticated owner, selected plugin and input revision, admit advertised methods under server authorization, and copy the token only at dispatch. Use the bounded verification contract below; stale success/error/finally cannot alter a replacement draft or busy state. Clear secrets/verification on retirement; no automatic retry after dispatched ambiguity. |
| `WhatsAppQrPairing`, `requestWhatsAppPair`, Gateway event forwarding and both wizard/`ChannelLinking` callers | `serverId` is a required canonical target check, not an ignored prop. Capture authenticated owner/session/view, plugin/channel identity and one unique operation ID; admit only correlated bounded events. Remove the `pending` wildcard. Pairing has the durable pre-create lifecycle specified in D; unmount, timeout and socket loss do not prove provider cancellation. |
| `ChannelCard` | Own DB PUT, status polling, config reload, logout, both config patches and every chained continuation. Capture channel/account, owner and input revision before the first effect; revalidate before each later admission. Keep database-committed, Gateway-committed, rejected and unknown outcomes distinct. Old responses cannot clear new pending state, publish status/toasts, restart polling or admit a patch against a replacement owner. |
| `HistorySyncControl`, `ChannelSetupWizard`, `ChannelGroup`, all `ChannelCard` config patch paths | Replace ambient `sendRequest('config.patch')` with the shared captured-owner/baseHash mutation boundary. Capture channel/account selection and local draft revision too. Apply identical unknown/committed-refreshing/no-replay semantics, current-only toasts, pending flags, base refresh and restart transitions. |
| `gateway.svelte.ts` lazy config refresh and `config/restart.svelte.ts` consumers | Owner-scoped reconnect/restart transitions; retiring a gateway cannot start or finish a replacement gateway's restart UI. Preserve the existing module cycle boundary. |
| `gateway/session-bootstrap.ts`, `gateway-rpc.refreshChannelStatus`, `ChannelSyncStatus` | Preserve the accepted captured-session bootstrap reads. The exported refresh helper has a live ChannelSyncStatus polling caller; require a captured owner and bounded channel-status decoder before publishing to its registered sink. Bind each poll to owner/account/view, with one active read, teardown retirement and no old-scope sink update or pending clear. Its catch cannot present an old owner's counters as current. |
| Server `org-config-sync.service`, `channel-publish.service`, channel POST/PUT/DELETE routes, `[channelId]/qr/+server.ts` POST and `channel-sync.service` | Their hidden effects during create/update/delete/QR update/import are included in D's child contract. Gateway configuration writes use GW-022A operation identity/outcomes; cache publication and removal signals need the D durable owner. Preserve DB-committed state on downstream failure and remain owned through settlement. |
| Server `crm-channels.service.getChannelCatalog/getAccountScopeLive` | Preserve request-captured tenant and account visibility when sharing channel-status types/decoders. Its system-credential Gateway transport belongs to the GW-024 server caller inventory; a client cache must never replace that authority. Keep ledger-only fallback explicitly unavailable for live data, and test foreign account/default references and malformed responses before accepting cross-consumer changes. |
| `routes/api/channels/identities/+server.ts`, `channel-identity.service.listChannelIdentitiesForPicker` | Preserve current exact-tenant authority while bounding the picker projection in SQL with a 4097-row overflow sentinel and field-byte admission before transfer. Do not truncate into successful empty/partial results. Inspect other service callers before changing its DTO; prefer a focused bounded picker projection. Return finite private/no-store failures and scrub raw provider/SQL/error values from both response and monitoring. |
| Server `personal-agent` routes, `builder-agent-publisher`, `brain-agents.service` | They do not consume the client draft. Their full-config writers still require the GW-022A conversion; inspect those dependency receipts rather than claiming client locks fix server concurrency. |

All client `config.patch` writes conflict on one gateway configuration base, so their admission guard
is shared per owner, including channel and generic-editor saves. A second write is known-unsent;
there is no queued stale patch. Loading only the base hash cannot mark a full editor snapshot fresh
or replace its revision. Full config refresh cannot silently erase a dirty draft. Channel verification
results are bound to their captured owner and input revision before a later patch can be admitted.

#### Channel plugin descriptor boundary

`channels.plugins.list` is strictly `{plugins:[...]}`: at most 128 rows and 512 KiB UTF-8 serialized
response. Each row has only required `pluginId`, `channelType`, `label`, `link` and optional
`description`, `icon`. IDs are 1..128 ASCII bytes, match `[a-z][a-z0-9_-]*`, and are distinct as
`(pluginId,channelType)`; a plugin cannot claim a channel absent from its enabled registry entry.
Labels/submit labels are at most 256 UTF-8 bytes, descriptions/instructions/notes at most 4096,
icons at most 128, and each complete descriptor at most 16 KiB. All strings reject NUL/control
characters except LF/TAB in explanatory copy. Counts and byte budgets apply before copying/rendering.
No coercion, unknown keys, inherited/prototype keys, duplicate fields or malformed partial success
is accepted. The Gateway validates actual manifest/runtime descriptors before publication, and the
Hub independently decodes before state publication; invalid contracts are visibly unavailable.

The exact `link` union contains the existing mode-specific keys only:

- `qr`: required `mode,startMethod,qrEvent,pairedEvent,failedEvent`, optional `instructions`.
  Names must equal `standardChannelLinkNames(channelType)` exactly; they are not arbitrary method
  strings. The selected plugin must own that channel's actual registered link handler, the captured
  hello must advertise the pair method, and its event stream must satisfy D's operation correlation.
  A non-WhatsApp QR descriptor cannot be passed to the WhatsApp component; it uses a generic
  correlated renderer/driver or is explicitly unsupported until its reviewed driver exists.
- `form`: required `mode,fields,submitMethod`, optional `submitLabel`. Exactly 1..32 fields, each with
  required `key,label,type` and optional `placeholder,required`; type is exactly `text|password`,
  required is boolean, placeholder is at most 1024 UTF-8 bytes. Distinct keys match
  `[A-Za-z][A-Za-z0-9_]{0,63}` and reject `__proto__`, `prototype` and `constructor`. The method is
  exactly `channels.${channelType}.linkSubmit`, owned by that enabled plugin's registered form
  handler and advertised by the captured session. Submitted data contains only declared keys,
  string values at most 4096 bytes each, 64 KiB total, and every required nonempty value. Validate
  before immutable capture and again before server handler effects; no raw credential logging.
- `managed`: required `mode`, optional `settingsHref,note`. The initial navigation allowlist is the
  exact existing `/settings?s=comms` constant only; no arbitrary URL, encoded variant, fragment or
  extra query is accepted. Resolve through the governed locale navigation helper and recheck the
  final same-origin path/query before rendering the link. New destinations require explicit review.
- `iframe`: required `mode,entrypoint`. Entrypoint is at most 512 ASCII bytes, a plugin-root-relative
  `ui/` path ending in `.html`; each nonempty segment matches `[A-Za-z0-9_-][A-Za-z0-9_.-]*`, with no
  dot/dot-dot segment, `%`, backslash, leading slash, scheme, query, fragment or control. The server
  serves it only beneath that exact enabled plugin root using its existing asset authority and
  traversal/symlink protections. Preserve the plugin iframe sandbox and bridge permission boundary;
  a descriptor cannot widen it. Retire/unmount the bridge when the captured owner or plugin changes.

Every union shape, aggregate bound and current built-in descriptor needs real client/server
differential tests. Exact and cap-plus-one values, duplicate/prototype/extra keys, forged methods,
foreign-plugin channels, unsafe links/entrypoints and non-WhatsApp QR descriptors must fail without
dispatch/navigation. A valid empty registry is distinct from invalid/unsupported/unavailable data.

The channel-source singleton's `GET /api/channels/identities` cache is owned by the captured actor/org
and authenticated target generation too. No old HTTP reply may populate a replacement resource.
Admit at most 4096 identities and 2 MiB response bytes. The response is exactly `{identities:[...]}`;
rows have required string `id,channel,to` and optional nullable string `displayName` and boolean
`verified`. IDs and channel keys are at most 128 UTF-8 bytes, `to` at most 1024 and displayName at
most 512; reject duplicate identities, unknown/unsafe keys, controls and invalid primitive types.
Failures expose no identity/address details in telemetry and do not mark the cache loaded.

The shared channel-status read first bounds the entire JSON response to 8 MiB, depth 32 and 100,000
values. Its dropdown projection admits at most 128 channel keys, 1024 accounts per channel and 4096
accounts total. Account/default IDs are nonempty strings at most 256 UTF-8 bytes, names at most 512,
and optional `self.e164/self.jid` at most 256; `linked/connected` are actual booleans when present.
Duplicate accounts, unsafe keys, invalid types and defaults pointing outside the admitted account
set fail the projection. Provider-specific fields may remain bounded inert JSON for existing status
consumers, but do not enter dropdown authority or override validated common fields. The child
implementation inventory must name every retained provider field consumed by existing status UI
before narrowing the shared payload. HTTP identity failure, missing capabilities, rejected reads
and confirmed unsupported methods remain separate outcomes. A-to-B-to-A, reconnect, delayed failure,
settled-old-snapshot and unmount tests cover each cache and all four consumers, plus the live status
poll and its sink; one owner's failed read cannot make another owner's data a successful fallback.

#### Credential verification boundary

Telegram/Discord validation requests are exactly `{token:string}`; preserve the existing minimum
of ten characters and add a maximum of 4096 UTF-8 bytes with no controls. Validate before immutable capture and server/provider
admission. Both captured methods require current advertised capability and server authorization.
Each provider response is read with a streaming 32 KiB body cap and the existing ten-second abort
budget; pending bodies are cancelled on any rejected sibling response, with no detached fetch.
The Gateway returns at most 8 KiB, with exact `ok,bot,application,error` keys appropriate to that
provider. A successful Telegram bot has safe positive integer `id`, nonempty `username` up to 256
bytes and `firstName` up to 512. Discord bot/application IDs are 1..32 decimal digits, username up
to 256 bytes, and optional application name up to 512. Reject unknown or unsafe nested fields.
Provider failure becomes a finite code (`invalid_token`, `provider_unavailable`, `provider_timeout`,
`invalid_response`, `response_too_large`) and localized Hub copy; raw provider body/message/URL is
never returned, rendered or logged. An older Gateway's bounded legacy error string can produce only
generic failure, never a no-effect disposition or an automatically retried write.

Wizard handlers capture owner/plugin/input revision before awaiting, freeze only the admitted token,
and recheck every verified identity, label, error and finally publication. Token edits invalidate
the previous verification before another stage; teardown/owner retirement clears credentials and
verification. A response from A after B starts cannot verify B, clear B's busy state, navigate or
start channel creation. Actual mounted regressions cover A-to-B-to-A, token edit, switch, reconnect,
unmount, stale success/error and a replacement request already pending. Malformed or over-budget
provider/client responses fail without publishing an identity or admitting a later mutation.

### D. Channel setup recovery

Pairing precedes database creation today. `WhatsAppQrPairing` accepts uncorrelated QR data and any
terminal event for the shared `pending` sentinel; the Gateway ACKs before detached provider
stop/logout/login, credential-directory replacement, config publication and provider restart.
These are admitted effects and part of D's child implementation contract, not a harmless UI read.
That child must replace the detached lifecycle with an explicit durable operation owner bound to
session-derived actor/org/canonical Gateway, target account and a cryptographically random client
operation ID. The same immutable identity is echoed by the ACK, each QR/terminal event and status
receipt. Gateway event authorization is required through GW-024; browser-supplied IDs are correlation,
never authority. No literal `pending` identity or broadcast wildcard may attribute success.

Persist a secret-free `pair_prepared` record before admission, then `pair_dispatched`; structural
proved-no-effect rejection may become `pair_rejected`, loss/timeout/crash becomes `pair_unknown`,
and only the exact durable terminal receipt can become `pair_committed`. These stages precede and
link to the existing db/patch operation records. QR bytes, phone/credentials and credential hashes
never enter localStorage, monitoring or the operation ledger; store opaque operation/account refs
under server authority. Provider failure after stop/logout/move is not a proved-no-effect rejection.
The child freezes the actual Gateway ledger/lease/write ordering, takeover/status behavior and
recovery of each provider/config effect with GW-022A before implementation. Cancellation is explicit
only if that operation owner proves it; UI retirement never cancels or replays an admitted pair.

The versioned QR event union has exact keys for the server-authorized operation scope plus one
finite phase. QR data is a bounded string of at most 8192 UTF-8 bytes, expiresIn is an integer
1..180, and the complete event is at most 16 KiB. Terminal events carry a finite result code and
the exact opaque receipt/account reference, not an arbitrary message or configuration. The child
freezes each scope scalar grammar and full terminal code set against actual provider outcomes.
Only the current captured operation/session can display an event; reconnect retires live display
and reconciles the durable status before any new pair. Test A-to-B changes, remount, reauthentication,
two pending tabs, delayed old QR/terminal events, provider success before ACK and cuts around every
provider/config effect. Each dispatched-unknown case remains visible and never becomes automatic Retry.

The actual flow has several effects: `createChannel` commits the database row, awaits
`reconcileOrgConfigSafe` (which can itself patch Gateway config), and the POST currently launches
`publishChannel` without awaiting it. The wizard then submits a separate credential patch. D must
remove the unowned publication and swallowed-success boundary. The server returns a typed row-create
receipt separately from derived organization-config reconciliation and cache publication outcomes.
It must never reinterpret a committed database row as an unsent create because a later effect failed.
Await every admitted derived effect or transfer it to an explicit durable owner before responding;
no bare detached promise is accepted. All server configuration patches use GW-022A's reserved
operation identity, durable status and under-lock CAS. Retry only a proven no-effect conflict; resolve
an unknown operation by status before admitting any new projection. English-message retry matching
in `isBaseHashRace` is replaced with the structural error contract.

Channel setup's concrete server receipt records and any additional migration require their own D
implementation contract and independent two-pass review before D source edits. That child contract
must name how the reserved Gateway operation reference survives a server crash and binds the exact
derived source revision, and how pending cache publication is recovered. This is required remaining
work, not permission to leave the present swallowed or detached behavior in the final implementation.
A/B can proceed independently; D cannot be marked implemented from this parent contract alone.

The D child inventory includes PUT's database update, awaited `ensureGatewayWhatsappAccountSafe`
and detached `publishChannel`; DELETE's committed deletion, organization reconciliation and detached
`signalChannelChange`; and `channel-sync.service`'s import/reconciliation. Their shared services must
not become correct only for POST while other callers retain swallowed outcomes or detached effects.
For each caller the child defines source revision, durable derived-effect identity, deletion/tombstone
handling, response outcome and replay policy. A cache or Gateway error after any database commit
remains committed-with-derived-work-pending, never a known-unsent database failure.

The QR POST caller of `updateChannel` has the same explicit disposition and receipt ownership;
changing the shared service must not leave its QR response or derived effects unowned.

The create request carries a cryptographically random client operation ID. The server binds an
immutable receipt to that ID, the session-derived canonical actor/org/server, and a canonical
secret-free intent hash in the same transaction that creates the channel. The D child freezes
the canonical encoding, unique constraints, row/receipt relationship and retention/tombstone rules.
The receipt attributes exactly one create; matching type/label/account/access alone cannot attribute
an unknown operation. A repeated ID with another actor, scope or intent is a conflict. Existing
rows without that operation's exact receipt are collisions, not successful duplicate adoption.
Concurrent identical intents from different authorized users must not let one operation adopt the
other's row or authorize a later credential patch. Preserve this invariant across response loss,
crash, deletion and import; legacy/imported rows cannot synthesize create attribution.

Before each client stage, persist a versioned secret-free recovery record with
canonical actor/org/host/server identity, random local operation nonce, finite stage, exact channel ID
when known, intended type/label/account/personal/access fields and verified provider account identity.
Never store credentials, their hashes, a gateway token, or an opaque session token as reusable
authority. Resume always captures a fresh authenticated owner. Bound records to 16 globally, one
unresolved record per owner/server/account, 16 KiB canonical UTF-8 per record, and 256 KiB total;
capacity or unavailable storage blocks dispatch and shows recovery instructions without evicting
unresolved work. Storage is one canonical JSON envelope in `localStorage` at
`minion:channel-setup-recovery:v1`, containing a version, monotonic safe-integer revision and records
sorted by their canonical identity. A global `minion:channel-setup-recovery:v1` Web Lock protects
every read-modify-write and enforces global caps; a separate per-operation Web Lock owns the complete
setup attempt across tabs. A storage write/remove succeeds only after exact byte readback under the
global lock. Settle that write before dispatching its associated effect. Unknown versions, malformed
JSON, duplicate keys/records, unexpected fields, excessive bytes or exhausted revisions fail closed
without overwriting the envelope. They show unavailable recovery; they never reset to an empty store.

Use `storage` events to invalidate every tab's cached envelope and require fresh locked reads before
dispatch. Logout/owner retirement clears in-memory records and UI; only the same authenticated
canonical actor/org/host can view or reconcile its stored records later. Do not delete unknown records
on logout, timeout or age. Capacity shows a generic recovery-required state without exposing another
actor's records. Terminal records may be removed after exact receipt/status reconciliation and
current-owner completion; unknown/corrupt records have no automatic deletion or "try again" escape.
No Web Locks support means setup is unavailable. Each global and per-operation lock request uses
an AbortSignal and a captured admission guard. A 5-second acquisition deadline aborts the queued
request and retires its guard; even a callback racing that deadline must perform zero work after
retirement. A bare Promise.race is insufficient because the queued callback could run later.
Only failure before effect admission is known-unsent. Hold an acquired operation lock through the
underlying admitted client promise and the exact durable stage readback. After a settled transport
outcome is durably recorded as unknown, release it so a current-owner tab can reconcile read-only.
If that underlying promise never settles, retain the operation lock until tab/process death; a UI
timeout alone cannot release it or permit a second admission.

Stages are `db_prepared`, `db_dispatched`, `db_rejected`, `db_unknown`, `db_committed`, `patch_dispatched`, `patch_rejected`, `patch_unknown` and
`patch_committed_refreshing`. Record `patch_dispatched` before issuing the RPC. A remount or lost reply
at that stage becomes unknown. Persist `db_dispatched` before POST; interrupted dispatch becomes
`db_unknown`. `db_prepared` alone proves no POST was admitted and can continue after current-owner
revalidation. Do not automatically replay either unknown stage. Database response loss is reconciled
by `POST /api/servers/[id]/channels/setup/reconcile`, a read-only operation requiring current
`channels:create`, exact tenant/server and the session-derived actor. Its strict versioned request
contains the client operation ID and secret-free intent descriptor (maximum 16 KiB). The server
looks up that operation's transactionally persisted receipt and verifies the canonical scope and
intent hash; descriptor equality only validates a collision, never proves operation attribution.
It returns the exact channel ID only for that receipt, absent, or conflict. Actor and owner are
session-derived. The response is
`200 {state:'present',id,derived}` or `200 {state:'absent'}`, `409 {state:'conflict'}`, or a finite typed
unavailable response with no private values. `derived` names independently known reconciliation and
publication outcomes from the D server receipt contract. Absence leaves `db_unknown` unresolved since
the original POST may still commit; it never authorizes a blind create retry. Correct
`channel.service.createChannel` duplicate handling to use the same exact operation receipt;
a label collision cannot adopt another operation's channel even when all descriptors are identical.
Do not expose credentials or private configuration through that endpoint.

`db_rejected` requires a versioned structural response whose finite code and explicit no-effect
disposition are emitted before any database mutation is admitted, or after a proved transaction
rollback with no admitted derived effects. The D child freezes that allowlist against actual route,
service and transaction code, including validation, authority denial and identity collision. HTTP
status alone, generic non-2xx, timeout, JSON decode failure or an arbitrary error message never grants
this transition. A rejected record may be corrected only by explicit action and fresh authority;
the replacement intent gets a new operation identity. Unknown records remain for reconciliation.

A known gateway rejection retains the created channel ID and may retry only the patch after an
explicit action, fresh verification and current base read. Unknown recovery is read-only: masked
credential fields are not acceptance proof, and an absent account after reconnect does not prove
that an earlier handler cannot still commit. Only an authoritative configured runtime status that
matches the exact previously verified provider identity and public intended account fields can
reconcile it as committed. If the provider/status contract cannot establish that fact, remain visibly
unknown; do not delete the row, show success, or replay the patch. Guaranteed resolution of those
cases would require a separately reviewed durable Gateway operation receipt. Show pending recovery
on the channel surface as well as the wizard so remount cannot hide it. Clear a record only after
exact reconciliation and current-owner completion, never merely on route exit.

### UI, monitoring and bounds

Use existing semantic tokens, shared controls and action tracking. Failed reads retain context and
offer Retry. Pending/unknown/committed-refreshing states must be visible without exposing raw
gateway payloads. Touch actions are at least the shared mobile minimum. Update UI governance with
the proven ownership and empty-versus-inherit lessons, and run design/token gates.

Do not add new high-cardinality telemetry identities or log settings values. Reuse bounded action
events and sanitized error categories. Local ownership cancellation does not claim a server write
was cancelled. No backend capability or permission is weakened to make a test pass.

### Bounded response admission

One decoder contract is shared by per-agent tools and the gateway catalog. Skills and files use
separate decoders with the same byte/count rules. These are client display limits, not a claim that
the server response was bounded before transport. No response is truncated into a valid report.

| Value | Maximum and validation |
| --- | --- |
| Tools or skills in a report | 4,096 distinct IDs/skill keys. Duplicate IDs, including identical duplicates, reject the report. |
| Whole tools/skills report | 8 MiB UTF-8 encoded JSON; admit sizes and collection limits before constructing view indexes. |
| Group map | 256 groups, 4,096 distinct members per group, 32,768 total membership references. Runtime/plugin members may be opaque IDs absent from `tools` (the actual Gateway includes these); only correlate entries present in the tool array. Group descriptions may name only known groups. |
| IDs, role/profile labels, enum-like keys | 256 UTF-8 bytes; nonempty where the protocol requires it. Validate advertised enum values. |
| Display labels, descriptions, paths | 1,024 / 16,384 / 4,096 UTF-8 bytes respectively; paths remain opaque display/protocol values and confer no filesystem authority. |
| Nested requirement arrays, install options, config checks | 256 entries each, 4,096 entries total per report; validate every element's actual gateway schema. |
| Skill filter | `null` or at most 4,096 distinct keys; preserve explicit keys absent from the currently discovered list rather than accidentally enabling inherited skills. |
| Directory listing | 4,096 entries per read and 16,384 retained nodes per view; count UI shows unavailable on overflow, never zero or an exact truncated count. Duplicate paths and unsafe recursion/cycles reject publication. |
| File content/editor write | 2 MiB UTF-8; a larger read is visibly unavailable and cannot be saved as an empty/truncated replacement. |
| Numeric sizes/timestamps | Nonnegative safe integers; boolean fields require booleans. No coercion from strings, null or missing required fields. |

Tools metadata uses this exact wire schema, shared between status and inspection where fields
overlap. Required status envelope fields are `tools`, `groups`, and `profile`; the existing optional
`groupDescriptions` map is decoded when present. A status row requires `id`, `groups`, `enabled`.
Its optional fields are `requires`, `install`, `optional`, `mcpExport`, `multi`, `condition`,
`permission`, `display`. Inspection requires `id`, `factory`, `groups`, `source`, and `sourceLang`;
its optional fields are `display`, `permission`, `condition`, `contextKeys`, `requires`, `mcpExport`,
`optional`, `multi`. Inspection does not invent status-only `enabled` or `install`, nor does either
wire shape include internal `modulePath`/`skillPromptFile`. Reject unknown fields at each named
object boundary. Optional means absent, never null unless explicitly specified for `source`.

- `groups`, `contextKeys`, `requires.bins`, `requires.env`, `display.detailKeys`, each action's
  `detailKeys`, and each install row's `bins`: at most 256 distinct nonempty strings, each 256 UTF-8
  bytes. Reject duplicates. `requires` has only optional `bins` and `env`.
- `permission` requires only nonempty `module` (256 bytes) and action exactly
  `view|create|edit|delete|export|manage`. `condition`, `factory`, `id` and `profile` are nonempty
  strings at most 256 bytes; the three optional flags and status enabled are booleans.
- `display` requires string `emoji` (128 bytes) and nonempty `title` (1,024 bytes); only optional
  `detailKeys` and `actions` are additional fields. `actions` is a map with at most 256 distinct
  nonempty action keys (256 bytes), each value containing only optional label (1,024 bytes) and
  detailKeys. Reject unsafe prototype keys rather than assigning into an ambient object prototype.
- `install` contains at most 256 rows, each with required nonempty `kind` (256 bytes) and only
  optional `formula` (1,024 bytes), `bins` as above and `label` (1,024 bytes). Installation descriptors
  are displayed metadata, never commands executed by a decoder.
- Across a tools status response, all nested metadata array elements, install rows and action-map
  entries share a 32,768-element budget; an inspection response has a 4,096-element budget. Tool
  group-map membership references use their separately named 32,768 cap. The whole byte budget is
  also enforced. These more-specific tool metadata budgets supersede the generic requirement-array
  total above; skills keep their existing 4,096 total. Count before allocating view indexes.
- Group descriptions have at most 256 known-group keys, each value a string of at most 16,384 bytes.
  Tests run actual generated registry metadata plus exact/cap-plus-one, duplicate, unexpected-field
  and malformed nested cases through both response decoders.

Reject unknown keys against the actual supported gateway schema, not the currently incomplete Hub
interfaces. In particular current skill rows include `filePath`, `baseDir`, `configChecks` and
requirement metadata; explicitly decode those known fields even when the UI does not display them.
Historical optional tool permission/display/group descriptions stay optional. A future unknown field
is typed unavailable until the decoder is reviewed. Over-limit or malformed reads keep only the same
owner's previously admitted data visibly stale and disable writes; a new owner sees no old data.
Decode failures and finalizers cannot clear a newer generation's loading/error state.

Configuration inputs have a separate decoder boundary before cloning, schema inference, group
extraction, dirty computation or publishing a writable base hash. It applies to `loadBaseHash` too;
casting `config.get` and extracting its hash cannot bypass admission of the response containing it.

| Configuration value | Maximum and validation |
| --- | --- |
| Entire `config.get` or `config.schema` response | 8 MiB canonical UTF-8 JSON each, with a bounded iterative walk before serialization or recursive consumers. Include ignored/opaque fields in the budget. No truncation. |
| JSON structure per response | 100,000 total values, depth 64 (root depth 0), 4,096 members per array or properties per object, 4,096 UTF-8 bytes per key. Count all nested opaque/default/template/config values. Reject cycles, non-JSON values, accessors, unsafe prototype keys and non-finite numbers. |
| General string values | 1 MiB UTF-8 per value, except snapshot `raw` up to 2 MiB. The 8 MiB whole-response cap still applies. |
| Snapshot envelope | Exact current Gateway `ConfigFileSnapshot` fields/types, including `parsed`, `resolved`, `issues`, `warnings`, `legacyIssues`; only protocol-optional fields may be absent. `path` max 4,096 bytes; optional nonempty `hash` max 256 bytes. Missing hash or `valid:false` cannot enable writes. Config/resolved must be JSON objects. Parsed may be any bounded JSON value; raw is string or null. |
| Validation issues | At most 1,024 rows in each issues/warnings/legacyIssues list and 2,048 combined. Exact known issue fields, path max 4,096 bytes, message/migration max 16,384 bytes. |
| Schema envelope | Exact `schema`, `uiHints`, nonempty `version` (256 bytes) and `generatedAt` (128 bytes); require a valid timestamp. Schema root is an object; at most 16,384 schema nodes within the shared total/depth budget. |
| UI hints | 8,192 entries; path keys max 4,096 bytes. Exact current hint fields; label/group/placeholder max 1,024 bytes, help max 16,384, order a safe integer, flags booleans, itemTemplate bounded JSON counted against all shared budgets. |
| Schema structure | Decode recursive properties/definitions/$defs/items/combinators through the same shared budget. Validate recognized keyword types before rendering. Preserve arbitrary plugin schema keywords as inert bounded JSON; do not evaluate code, fetch $refs or compile untrusted patterns. Unknown keywords do not themselves authorize an editor control. Bound inference over an admitted config by the same depth/node rules. |

Top-level unknown snapshot/envelope/hint fields fail closed. The schema itself is an extensible
JSON Schema document in the actual Gateway contract (`Type.Unknown`), so its bounded opaque keywords
are the explicit exception to the preceding tools/skills unknown-field rule. Inspect the actual
generated Gateway schema, bundled plugin schemas and current redacted snapshots as compatibility
fixtures; do not invent a narrow Hub-only shape that rejects ordinary Gateway metadata.
Malformed or oversized schema is an unavailable error, not silent permission to infer a writable
replacement. Schema inference is permitted only for a structurally known unsupported-method result
on an otherwise admitted snapshot. Same-owner rejected refresh preserves labelled stale data and
dirty edits with writes disabled; changed owner exposes no prior data or base authority. Use fixed
error categories without logging config, credentials or schema contents.

## 3. DELTA and verification

Implement and qualify A, B, C and D as separate reviewable commits in dependency order. All are
required blast-radius work for HC-036. Transport and Gateway atomic-write prerequisites must pass
before mutation acceptance. Each commit preserves unrelated readiness WIP.

1. Mounted production tools/skills/dashboard views: A→B→A, actor/org/host change, reconnect with
   unchanged visible ids, disconnect, dispose, two simultaneous distinct-agent consumers, and
   delayed success/error/finally. No old state or pending marker leaks to a new owner.
2. Actual mounted skill toggle: disable the last skill emits exactly `[]`; inherit emits `null` only
   through its explicit action; a globally disabled selected skill survives unrelated changes.
3. Actual write seam: duplicate conflicting actions dispatch once; known rejection, lost reply,
   acknowledged-write/failed-refresh and stale completion produce the correct outcome. Remove the
   owner check and prove a named regression fails, then restore exact source bytes.
4. ChatInput and adjacent counts use their explicit agents. Tool drag and keyboard action call the
   same guarded mutation. Read-only capability views never dispatch a settings write.
5. Catalog: BuilderHub prime and ChatBlocks badge read share only an identical current owner;
   reconnect, invalid report, old finalizer and failed replacement read are negative cases.
   Include actual McpPanel, flow-editor skill editor and tool detail consumers with A→B→A,
   reconnect, unavailable/unsupported/malformed results and a tool-page versus panel write race.
   Exercise actual GatewayToolView inspect: delayed old tool/owner source, null source, denied,
   unsupported and source byte cap. On the tool page, switch owner after committed HTTP publish
   but before reload, race edits against save, retire queued autosave, and retire a dispatched run
   before success/error/finally. Assert no wrong-Gateway nudge or stale console/focus publication.
   Installed hello method advertisement and authorized/unauthorized dispatcher tests cover
   `tools.custom.run`, `channels.plugins.list`, `channels.telegram.validateToken` and
   `channels.discord.validateToken`; explicit omission produces zero client dispatch. Script output size,
   stream/type/count and multibyte cases reject without rerunning the script.
6. Config: old-gateway read/save after switch cannot change the new draft, a late save cannot erase
   newer edits, a baseHash conflict preserves the draft, and committed-refreshing never resends a
   patch. Exercise actual restart/reconnect, schema fallback and every caller in the disposition table,
   including overlapping channel/editor saves and stale channel verification.
   Verify the settings, users/bindings, autonomous agents, GatewayUpdateCard and avatar consumers
   in the disposition table. Workshop tests cover unknown bindings and retirement between actual
   participant-dispatch calls. Every configuration byte/structure/issue/hint/schema cap has exact
   and cap-plus-one tests, multibyte/deep/unsafe-key vectors and real generated-schema compatibility.
7. Real-component desktop/mobile screenshots demonstrate loading, failed refresh, empty explicit
   allowlist and selection change. Label synthetic transport evidence. No production writes needed.
8. Focused mounted tests must execute Svelte effects; no optional assertions or runtime skips. Full
   Hub check, design/token gates and the relevant action/config/reconnect suites must pass. Inspect
   imported modules and all consumers before signing each packet.
9. Missing/mismatched canonical identity dispatches zero calls. Explicit method absence, legacy-null
   method probing, same visible IDs/new token and late malformed finalizers are distinct tests.
   Every collection and byte cap has exact-limit and cap-plus-one cases, including multibyte text,
   duplicate/conflicting rows, unexpected fields/types and known gateway metadata compatibility.
10. Mounted `AgentFiles`: root/directory/file A→B→A, overlapping file selections, create/save during
    reconnect, edits made during save, missing and oversized content, failed refresh and lost reply.
    Removing its owner/publication check must make a named actual-component regression fail.
11. Actual installed shared artifact and Gateway handlers: unknown method, hash conflict, validation
    rejection, known-unsent transport and dispatched timeout/disconnect preserve finite outcomes.
    Actual Gateway reports containing opaque runtime/plugin group members remain valid. Real handler
    races in both winner orders cover different tool IDs, tool versus skill and tool versus channel
    patch; all independent changes survive, and stale caller base hashes fail under writer authority.
    Channel descriptors and actual registered handlers satisfy the exact union/budget/name/asset
    contract above; removing any dispatch or event-correlation guard fails its named regression.
12. Mounted wizard recovery: crash/remount before and after every durable stage write, lost POST
    reply, label/account/owner/access collision, storage cap/failure, two tabs, known patch rejection,
    lost patch reply, absent account and exact/inconclusive runtime status. Reads alone must never
    replay an unknown patch; redacted credentials never prove acceptance. Restricted server/native
    tests prove reconciliation and duplicate adoption cannot cross owner, gateway or organization.
    Add server-crash/lost-reply cuts after DB commit and during the derived org-config patch, late
    publication settlement, corrupt/unknown-version storage, exact readback failure, cross-tab
    mutation and full-capacity records. Each derived effect must retain an identifiable owner and
    outcome across the cut; no notification-style success may hide pending channel setup.
    Exercise PUT/DELETE/QR/import callers of the same services, including deletion before cache signal,
    and prove generic error responses cannot become `db_rejected` or authorize a create replay.
    Two authorized users with identical descriptors and different operation IDs must never adopt
    each other's rows; test missing/legacy receipts, same-ID hash mismatch, deletion/tombstones and
    in-flight create when reconcile reports absent. Held global/operation lock tests prove timeout
    causes zero fetch/RPC/storage work, including a deliberately late callback after abort. A settled
    unknown releases only after durable readback, while an unsettled underlying promise retains the
    lock. Mounted channel tests switch owner/input between plugin load/submit, PUT/status/reload,
    logout/patch and singleton assignment/delete; no old secret, status or continuation reaches B.

## 4. Review and release boundary

This draft requires independent Spec and Standards passes before implementation. Local qualification
does not prove deployment. Merge, production release and live authorization verification retain their
existing gates. The readiness report carries exact source/test/image evidence for HC-036 and does
not close it until all four slices, their dependencies and cross-consumer review pass.
