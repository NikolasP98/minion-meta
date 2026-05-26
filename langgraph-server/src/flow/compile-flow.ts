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
} from './types.js';
import { resolveProviderModel } from './provider.js';
import { sendAgentTurn } from '../gateway/client.js';

const MVP_HINT = 'MVP runner supports exactly one Prompt connected to one Agent or LLM node.';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function validateFlowShape(nodes: FlowNode[], edges: FlowEdge[]): void {
  const prompts = nodes.filter((n) => n.type === 'promptBox');
  const execNodes = nodes.filter((n) => n.type === 'agent' || n.type === 'llm');

  if (prompts.length !== 1) {
    throw new UnsupportedFlowError(
      `Expected exactly 1 prompt node, found ${prompts.length}. ${MVP_HINT}`,
    );
  }
  if (execNodes.length !== 1) {
    throw new UnsupportedFlowError(
      `Expected exactly 1 agent or LLM node, found ${execNodes.length}. ${MVP_HINT}`,
    );
  }

  const prompt = prompts[0];
  const exec = execNodes[0];
  const connected = edges.some(
    (e) => e.source === prompt.id && e.target === exec.id && e.type === 'flow',
  );
  if (!connected) {
    throw new UnsupportedFlowError(`Prompt must be connected to the agent or LLM. ${MVP_HINT}`);
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
}

export interface CompileOptions {
  /** Inject a model for tests (llm node path). Defaults to resolveProviderModel(). */
  model?: ChatModel;
  /** Inject a gateway client for tests (agent node path). Defaults to the real client. */
  gatewayClient?: GatewayClient;
}

export function compileFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts: CompileOptions = {},
) {
  validateFlowShape(nodes, edges);

  const promptNode = nodes.find((n) => n.type === 'promptBox')!;
  const execNode = nodes.find((n) => n.type === 'agent' || n.type === 'llm')!;
  const promptValue = (promptNode.data as PromptBoxData).value ?? '';
  const runId = randomUUID();

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
