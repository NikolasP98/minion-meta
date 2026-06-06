// Flow JSON shapes — mirror of minion_hub's flow-editor types.
// Kept local (no shared package yet); see spec "Shared config".

export type HandleDef = { id: string; label: string };

export type AgentNodeData = {
  agentKind?: 'custom' | 'personal' | 'drone';
  agentId: string;
  label: string;
  sessionMode: 'ephemeral' | 'shared';
  defaultValues?: Record<string, string>;
  contextRules?: unknown[];
  inputHandles?: HandleDef[];
  outputHandles?: HandleDef[];
  contextHandles?: HandleDef[];
};

export type PromptBoxData = {
  label: string;
  value: string;
};

export type LLMNodeData = {
  modelId: string;
  label: string;
};

/** One inbound source for a Channel Trigger: channel + optional linked account. */
export type ChannelTriggerSource = {
  channel: string;
  accountId?: string;
};

export type TriggerNodeData = {
  /** Channel-scoped events only (non-channel events don't belong on a Channel Trigger). */
  event: 'message:received' | 'message:sent';
  label: string;
  deliverResponse: boolean;
  /**
   * Inbound sources (channel + optional account) this trigger listens on.
   * Empty/absent = all channels. The gateway's trigger-manager does the filtering;
   * the runner itself doesn't — it's structural here for type parity.
   */
  sources?: ChannelTriggerSource[];
  /** @deprecated slice-1 multi-channel shape; superseded by `sources`. */
  channels?: string[];
  /** @deprecated single-channel filter; superseded by `sources`. */
  filterChannelId?: string;
  filterAgentId?: string;
};

export type PluginTriggerNodeData = {
  pluginId: string;
  contributionId: string;
  event: string;
  label: string;
  deliverResponse: boolean;
};

export type PluginActionNodeData = {
  pluginId: string;
  contributionId: string;
  method: string;
  label: string;
  /** Values for the contribution's declared config fields; forwarded as params
   *  to the gateway method alongside the upstream input. */
  config?: Record<string, unknown>;
};

export type TransformNodeData = {
  template: string;
  label: string;
};

export type StructuredNodeData = {
  modelId: string;
  schema: string;
  label: string;
};

export type RouterRuleOp = 'contains' | 'equals' | 'regex';

export type RouterBranch = {
  id: string;
  label: string;
  /** LLM mode: rubric/conditions that define when this branch is chosen. */
  description?: string;
  rule?: { op: RouterRuleOp; value: string };
};

export type RouterNodeData = {
  /** 'rule' = text matching; 'llm' = rubric classification; 'hybrid' = rule
   *  fast-path then LLM rubric fallback (Classify/Route). */
  mode: 'rule' | 'llm' | 'hybrid';
  modelId?: string;
  branches: RouterBranch[];
  label: string;
};

export type ToolRef =
  | { kind: 'builtin'; id: string }
  | { kind: 'gateway'; method: string; name: string; description: string };

export type ToolAgentNodeData = {
  modelId: string;
  systemPrompt?: string;
  tools: ToolRef[];
  label: string;
};

/** One delivery target for a built-in channel node. */
export type ChannelDestination = {
  /** 'user' = chosen from the channel's registered directory; 'custom' = manual address. */
  kind: 'user' | 'custom';
  /** Channel-native address: WhatsApp E.164/JID, Telegram chat id, Discord user/channel id. */
  to: string;
  label?: string;
};

/**
 * Built-in channel node — delivers the upstream message to one or more
 * destinations on a chosen channel via the gateway `send` RPC. Not tied to any
 * plugin (replaces per-plugin "send alert" actions with a generic primitive).
 */
export type ChannelNodeData = {
  /** Channel id: 'whatsapp' | 'telegram' | 'discord' | … (any channel plugin). */
  channel: string;
  /** Optional sending account; defaults to the channel's default account. */
  accountId?: string;
  destinations: ChannelDestination[];
  label: string;
};

export type HandoffDestination = { channel: string; to: string; accountId?: string };

export type HandoffNodeData = {
  label: string;
  destinations: HandoffDestination[];
  priority?: string;
  suggestionCount?: number;
  /** Model for generating suggested replies (e.g. 'claude-haiku-4-5', or a
   *  'claude-sonnet-…' for higher quality). Defaults to claude-haiku-4-5. */
  suggestionModel?: string;
  language?: string;
  systemPrompt?: string;
  closingMessage?: string;
};

/**
 * Built-in reaction node — sets a status emoji on the flow's TRIGGER message
 * (the inbound message that fired the flow) via the gateway
 * `flows.reaction.set` RPC. A transparent side-effect: it reacts and passes the
 * upstream message through unchanged, so it can sit anywhere in a chain (e.g.
 * mark a complaint 👀 received → classify → 🔴 escalated). Needs the trigger's
 * channel/chat/message id from the run's eventPayload, so it only does anything
 * on triggered runs (no-op with a friendly note on manual runs).
 */
export type ReactionNodeData = {
  label: string;
  /** Single emoji to set (Telegram restricts to its allowed set; WhatsApp is open). */
  emoji: string;
};

/** Subflow node — runs another flow as a subroutine, feeding it this node's
 *  input and returning that flow's final output downstream. */
export type SubflowNodeData = {
  label: string;
  /** Id of the flow to run. Resolved + compiled + invoked at execution time. */
  flowId?: string;
  /** Cached display name of the referenced flow (editor convenience only). */
  flowName?: string;
};

/** Database CRUD action. `read` runs a SELECT via the hardened `flows.db.query`
 *  RPC (SELECT-only + optional consume-marker); `create`/`update`/`delete` run a
 *  write via `flows.db.exec` and return the change count. */
export type DatabaseAction = 'read' | 'create' | 'update' | 'delete';

/**
 * Built-in Database node — a single node covering all CRUD against a sqlite DB
 * (defaults to the message ledger). The `action` selects the RPC: `read` →
 * `flows.db.query` (SELECT-only, returns rows JSON, optional consume-marker on
 * the returned rows for at-most-once draining); `create`/`update`/`delete` →
 * `flows.db.exec` (write, returns the change count). The gateway handlers enforce
 * SELECT-only + identifier allowlist + DB-path confinement; the runner forwards
 * the configured fields. `{input}` expands in the SQL.
 */
export type DatabaseNodeData = {
  label: string;
  action: DatabaseAction;
  sql: string;
  /** Optional db file (blank = message ledger). Confined to ledger or state dir. */
  dbPath?: string;
  /** Read-only: consume-marker column stamped on returned rows (e.g. last_checked). */
  markColumn?: string;
  markTable?: string;
  markIdColumn?: string;
};

/**
 * Built-in file-write node — writes the upstream message content to a file via
 * the gateway `flows.file.write` RPC. The gateway confines writes to a base dir
 * and expands `{date}` → YYYY-MM-DD in the path.
 */
export type FileWriteNodeData = {
  label: string;
  /** Destination path (confined to the gateway's flow-files base). {date} expands. */
  path: string;
  /** 'overwrite' (default) replaces the file; 'append' adds a line. */
  mode: 'overwrite' | 'append';
};

/**
 * Built-in Schedule trigger — an ENTRY node (no runner) that fires the flow on a
 * recurring interval. The gateway's flows-plugin scheduler service evaluates the
 * interval and POSTs `/flows/run-triggered` when due. A scheduled run carries no
 * inbound message, so the entry seeds an empty prompt.
 */
export type ScheduleNodeData = {
  label: string;
  /** Interval count (paired with `unit`). */
  every: number;
  unit: 'minutes' | 'hours' | 'days';
  /** Optional "HH:MM" local anchor — for the 'days' unit, fire at/after this time. */
  atTime?: string;
};

/**
 * Built-in Memory node — semantic recall from the hub corpus (pgvector). Queries
 * the upstream message against `agent_memories` via the gateway `memory.recall`
 * RPC (the gateway embeds the query hub-side) and prepends the top matches to the
 * message so downstream LLM/agent nodes answer with that context. Passes the
 * input through unchanged when nothing relevant is found or the corpus is
 * unavailable. This is the flow-runner's path to memory (flows are otherwise
 * memory-blind).
 */
export type MemoryNodeData = {
  label: string;
  /** Which agent's memory corpus to query. */
  agentId: string;
  /** Max memories to inject (default 5). */
  limit?: number;
  /** Minimum cosine similarity 0..1 to include a hit (default 0.2). */
  minScore?: number;
};

export type FlowNode = {
  id: string;
  type: 'agent' | 'promptBox' | 'llm' | 'trigger' | 'pluginTrigger' | 'pluginAction' | 'transform' | 'structured' | 'router' | 'toolAgent' | 'channel' | 'handoff' | 'reaction' | 'subflow' | 'database' | 'fileWrite' | 'schedule' | 'memory';
  position: { x: number; y: number };
  data:
    | AgentNodeData
    | PromptBoxData
    | LLMNodeData
    | TriggerNodeData
    | PluginTriggerNodeData
    | PluginActionNodeData
    | TransformNodeData
    | StructuredNodeData
    | RouterNodeData
    | ToolAgentNodeData
    | ChannelNodeData
    | HandoffNodeData
    | ReactionNodeData
    | SubflowNodeData
    | DatabaseNodeData
    | FileWriteNodeData
    | ScheduleNodeData
    | MemoryNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type: 'flow' | 'context';
  label?: string;
};

/**
 * One streamed unit of execution feedback, sent to the hub console.
 *
 * `kind` distinguishes plain log lines from node lifecycle events so the hub
 * can show which node is running and its input/output. Older consumers that
 * only read `{level, message}` still work (those fields are always present).
 */
export type FlowRunEventKind =
  | 'run-start'
  | 'node-start'
  | 'node-end'
  | 'node-error'
  | 'run-end'
  | 'log';

export type FlowRunEvent = {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  /** Lifecycle classification; absent/`'log'` for plain log lines. */
  kind?: FlowRunEventKind;
  /** Node identity (for node-* kinds). */
  nodeType?: string;
  nodeLabel?: string;
  /** Node I/O content (node-start carries input; node-end carries both). */
  input?: string;
  output?: string;
  /** Epoch ms when emitted. */
  ts?: number;
};

/** Thrown when a flow is not a shape the MVP runner can execute. */
export class UnsupportedFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFlowError';
  }
}
