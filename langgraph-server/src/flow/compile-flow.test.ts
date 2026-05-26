import { describe, it, expect } from 'vitest';
import { validateFlowShape } from './compile-flow.js';
import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge } from './types.js';

const prompt: FlowNode = {
  id: 'p1', type: 'promptBox', position: { x: 0, y: 0 },
  data: { label: 'Prompt', value: 'Hello' },
};
const agent: FlowNode = {
  id: 'a1', type: 'agent', position: { x: 200, y: 0 },
  data: { agentId: 'claude-haiku-4-5-20251001', label: 'Agent' },
};
const edge: FlowEdge = {
  id: 'e1', source: 'p1', sourceHandle: 'prompt-out',
  target: 'a1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape', () => {
  it('accepts one prompt connected to one agent', () => {
    expect(() => validateFlowShape([prompt, agent], [edge])).not.toThrow();
  });

  it('rejects a flow with no agent', () => {
    expect(() => validateFlowShape([prompt], [])).toThrow(UnsupportedFlowError);
  });

  it('rejects a flow with two agents', () => {
    const agent2 = { ...agent, id: 'a2' };
    expect(() => validateFlowShape([prompt, agent, agent2], [edge])).toThrow(UnsupportedFlowError);
  });

  it('rejects when prompt is not connected to the agent', () => {
    expect(() => validateFlowShape([prompt, agent], [])).toThrow(UnsupportedFlowError);
  });
});
