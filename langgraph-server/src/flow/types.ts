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

export type FlowNode = {
  id: string;
  type: 'agent' | 'promptBox' | 'llm' | 'trigger' | 'pluginTrigger' | 'pluginAction' | 'transform' | 'structured' | 'router' | 'toolAgent' | 'channel' | 'handoff' | 'reaction';
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
    | ReactionNodeData;
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
