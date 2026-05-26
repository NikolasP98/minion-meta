import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge } from './types.js';

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
