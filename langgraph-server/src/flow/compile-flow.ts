import { MessagesAnnotation, StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { randomUUID } from 'node:crypto';
import {
  UnsupportedFlowError,
  type FlowNode,
  type FlowEdge,
  type AgentNodeData,
  type PromptBoxData,
  type LLMNodeData,
  type PluginActionNodeData,
  type TransformNodeData,
  type StructuredNodeData,
  type RouterNodeData,
  type RouterRuleOp,
} from './types.js';
import { resolveProviderModel } from './provider.js';
import { sendAgentTurn, callGatewayMethod } from '../gateway/client.js';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const PROCESSING_TYPES = ['llm', 'agent', 'pluginAction', 'transform', 'structured', 'router'] as const;

export function validateFlowShape(nodes: FlowNode[], edges: FlowEdge[]): void {
  const prompts = nodes.filter((n) => n.type === 'promptBox');
  const triggers = nodes.filter((n) => n.type === 'trigger' || n.type === 'pluginTrigger');
  const processing = nodes.filter((n) => (PROCESSING_TYPES as readonly string[]).includes(n.type));

  if (prompts.length > 0 && triggers.length > 0) {
    throw new UnsupportedFlowError('A flow cannot have both a trigger and a prompt box.');
  }
  const entryNodes = [...prompts, ...triggers];
  if (entryNodes.length !== 1) {
    throw new UnsupportedFlowError(`Expected exactly 1 prompt or trigger node, found ${entryNodes.length}.`);
  }
  if (processing.length < 1) {
    throw new UnsupportedFlowError('Flow needs at least one processing node.');
  }

  const entry = entryNodes[0];
  const flowEdges = edges.filter((e) => e.type === 'flow');
  const adj = new Map<string, string[]>();
  for (const e of flowEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  // Reachability from entry.
  const reachable = new Set<string>();
  const stack = [entry.id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  for (const p of processing) {
    if (!reachable.has(p.id)) {
      throw new UnsupportedFlowError(`Node "${p.id}" is not connected to the entry node.`);
    }
  }

  // Cycle detection (DFS).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const visit = (id: string): void => {
    color.set(id, GRAY);
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) throw new UnsupportedFlowError('Flow graph has a cycle — loops are not supported.');
      if (c === WHITE) visit(next);
    }
    color.set(id, BLACK);
  };
  for (const n of nodes) if ((color.get(n.id) ?? WHITE) === WHITE) visit(n.id);
}

/**
 * Backward compat: a legacy 'agent' node whose agentId starts with "claude-"
 * is treated as an LLM node (preserves MVP "PONG demo" flows).
 */
export function resolveModelId(agentId: string): string {
  return (agentId ?? '').startsWith('claude-') ? agentId : DEFAULT_MODEL;
}

interface ChatModel {
  invoke(messages: BaseMessage[]): Promise<BaseMessage>;
  withStructuredOutput?(schema: unknown): ChatModel;
}

interface GatewayClient {
  sendAgentTurn(
    agentId: string,
    prompt: string,
    sessionMode: 'ephemeral' | 'shared',
    runId: string,
    nodeId: string,
  ): Promise<string>;
  callGatewayMethod?(method: string, params: Record<string, unknown>): Promise<string>;
}

export interface CompileOptions {
  /** Inject a model for tests (llm node path). Defaults to resolveProviderModel(). */
  model?: ChatModel;
  /** Inject a gateway client for tests (agent node path). Defaults to the real client. */
  gatewayClient?: GatewayClient;
  /** Event payload passed by the trigger-manager when running trigger-based flows. */
  initialPrompt?: string;
}

export function compileFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts: CompileOptions = {},
) {
  validateFlowShape(nodes, edges);

  const entryNode = nodes.find(
    (n) => n.type === 'promptBox' || n.type === 'trigger' || n.type === 'pluginTrigger',
  )!;
  const runId = randomUUID();

  let promptValue: string;
  if (entryNode.type === 'trigger' || entryNode.type === 'pluginTrigger') {
    if (!opts.initialPrompt) {
      throw new UnsupportedFlowError(
        'Trigger node requires an initialPrompt (event payload) — call via /flows/run-triggered.',
      );
    }
    promptValue = opts.initialPrompt;
  } else {
    promptValue = (entryNode.data as PromptBoxData).value ?? '';
  }

  const processing = nodes.filter((n) =>
    n.type === 'llm' || n.type === 'agent' || n.type === 'pluginAction' ||
    n.type === 'transform' || n.type === 'structured' || n.type === 'router',
  );
  const flowEdges = edges.filter((e) => e.type === 'flow');

  const builder = new StateGraph(MessagesAnnotation);
  type AnyGraph = {
    addNode: (name: string, fn: (s: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }>) => void;
    addEdge: (from: string, to: string) => void;
    compile: () => ReturnType<typeof builder.compile>;
  };
  const g = builder as unknown as AnyGraph;

  for (const node of processing) {
    g.addNode(node.id, buildNodeRunner(node, opts, runId));
  }
  const hasOutgoing = new Set(flowEdges.map((e) => e.source));
  for (const e of flowEdges) {
    if (e.source === entryNode.id) g.addEdge(START, e.target);
    else g.addEdge(e.source, e.target);
  }
  for (const node of processing) {
    if (!hasOutgoing.has(node.id)) g.addEdge(node.id, END);
  }

  const graph = g.compile();
  const initialState = { messages: [new HumanMessage(promptValue)] };
  return { graph, initialState };
}

/** A processing node's input = the content of the most recent message in state. */
function lastMessageContent(state: typeof MessagesAnnotation.State): string {
  const last = state.messages[state.messages.length - 1];
  return last ? String(last.content) : '';
}

export function matchesRule(input: string, rule: { op: RouterRuleOp; value: string }): boolean {
  switch (rule.op) {
    case 'contains': return input.includes(rule.value);
    case 'equals': return input === rule.value;
    case 'regex': { try { return new RegExp(rule.value).test(input); } catch { return false; } }
  }
}

async function classifyWithLlm(input: string, data: RouterNodeData, opts: CompileOptions): Promise<string> {
  const model: ChatModel = opts.model ?? resolveProviderModel(data.modelId ?? DEFAULT_MODEL);
  const labels = [...data.branches.map((b) => b.label), 'default'];
  const sys =
    `Classify the input into exactly one of these labels: ${labels.join(', ')}. ` +
    `Reply with ONLY the label, nothing else.`;
  const res = await model.invoke([new SystemMessage(sys), new HumanMessage(input)]);
  const answer = String(res.content).trim().toLowerCase();
  const match = data.branches.find((b) => b.label.toLowerCase() === answer);
  return match ? match.id : 'default';
}

/** Build the conditional-edge routing fn for a router node. Exported for tests. */
export function buildRouterRoute(
  node: FlowNode,
  connectedHandles: Set<string>,
  opts: CompileOptions,
): (state: typeof MessagesAnnotation.State) => Promise<string> {
  const data = node.data as RouterNodeData;
  return async (state) => {
    const input = lastMessageContent(state);
    let chosen = 'default';
    if (data.mode === 'rule') {
      for (const b of data.branches) {
        if (b.rule && matchesRule(input, b.rule)) { chosen = b.id; break; }
      }
    } else {
      chosen = await classifyWithLlm(input, data, opts);
    }
    return connectedHandles.has(chosen) ? chosen : 'default';
  };
}

function buildNodeRunner(
  node: FlowNode,
  opts: CompileOptions,
  runId: string,
): (state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }> {
  // pluginAction node — call gateway method contributed by a plugin
  if (node.type === 'pluginAction') {
    const data = node.data as PluginActionNodeData;
    const invoke = opts.gatewayClient?.callGatewayMethod ?? callGatewayMethod;
    return async (state) => {
      const input = lastMessageContent(state);
      const reply = await invoke(data.method, { input, runId, nodeId: node.id });
      return { messages: [new AIMessage(reply)] };
    };
  }

  // llm node — direct model call
  if (node.type === 'llm') {
    const { modelId } = node.data as LLMNodeData;
    const model: ChatModel = opts.model ?? resolveProviderModel(modelId ?? DEFAULT_MODEL);
    return async (state) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    };
  }

  // agent node — check for legacy claude-* id (backward compat)
  if (node.type === 'agent') {
    const agentData = node.data as AgentNodeData;

    if (agentData.agentKind === 'drone') {
      throw new UnsupportedFlowError('Drone execution is not yet supported — coming soon.');
    }

    const isLegacyLLM = agentData.agentId && agentData.agentId.startsWith('claude-');

    if (isLegacyLLM) {
      // Intentional duplicate of the llm-node path — kept separate for clarity,
      // not collapsed to preserve the ability to diverge these paths later.
      const modelId = resolveModelId(agentData.agentId);
      const model: ChatModel = opts.model ?? resolveProviderModel(modelId);
      return async (state) => {
        const response = await model.invoke(state.messages);
        return { messages: [response] };
      };
    }

    // agent node — real gateway agent
    const gc: GatewayClient = opts.gatewayClient ?? { sendAgentTurn };
    return async (state) => {
      const prompt = lastMessageContent(state);
      const reply = await gc.sendAgentTurn(
        agentData.agentId, prompt, agentData.sessionMode ?? 'ephemeral', runId, node.id,
      );
      return { messages: [new AIMessage(reply)] };
    };
  }

  // transform node — string template with {input} substitution
  if (node.type === 'transform') {
    const { template } = node.data as TransformNodeData;
    return async (state) => {
      const text = template.replaceAll('{input}', lastMessageContent(state));
      return { messages: [new HumanMessage(text)] };
    };
  }

  // structured node — withStructuredOutput + JSON schema
  if (node.type === 'structured') {
    const data = node.data as StructuredNodeData;
    const model: ChatModel = opts.model ?? resolveProviderModel(data.modelId ?? DEFAULT_MODEL);
    return async (state) => {
      let schema: Record<string, unknown>;
      try {
        schema = JSON.parse(data.schema || '{}');
      } catch {
        throw new UnsupportedFlowError(`Structured node "${node.id}" has invalid JSON schema.`);
      }
      const structuredModel = model.withStructuredOutput?.(schema) ?? model;
      const response = await structuredModel.invoke(state.messages);
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content ?? response);
      return { messages: [new AIMessage(content)] };
    };
  }

  // router node — routing happens on the conditional edge; the node itself is a pass-through.
  if (node.type === 'router') {
    return async () => ({ messages: [] });
  }

  // No runner exists for this node type yet — fail loudly rather than mis-casting.
  throw new UnsupportedFlowError(`No runner for node type "${node.type}".`);
}
