# Agent Memory Routing and Chat Response Trees

**Date:** 2026-07-12  
**Status:** Implementation design  
**Projects:** `minion/` gateway and `minion_hub/` home chat

## 1. Outcome

This change has two related deliverables:

1. An agent's workspace, identity, and file-backed memory must follow its assigned
   org volume. A gateway restart, image replacement, or host move must never make
   an existing agent look newly bootstrapped.
2. Retry and edit are branches of a conversation, not ordinary appended sends.
   The home chat shows one selected branch at a time, with previous/next attempt
   navigation on both the user prompt and its response.

The memory fix is a production incident fix and ships first. Response trees can
ship in two compatible stages: immediate duplicate-free retry UX, then durable
gateway-persisted branches.

## 2. Evidence and root cause

### 2.1 Confirmed source-level cause

The volume design sets `MINION_STATE_DIR=/vol/orgs/<orgId>` and stores config,
sessions, agent state, and workspaces beneath that root. `resolveStateDir()` in
`minion/src/config/paths.ts` correctly honors `MINION_STATE_DIR`.

The default-agent fallback does not. The current
`resolveDefaultAgentWorkspaceDir()` in
`minion/src/agents/identity/workspace.ts` constructs its root directly as:

```ts
path.join(resolveRequiredHomeDir(env, homedir), '.minion')
```

It then chooses `.minion/agents/main/workspace` if that directory already exists,
otherwise the legacy `.minion/workspaces` path. `resolveAgentWorkspaceDir()` in
`minion/src/agents/agent-scope.ts` calls that resolver for the default agent while
non-default agents fall back through `resolveStateDir()`.

Therefore the default agent is the exceptional path:

```text
configured/non-default state -> /vol/orgs/<orgId>/...
default workspace fallback   -> /home/<runtime-user>/.minion/...
```

In a replaced container, the latter is empty and ephemeral. Workspace bootstrap
then sees a fresh directory/`BOOTSTRAP.md`, so the agent asks for its name and
personality instead of reading its existing `SOUL.md`, `USER.md`, `MEMORY.md`, and
daily memory. This matches the reported `/home` behavior.

This is confirmed from source. Production path/config contents still need a live
pre-deploy check; an explicitly configured absolute `agents.list[].workspace`
pointing to an old OS path can produce the same symptom and must be audited.

### 2.2 Why the chat duplicates

`minion_hub/src/routes/(app)/home/+page.svelte` implements Retry by finding the
nearest user row and calling the ordinary submit path with the same text.
`chat.send` appends a new user turn to the linear gateway transcript. Neither the
RPC schema nor `chat.history` carries a parent/attempt relation, so the two equal
prompts are correctly returned as two independent rows. The UI has no information
with which to collapse or navigate them.

The gateway currently provides useful primitives but no response tree:

- `chat.send`: linear append plus a required idempotency key;
- `chat.history`: a bounded, sanitized message array;
- run IDs and final/delta events;
- transcript message IDs/idempotency fields in some persisted events.

Idempotency prevents replaying the *same network operation*. Retry intentionally
uses a new run and cannot reuse its key; it is not branch semantics.

## 3. Invariants

### 3.1 Workspace and memory

1. Every implicit mutable path derives from the same resolved state root.
2. `MINION_STATE_DIR` wins for both default and non-default agents.
3. An explicit agent workspace remains supported, but startup emits a warning if
   it lies outside the state volume in volume mode.
4. A missing expected workspace never silently bootstraps over an existing legacy
   workspace. Startup reports candidate paths and uses a deterministic migration.
5. No org-identifying workspace data is written to container-local `$HOME` when a
   volume state root is configured.
6. Resolution is independent of current working directory and runtime username.
7. Logs include agent ID, resolution source, and a redacted path fingerprint, not
   memory contents or user-identifying path segments.

### 3.2 Conversation branches

1. A normal send creates a new logical turn after the selected branch head.
2. Retry creates a new assistant attempt for the same prompt revision.
3. Edit creates a new prompt revision and a new descendant assistant attempt;
   prior prompt text and responses remain immutable and navigable.
4. Only one branch path is rendered at a time. Siblings are never displayed as
   consecutive duplicate bubbles.
5. Selecting an older prompt attempt selects the corresponding descendant response
   path; navigation state is deterministic after reload and across devices.
6. Historical messages are append-only. Edit does not rewrite an audit record.
7. Branch creation is idempotent per client operation and unauthorized clients
   cannot attach to a turn outside the requested session.
8. Legacy linear transcripts remain readable without migration downtime.

## 4. Workspace resolution fix

### 4.1 Canonical resolver

Change `resolveDefaultAgentWorkspaceDir(env, homedir)` to derive its state root via
`resolveStateDir(env, homedir)` (or a dependency-injected equivalent that avoids a
module cycle), not `path.join(home, '.minion')`.

Canonical fallback layout:

```text
<stateDir>/agents/<agentId>/workspace
```

For the default agent, compatibility candidates are evaluated in order:

1. explicit `agents.list[].workspace`;
2. canonical `<stateDir>/agents/<id>/workspace`;
3. legacy `<stateDir>/workspaces` only when it exists and canonical does not;
4. canonical path for a genuinely new agent.

Do not probe `$HOME/.minion` when `MINION_STATE_DIR` is explicitly set, except in
an explicit migration command/report. Automatically preferring an old host path
would violate volume isolation.

### 4.2 Startup preflight and migration

Add a read-only startup audit for every configured agent:

- resolved workspace and source (`explicit`, `canonical`, `legacy-state`);
- whether `AGENTS.md`, identity files, and memory files exist;
- whether the path is within `resolveStateDir()`;
- whether an explicit absolute path is missing or outside the volume.

In volume mode, a missing explicit workspace is a startup error for that agent,
not permission to bootstrap silently. A legacy layout inside the same volume may
be adopted or moved atomically by the existing migration flow. Cross-root copying
must be an operator command with snapshot, dry run, and checksum verification.

Pre-deploy production audit:

```text
gateway config agents.list[].workspace
/vol/orgs/<orgId>/agents/<id>/workspace/{AGENTS,SOUL,USER,MEMORY}.md
/vol/orgs/<orgId>/agents/<id>/workspace/memory/
container-local $HOME/.minion candidates (report only)
```

### 4.3 Recovery procedure

1. Snapshot the org volume and current container-local workspace if it contains
   newly written data.
2. Stop/drain the org gateway.
3. Identify the authoritative old workspace by identity/memory files and timestamps.
4. Merge only after human review if both roots changed; never overwrite one tree.
5. Place the authoritative result at the canonical volume path, update/remove stale
   explicit workspace config, and start the gateway.
6. Verify a main-session prompt loads known identity and memory before deleting any
   source. Retain the old tree read-only through the soak window.

## 5. Response-tree data model

### 5.1 Why tree metadata belongs at the gateway

A client-only collapse can fix today's visual duplication, but it cannot safely
represent edits, survive another device, or tell equal intentional prompts apart.
The gateway owns the session transcript and is the authority for ancestry.

Use append-only sidecar metadata initially rather than changing the agent-provider
transcript format. This avoids breaking compaction, provider adapters, and existing
JSONL readers.

Suggested per-session sidecar:

```text
<sessionsDir>/<sessionId>.branches.jsonl
```

Each record is checksummed/versioned and contains no duplicated message body:

```ts
type BranchRecord = {
  version: 1;
  nodeId: string;              // stable logical node
  sessionId: string;
  kind: 'user' | 'assistant';
  messageRef: string;          // transcript message id or stable persisted ref
  parentNodeId: string | null;
  turnId: string;              // logical user-turn family
  revision: number;            // user edit revision, starts at 0
  attempt: number;             // assistant attempt within revision, starts at 0
  operationId: string;         // idempotency/audit key
  createdAt: number;
  supersedesNodeId?: string;   // edit lineage
};
```

Rules:

- A user node's parent is the selected previous assistant (or null at root).
- Assistant nodes parent to one user revision.
- Retry appends another assistant child to the same user revision.
- Edit appends a sibling user revision with `supersedesNodeId`, then an assistant
  child. It does not mutate the original text.
- Tool/reasoning records are owned by an assistant attempt through run/message
  correlation and render inside that attempt, not as navigation siblings.
- The selected branch is a client preference keyed by session. The gateway returns
  a deterministic default: newest successfully completed child, otherwise newest.

### 5.2 Protocol additions

Preserve `chat.send` for old clients. Add optional, capability-gated fields or a
new `chat.branch` method:

```ts
chat.send {
  sessionKey, message, idempotencyKey,
  branch?: {
    operation: 'send' | 'retry' | 'edit';
    parentNodeId?: string;
    sourceUserNodeId?: string;       // retry/edit target
    selectedAssistantNodeId?: string;
  }
}
```

For retry, the server loads the source prompt from the transcript; the client should
not have to resend trusted ancestry or claim arbitrary text. For edit, `message` is
the new revision text. Validate that every referenced node belongs to `sessionKey`.

`chat.history` gains an optional `tree: true` request and returns:

```ts
{
  messages,                       // unchanged for legacy clients
  branchVersion: 1,
  nodes: BranchRecord[],
  selectedPath: string[],
  capabilities: { responseTree: true, editMessage: true }
}
```

Prefer adding protocol definitions to the canonical shared protocol package/schema
and regenerate consumers. Unknown optional fields must remain harmless to older
gateways; the hub hides edit/tree UI when capability negotiation says unsupported.

### 5.3 Context semantics

The provider must receive only the selected root-to-leaf conversation, never all
sibling attempts. Before running retry/edit, materialize selected ancestry into a
new provider context or branch-aware transcript view. Simply appending a retry to
the current linear transcript would expose the rejected answer to the model and is
not a real branch.

This is the main gateway capability gap. Durable tree UI must not be advertised
until context materialization is implemented and tested. A safe transitional retry
may replace/collapse the optimistic duplicate in the UI while retaining current
linear model context, clearly treated as compatibility behavior rather than full
branching.

## 6. Hub UX

### 6.1 Rendering

Build a pure projection from `{messages, nodes, selection}` to visible rows. Avoid
content-derived identity (`role|text|index`) for branches; use `nodeId` so identical
legitimate prompts remain distinct.

For a node with siblings, show compact controls below the bubble:

```text
‹  2 / 3  ›
```

User navigation changes prompt revision and its descendant response path together.
Assistant navigation changes the selected response attempt for the current prompt.
Navigation does not send a message.

Retry on a user or assistant bubble targets the owning user revision and creates a
new assistant attempt. During streaming it is selected immediately. Failure leaves
the failed attempt navigable and restores controls.

Edit adds a pencil action to user messages only. It opens the message in an inline
multiline editor with Save/Cancel. Save is disabled when unchanged/blank or while
the session has an active run. On save, create and select a new prompt revision and
assistant attempt.

### 6.2 Accessibility and small screens

- Every icon button has an accessible name and tooltip: “Edit message”, “Retry
  response”, “Previous attempt”, “Next attempt”.
- Pagination is a labelled group; announce “Attempt 2 of 3” through an `aria-live`
  polite region after selection.
- Controls are keyboard reachable, retain visible focus, and meet a 44px coarse
  pointer target through padding even if the glyph is smaller.
- Inline edit uses a real labelled textarea. `Escape` cancels; `Mod+Enter` submits;
  focus returns to the edited bubble/pagination after either action.
- Do not rely on color to distinguish the selected/failed/streaming attempt.
- On narrow screens keep previous/count/next together and prevent action rows from
  pushing the bubble wider than the viewport.
- All new strings go through Paraglide.

## 7. Compatibility and migration

### 7.1 Legacy history projection

On first branch-aware read, project a linear transcript deterministically:

- pair each visible user message with following assistant/tool records until the
  next user message;
- create revision 0 / attempt 0 nodes;
- persist the sidecar lazily under an atomic lock, or return an in-memory projection
  until the next branch operation;
- never infer siblings merely because prompt text is equal.

If a sidecar is corrupt or references a missing message, log the error and fall back
to linear history read-only. Do not discard the transcript.

### 7.2 Transitional hub behavior

Against a gateway without `responseTree` capability:

- Retry should avoid an optimistic second identical bubble and refresh history when
  complete; adjacent exact duplicate retry prompts may be visually grouped only
  when the current client itself recorded the retry operation.
- Do not globally dedupe equal strings; users can intentionally repeat a prompt.
- Edit is hidden/disabled with an explanatory tooltip until durable branching is
  supported. Sending an edited message as ordinary text would misrepresent history.

## 8. Concurrency, security, and failure handling

- Serialize branch-sidecar append with the same session-level write discipline as
  transcript persistence. Transcript append and branch metadata need a recoverable
  two-step protocol: write transcript, fsync, append sidecar reference; repair can
  project unreferenced transcript messages as linear tail nodes.
- Reject retry/edit while another run owns the target session unless explicit queue
  semantics are added later.
- Bind node lookup to canonical session key and authenticated org/agent visibility.
- Bound node counts/history bytes consistently with `chat.history`; selected-path
  ancestors must not be truncated without an explicit continuation cursor.
- Sanitize edited text exactly like ordinary `chat.send`, including attachments,
  null bytes, and command semantics. Decide explicitly whether slash commands are
  editable/retryable; safest initial policy is no.
- Audit operation type and opaque IDs, not raw prompt text.

## 9. Test plan

### 9.1 Gateway workspace

Unit/e2e matrix:

1. `MINION_STATE_DIR=/tmp/vol` + no explicit config resolves default agent to
   `/tmp/vol/agents/main/workspace`.
2. Custom default ID resolves to `<stateDir>/agents/<id>/workspace`.
3. Default and non-default agents use the same root rule.
4. Legacy `<stateDir>/workspaces` is selected only when it exists and canonical
   does not.
5. Explicit workspace wins and is path-normalized.
6. Missing/outside explicit path in volume mode produces the intended warning/error.
7. Changing runtime home while keeping state dir fixed does not change resolution.
8. No configured-volume run creates files below `$HOME/.minion`.
9. Container smoke test mounts an empty home plus populated volume and verifies the
   agent reads known identity/memory and does not recreate `BOOTSTRAP.md`.

### 9.2 Gateway branches

- Linear transcript projection, including tools, aborts, and oversized placeholders.
- Retry creates assistant sibling without duplicating user node.
- Edit creates immutable user revision plus assistant child.
- Selected ancestry excludes rejected siblings from provider context.
- Repeated equal normal sends remain separate turns.
- Operation replay is idempotent; concurrent branch attempts serialize.
- Cross-session/cross-org node references are rejected.
- Corrupt/missing sidecar falls back and repairs without transcript loss.
- Old `chat.send/history` clients retain byte-compatible response shape.

### 9.3 Hub

- Pure projection tests for 1, 2, and N prompt/response siblings.
- Retry renders one prompt and selects attempt 2/N.
- Edit preserves old prompt/answer under previous navigation.
- Keyboard, focus restoration, live announcement, disabled/busy states.
- Streaming delta/final reconciliation uses stable node IDs and never flashes both
  branches.
- Capability fallback does not dedupe intentional equal sends.
- Reload and another-client history select a deterministic valid path.
- Browser E2E covers the exact screenshot scenario plus retry failure and reconnect.

## 10. Deployment, rollback, and observability

### 10.1 Deployment order

1. Snapshot the personal org volume and audit explicit workspace paths.
2. Deploy workspace resolver plus tests to a canary gateway.
3. Verify resolved path/identity/memory before rolling remaining org gateways.
4. Deploy gateway branch persistence/protocol behind `chat.responseTree=false`.
5. Exercise migration and provider-context tests on copied production transcripts.
6. Enable for one internal org, then deploy capability-aware hub UI.
7. Enable per org after a soak; legacy clients continue using linear APIs.

### 10.2 Metrics/logs

Workspace:

- `workspace_resolution_total{source,inside_state_dir,fallback}`;
- `workspace_expected_files_missing_total{kind}`;
- structured startup resolution event with redacted/fingerprinted paths;
- alert on bootstrap creation for an existing agent/session or any outside-volume
  resolution while `MINION_STATE_DIR` is set.

Branches:

- `chat_branch_operation_total{operation,result}`;
- `chat_branch_siblings` histogram;
- `chat_branch_projection_fallback_total{reason}`;
- `chat_branch_sidecar_repair_total{result}`;
- retry/edit latency and branch-run failure rate;
- client capability/version in debug diagnostics, without message contents.

### 10.3 Rollback

The workspace resolver rollback is code-only if data was copied rather than moved;
retain the source read-only throughout soak. If a canonical workspace was moved,
restore config/path from the snapshot before reverting code.

For response trees, disable the feature flag. Sidecars are additive and may remain;
old clients read the unchanged linear transcript. Do not delete branch metadata
during rollback. If branching has been used, linear fallback will show all appended
records; the hub compatibility grouper may reduce visual duplicates, but only
re-enabling the branch-aware path restores full selection semantics.

## 11. Implementation slices

1. **P0 incident:** state-root-aware default workspace resolver, regression tests,
   production audit/recovery, canary verification.
2. **P0 UX containment:** retry operation tracked client-side so its source prompt is
   not rendered twice optimistically; stable IDs where available.
3. **P1 gateway foundation:** branch sidecar, legacy projection, protocol capability,
   retry/edit validation and persistence.
4. **P1 context correctness:** selected-path provider materialization; only then set
   `responseTree=true`.
5. **P1 hub:** pure tree projection, pagination, inline edit, accessibility/i18n,
   reconnect and streaming reconciliation.
6. **P2 hardening:** repair tooling, cursored tree history, cross-device selected-path
   persistence if user testing shows it is valuable.

## 12. Acceptance criteria

- With an empty container home and the production org volume mounted, `/home` reads
  its existing identity and memory and never enters bootstrap.
- Restarting/replacing the gateway does not change the resolved workspace.
- Clicking Retry once produces one visible prompt and a `2 / 2` response selector.
- Editing a prompt produces a new selected prompt/response branch; previous prompt
  and answer are reachable with previous/next controls after reload.
- The model context for either branch contains only that branch's ancestors.
- Legacy clients and transcripts continue to function, and both features can be
  rolled back without deleting user conversation or memory data.
