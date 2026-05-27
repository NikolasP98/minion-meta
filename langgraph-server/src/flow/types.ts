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

export type TriggerNodeData = {
  event: 'message:received' | 'message:sent' | 'agent:bootstrap'
        | 'memory:node_created' | 'memory:node_updated' | 'memory:node_deleted';
  label: string;
  deliverResponse: boolean;
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
  rule?: { op: RouterRuleOp; value: string };
};

export type RouterNodeData = {
  mode: 'rule' | 'llm';
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

export type FlowNode = {
  id: string;
  type: 'agent' | 'promptBox' | 'llm' | 'trigger' | 'pluginTrigger' | 'pluginAction' | 'transform' | 'structured' | 'router' | 'toolAgent';
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
    | ToolAgentNodeData;
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

/** One streamed line of execution feedback, sent to the hub console. */
export type FlowRunEvent = {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
};

/** Thrown when a flow is not a shape the MVP runner can execute. */
export class UnsupportedFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFlowError';
  }
}
