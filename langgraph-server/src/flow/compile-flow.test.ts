import { describe, it, expect } from 'vitest';
import { validateFlowShape, compileFlow, resolveModelId, DEFAULT_MODEL } from './compile-flow.js';
import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge } from './types.js';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';

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

  it('rejects when prompt connects to agent only via a context edge', () => {
    const ctxEdge: FlowEdge = { ...edge, id: 'e2', type: 'context' };
    expect(() => validateFlowShape([prompt, agent], [ctxEdge])).toThrow(UnsupportedFlowError);
  });
});

describe('compileFlow', () => {
  it('seeds the prompt value and runs the agent node', async () => {
    const fakeModel = {
      async invoke(messages: BaseMessage[]) {
        const last = messages[messages.length - 1];
        return new AIMessage(`echo:${String(last.content)}`);
      },
    };

    const { graph, initialState } = compileFlow([prompt, agent], [edge], {
      model: fakeModel,
    });

    expect(initialState.messages[0]).toBeInstanceOf(HumanMessage);
    expect(initialState.messages[0].content).toBe('Hello');

    const result = await graph.invoke(initialState);
    const final = result.messages[result.messages.length - 1];
    expect(final.content).toBe('echo:Hello');
  });

  it('throws on an unsupported flow before building a graph', () => {
    expect(() => compileFlow([prompt], [], {})).toThrow(UnsupportedFlowError);
  });
});

describe('resolveModelId', () => {
  it('passes through a claude model id', () => {
    expect(resolveModelId('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5-20251001');
  });
  it('falls back to the default for non-model ids', () => {
    expect(resolveModelId('built:abc123')).toBe(DEFAULT_MODEL);
  });
  it('falls back to the default when agentId is missing', () => {
    expect(resolveModelId(undefined as unknown as string)).toBe(DEFAULT_MODEL);
  });
});
