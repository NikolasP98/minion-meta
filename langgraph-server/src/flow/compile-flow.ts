import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { HumanMessage, AIMessage, type BaseMessage } from '@langchain/core/messages';
import { randomUUID } from 'node:crypto';
import {
  UnsupportedFlowError,
  type FlowNode,
  type FlowEdge,
  type AgentNodeData,
  type PromptBoxData,
  type LLMNodeData,
  type TriggerNodeData,
  type PluginActionNodeData,
} from './types.js';
import { resolveProviderModel } from './provider.js';
import { sendAgentTurn, callGatewayMethod } from '../gateway/client.js';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function validateFlowShape(nodes: FlowNode[], edges: FlowEdge[]): void {
  const prompts = nodes.filter((n) => n.type === 'promptBox');
  const triggers = nodes.filter((n) => n.type === 'trigger' || n.type === 'pluginTrigger');
  const execNodes = nodes.filter((n) => n.type === 'agent' || n.type === 'llm' || n.type === 'pluginAction');
  const HINT = 'MVP runner supports exactly one Prompt (or Trigger) connected to one Agent or LLM node.';

  if (prompts.length > 0 && triggers.length > 0) {
    throw new UnsupportedFlowError('A flow cannot have both a trigger and a prompt box.');
  }
  if (triggers.length > 1) {
    throw new UnsupportedFlowError(`Expected exactly 1 trigger node, found ${triggers.length}. ${HINT}`);
  }
  const entryNodes = [...prompts, ...triggers];
  if (entryNodes.length !== 1) {
    throw new UnsupportedFlowError(`Expected exactly 1 prompt or trigger node, found ${entryNodes.length}. ${HINT}`);
  }
  if (execNodes.length !== 1) {
    throw new UnsupportedFlowError(
      `Expected exactly 1 agent or LLM node, found ${execNodes.length}. ${HINT}`,
    );
  }

  const entry = entryNodes[0];
  const exec = execNodes[0];
  const connected = edges.some(
    (e) => e.source === entry.id && e.target === exec.id && e.type === 'flow',
  );
  if (!connected) {
    throw new UnsupportedFlowError(`Entry node must be connected to the agent or LLM. ${HINT}`);
  }
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

  const entryNode = nodes.find((n) => n.type === 'promptBox' || n.type === 'trigger' || n.type === 'pluginTrigger')!;
  const execNode = nodes.find((n) => n.type === 'agent' || n.type === 'llm' || n.type === 'pluginAction')!;
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

  const callNode = buildExecNode(execNode, opts, runId);

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('exec', callNode)
    .addEdge('__start__', 'exec')
    .addEdge('exec', '__end__')
    .compile();

  const initialState = { messages: [new HumanMessage(promptValue)] };
  return { graph, initialState };
}

function buildExecNode(
  node: FlowNode,
  opts: CompileOptions,
  runId: string,
): (state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }> {
  // pluginAction node — call gateway method contributed by a plugin
  if (node.type === 'pluginAction') {
    const data = node.data as PluginActionNodeData;
    const invoke = opts.gatewayClient?.callGatewayMethod ?? callGatewayMethod;
    return async (state) => {
      const lastHuman = [...state.messages].reverse().find((m) => m._getType() === 'human');
      if (!lastHuman) {
        throw new Error(
          `Plugin action node "${node.id}" (${data.method}) received no human message in state — cannot dispatch.`,
        );
      }
      const reply = await invoke(data.method, {
        input: String(lastHuman.content), runId, nodeId: node.id,
      });
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
    const lastHuman = [...state.messages].reverse().find((m) => m._getType() === 'human');
    if (!lastHuman) {
      throw new Error('Agent node received no human message in state — cannot dispatch.');
    }
    const prompt = String(lastHuman.content);
    const reply = await gc.sendAgentTurn(
      agentData.agentId,
      prompt,
      agentData.sessionMode ?? 'ephemeral',
      runId,
      node.id,
    );
    return { messages: [new AIMessage(reply)] };
  };
}
