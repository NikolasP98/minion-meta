import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge, AgentNodeData, PromptBoxData } from './types.js';
import { ChatAnthropic } from '@langchain/anthropic';
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { HumanMessage, type BaseMessage } from '@langchain/core/messages';

const MVP_HINT =
  'MVP runner supports exactly one Prompt connected to one Agent.';

export function validateFlowShape(nodes: FlowNode[], edges: FlowEdge[]): void {
  const prompts = nodes.filter((n) => n.type === 'promptBox');
  const agents = nodes.filter((n) => n.type === 'agent');

  if (prompts.length !== 1) {
    throw new UnsupportedFlowError(
      `Expected exactly 1 prompt node, found ${prompts.length}. ${MVP_HINT}`,
    );
  }
  if (agents.length !== 1) {
    throw new UnsupportedFlowError(
      `Expected exactly 1 agent node, found ${agents.length}. ${MVP_HINT}`,
    );
  }

  const prompt = prompts[0];
  const agent = agents[0];
  const connected = edges.some(
    (e) => e.source === prompt.id && e.target === agent.id,
  );
  if (!connected) {
    throw new UnsupportedFlowError(
      `Prompt must be connected to the agent. ${MVP_HINT}`,
    );
  }
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/** MVP: the picker writes a model id into agentId; non-model ids fall back. */
export function resolveModelId(agentId: string): string {
  return agentId.startsWith('claude-') ? agentId : DEFAULT_MODEL;
}

interface ChatModel {
  invoke(messages: BaseMessage[]): Promise<BaseMessage>;
}

export interface CompileOptions {
  /** Inject a model for tests; defaults to a real ChatAnthropic. */
  model?: ChatModel;
}

export function compileFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts: CompileOptions = {},
) {
  validateFlowShape(nodes, edges);

  const promptNode = nodes.find((n) => n.type === 'promptBox')!;
  const agentNode = nodes.find((n) => n.type === 'agent')!;
  const promptValue = (promptNode.data as PromptBoxData).value ?? '';
  const modelId = resolveModelId((agentNode.data as AgentNodeData).agentId);

  const model: ChatModel =
    opts.model ?? new ChatAnthropic({ model: modelId, temperature: 0 });

  const callAgent = async (state: typeof MessagesAnnotation.State) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('agent', callAgent)
    .addEdge('__start__', 'agent')
    .addEdge('agent', '__end__')
    .compile();

  const initialState = { messages: [new HumanMessage(promptValue)] };

  return { graph, initialState };
}
